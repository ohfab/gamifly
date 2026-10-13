import { useGame, todayLog } from '../store/useGame'
import { BOSSES } from '../game/world'
import { TOPICS } from '../guide/topics'
import { suggest } from '../lib/style'
import { dayKey } from '../lib/util'
import { briefing, cleanliness, dirtiest, expiring, gateByMinutes, nextStep, recipeIdeas } from './context'

export interface Reply { text: string; actions?: { label: string; cmd: string }[]; mood?: 'happy' | 'think' | 'surprised' | 'calm' }

const WORDS: Record<string, number> = { ein: 1, eins: 1, eine: 1, einen: 1, einem: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, halbe: 0.5, halb: 0.5 }
function num(t: string): number | null {
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(k|tausend)?/)
  if (m) return parseFloat(m[1].replace(',', '.')) * (m[2] ? 1000 : 1)
  for (const [w, n] of Object.entries(WORDS)) if (new RegExp(`\\b${w}\\b`).test(t)) return n
  return null
}
const isQuestion = (t: string) => /\?|^(wie|was|wann|wo|wieviel|wie viel|hab ich|habe ich|bin ich)\b/.test(t)
const TAB_WORDS: [RegExp, string][] = [[/status|charakter|profil/, 'status'], [/quest|aufgabe/, 'quests'], [/wohnung|zuhause|haus|3d|räume/, 'home'], [/style|kleider|schrank|outfit|mode/, 'style'], [/life|health|gesundheit|tracker/, 'life'], [/inventar|tasche|shop|items|erfolge/, 'inventory']]

const QUICK = [
  { label: 'Tagesbriefing', cmd: 'say:briefing' },
  { label: 'Was als Nächstes?', cmd: 'say:next' },
  { label: 'Guide-Tour', cmd: 'tour' },
]

const JOKES = [
  'Warum hat der Kühlschrank so gute Laune? Weil er immer cool bleibt.',
  'Ich wollte heute produktiv sein. Dann habe ich ein Fokus-Gate betreten und es tatsächlich geschafft. Plot twist!',
  'Der Prokrastinations-Golem hat mir erzählt, er fängt morgen mit dem Training an. Seit drei Wochen.',
  'Wasser trinken ist wie Speichern im Spiel. Mach’s oft, sonst verlierst du HP.',
]

export function think(raw: string): Reply {
  const s = useGame.getState()
  const t = raw.toLowerCase().trim()
  const name = s.player.name
  const d = todayLog(s)
  const n = num(t)

  if (!t || /^(hi|hallo|hey|moin|servus|huhu|na|guten (morgen|tag|abend)|hello)\b/.test(t)) {
    return { text: `Hey ${name}! Schön, dass du da bist. Soll ich dir dein Tagesbriefing geben oder sagen, was als Nächstes dran ist?`, actions: QUICK, mood: 'happy' }
  }
  if (/^(danke|dankeschön|thx|merci|cool|super|nice|perfekt)\b/.test(t)) return { text: 'Sehr gern! Ich bin hier, wann immer du mich brauchst.', mood: 'happy' }
  if (/wer bist du|wie heißt du|was bist du/.test(t)) return { text: 'Ich bin Lumi, dein System-Guide. Ich kenne jede Ecke von Gamifly, erinnere dich an Quests und feiere deine Erfolge mit dir.', actions: [{ label: 'Guide-Tour', cmd: 'tour' }, { label: 'Handbuch', cmd: 'guide:start' }], mood: 'happy' }
  if (/witz|lustig|bring mich zum lachen/.test(t)) return { text: JOKES[Math.floor(Math.random() * JOKES.length)], mood: 'happy' }
  if (/tour|führung|zeig mir alles|einführung|tutorial|erklär mir die app/.test(t)) return { text: 'Los geht’s! Ich zeige dir Schritt für Schritt, wo alles ist.', actions: [{ label: 'Tour starten', cmd: 'tour' }], mood: 'happy' }
  if (/handbuch|anleitung|hilfe$|^hilfe/.test(t)) return { text: 'Im Handbuch findest du alle Systeme erklärt. Oder frag mich einfach direkt, zum Beispiel: Was ist ein Fokus-Gate?', actions: [{ label: 'Handbuch öffnen', cmd: 'guide:start' }] }

  // ---------- logging ----------
  if (/wasser|glas|gläser|getrunken|trink/.test(t) && !/wie viel|wieviel|was ist/.test(t)) {
    if (/trink|getrunken|hatte|hab|habe|\+|noch/.test(t) && !isQuestion(t)) {
      const k = Math.max(1, Math.min(12, Math.round(n ?? 1)))
      s.addHealth('water', k)
      const now = todayLog(useGame.getState()).water
      return { text: `${k === 1 ? 'Ein Glas' : `${k} Gläser`} eingetragen. Du bist bei ${now} von 8.${now >= 8 ? ' Hydration-Ziel geschafft!' : ` Noch ${8 - now} bis zum Ziel.`}`, mood: 'happy' }
    }
  }
  if (/wie viel|wieviel/.test(t) && /wasser|getrunken/.test(t)) return { text: `Heute hast du ${d.water} von 8 Gläsern getrunken.${d.water < 8 ? ' Magst du gleich eins trinken?' : ' Ziel erreicht!'}`, actions: d.water < 8 ? [{ label: '+1 Glas', cmd: 'water+1' }] : undefined }
  if (/schritt/.test(t)) {
    if (n && !isQuestion(t)) { s.addHealth('steps', Math.round(n)); return { text: `${Math.round(n).toLocaleString('de-DE')} Schritte eingetragen. Gesamt heute: ${todayLog(useGame.getState()).steps.toLocaleString('de-DE')}.`, mood: 'happy' } }
    return { text: `Du bist heute bei ${d.steps.toLocaleString('de-DE')} Schritten.${d.steps < 6000 ? ` Bis zur Daily fehlen ${(6000 - d.steps).toLocaleString('de-DE')}.` : ' Daily-Ziel geschafft!'}` }
  }
  if (/workout|sport|trainiert|training|yoga|pilates|gym|joggen|gelaufen|getanzt|tanzen|work ?out/.test(t) && n && !isQuestion(t)) {
    const min = Math.round(n < 5 && /stunde/.test(t) ? n * 60 : n)
    s.addHealth('workoutMin', min)
    s.addStatXp({ str: Math.round(min / 2) })
    return { text: `${min} Minuten Training eingetragen. Deine Stärke wächst!`, mood: 'happy' }
  }
  if (/geschlafen|schlaf/.test(t) && n && n <= 14 && !isQuestion(t)) {
    s.logHealth({ sleep: n })
    return { text: `${String(n).replace('.', ',')} Stunden Schlaf gespeichert. ${n >= 7.5 ? 'Beauty Sleep! Deine HP freuen sich.' : 'Etwas wenig. Heute Abend vielleicht etwas früher ins Bett?'}`, mood: n >= 7.5 ? 'happy' : 'calm' }
  }
  if (/mir geht|ich fühl|fühle mich|stimmung|bin (gerade )?(so )?(müde|traurig|gestresst|happy|glücklich)|keine lust|überfordert/.test(t)) {
    const mood = /super|toll|glücklich|happy|großartig|fantastisch|mega/.test(t) ? 5 : /gut|fein|entspannt/.test(t) && !/nicht gut/.test(t) ? 4 : /okay|ok|geht so|normal/.test(t) ? 3 : /müde|meh|naja|lustlos|keine lust/.test(t) ? 2 : /schlecht|traurig|mies|gestresst|überfordert|nicht gut|kacke/.test(t) ? 1 : null
    if (mood) s.logHealth({ mood })
    if (mood && mood <= 2) return { text: 'Danke, dass du es mir sagst. Heute muss nicht alles perfekt sein. Wie wär’s mit drei Minuten Atmen oder einem kleinen Gate Rang E? Kleine Schritte zählen genauso.', actions: [{ label: 'Atmen', cmd: 'tab:life' }, { label: 'Gate E (10 Min.)', cmd: 'gate:E' }], mood: 'calm' }
    if (mood) return { text: mood >= 4 ? 'Das freut mich riesig! Nutz die Energie: Was steht als Nächstes an?' : 'Okay, ein ganz normaler Tag also. Lass uns ihn trotzdem ein bisschen besser machen.', actions: [{ label: 'Was als Nächstes?', cmd: 'say:next' }], mood: 'happy' }
  }

  // ---------- overviews ----------
  if (/briefing|überblick|tagesplan|was steht (heute )?an|mein tag|zusammenfassung|morgen-?routine/.test(t)) { const b = briefing(); return { text: b.text, actions: b.actions } }
  if (/was (soll|kann|könnte) ich (jetzt |als nächstes |heute )?(tun|machen)|als nächstes|nächster schritt|tipp|langweil|motivier|was jetzt/.test(t)) { const x = nextStep(); return { text: x.text, actions: x.actions, mood: 'happy' } }
  if (/wie (stehe|steh|läuft)|mein status|mein level|fortschritt|wie gut bin ich/.test(t)) {
    return { text: `Du bist Level ${s.player.level}, ${s.player.title}, mit ${s.player.gold} Gold und ${s.player.gems} Kristallen. Streak: ${s.player.streak} Tage. Bisher ${s.stats.questsDone} Quests abgeschlossen.`, actions: [{ label: 'Status öffnen', cmd: 'tab:status' }] }
  }
  if (/quests?|aufgaben|to ?dos?|was ist offen|offen/.test(t) && !/neue|erstell|füg/.test(t) && !/was ist ein/.test(t)) {
    const open = s.quests.filter((q) => !q.done && (q.type === 'daily' || q.type === 'penalty' || q.bonus))
    if (!open.length) return { text: 'Für heute ist alles erledigt. Du bist unaufhaltsam!', mood: 'happy' }
    return { text: `Heute offen: ${open.map((q) => q.title).join(', ')}.`, actions: [{ label: 'Quest-Log', cmd: 'tab:quests' }] }
  }

  // ---------- home ----------
  if (/kochen|rezept|was (soll|kann) ich essen|hunger|abendessen|mittagessen|frühstück/.test(t)) {
    const ideas = recipeIdeas()
    if (!ideas.length) return { text: 'Dein Kühlschrank ist ziemlich leer. Trag ein, was da ist, dann schlage ich dir Rezepte vor.', actions: [{ label: 'Kühlschrank', cmd: 'fridge' }] }
    const top = ideas[0]
    return { text: `Wie wär’s mit ${top.r.name}? Dauert ${top.r.minutes} Minuten. ${top.r.tip}${top.missing.length ? ` Dir fehlt noch: ${top.missing.join(', ')}.` : ' Du hast alles da!'}${ideas[1] ? ` Alternativ: ${ideas[1].r.name}.` : ''}`, actions: [{ label: 'Rezepte ansehen', cmd: 'fridge' }], mood: 'happy' }
  }
  if (/kühlschrank|abgelaufen|läuft ab|haltbar|verbrauchen/.test(t)) {
    const e = expiring()
    return { text: e.length ? `Zuerst verbrauchen: ${e.map((f) => f.name).join(', ')}.` : 'Im Kühlschrank läuft gerade nichts ab. Alles frisch!', actions: [{ label: 'Kühlschrank öffnen', cmd: 'fridge' }] }
  }
  if (/einkaufsliste|einkaufen|besorgen|kaufen/.test(t) && /(setz|schreib|füg|pack|auf die|brauche)/.test(t)) {
    const items = t.replace(/.*?(setz|schreib|füg|pack|brauche)\w*\s*/, '').replace(/(auf|zur|zu) (die|der) einkaufsliste|hinzu|bitte/g, '').split(/,| und /).map((x) => x.trim()).filter((x) => x.length > 1)
    const nice = items.map((i) => i.charAt(0).toUpperCase() + i.slice(1))
    if (nice.length) { nice.forEach((i) => s.addShopping(i)); return { text: `Auf die Einkaufsliste: ${nice.join(', ')}.`, mood: 'happy' } }
  }
  if (/putz|aufräum|sauber|dreckig|staub|chaos/.test(t)) {
    const r = dirtiest()
    return { text: `Am dringendsten: ${r.name} mit ${cleanliness(r.lastCleaned)} % Sauberkeit. Zehn Minuten reichen schon. Danach tippst du im Raum auf Aufgeräumt.`, actions: [{ label: 'Zur Wohnung', cmd: 'tab:home' }] }
  }
  if (/(licht|lampe)n? (aus|an)/.test(t)) {
    const on = /an\b/.test(t)
    s.home.devices.filter((x) => x.kind === 'light' && x.on !== on).forEach((x) => s.toggleDevice(x.id))
    return { text: `Alle Lichter sind jetzt ${on ? 'an' : 'aus'}. Im 3D-Modell siehst du es direkt.` }
  }

  // ---------- style ----------
  if (/outfit|anziehen|zieh ich|was trag|klamotten/.test(t) && !/was ist/.test(t)) {
    if (!s.wardrobe.length) return { text: 'Dein Kleiderschrank ist noch leer. Fotografiere ein paar Teile oder lade den Beispiel-Schrank, dann stelle ich dir Outfits zusammen.', actions: [{ label: 'Style Studio', cmd: 'tab:style' }] }
    const occ = /date/.test(t) ? 'date' : /arbeit|uni|büro/.test(t) ? 'arbeit' : /sport|gym/.test(t) ? 'sport' : /party/.test(t) ? 'party' : 'alltag'
    const [best] = suggest(s.wardrobe, occ, /regen/.test(t) ? 'regen' : /kalt|winter/.test(t) ? 'kalt' : /warm|sommer/.test(t) ? 'warm' : 'mild', Date.now() % 97)
    if (!best) return { text: 'Für ein Outfit brauche ich ein Kleid oder ein Oberteil plus Unterteil im Schrank.', actions: [{ label: 'Style Studio', cmd: 'tab:style' }] }
    return { text: `Mein Vorschlag: ${best.items.map((c) => c.name).join(', ')}. ${best.reasons[0]}.`, actions: [{ label: 'Anprobieren', cmd: 'tab:style' }], mood: 'happy' }
  }

  // ---------- game systems ----------
  if (/boss/.test(t) && !/was ist/.test(t) && s.boss) {
    const b = BOSSES[s.boss.idx]
    return { text: s.boss.defeated ? `${b.name} ist besiegt! Ab Montag wartet ein neuer Gegner.` : `${b.name} hat noch ${s.boss.hp} von ${s.boss.maxHp} HP. Seine Schwäche: ${b.weakness}. Damit machst du doppelten Schaden.`, actions: [{ label: 'Zum Boss', cmd: 'tab:status' }] }
  }
  if (/(start|betret|öffne|beginn|los).*(gate|fokus)|(gate|fokus).*(start|los)|lass uns lernen|ich will (lernen|arbeiten)/.test(t)) {
    const g = gateByMinutes(n ?? 25)
    return { text: `Gate Rang ${g.rank} mit ${g.minutes} Minuten ist bereit. Handy weg, eine Aufgabe, los!`, actions: [{ label: `Gate ${g.rank} starten`, cmd: `gate:${g.rank}` }] }
  }
  if (/kiste|login.?belohnung/.test(t) && s.chestDay !== dayKey()) return { text: 'Deine Login-Kiste wartet!', actions: [{ label: 'Öffnen', cmd: 'chest' }] }
  if (/neue quest|quest (hinzufügen|anlegen|erstellen)|erinnere mich|füg .* quest/.test(t)) {
    const title = raw.replace(/.*?(neue quest|quest (hinzufügen|anlegen|erstellen)|erinnere mich( daran)?|füg)\s*:?\s*/i, '').replace(/\s*(als quest|hinzu)\s*$/i, '').trim()
    if (title.length > 2) {
      s.addQuest({ title: title.charAt(0).toUpperCase() + title.slice(1), type: 'side', cat: 'custom', xp: 40 })
      return { text: `Neue Quest angelegt: „${title}“. Du findest sie im Quest-Log unter Neben.`, actions: [{ label: 'Quest-Log', cmd: 'tab:quests' }], mood: 'happy' }
    }
    return { text: 'Wie soll die Quest heißen? Sag zum Beispiel: Neue Quest Steuererklärung machen.' }
  }

  // ---------- navigation ----------
  if (/öffne|zeig|geh (zu|zum|zur)|wechsel|bring mich/.test(t)) {
    if (/kühlschrank/.test(t)) return { text: 'Hier ist dein Kühlschrank.', actions: [{ label: 'Öffnen', cmd: 'fridge' }] }
    const tab = TAB_WORDS.find(([r]) => r.test(t))
    if (tab) return { text: 'Bin schon unterwegs!', actions: [{ label: 'Öffnen', cmd: `tab:${tab[1]}` }] }
  }

  // ---------- explanations ----------
  const topic = TOPICS.find((x) => x.keys.test(t))
  if (topic) return { text: topic.say, actions: [{ label: 'Im Handbuch', cmd: `guide:${topic.id}` }, ...(topic.tab ? [{ label: 'Hinführen', cmd: `tab:${topic.tab}` }] : [])], mood: 'think' }

  return {
    text: 'Das habe ich noch nicht ganz verstanden. Du kannst mich nach deinem Tag fragen, mir sagen, was du erledigt hast, oder dir etwas erklären lassen.',
    actions: [{ label: 'Tagesbriefing', cmd: 'say:briefing' }, { label: 'Was ist ein Gate?', cmd: 'ask:Was ist ein Fokus-Gate?' }, { label: 'Ich hab 2 Gläser getrunken', cmd: 'ask:Ich hab 2 Gläser getrunken' }],
    mood: 'think',
  }
}
