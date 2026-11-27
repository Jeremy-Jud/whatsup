# WhatsUp – Hinweise für Claude

Antworten an den Nutzer auf Deutsch.

## Grundregel: Zuerst WhatsUp Studio, dann Release

Jede Änderung an der App (`src/`, `main.js`, `preload.js`, `web/`, `scripts/build-web.js`) geht **zuerst in die Test-App „WhatsUp Studio“**, nie direkt in ein Release.

1. Auf einem eigenen Branch arbeiten. **Nie ungefragt nach `main` pushen**: Ein Push auf `main` veröffentlicht sofort die Web-Version (GitHub Pages).
2. `npm test`, dann `npm run studio`:
   - baut „WhatsUp Studio“ für Windows und installiert es auf diesem PC neben WhatsUp (beendet dabei nur Studio, nie WhatsUp),
   - lädt die Web-Version hoch – Link fürs Handy: **https://whatsup-studio.whatsup-relay.workers.dev/**
   - Nur eins davon: `npm run studio:win` bzw. `npm run studio:web`.
3. Dem Nutzer sagen, was er in Studio testen soll.
4. Erst wenn der Nutzer ausdrücklich sagt, dass veröffentlicht werden soll: Release wie unten.

WhatsUp Studio = gleiches WhatsUp mit violettem Logo, eigenem Test-Konto und eigenen Daten:
- Windows: Programm `%LOCALAPPDATA%\Programs\whatsup-studio`, Daten `%APPDATA%\Chatbox-Studio` (WhatsUp: `…\Programs\whatsup`, `%APPDATA%\Chatbox`). Keine Updates aus dem normalen Kanal.
- Web: eigener Cloudflare Worker „whatsup-studio“ (`studio/wrangler.jsonc`), eigene Adresse = eigener Speicher im Browser. **Passwortgeschützt** (`studio/worker.js`): Nur der Nutzer soll hinein. Das Passwort setzt der Nutzer selbst (`npx wrangler secret put STUDIO_PASSWORD --name whatsup-studio` im Ordner `relay/`); ohne Passwort ist der Link gesperrt. Das Passwort nie selbst setzen, erfragen oder anzeigen.
- Erkennung: `package.json` der App hat `studio: true` (scripts/studio.js) bzw. `window.WHATSUP_STUDIO` (build-web.js `--studio`).
- Violette Symbole neu erzeugen, falls sich das Logo ändert: `scripts/make-studio-icons.ps1`.

## Release (nur nach ausdrücklichem OK)

1. `npm version X.Y.Z --no-git-tag-version`, Commit „vX.Y.Z“, PR nach `main`, mergen (Merge-Commit).
2. Auf dem Stand von `main`: `npm ci` (echte Installation – `node_modules` darf keine Junction/Verknüpfung sein, sonst fehlen Abhängigkeiten im Paket und die App stürzt beim Start ab), dann `npm run dist`.
3. Vor dem Hochladen prüfen: `dist/win-unpacked/resources/app.asar` enthält alle Abhängigkeiten von `electron-updater` (fs-extra, js-yaml, builder-util-runtime …) und `latest.yml` hat die neue Version.
4. GitHub-Release `vX.Y.Z`, Titel „WhatsUp vX.Y.Z“, als **Latest**; Dateien: `WhatsUp-Setup.exe`, `WhatsUp.exe`, `latest.yml`, `WhatsUp-Setup.exe.blockmap`, `SHA256SUMS.txt`; SHA-256-Prüfsummen auch im Text. Die Vorabversion `promo-video-1` bleibt Vorabversion.
5. Prüfen: Downloads über `releases/latest/download/…`, GitHub-Pages-Deploy erfolgreich, Web-Version liefert die neue Version aus.

## Sonstiges

- Briefkasten-Server (Offline-Zustellung, Push, TURN-Zugang): `relay/` (Cloudflare Worker „whatsup-relay“). TURN für Anrufe braucht die Secrets `TURN_KEY_ID` und `TURN_KEY_TOKEN` (Cloudflare Realtime) – die setzt der Nutzer selbst.
- Spieleserver (Kritzelpost): `games/` (eigener Worker „whatsup-games“, Durable Object pro Spiel). Hochladen im Ordner `games/` mit `node ../relay/node_modules/wrangler/bin/wrangler.js deploy`. Er holt die Schlüssel der Spieler über ein Service Binding vom Briefkasten-Server (Worker desselben Kontos können sich nicht über workers.dev aufrufen). Studio und echte App nutzen denselben Spieleserver.
- Tests: `npm test`. Web-Version bauen: `npm run build:web`.
