# Gamifly 🎀

Dein Alltag als RPG. Gamifly ist eine Web-App, die sich auch als App aufs Handy installieren lässt (PWA). Sie verbindet Wohnung, Style und Health mit einem echten Spielsystem im Stil von Solo Leveling.

## Features

**Lumi, dein System-Guide**
- Animiertes Maskottchen oben rechts: blinzelt, wippt, spricht und hört zu
- Spricht mit dir per Sprachausgabe (Stimme, Tempo und Tonhöhe einstellbar) und versteht Spracheingabe
- Versteht Deutsch offline: Wasser, Schritte, Workout, Schlaf und Stimmung eintragen, Tagesbriefing, „Was als Nächstes?“, Rezepte, Outfits, Aufräumen, neue Quests, Einkaufsliste, Erklärungen zu allem
- Optional mit Claude als Gehirn: eigener Anthropic-API-Schlüssel in Lumis Einstellungen, Lumi kann dann auch selbst Dinge in der App eintragen
- Kontext-Tipps in der Sprechblase, einmal pro Bereich und Tag

**Guide**
- Interaktive Tour mit Spotlight durch alle Bereiche, von Lumi erzählt
- Handbuch mit allen Systemen zum Nachlesen und Vorlesen

**Eigene Illustrationen**
- Über 200 handgezeichnete SVG-Illustrationen im Matcha-Stil statt Emojis: Items, Ausrüstung, Räume, Geräte, Kleidung, Lebensmittel, Stimmungen, Bosse und Erfolgsmedaillen

**Status & RPG-System**
- Level, XP-Kurve, Ränge E bis SS, Titel aus Erfolgen
- Sechs Attribute (STR, VIT, AGI, INT, PER, CHA), die durch echtes Verhalten trainiert werden, plus freie Statuspunkte pro Level
- HP und MP aus Schlaf, Wasser, Schritten, Stimmung und Meditation
- Daily Quest mit Countdown, Streak und Strafzone bei Nichterfüllung
- Tägliche Login-Kiste, System-Benachrichtigungen, Level-Up- und Loot-Animationen, Vibration auf dem Handy
- **Wochenboss:** fünf Bosse mit Schwächen, alles was du erledigst macht Schaden
- **Klassen ab Level 10:** Glow Monarch, Iron Bloom, Sage of Pages, Hearth Keeper mit XP-Bonus

**Quests**
- Tägliche, wöchentliche, Story- und eigene Quests, dazu eine Bonus-Quest pro Tag
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
- Rezeptvorschläge aus dem Kühlschrank, Fehlendes mit einem Tipp auf die Einkaufsliste

**Style Studio**
- Kleidung fotografieren: Farbe und Stoff werden automatisch erkannt
- 3D-Modell zum Anprobieren, Stoff-Textur aus dem Foto
- Outfit-Vorschläge nach Anlass, Wetter (optional live) und Farbharmonie
- Lücken-Analyse für die Capsule Wardrobe mit Such-Links zu Zalando, H&M, Zara, ASOS, Vinted und Pinterest
- Outfits speichern, „Heute tragen" loggen

**Life & Health**
- Wasser, Schritte, Workout, Schlaf, Stimmung
- Atem-Timer für Meditation
- **Fokus-Gates:** Konzentrations-Timer von Rang E (10 Min.) bis A (60 Min.) mit Loot
- 7-Tage-Charts, Aktivitätskalender über 12 Wochen und Habit-Streaks
- Abend-Reflexion mit Dankbarkeits-Tagebuch

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

React 19, TypeScript, Vite, Three.js mit React Three Fiber und Drei, Framer Motion, Zustand, Web Speech API, Anthropic SDK (optional, nur bei eigenem Schlüssel).

Alle Illustrationen ansehen: App mit `?artsheet` öffnen.

## Ideen für später

- Sync zwischen Geräten mit Login
- Echte Smart-Home-Anbindung über Home Assistant oder Matter
- Grundriss-Editor für die eigene Wohnung
- Schritte und Schlaf aus Apple Health oder Google Fit
- Freistellen von Kleidungsfotos für realistischere Anprobe
- App-Store-Version über Capacitor
