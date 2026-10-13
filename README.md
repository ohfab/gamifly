# Gamifly 🎀

Dein Alltag als RPG. Gamifly ist eine Web-App, die sich auch als App aufs Handy installieren lässt (PWA). Sie verbindet Wohnung, Style und Health mit einem echten Spielsystem im Stil von Solo Leveling.

## Features

**Status & RPG-System**
- Level, XP-Kurve, Ränge E bis SS, Titel aus Erfolgen
- Sechs Attribute (STR, VIT, AGI, INT, PER, CHA), die durch echtes Verhalten trainiert werden, plus freie Statuspunkte pro Level
- HP und MP aus Schlaf, Wasser, Schritten, Stimmung und Meditation
- Daily Quest mit Countdown, Streak und Strafzone bei Nichterfüllung
- Tägliche Login-Kiste, System-Benachrichtigungen, Level-Up- und Loot-Animationen

**Quests**
- Tägliche, wöchentliche, Story- und eigene Quests
- Gedrückt halten zum Abschließen
- Wasser, Schritte, Workout, Schlaf, Kleiderschrank und Wohnung zählen automatisch

**Inventar**
- Tasche mit Seltenheiten von Gewöhnlich bis Mythisch
- Ausrüstung mit sechs Slots und Stat-Boni
- Shop mit Gold und Kristallen, dazu eigene echte Belohnungen (z. B. Bubble Tea für 250 Gold)
- Fusion: 3 Items gleicher Seltenheit ergeben 1 Item der nächsten Stufe
- Erfolge mit freischaltbaren Titeln

**Wohnung in 3D**
- Puppenhaus-Ansicht mit fünf Räumen, Raum antippen zum Hineinzoomen
- „Was ist wo?" und „Was es braucht" pro Raum, To-dos direkt auf die Einkaufsliste
- Sauberkeit pro Raum mit Staub-Visuals, Aufräumen gibt XP
- Kühlschrank mit Haltbarkeit, Gefrierfach, Vorrat und Einkaufsliste
- Smart-Home-Demo: Lampen, Rollo, Speaker, Heizung und Saugroboter steuern die 3D-Szene

**Style Studio**
- Kleidung fotografieren: Farbe und Stoff werden automatisch erkannt
- 3D-Modell zum Anprobieren, Stoff-Textur aus dem Foto
- Outfit-Vorschläge nach Anlass, Wetter (optional live) und Farbharmonie
- Lücken-Analyse für die Capsule Wardrobe mit Such-Links zu Zalando, H&M, Zara, ASOS, Vinted und Pinterest
- Outfits speichern, „Heute tragen" loggen

**Life & Health**
- Wasser, Schritte, Workout, Schlaf, Stimmung
- Atem-Timer für Meditation
- 7-Tage-Charts und Habit-Streaks

**Design**
- Drei Themes: Matcha (Standard), Pastell und Night
- Alle Daten bleiben lokal im Browser (IndexedDB). Export und Import als JSON in den Einstellungen.

## Entwickeln

```bash
npm install
npm run dev      # lokaler Dev-Server
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
```

## Als App nutzen

- **Website:** https://ohfab.github.io/gamifly/ – der Workflow in `.github/workflows/deploy.yml` veröffentlicht die App bei jedem Push auf `main` über GitHub Pages (Quelle: *Settings → Pages → Source* „GitHub Actions").
- **Handy:** Seite im Browser öffnen und „Zum Home-Bildschirm" wählen. Danach startet Gamifly wie eine App und funktioniert offline.

## Tech

React 19, TypeScript, Vite, Three.js mit React Three Fiber und Drei, Framer Motion, Zustand.

## Ideen für später

- Sync zwischen Geräten mit Login
- Echte Smart-Home-Anbindung über Home Assistant oder Matter
- Grundriss-Editor für die eigene Wohnung
- Schritte und Schlaf aus Apple Health oder Google Fit
- Freistellen von Kleidungsfotos für realistischere Anprobe
- App-Store-Version über Capacitor
