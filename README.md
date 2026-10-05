# Quiz Game

A multiplayer quiz game with quizzes stored in this repository. The host starts a game, shares its join link or QR code, and advances through questions. Players answer on their own devices and the host sees the leaderboard.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000` to select a quiz. New games receive a four-digit room code. When you host through localhost, the QR link automatically uses the server's Wi-Fi or Ethernet IPv4 address so phones on the same network can join. If the server has multiple network interfaces and the chosen address is wrong, edit the player link in the lobby or set `QUIZ_JOIN_HOST` before starting the server, for example `QUIZ_JOIN_HOST=192.168.1.25 npm run dev`. The QR code never uses localhost. Ensure the server port is reachable from players' devices.

The `dev` and `start` scripts suppress routine server messages. Application errors still appear in the terminal.

## Add quizzes

Place one JSON file per quiz in `data/networks`, `data/os`, `data/aml`, or `data/cvpr`. Add its relative path to the `quizPaths` array in [config.js](config.js). Only listed files appear on the dashboard. The quiz ID comes from its path, such as `networks/demo`.

Use [data/networks/demo.json](data/networks/demo.json) as a template. Each file has a `name`, optional `description`, and a nonempty `questions` array. Each question has a `body` and two to four `choices`. Every choice has `body` and `is_correct`; exactly one choice per question must be correct. Restart the server after changing the config or quiz files.

Live game state is held in the Next.js server process. Run a single persistent server instance; restarting it ends active games. The host token is saved in the creating browser's local storage, so keep that browser for hosting. This setup is intended for local or single-server use, not a multi-instance or serverless deployment.

## Checks

```sh
npm run typecheck
npm run build
npm audit
```
