# Quizlet

Host multiplayer quizzes from JSON files in `data`, or create a quick live poll. Participants join by link or QR code and respond on their own devices.

## Installation and run

Requires Node.js 20.9+ and npm.

1. Install dependencies: `npm install`.
2. Create a local environment file: `cp .env.example .env.local`.
3. Set `QUIZ_ADMIN_PASSWORD` in `.env.local` to a long, private password. The file is ignored by Git.
4. Build and start the server: `npm run build`, then `npm run start`.
5. Open the printed `Visit: http://<ip>:<port>` link and sign in.

- Use `npm run dev` while editing. Use the production build for hosting; it uses less CPU. Rebuild after code changes.
- The terminal prints the visit link and application errors, but suppresses routine request logs.
- In VS Code, Ctrl+click the visit link to open it in your browser. The included `.vscode/settings.json` keeps localhost links external too.

## Configure quizzes

- Create a category folder inside `data`, then add one `.json` file per quiz: `data/<category>/<quiz>.json`.
- Every folder is a category, including empty folders. Every JSON file is discovered automatically; no path list or config file is needed.
- Each category gets a repeatable icon and color gradient based on its position in the sorted folder list.
- Quiz IDs follow the path: `<category>/<quiz>`.

Each quiz file needs:

- `name` (string) and an optional `description` (string).
- A nonempty `questions` array. Each question has a `body` and 2–4 `choices`.
- Each choice has a `body` and `is_correct` boolean. Exactly one choice per question must be correct.

Open **Instructions** on the dashboard for a copyable two-question JSON template. Refresh Home after adding or editing quizzes; no rebuild or server restart is needed for data changes.

## Quiz settings

- Select **Settings** in the admin navigation to set the choice reveal delay (0–20 seconds, default 5) and answer time (10–100 seconds, default 20).
- Select **Save settings** to persist them in `.quiz-settings.json`. This local file is ignored by Git.
- Changes apply to newly hosted rooms. A room keeps the timing it had when it was created.

## Host a game

- Sign in, choose a category and quiz, then select **Host this quiz**.
- Share the four-digit room code, player link, or QR code. Players do not need an admin password.
- **Cancel quiz** in the waiting room ends that room and tells joined players to scan a new QR code.
- Reveal answers to see the vote distribution. **Return to home** after the results closes the room and frees its code.

## Quick polls

- Select **Create a poll** on Home. Enter a question of up to 500 characters, choose **Multiple choice**, and add 2–8 options of up to 200 characters each. Select **Create poll** to open a live poll and QR link.
- Participants select one option and submit. The host sees the response count and option chart update live.
- **End poll** stops new votes and shows results on participant screens. Then **Close and go home** or **Modify poll** to use the same question and options as a new draft.
- One submission is allowed per browser per poll. The anonymous browser cookie works across polls, so voting in one poll does not prevent voting in another. Without participant accounts, clearing cookies or using another browser can allow another submission.
- Polls and responses live in server memory and are lost on restart. Ended polls remain available for one hour; closed polls remain available to participants for ten minutes.

## Network, security, and sessions

- By default, hosting through localhost generates player links and QR codes with a LAN IPv4 address. Players must be on the same network, with the server port reachable.
- If the selected address is wrong, edit the player link in the lobby or set `QUIZ_JOIN_HOST`, for example: `QUIZ_JOIN_HOST=192.168.1.25 npm run start`.
- Use local HTTP only on a trusted network. Use HTTPS if the admin signs in over an untrusted network; HTTP does not encrypt the password.
- Admin sessions last seven days. **Sign out** on the dashboard. Restarting after a password change invalidates existing sessions.
- Keep `QUIZ_ADMIN_PASSWORD` on the server; do not use a `NEXT_PUBLIC_` prefix.
- Run one persistent server instance. Games and polls live in memory, so restarting ends them. Idle rooms expire after six hours without a connected client or request.
- The host token stays in the browser that created the room; use that browser to host the game.

## Checks

```sh
npm run typecheck
npm run build
npm audit
```
