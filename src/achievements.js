/* Erfolge: [id, Icon, Titel, Beschreibung, Statistik-Feld, Ziel] */
window.CHATBOX_ACHIEVEMENTS = [
  ['msg1', '💬', 'Erste Worte', 'Schicke deine erste Nachricht', 'sent', 1],
  ['msg25', '✉️', 'Plaudertasche', 'Schicke 25 Nachrichten', 'sent', 25],
  ['msg100', '📨', 'Vielschreiber', 'Schicke 100 Nachrichten', 'sent', 100],
  ['msg500', '🗣️', 'Quasselstrippe', 'Schicke 500 Nachrichten', 'sent', 500],
  ['msg1000', '👑', 'Chat-Legende', 'Schicke 1000 Nachrichten', 'sent', 1000],
  // Schaltet WhatsUp Pro frei, gratis (siehe pro in app.js; der Server zählt die Besitzer dieses Erfolgs als Pro)
  ['msg10000', '⭐', 'WhatsUp Pro', "Schicke 10'000 Nachrichten", 'sent', 10000],
  ['friend1', '🤝', 'Erster Freund', 'Füge einen Freund hinzu', 'friends', 1],
  ['friend5', '👥', 'Beliebt', 'Habe 5 Freunde', 'friends', 5],
  ['friend10', '🌟', 'Social Star', 'Habe 10 Freunde', 'friends', 10],
  ['img1', '📷', 'Schnappschuss', 'Schicke dein erstes Bild', 'images', 1],
  ['img25', '🖼️', 'Galerie', 'Schicke 25 Bilder', 'images', 25],
  ['gif1', '🎞️', 'Bewegte Bilder', 'Schicke dein erstes GIF', 'gifs', 1],
  ['gif10', '🕺', 'GIF-Meister', 'Schicke 10 GIFs', 'gifs', 10],
  ['emoji10', '😄', 'Gefühlvoll', 'Schicke 10 Emojis', 'emojis', 10],
  ['emoji100', '😂', 'Emoji-König', 'Schicke 100 Emojis', 'emojis', 100],
  ['group1', '🏠', 'Gründer', 'Erstelle eine Gruppe', 'groupsCreated', 1],
  ['group50', '🎉', 'Partytalk', 'Schicke 50 Nachrichten in Gruppen', 'groupSent', 50],
  ['recv100', '📥', 'Gefragt', 'Empfange 100 Nachrichten', 'received', 100],
  ['avatar', '🖌️', 'Neues Gesicht', 'Lege ein Profilbild fest', 'avatarSet', 1],
  ['frame', '🐱', 'Stylisch', 'Wähle einen Profilrahmen', 'frameSet', 1],
  ['status1', '🌅', 'Mein Tag', 'Teile deinen ersten Status', 'statuses', 1],
  ['call1', '📞', 'Hallo?', 'Führe deinen ersten Anruf', 'calls', 1],
  ['voice1', '🎤', 'Gut zu hören', 'Schicke deine erste Sprachnachricht', 'voices', 1],
  ['fire3', '🔥', 'Feuer gefangen', 'Halte mit jemandem einen 3-Tage-Streak', 'maxFire', 3],
  ['fire30', '🌋', 'Unaufhaltsam', 'Halte mit jemandem einen 30-Tage-Streak', 'maxFire', 30],
  ['night', '🦉', 'Nachteule', 'Schreibe zwischen 0 und 4 Uhr nachts', 'night', 1],
  ['early', '🐦', 'Frühaufsteher', 'Schreibe zwischen 5 und 7 Uhr morgens', 'early', 1],
  ['streak3', '🔥', 'Dranbleiben', 'Chatte 3 Tage am Stück', 'maxStreak', 3],
  ['streak7', '☄️', 'Wochenserie', 'Chatte 7 Tage am Stück', 'maxStreak', 7],
  ['game1', '🎮', 'Spielkind', 'Spiele ein Mini-Spiel im Chat zu Ende', 'gamesPlayed', 1],
  ['win5', '🏅', 'Seriensieger', 'Gewinne 5 Mini-Spiele', 'gamesWon', 5],
  ['quiz1m', '💰', 'Millionär', 'Gewinne im Millionen-Quiz die Million', 'quizMillion', 1],
  ['all', '🏆', 'Komplettist', 'Schalte alle anderen Erfolge frei', 'unlockedOthers', 0], // Ziel: siehe unten
].map(([id, icon, title, desc, stat, goal]) => ({ id, icon, title, desc, stat, goal }));
// „Komplettist“ braucht alle anderen Erfolge – wächst automatisch mit, wenn neue dazukommen
window.CHATBOX_ACHIEVEMENTS.find((a) => a.id === 'all').goal = window.CHATBOX_ACHIEVEMENTS.length - 1;
