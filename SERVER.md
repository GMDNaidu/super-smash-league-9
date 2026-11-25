# Super Smash League 9.0 — no-Firebase version (one small server)

No Firebase, no config file, no accounts. One program serves the website, pushes live scores to everybody's phone, and accepts scoring only from people who know the scorer PIN. Scores are saved to `data.json` next to the program, so a restart keeps everything.

You need Node.js (free, https://nodejs.org — choose the LTS version). Nothing else to install.

## 1. Start it (2 minutes)
1. Unzip this folder.
2. Double-click `start-windows.bat` (Mac/Linux: `sh start-mac-linux.sh`). A window opens and asks you to type a scorer PIN (4+ characters). Type it and press Enter — no file editing needed.
3. Open http://localhost:3000 — the site is running. Scorers go to http://localhost:3000/#control and enter the PIN.

## 2. Let everyone open it — pick one

### A. Your laptop + a free Cloudflare tunnel (recommended for the tournament night)
Gives a public https link for anyone on any network. No account needed.
1. Install cloudflared: Windows `winget install --id Cloudflare.cloudflared` (or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). Mac: `brew install cloudflared`.
2. With the server running, open a second terminal and run:
   `cloudflared tunnel --url http://localhost:3000`
3. It prints a link like `https://random-words.trycloudflare.com`. That is your public link. Share it.
4. Keep both windows open and the laptop awake and plugged in. The link changes each time you restart the tunnel, so start it once before the first match and leave it running.

### B. Same campus Wi-Fi only (no internet tricks)
1. Find your laptop's IP address (Windows: `ipconfig` → IPv4; Mac: System Settings → Wi-Fi → Details).
2. Everyone on the same Wi-Fi opens `http://<that-IP>:3000`.
3. If it doesn't load, allow Node.js through the firewall when Windows asks. Some campus networks block device-to-device traffic; use option A then.

### C. A cloud host (always on, no laptop)
Works on Render, Railway, Koyeb or Fly.io: upload this folder to a GitHub repo, create a "Web Service" from it, start command `node server.js`, and add the environment variable `SCORER_PIN`.
Important: free tiers of most hosts (Render free, for example) have temporary storage and sleep when idle, so saved scores can be wiped on restart. Use a host with a persistent volume, or take a backup after every match (Control Room → Rules & data → copy the JSON) and import it back if the server restarts.

## 3. Running matches
- Scorer: `<link>/#control` → enter PIN → Live scoring → pick the match → toss, openers, bowler → tap runs after every ball (Wide / No ball / Bye / Leg bye first for extras, WICKET for dismissals, Undo for mistakes).
- Viewers just open the link. Live tab updates by itself within a second.
- Only one scorer per match at a time. To change the PIN, close the window and start again.

## 4. Test first
1. Start the server, open the link on two phones. Score a few balls on one with the PIN.
2. The other phone (not signed in) should update live.
3. Undo the test balls and set the match status back to upcoming, or delete `data.json` and restart for a clean slate.

## Security notes
- Anyone can read; only people with the PIN can write. Use a PIN that isn't guessable and share it only with scorers.
- If you expose it publicly, anyone who knows the link can try PINs; a long PIN (8+ characters) is sensible.
