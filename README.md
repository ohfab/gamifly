# Gamifly

Dein Alltag als RPG im Stil von Solo Leveling. Gamifly ist eine Web-App, die sich auch als App aufs Handy installieren lässt (PWA). Sie verbindet Wohnung, Style und Health mit einem echten Spielsystem: dunkle System-Fenster, Quests, Gates, Bosse, Ränge und Loot.

## Features

**Das System, dein Guide**
- Holografisches System-Emblem oben rechts, antwortet schriftlich im System-Fenster
- Spracheingabe per Mikrofon (keine Sprachausgabe)
- Versteht Deutsch offline: Wasser, Schritte, Workout, Schlaf und Stimmung eintragen, Tagesbriefing, „Was als Nächstes?“, Rezepte, Outfits, Aufräumen, Skills, neue Quests, Einkaufsliste, Erklärungen zu allem
- Optional mit Claude als Gehirn: eigener Anthropic-API-Schlüssel in den System-Einstellungen. Das System kann dann auch selbst Dinge eintragen und Skills auslösen
- Interaktive Tour mit Spotlight und ein Handbuch mit allen Systemen

**Status & RPG-System**
- Level, XP-Kurve, Ränge E bis SS, Titel aus Erfolgen
- Sechs Attribute (STR, VIT, AGI, INT, PER, CHA), trainiert durch echtes Verhalten, plus freie Statuspunkte
- HP aus Schlaf, Wasser und Schritten, MP (Mana) aus Stimmung und Meditation
- Daily Quest mit Countdown, Streak und Strafzone
- **Skills mit Mana:** Sprint (+50 % XP), Blutrausch (kritische Boss-Treffer), Tarnung (doppelte Gate-XP), Herrscher-Autorität (garantierter seltener Drop)
- **Wochenboss:** fünf Bosse mit Schwächen, alles was du erledigst macht Schaden
- **Schattenarmee:** nach einem Bosssieg mit „Erhebe dich“ den Schatten extrahieren. Jeder Schatten gibt einen dauerhaften Bonus und steigt im Rang
- **Red Gates:** tauchen unangekündigt auf. 90 Minuten für eine Mini-Mission, sonst kollabiert das Gate
- **Klassen ab Level 10** mit XP-Bonus

**Quests & Inventar**
- Tägliche, wöchentliche, Story-, Bonus- und eigene Quests, gedrückt halten zum Abschließen
- Wasser, Schritte, Workout, Schlaf, Kleiderschrank und Wohnung zählen automatisch
- Tasche mit Seltenheiten von Gewöhnlich bis Mythisch, Ausrüstung mit sechs Slots, Shop, Fusion, Erfolge

**Wohnung in 3D**
- 3D-Modell im Dungeon-Map-Look, generiert aus deinen Räumen: Wände, Türen, Fenster und passende Möbel je Raumtyp
- **Bauplan-Editor:** Foto oder Screenshot vom Grundriss hochladen, Maßstab an einer bekannten Wand kalibrieren, Räume aufziehen, verschieben und in der Größe ändern. Alternativ Vorlagen für 1, 2 oder 3 Zimmer
- Scrollen über der 3D-Ansicht scrollt die Seite. Seitlich wischen dreht, „3D erkunden“ gibt volle Kamerasteuerung mit Pinch-Zoom
- „Was ist wo?“ und „Was es braucht“ pro Raum, Sauberkeit mit Staub-Visuals
- Kühlschrank mit Haltbarkeit, Einkaufsliste und Rezeptvorschlägen
- Smart-Home-Demo: Lampen, Rollo, Speaker, Heizung und Saugroboter steuern die Szene

**Style Studio mit realistischer Anprobe**
- Kleidung fotografieren, die Farbe wird automatisch erkannt
- Realistischer 3D-Avatar (MakeHuman, CC0) mit fotobasierter Haut, echten Haaren, Wimpern, Augenbrauen und Augen
- Kleidung als angepasste 3D-Schnitte (T-Shirt, Oversized, Crop-Top, Longsleeve, Hemd, Bluse, Jeans, Stoffhose, Leggings, Shorts, A-Linien-Rock, Bleistiftrock, Kleid, Jacke, Mantel, Sakko, sechs Schuhmodelle, Hut) mit gescannten Stoffen (Poly Haven, CC0): Jersey, Denim, Satin, Strick, Wolle, Leder, Samt und mehr
- Kleidung wird mit einem Scan-Effekt angezogen, Röcke, Mäntel und lange Haare schwingen beim Drehen mit
- Atmung, Blinzeln, Blickkontakt und fünf Posen, Kameraansichten für Körper, Oberkörper, Gesicht und Schuhe
- Avatar-Editor: Körperbau, Größe, Statur, Muskeln, Oberweite, Hautton, Augenfarbe, Frisur, Haarfarbe, Augenbrauen
- Outfit-Vorschläge nach Anlass, Wetter und Farbharmonie, Lücken-Analyse mit Shop-Links

**Life & Health**
- Wasser, Schritte, Workout, Schlaf, Stimmung, Atem-Timer
- Fokus-Gates von Rang E (10 Min.) bis A (60 Min.) mit Loot
- Charts, Aktivitätskalender und Abend-Reflexion

**Design**
- Dunkle System-Oberfläche mit drei Akzenten: System (Blau), Monarch (Violett), Red Gate (Rot)
- Über 200 eigene SVG-Illustrationen statt Emojis
- Alle Daten bleiben lokal im Browser (IndexedDB). Export und Import als JSON in den Einstellungen

## Entwickeln

```bash
npm install
npm run dev      # lokaler Dev-Server
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
```

Testseiten: `?artsheet` zeigt alle Illustrationen, `?avatar&wear=tee,jeans,shoes06` rendert die Anprobe allein.

### Avatar-Assets neu bauen

Die Dateien unter `public/avatar/` werden aus freien CC0-Quellen erzeugt:

```bash
cd tools/avatar
./fetch_assets.sh            # MakeHuman (Basis, Rig, Targets, System-Assets) + Poly Haven (Stoffe, HDRI)
python3 -I build_avatar.py   # schreibt public/avatar/
```

## Als App nutzen

- **Website:** https://ohfab.github.io/gamifly/ – der Workflow in `.github/workflows/deploy.yml` veröffentlicht die App bei jedem Push auf `main` über GitHub Pages.
- **Handy:** Seite im Browser öffnen und „Zum Home-Bildschirm“ wählen. Danach startet Gamifly wie eine App und funktioniert nach dem ersten Laden auch offline.

## Tech

React 19, TypeScript, Vite, Three.js mit React Three Fiber und Drei, Framer Motion, Zustand, Web Speech API (nur Spracheingabe), Anthropic SDK (optional, nur bei eigenem Schlüssel).

## Credits

- Körper, Hauttexturen, Haare, Augen, Wimpern, Augenbrauen und Kleidungsschnitte: [MakeHuman](http://www.makehumancommunity.org) (CC0)
- Stoff-Scans und Studio-HDRI: [Poly Haven](https://polyhaven.com) (CC0)

## Ideen für später

- Sync zwischen Geräten mit Login
- Echte Smart-Home-Anbindung über Home Assistant oder Matter
- Schritte und Schlaf aus Apple Health oder Google Fit
- Foto-Prints und Muster von eigenen Kleidungsstücken direkt auf dem 3D-Schnitt
- App-Store-Version über Capacitor
