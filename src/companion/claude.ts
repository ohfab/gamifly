import type { SkillId } from '../game/skills'
import type Anthropic from '@anthropic-ai/sdk'
import { useGame, type Tab } from '../store/useGame'
import { TOPICS } from '../guide/topics'
import { GATE_RANKS } from '../game/world'
import { snapshot } from './context'
import { runCmd } from './commands'

type Msg = Anthropic.Beta.BetaMessageParam
type Tool = Anthropic.Beta.BetaTool

export const CLAUDE_MODEL = 'claude-opus-5-5'

const SYSTEM = `Du bist „das System“ in der App „Gamifly“. Gamifly macht den Alltag der Person zu einem Rollenspiel im Stil von Solo Leveling: dunkle, klare Oberfläche, Quests, Gates, Bosse, Ränge und Level. Du bist die Stimme dieses Systems, aber auf ihrer Seite.

So schreibst du:
- Deutsch, per du, präzise und knapp wie ein System-Fenster, trotzdem menschlich und ermutigend. Meist 1 bis 3 Sätze, höchstens 5.
- Deine Antworten erscheinen als schlichter Text. Keine Emojis, keine Markdown-Formatierung, keine Listen mit Sonderzeichen.
- Du motivierst ohne Druck. Bei schlechter Stimmung bist du einfühlsam und schlägst kleine Schritte vor. Bei ernsten gesundheitlichen oder seelischen Problemen empfiehlst du, mit einer vertrauten Person oder Fachleuten zu sprechen.

So arbeitest du:
- Mit jeder Nachricht bekommst du eine Systemnachricht mit dem aktuellen App-Zustand als JSON. Nutze nur diese Daten für Aussagen über den Tag der Person und erfinde keine Zahlen.
- Wenn die Person etwas erledigt hat oder etwas eintragen möchte, nutze die passenden Tools, statt nur darüber zu reden. Bestätige danach kurz, was du eingetragen hast.
- Quests schließt du nur ab, wenn die Person sagt, dass sie die Aufgabe erledigt hat, und nur Quests mit "manual": true.
- Wenn eine Frage nichts mit der App oder dem Alltag der Person zu tun hat, beantworte sie trotzdem kurz und hilfsbereit.

Wissen über die App:
${TOPICS.map((t) => `- ${t.title}: ${t.say}`).join('\n')}`

const TOOLS: Tool[] = [
  {
    name: 'log_health', strict: true,
    description: 'Trägt einen Health-Wert für heute ein. water, steps, workoutMin und meditationMin werden addiert. sleep (Stunden) und mood (1 bis 5) werden gesetzt.',
    input_schema: { type: 'object', additionalProperties: false, required: ['metric', 'amount'], properties: { metric: { type: 'string', enum: ['water', 'steps', 'workoutMin', 'meditationMin', 'sleep', 'mood'] }, amount: { type: 'number' } } },
  },
  {
    name: 'complete_quest', strict: true,
    description: 'Schließt eine offene manuelle Quest ab. Nur verwenden, wenn die Person sagt, dass sie die Aufgabe erledigt hat. quest_id stammt aus openQuests im App-Zustand.',
    input_schema: { type: 'object', additionalProperties: false, required: ['quest_id'], properties: { quest_id: { type: 'string' } } },
  },
  {
    name: 'add_quest', strict: true,
    description: 'Legt eine neue eigene Quest an.',
    input_schema: { type: 'object', additionalProperties: false, required: ['title', 'type', 'difficulty'], properties: { title: { type: 'string' }, type: { type: 'string', enum: ['daily', 'weekly', 'side'] }, difficulty: { type: 'string', enum: ['easy', 'normal', 'hard', 'boss'] } } },
  },
  {
    name: 'add_shopping', strict: true,
    description: 'Setzt Artikel auf die Einkaufsliste.',
    input_schema: { type: 'object', additionalProperties: false, required: ['items'], properties: { items: { type: 'array', items: { type: 'string' } } } },
  },
  {
    name: 'navigate', strict: true,
    description: 'Öffnet einen Bereich der App für die Person.',
    input_schema: { type: 'object', additionalProperties: false, required: ['tab'], properties: { tab: { type: 'string', enum: ['status', 'quests', 'home', 'style', 'life', 'inventory'] } } },
  },
  {
    name: 'start_gate', strict: true,
    description: 'Startet ein Fokus-Gate (Konzentrations-Timer). Ränge: E 10 Min., D 15, C 25, B 45, A 60.',
    input_schema: { type: 'object', additionalProperties: false, required: ['rank'], properties: { rank: { type: 'string', enum: GATE_RANKS.map((g) => g.rank) } } },
  },
  {
    name: 'cast_skill', strict: true,
    description: 'Aktiviert einen Skill der Person, wenn sie das möchte. Kostet MP (siehe skills und vitals.mpLeftToday im App-Zustand). arise extrahiert den Schatten des besiegten Wochenbosses.',
    input_schema: { type: 'object', additionalProperties: false, required: ['skill'], properties: { skill: { type: 'string', enum: ['dash', 'bloodlust', 'stealth', 'ruler', 'arise'] } } },
  },
  {
    name: 'start_tour', strict: true,
    description: 'Startet die interaktive Guide-Tour durch die App.',
    input_schema: { type: 'object', additionalProperties: false, required: [], properties: {} },
  },
]

const XP = { easy: 20, normal: 40, hard: 80, boss: 160 } as const

function runTool(name: string, input: Record<string, unknown>): string {
  const s = useGame.getState()
  switch (name) {
    case 'log_health': {
      const m = input.metric as string
      const a = Number(input.amount)
      if (!Number.isFinite(a)) return 'Fehler: amount ist keine Zahl.'
      if (m === 'sleep') s.logHealth({ sleep: Math.max(0, Math.min(16, a)) })
      else if (m === 'mood') s.logHealth({ mood: Math.max(1, Math.min(5, Math.round(a))) })
      else s.addHealth(m as 'water', Math.round(a))
      return `Eingetragen: ${m} ${a}`
    }
    case 'complete_quest': {
      const q = s.quests.find((x) => x.id === input.quest_id)
      if (!q) return 'Fehler: Quest nicht gefunden.'
      if (q.done) return 'Quest war schon erledigt.'
      if (q.target) return 'Fehler: Diese Quest zählt automatisch und kann nicht manuell abgeschlossen werden.'
      s.completeQuest(q.id)
      return `Quest abgeschlossen: ${q.title}`
    }
    case 'add_quest': {
      const d = (input.difficulty as keyof typeof XP) ?? 'normal'
      s.addQuest({ title: String(input.title), type: input.type as 'side', cat: 'custom', xp: XP[d] ?? 40 })
      return `Quest angelegt: ${input.title}`
    }
    case 'add_shopping': {
      const items = (input.items as string[]).filter(Boolean)
      items.forEach((i) => s.addShopping(i))
      return `Auf der Einkaufsliste: ${items.join(', ')}`
    }
    case 'navigate': s.setTab(input.tab as Tab); return `Geöffnet: ${input.tab}`
    case 'start_gate': s.setTab('life'); s.startGate(String(input.rank)); return `Gate ${input.rank} gestartet`
    case 'start_tour': runCmd('tour'); return 'Tour gestartet'
    case 'cast_skill': return s.castSkill(input.skill as SkillId) ? `Skill ${input.skill} aktiviert` : `Skill ${input.skill} nicht möglich (zu wenig MP, gesperrt oder nicht verfügbar)`
    default: return `Fehler: unbekanntes Tool ${name}`
  }
}

/** The conversation sent to the API. Append-only, so thinking blocks stay valid between turns. */
let history: Msg[] = []
export const resetClaude = () => { history = [] }

export async function askClaude(text: string, apiKey: string): Promise<string> {
  let Client: typeof Anthropic
  try {
    Client = (await import('@anthropic-ai/sdk')).default
  } catch {
    throw new Error('Das KI-Gehirn konnte nicht geladen werden, vermutlich bist du offline. Ich antworte mit meinem eingebauten Wissen.')
  }
  const client = new Client({ apiKey, dangerouslyAllowBrowser: true })
  history.push({ role: 'user', content: text })
  history.push({ role: 'system', content: `Aktueller App-Zustand:\n${JSON.stringify(snapshot())}` } as unknown as Msg)
  let reply = ''
  try {
    for (let turn = 0; turn < 6; turn++) {
      const res = await client.beta.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages: history,
      })
      history.push({ role: 'assistant', content: res.content })
      const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join(' ').trim()
      if (text) reply = text
      if (res.stop_reason === 'refusal') return reply || 'Dabei kann ich dir leider nicht helfen. Frag mich gern etwas anderes.'
      if (res.stop_reason !== 'tool_use') break
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
      for (const b of res.content) {
        if (b.type !== 'tool_use') continue
        let out: string
        try { out = runTool(b.name, (b.input ?? {}) as Record<string, unknown>) } catch (e) { out = `Fehler: ${(e as Error).message}` }
        results.push({ type: 'tool_result', tool_use_id: b.id, content: out, is_error: out.startsWith('Fehler') })
      }
      history.push({ role: 'user', content: results })
    }
  } catch (e) {
    // A failed request must not leave a dangling user turn behind.
    history = []
    if (e instanceof Client.AuthenticationError) throw new Error('Der API-Schlüssel wurde abgelehnt. Prüfe ihn in Lumis Einstellungen.')
    if (e instanceof Client.RateLimitError) throw new Error('Gerade sind zu viele Anfragen unterwegs. Versuch es gleich nochmal.')
    if (e instanceof Client.APIConnectionError) throw new Error('Keine Verbindung zu Claude. Ich antworte offline.')
    if (e instanceof Client.APIError) throw new Error(`Claude meldet einen Fehler (${e.status}). Ich antworte offline.`)
    throw e
  }
  if (history.length > 60) history = []
  return reply || 'Erledigt!'
}
