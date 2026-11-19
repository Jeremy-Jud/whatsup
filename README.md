<div align="center">

<img src="build/icon.png" width="110" alt="WhatsUp-Logo">

# WhatsUp

**Eine kleine Desktop-Chat-App. Freunde per Code adden und direkt chatten.**

Ohne Konto, ohne Telefonnummer, ohne Server, der deine Nachrichten speichert.

[![Download](https://img.shields.io/badge/Download-WhatsUp_Setup-1a8cff?style=for-the-badge&logo=windows)](https://github.com/Jeremy-Jud/whatsup/releases/latest/download/WhatsUp-Setup.exe)
[![Webseite](https://img.shields.io/badge/Webseite-Über_WhatsUp-555?style=for-the-badge&logo=googlechrome&logoColor=white)](https://jeremy-jud.github.io/whatsup/about/)

[![Release](https://img.shields.io/github/v/release/Jeremy-Jud/whatsup?label=Version)](https://github.com/Jeremy-Jud/whatsup/releases/latest)
[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-green)](LICENSE)
![Plattform](https://img.shields.io/badge/Plattform-Windows-blue)
![Electron](https://img.shields.io/badge/Electron-45-47848f?logo=electron)

</div>

---

## ⬇️ Download

**Empfohlen: [WhatsUp-Setup.exe](https://github.com/Jeremy-Jud/whatsup/releases/latest/download/WhatsUp-Setup.exe)** (Windows 10/11, 64-Bit)
- Doppelklick, und WhatsUp installiert sich in wenigen Sekunden (keine Admin-Rechte nötig).
- Auf dem Desktop und im Startmenü erscheint eine Verknüpfung.
- **Updates mit einem Klick** direkt in der App (Einstellungen → Updates).

**Ohne Installation: [WhatsUp.exe](https://github.com/Jeremy-Jud/whatsup/releases/latest/download/WhatsUp.exe)**
- Läuft direkt, z. B. vom USB-Stick. Der Start dauert etwa 15 Sekunden.
- Bei Updates öffnet die App die Download-Seite, die neue Version musst du selbst herunterladen.

Danach Namen eingeben und fertig. Du bekommst deinen eigenen **6-stelligen Code**.

> **„Der Computer wurde durch Windows geschützt“?**
> Die App ist (noch) nicht mit einem kostenpflichtigen Zertifikat signiert, deshalb warnt Windows SmartScreen.
> Klicke auf **„Weitere Informationen“** und dann auf **„Trotzdem ausführen“**.
> Prüfe vorher am besten die [SHA-256-Prüfsumme](#-prüfsumme-checken) der Datei.

Alle Versionen findest du unter [**Releases**](https://github.com/Jeremy-Jud/whatsup/releases).

Mehr über WhatsUp findest du auf der Webseite: **[jeremy-jud.github.io/whatsup/about](https://jeremy-jud.github.io/whatsup/about/)**

### 📱 iPhone & iPad

WhatsUp läuft auch im Browser: **[jeremy-jud.github.io/whatsup](https://jeremy-jud.github.io/whatsup/)**

1. Den Link in **Safari** öffnen.
2. Auf **Teilen** (Viereck mit Pfeil) → **„Zum Home-Bildschirm“** tippen.
3. WhatsUp vom Home-Bildschirm starten. Es läuft dann im Vollbild wie eine eigene App.

Die Web-Version chattet direkt mit der Windows-App. **Jedes Gerät hat aber seinen eigenen Code:** Dein iPhone bekommt einen anderen Code als dein PC, und Chats und Freunde werden nicht zwischen den Geräten übertragen. Deine Freunde müssen deinen iPhone-Code also extra adden.

iPhone und iPad pausieren Apps im Hintergrund. Nachrichten, die in der Zwischenzeit kommen, warten verschlüsselt im Briefkasten (siehe [Offline-Zustellung](#-offline-zustellung)) und erscheinen beim nächsten Öffnen.
Damit du sie mitbekommst, schalte in WhatsUp unter **Einstellungen → Benachrichtigungen** die Benachrichtigungen ein. Dann bekommst du eine **Push-Benachrichtigung**, auch wenn WhatsUp geschlossen ist, auf dem Sperrbildschirm und in der Mitteilungszentrale (ab iOS 16.4, nur vom Home-Bildschirm aus).
Mit **Test senden** kommt nach 5 Sekunden ein echter Test-Push über den Server. Sperr in der Zeit dein Handy, dann siehst du, wie er auf dem Sperrbildschirm aussieht.

> Auf Android und am PC zeigt die Push-Benachrichtigung das Profilbild des Absenders. iPhone und iPad zeigen bei Web-Apps immer das App-Symbol; das Profilbild kann Apple dort nur bei Apps aus dem App Store anzeigen.

## ✨ Funktionen

| | |
|---|---|
| 🪟 **Mini-Fenster** | Kompaktes, rahmenloses Fenster (380 × 600), mit 📌 immer im Vordergrund |
| 🔑 **Freundescode** | Jeder bekommt einen eigenen Code wie `K7M2QX`. Code eingeben, schon seid ihr verbunden |
| ⚡ **Echtzeit-Chat** | Nachrichten gehen direkt von PC zu PC (Peer-to-Peer) |
| 👥 **Gruppenchats** | Gruppen erstellen, Freunde hinzufügen, umbenennen, verlassen. Mit Gruppenbild und Beschreibung |
| 📷 **Bilder & GIFs** | Über 📎, mit Strg+V, per Drag & Drop oder aus dem Windows-Emoji-Feld (Win + .). GIFs bis 25 MB, Bilder werden automatisch verkleinert |
| 📄 **Dateien** | PDFs, Word, ZIP und alles andere bis 25 MB über 📎, Strg+V oder Drag & Drop. Bei Programmdateien (.exe, .bat …) warnt WhatsUp vor dem Speichern |
| 🎞️ **GIF-Suche** | GIFs von GIPHY direkt im Emoji-Feld suchen (😊 → Reiter „GIF“). Suchbegriffe gehen an GIPHY, abschaltbar in den Einstellungen |
| ✍️ **„schreibt…“** | Du siehst, wenn jemand gerade tippt, im Chat und in der Chatliste. In den Einstellungen abschaltbar |
| ↪️ **Weiterleiten** | Nachrichten, Bilder und Dateien an einen oder mehrere Chats weiterleiten (Rechtsklick bzw. gedrückt halten) |
| 🔍 **Suche** | Über der Chatliste alle Chats und Nachrichten durchsuchen, mit der Lupe im Chat nur diesen Chat. Groß/klein und Akzente egal |
| ⏱ **Verschwindende Nachrichten** | Pro Chat einschaltbar: Neue Nachrichten verschwinden nach 24 Stunden, 7 oder 90 Tagen, bei allen im Chat |
| 💾 **Backup** | Profil, Freunde, Chats, Bilder und Dateien als passwortgeschützte Datei sichern und beim Einrichten wiederherstellen |
| 🎮 **Mini-Spiele** | Tic-Tac-Toe und Schere, Stein, Papier direkt im Chat (＋ → Spiel). In Gruppen wählst du deinen Gegner, die anderen schauen zu. Bei Schere, Stein, Papier siehst du die Wahl des anderen erst nach deiner eigenen |
| 💰 **Millionen-Quiz** | 15 Fragen von leicht bis schwer, Geldleiter bis 1 Million mit Sicherheitsstufen bei 500 und 16 000 Fr. und drei Joker (50:50, Publikum, Anruf). Alle im Chat spielen für sich, wer am meisten Geld hat, gewinnt. Gestellte Fragen kommen erst wieder, wenn du alle Fragen einer Stufe gesehen hast |
| 🕓 **Nachrichten planen** | Nachricht schreiben, ＋ → Nachricht planen und eine Zeit wählen (z. B. „Morgen 7:00“). Gesendet wird, wenn WhatsUp zu der Zeit läuft, auch im Hintergrund, sonst beim nächsten Start |
| @ **Erwähnungen** | In Gruppen @ tippen und jemanden auswählen, oder @alle. Erwähnte bekommen eine eigene Benachrichtigung und ein @ in der Chatliste |
| 🔳 **QR-Code** | Deinen Code als QR-Code zeigen (Symbol neben deinem Code) und den deines Freundes mit der Kamera scannen (Symbol im Feld „Code hinzufügen“). Mit der Handy-Kamera gescannt öffnet sich die Web-Version und fragt, ob ihr Freunde werden wollt |
| 📅 **Wochenrückblick** | Deine Woche in Zahlen: gesendete Nachrichten, Top-Chats, Lieblings-Emoji, aktivster Tag. Montags erscheint ein Hinweis über der Chatliste, sonst unter Einstellungen → Chats. Wird nur auf deinem Gerät berechnet |
| 🔐 **Sicherheitsnummer** | Wie bei Signal: 60 Ziffern mit einem Freund vergleichen, um sicherzugehen, dass niemand dazwischensitzt |
| 🧹 **Chat leeren** | Verlauf eines Chats löschen und Speicher freigeben. Übersicht aller Chats nach Größe in den Einstellungen |
| 🌅 **Status** | Wie bei WhatsApp: ein oder mehrere Bilder mit Beschreibung teilen, 24 Stunden sichtbar. Ansehen als Slides (tippen, wischen, gedrückt halten = Pause), Reaktionen mit Emojis, „Angesehen von“ für deine eigenen Status |
| 🎤 **Sprachnachrichten** | Mikrofon-Knopf im Chat (erscheint, wenn das Eingabefeld leer ist). Aufnahme mit Live-Pegel, verwerfen oder senden. Abspielen mit Wellenform, Vorspulen per Tippen und 1×/1,5×/2× Tempo. Funktioniert zwischen Windows, iPhone und Browser |
| 🎁 **Codes einlösen** | Unter Erfolge Codes eingeben und exklusive Profilrahmen (Flammen, Galaxie, Lorbeerkranz, Regenbogen, Diamant) oder Status-Banner freischalten. Alle Codes: [CODES.md](CODES.md) |
| 🔥 **Streaks** | Wie bei Snapchat: Schreibt ihr euch im Einzelchat jeden Tag beide mindestens eine Nachricht, wächst der Streak (🔥12 hinter dem Namen).  Kurz vor Mitternacht warnt ⏳ und eine Erinnerung; verpasst ihr einen Tag, ist der Streak weg |
| 🩷 **Sticker** | Exklusiv für einen Nutzer: Sticker aus eigenen Bildern erstellen (rund, eckig oder ganzes Bild, Größe, Text), speichern und senden. Alle anderen sehen die Sticker nur und können sie weder speichern noch benutzen |
| 📞 **Anrufe** | Sprach- und Videoanrufe im Einzelchat, direkt verschlüsselt zwischen den Geräten. Eigenes Bild klein in der Ecke (verschiebbar, antippen zum Tauschen), Kamera drehen, stummschalten, Kamera aus. Verpasste Anrufe stehen im Chat |
| 🧭 **Leiste unten** | Status links, Chats in der Mitte, Einstellungen („Du“) rechts |
| 📱 **Web-Version** | Für iPhone, iPad und Android, chattet direkt mit der Windows-App |
| 😊 **Emojis** | Emoji-Auswahl mit Kategorien und „Zuletzt benutzt“. Nachrichten nur aus Emojis werden groß angezeigt |
| 🏆 **Erfolge** | 32 Erfolge zum Freischalten, z. B. 25 Nachrichten, erstes GIF, Nachteule, 7 Tage am Stück oder 5 gewonnene Mini-Spiele |
| 🖼️ **Profil** | Profilbild, Name und Status. Deine Freunde sehen dein Bild und deine Erfolge |
| 🐱 **Profilrahmen** | 11 Rahmen fürs Profilbild: Katzenohren, Hasenohren, Teufelshörner, Heiligenschein, Krone, Partyhut, Kopfhörer, Blumenkranz, Herzen, Funkeln, Neon |
| 🎨 **Designs** | Unter Du → Personalisieren: **Liquid Glass** (schwebende Glasleisten, die Licht brechen, bewegter Farbhintergrund, hell & dunkel) und bewegte Welten: 🌌 Galaxy mit Sternschnuppen, 🌆 Synthwave, 🐠 Tiefsee, 🌸 Kirschblüte, ❄️ Winterzauber, ✨ Glühwürmchen, 🫧 Lavalampe, ⛈️ Gewitter, 🌅 Abendrot, 🪙 Goldstaub. Dazu das gewohnte Standard-Design |
| 🔔 **Benachrichtigungen** | Windows-Benachrichtigungen wie bei Teams/Discord mit Profilbild. Ein Klick öffnet den Chat. Roter Zähler am Taskleisten-Icon |
| ↩️ **Direkt antworten** | Wie bei Teams direkt in der Benachrichtigung antworten, ohne WhatsUp zu öffnen. `Enter` sendet, `Shift+Enter` macht eine neue Zeile (eigenes Benachrichtigungsfenster unten rechts, in den Einstellungen abschaltbar) |
| 🖥️ **Hintergrund** | ✕ schließt nicht, WhatsUp läuft unten rechts im Infobereich weiter. Optional mit Windows starten |
| ⚙️ **Einstellungen** | Profil, Hell/Dunkel, Benachrichtigungen, immer im Vordergrund |
| 🔄 **Updates** | In der App nach Updates suchen und direkt installieren |
| 🌓 **Minimalistisch** | Schlichtes Design, hell oder dunkel passend zu Windows |
| 🟢 **Online-Status** | Du siehst, wer gerade online ist |
| 🔔 **Benachrichtigungen** | Desktop-Meldung und blinkende Taskleiste bei neuen Nachrichten |
| ✓✓ **Zustellstatus** | 🕓 wartet · ✓ gesendet · ✓✓ angekommen · blaue ✓✓ gelesen. „Info“ zeigt, wer wann gelesen hat |
| 📬 **Warteschlange** | Nachrichten an Offline-Freunde werden automatisch zugestellt, sobald ihr beide online seid |
| 💾 **Lokaler Verlauf** | Chats bleiben nur auf deinem Gerät gespeichert, in der Windows-App verschlüsselt |

## 🚀 So benutzt du WhatsUp

1. **Code teilen:** Oben steht dein Code. Mit **Kopieren** kannst du ihn einem Freund schicken.
2. **Freund adden:** Den Code deines Freundes ins Feld eingeben und auf **Adden** klicken, oder seinen QR-Code scannen.
   Dein Freund sieht dich danach automatisch auch in seiner Liste.
3. **Chatten:** Auf den Namen klicken und lostippen. Mit `Enter` sendest du die Nachricht.
   Mit 😊 wählst du Emojis aus, mit 📎 schickst du Bilder oder GIFs. Du kannst Bilder auch einfügen (Strg+V) oder ins Fenster ziehen.
4. **Gruppe:** Auf **＋ Gruppe** klicken, einen Namen eingeben und Freunde auswählen.
5. **Einstellungen:** Über das Zahnrad (oder einen Klick auf deinen Namen) änderst du Profilbild, Name, Status und Design und suchst nach Updates.
6. **Erfolge:** Über 🏆 oben rechts siehst du alle Erfolge und deinen Fortschritt.
7. **Infos & Entfernen:** Im Chat oben auf den Namen klicken. Dort kannst du Freunde entfernen oder Gruppen verwalten.

## 🔑 Auf einem neuen Gerät anmelden

Du hast schon ein Konto und willst WhatsUp auf einem anderen PC oder im Browser nutzen?

1. Auf dem neuen Gerät **„Ich habe schon ein Konto“** wählen und deinen Code eingeben.
2. Auf deinem bisherigen Gerät (WhatsUp muss dort geöffnet sein) erscheint ein **6-stelliger Bestätigungscode**.
3. Diesen Code auf dem neuen Gerät eingeben. Fertig: Profil, Freunde, Gruppen, Chats und Bilder ziehen mit um.

Gut zu wissen:
- Dein Konto kann immer nur auf **einem** Gerät gleichzeitig angemeldet sein. Das bisherige Gerät wird nach dem Umzug abgemeldet.
- Gib den Bestätigungscode **niemals** an jemand anderen weiter. Wer ihn hat, übernimmt dein Konto.
- Nach 3 falschen Codes oder bei „Das war ich nicht“ sind Anmeldungen 10 Minuten gesperrt. Der Code gilt 5 Minuten.

## 💾 Backup

Ist dein altes Gerät kaputt oder weg, hilft ein Backup:

1. **Erstellen:** Einstellungen („Du“) → **Backup** → **Erstellen**. Passwort ausdenken (mind. 8 Zeichen) und die `.whatsup`-Datei gut aufheben.
2. **Wiederherstellen:** Auf dem neuen Gerät beim Einrichten **„Backup wiederherstellen“** wählen, Datei auswählen und Passwort eingeben.

Gut zu wissen:
- Das Backup ist mit deinem Passwort verschlüsselt (PBKDF2 + AES-256-GCM). **Ohne das Passwort kann es niemand öffnen, auch du nicht.**
- Es enthält auch den Schlüssel für die Offline-Zustellung. Beim ersten Backup bekommt dein Konto deshalb einen neuen Schlüssel, und deine Freunde sehen einmalig, dass sich deine Sicherheitsnummer geändert hat.
- Läuft dein Konto noch auf einem anderen Gerät, nimm stattdessen „Ich habe schon ein Konto“ (siehe oben). Ein Konto kann nur auf einem Gerät gleichzeitig laufen.

## 📬 Offline-Zustellung

Sind beide online, gehen Nachrichten wie bisher **direkt von Gerät zu Gerät**.
Ist dein Freund offline, landet die Nachricht **Ende-zu-Ende-verschlüsselt** in seinem Briefkasten auf einem kleinen Server (Cloudflare). Sobald er WhatsUp öffnet, wird sie abgeholt und vom Server gelöscht. Dann siehst du ✓✓.

- Funktioniert für Nachrichten, Bilder, GIFs, Gruppen und Freundschaftsanfragen
- Ungelesene Nachrichten werden nach 30 Tagen automatisch gelöscht
- Lässt sich unter **Einstellungen → Offline-Zustellung** ausschalten (dann wieder nur direkt)
- Der Server-Code liegt im Ordner [`relay/`](relay/)

## 🔒 Sicherheit & Datenschutz

- **Verschlüsselte Direktverbindung:** Nachrichten laufen über WebRTC-Datenkanäle, die immer mit DTLS verschlüsselt sind.
- **Verschlüsselter Briefkasten:** Für die Offline-Zustellung hat jedes Gerät eigene Schlüssel (P-256), die das Gerät nie verlassen. Jede Nachricht wird mit einem Einmal-Schlüssel und AES-256-GCM verschlüsselt und vom Absender signiert. Der Server kann Nachrichten weder lesen noch fälschen, und nur der Besitzer des Codes kann seinen Briefkasten abholen.
- **Signalisierung:** Der öffentliche [PeerJS](https://peerjs.com)-Server hilft nur beim *Verbindungsaufbau*. Deine Nachrichten bekommt er nie zu sehen.
- **Keine Konten, kein Tracking:** Es gibt keine Telemetrie und keine Werbung. Deine Kontakte bekommen nur Name, Status, Profilbild und die Anzahl deiner Erfolge.
- **Sicherheitsnummer:** In der Chat-Info (oben auf den Namen tippen) lässt sich wie bei Signal eine 60-stellige Nummer mit dem Freund vergleichen. Ändert sich der Schlüssel (neues Gerät, Backup), steht ein Hinweis im Chat.
- **Verschlüsselter Verlauf (Windows):** Chats, Bilder und Dateien liegen verschlüsselt (AES-256-GCM) auf der Festplatte. Der Schlüssel ist mit Windows (DPAPI) an deinen Windows-Benutzer gebunden. In der Web-Version gibt es keinen solchen geschützten Speicher, dort bleibt der Verlauf unverschlüsselt im Browser.
- **Geprüfte Daten:** Empfangene Bilder werden nur als PNG, JPEG, GIF oder WebP angenommen und in der Größe begrenzt. Dateien werden immer als neutrale Daten gespeichert und nie in der App geöffnet. Texte werden nie als HTML dargestellt.
- **Entfernen sperrt:** Wenn du einen Freund entfernst, kann dieser Code dich nicht mehr erreichen, bis du ihn selbst wieder addest.
- **Gehärtete App:** Context Isolation, Sandbox, keine Node.js-Rechte im Fenster, eine strenge Content Security Policy, gesperrte Navigation, und alle Berechtigungen außer Benachrichtigungen werden abgelehnt.
- **Sichere Updates:** Updates kommen nur aus den offiziellen Releases dieses Repos über HTTPS. Vor der Installation wird die SHA-512-Prüfsumme geprüft.
- **Geprüfte Abhängigkeiten:** Dependabot und Secret Scanning sind aktiv.

Wichtig zu wissen:
- Wer deinen Code kennt, kann dich adden. Gib ihn also nur Leuten, mit denen du chatten willst.
- Bei einer direkten Verbindung sieht dein Chatpartner deine IP-Adresse. Das ist bei jeder Peer-to-Peer-Verbindung so.
- Der Chatverlauf liegt in deinem Windows-Benutzerprofil (`%APPDATA%\Chatbox`). Nachrichten, Bilder und Dateien sind verschlüsselt, Profil, Freundesliste und Einstellungen nicht. Wer an deinem angemeldeten Windows-Konto sitzt, kann WhatsUp öffnen und alles lesen.
- „schreibt…“ geht nur direkt an verbundene Chatpartner, nie über einen Server. Die GIF-Suche schickt deine Suchbegriffe an GIPHY und lädt die Vorschaubilder von dort.
- Verschwindende Nachrichten verschwinden nur bei Geräten mit WhatsUp ab Version 1.29. Screenshots oder Weiterleiten können sie trotzdem festhalten.
- In Gruppen verbinden sich alle Mitglieder direkt miteinander. Damit sehen auch Gruppenmitglieder, die du nicht geaddet hast, deine IP-Adresse.
- Der Briefkasten-Server sieht keine Inhalte, aber **Metadaten**: welcher Code wann wie große Nachrichten an welchen Code schickt, sowie IP-Adressen.

Sicherheitslücke gefunden? Bitte lies die [Sicherheitsrichtlinie](SECURITY.md).

## 🔍 Prüfsumme checken

So stellst du sicher, dass deine Datei nicht verändert wurde. Öffne PowerShell im Download-Ordner und gib ein:

```powershell
Get-FileHash .\WhatsUp-Setup.exe -Algorithm SHA256
```

Das Ergebnis muss mit dem Wert übereinstimmen, der beim jeweiligen [Release](https://github.com/Jeremy-Jud/whatsup/releases) steht.

## 🛠️ Selbst bauen

Voraussetzung: [Node.js](https://nodejs.org) LTS

```bash
git clone https://github.com/Jeremy-Jud/whatsup.git
cd whatsup
npm install
npm start          # App im Entwicklermodus starten
npm test           # Tests ausführen (tests/)
npm run dist       # WhatsUp.exe in den Ordner dist/ bauen
npm run build:web  # Web-Version (iPhone/iPad) in den Ordner dist-web/ bauen
```

Die Web-Version wird bei jedem Push auf `main` automatisch auf GitHub Pages veröffentlicht (`.github/workflows/web.yml`).

**GIF-Suche einschalten:** Unter [developers.giphy.com](https://developers.giphy.com) kostenlos einen API-Schlüssel erstellen und in `src/app.js` bei `const GIPHY_KEY = '';` eintragen. Ohne Schlüssel ist der GIF-Reiter ausgeblendet.

> Unter Windows PowerShell funktioniert `npm` manchmal nicht, weil die Skriptausführung gesperrt ist. Nimm dann `npm.cmd install` und `npm.cmd start`.

## 📁 Projektaufbau

```
whatsup/
├── main.js          # Electron-Hauptprozess (Fenster, Sicherheit)
├── preload.js       # Sichere Brücke für Fenster-Buttons
└── src/
    ├── index.html   # Oberfläche
    ├── style.css    # Design
    ├── app.js       # Chat-Logik (PeerJS, Freunde, Gruppen, Bilder, Profil)
    ├── lib.js       # Reine Hilfsfunktionen (Suche, Dateien, Timer, Sicherheitsnummer, Verschlüsselung), getestet
    ├── qr.js        # QR-Code-Generator ohne Bibliothek, getestet
    ├── quiz-questions.js # Fragen für das Millionen-Quiz
    ├── vendor/jsQR.js   # QR-Scanner (jsQR, Apache-2.0), wird erst beim Scannen geladen
    ├── emojis.js    # Emoji-Auswahl
    └── achievements.js  # Liste der Erfolge
tests/               # Tests für src/lib.js, src/qr.js und die Quizfragen (npm test)
web/                 # Nur Web-Version: Ersatz für preload.js, iPhone-Design, Manifest, Icons
scripts/build-web.js # Baut die Web-Version aus src/ + web/
relay/               # Briefkasten-Server (Cloudflare Worker): npm install && npx wrangler deploy
```

## 🗺️ Ideen für später

- [x] Gruppenchats
- [x] Bilder & GIFs senden
- [x] Emoji-Auswahl
- [x] Erfolge & Profilbilder
- [x] Reaktionen, Antworten und Löschen für alle
- [x] Sprachnachrichten, Sprach- und Videoanrufe
- [x] Status, UpReels, Umfragen, Ranglisten und Wochen-Challenges
- [x] Lesebestätigungen
- [x] GIF-Suche
- [x] Dateien senden
- [x] „schreibt…“-Anzeige
- [x] Weiterleiten
- [x] Suche in Chats
- [x] Verschwindende Nachrichten
- [x] Backup & Wiederherstellen
- [x] Sicherheitsnummer
- [x] Verschlüsselter lokaler Verlauf (Windows)
- [x] Mini-Spiele, geplante Nachrichten, @Erwähnungen, QR-Code, Wochenrückblick
- [x] Millionen-Quiz im Chat
- [ ] Mehrere Geräte gleichzeitig (z. B. PC und iPhone mit demselben Code)
- [ ] Gruppenanrufe
- [ ] Bildschirm teilen in Anrufen
- [ ] macOS- und Linux-Version

## 📄 Lizenz

[MIT](LICENSE) © Jeremy-Jud

Der QR-Scanner [jsQR](https://github.com/cozmo/jsQR) in `src/vendor/` steht unter der Apache License 2.0 (`src/vendor/jsQR.LICENSE`).
