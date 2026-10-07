# Quiz Game

Host multiplayer quizzes from JSON files in `data`. Players join by link or QR code, answer on their own devices, and see the final leaderboard.

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

Use an existing JSON file in `data` as a template. Refresh the dashboard after adding or editing quizzes; no rebuild or server restart is needed for data changes.

## Host a game

- Sign in, choose a category and quiz, then select **Host this quiz**.
- Share the four-digit room code, player link, or QR code. Players do not need an admin password.
- Reveal answers to see the vote distribution. **Return to home** after the results closes the room and frees its code.

## Network, security, and sessions

- By default, hosting through localhost generates player links and QR codes with a LAN IPv4 address. Players must be on the same network, with the server port reachable.
- If the selected address is wrong, edit the player link in the lobby or set `QUIZ_JOIN_HOST`, for example: `QUIZ_JOIN_HOST=192.168.1.25 npm run start`.
- Use local HTTP only on a trusted network. Use HTTPS if the admin signs in over an untrusted network; HTTP does not encrypt the password.
- Admin sessions last seven days. **Sign out** on the dashboard. Restarting after a password change invalidates existing sessions.
- Keep `QUIZ_ADMIN_PASSWORD` on the server; do not use a `NEXT_PUBLIC_` prefix.
- Run one persistent server instance. Games live in memory, so restarting ends them. Idle rooms expire after six hours without a connected client or request.
- The host token stays in the browser that created the room; use that browser to host the game.

## Checks

```sh
npm run typecheck
npm run build
npm audit
```
