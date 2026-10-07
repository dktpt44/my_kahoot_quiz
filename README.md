# Quiz Game

A multiplayer quiz game with quizzes stored in this repository. The host starts a game, shares its join link or QR code, and advances through questions. Players answer on their own devices and the host sees the leaderboard.

## Run a quiz locally

Create a local password file before starting the app:

```sh
cp .env.example .env.local
```

Edit `.env.local` and set `QUIZ_ADMIN_PASSWORD` to a long, private password. The file is ignored by Git. Do not prefix the variable with `NEXT_PUBLIC_`; the password must stay on the server. Restart the server after changing it.

```sh
npm install
npm run build
npm run start
```

Open `http://localhost:3000` and enter the admin password. The dashboard shows the number of category folders in `data` and the number of configured quizzes. Only signed-in admins can open host pages or create games; players can still join with the room link or QR code without signing in. Use **Sign out** on the dashboard when finished. The admin session lasts seven days, and changing the password invalidates existing sessions.

Build again after changing code or quiz files. The production server uses much less CPU than the development compiler while hosting a session.

Use development mode only while editing:

```sh
npm run dev
```

New games receive a four-digit room code. When you host through localhost, the QR link automatically uses the server's Wi-Fi or Ethernet IPv4 address so phones on the same network can join. If the server has multiple network interfaces and the chosen address is wrong, edit the player link in the lobby or set `QUIZ_JOIN_HOST` before starting the server, for example `QUIZ_JOIN_HOST=192.168.1.25 npm run start`. The QR code never uses localhost. Ensure the server port is reachable from players' devices.

The local HTTP setup is intended for a trusted network. Use HTTPS if the admin signs in over an untrusted network, because HTTP does not encrypt the password in transit.

The `dev` and `start` scripts show one `Visit: http://<ip>:<port>` link after the server is ready and suppress routine request messages. Application errors still appear in the terminal. The IP follows the same LAN address preference as the QR link, and `QUIZ_JOIN_HOST` overrides it when set.

In VS Code, Ctrl+click the full `http://...` link to open it in your system browser. This repository sets `workbench.browser.openLocalhostLinks` to `false` in `.vscode/settings.json`, so localhost links also open externally. You can set `workbench.externalBrowser` in VS Code if you want a particular browser instead of the system default.

## Add quizzes

Place one JSON file per quiz in `data/networks`, `data/os`, `data/aml`, or `data/cvpr`. Each folder counts as a category, including folders with no quizzes yet. Add each quiz's relative path to the `quizPaths` array in [config.js](config.js). Only listed files appear on the dashboard and count toward its quiz total. The quiz ID comes from its path, such as `networks/demo`.

Use [data/networks/demo.json](data/networks/demo.json) as a template. Each file has a `name`, optional `description`, and a nonempty `questions` array. Each question has a `body` and two to four `choices`. Every choice has `body` and `is_correct`; exactly one choice per question must be correct. Restart the server after changing the config or quiz files.

Live game state is held in the Next.js server process. Room updates are pushed over a server-sent stream; players still submit answers with POST requests. After each answer reveal, the host sees a chart of votes for every option. On the final results page, **Return to home** closes the room and frees its code. Run a single persistent server instance; restarting it ends active games. Rooms left open expire after six hours without a connected client or request. The host token is saved in the creating browser's local storage, so keep that browser for hosting. This setup is intended for local or single-server use, not a multi-instance or serverless deployment.

## Checks

```sh
npm run typecheck
npm run build
npm audit
```
