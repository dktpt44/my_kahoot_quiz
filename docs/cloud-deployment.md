# Deploy a free Quizlet demo on Koyeb

Koyeb can run this app as one Node.js web service with a public HTTPS address. Its free web instance has **512 MB RAM, 0.1 vCPU, and 2 GB temporary SSD**, and goes to sleep after **one hour without traffic**. That idle window is useful for a live quiz or poll. It is still a small demo instance, so test with your expected audience before relying on it for an event. [Koyeb free instance limits](https://www.koyeb.com/docs/reference/instances) · [Scale to zero behavior](https://www.koyeb.com/docs/run-and-scale/scale-to-zero)

**Before signing up:** Koyeb requires a payment card and says it makes a temporary **$29 authorization hold**. Its sign-up flow may select a paid Pro plan and charge for it. Choose the **Starter plan** and the **free** web instance; review the billing screen before submitting. If Starter is unavailable before a paid checkout, stop there if you need a strictly zero-cost signup. Koyeb says the `free` web service itself is never charged. [Koyeb pricing FAQ](https://www.koyeb.com/docs/faqs/pricing)

## Why Koyeb for this version of the app?

This app keeps rooms and votes in one Node.js process and sends live updates through long-lived server-sent event connections. Koyeb runs a single web-service instance, and its free service waits one hour without traffic before sleeping. A held connection counts as activity under Koyeb's scale-to-zero rules. These properties fit a short live demo without changing the storage architecture. [Koyeb free instances](https://www.koyeb.com/docs/reference/instances) · [Scale to zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero)

Vercel is convenient for a typical Next.js site, but its Functions can scale across instances and its free Hobby Functions have a five-minute maximum duration with Fluid Compute. **Inference for this app:** the in-memory room maps would not be reliably shared between requests, and each live event stream would have to reconnect within that duration. A Vercel deployment would need a shared database or pub/sub service and a revised realtime design. [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute) · [Function limits](https://vercel.com/docs/functions/limitations)

Render can run a Node web service too and is easier to try without Koyeb's card-verification step. Its free service sleeps after 15 minutes without inbound traffic; this app's outbound SSE heartbeats do not count as inbound requests. **Inference for this app:** a quiet room could disappear during a one-hour session. [Render free service limits](https://render.com/docs/free)

## 1. Prepare the repository

1. Use Node.js 22 locally. The project declares this version in `package.json` for Koyeb's Node buildpack. [Koyeb Node version configuration](https://www.koyeb.com/docs/build-and-deploy/build-from-git/nodejs)
2. From the project root, run `npm ci`, `npm run typecheck`, and `npm run build`.
3. Check `git status --short` and review changes. The quiz files in `data/` must be committed because Koyeb builds from GitHub.
4. Check that `.env.local`, `.env`, and `.quiz-settings.json` are **not** committed. The repository's `.gitignore` excludes them. Never place the admin password in GitHub.
5. Commit your reviewed changes and push the branch you want to deploy to the existing GitHub remote:

   ```sh
   git add -A
   git diff --cached --stat
   git commit -m "Prepare Quizlet cloud demo"
   git push origin HEAD
   ```

If your GitHub repository is public, the quiz JSON files are public too. Use a private repository if you want to keep questions hidden before a demo.

## 2. Create the Koyeb service

1. Sign in at the [Koyeb control panel](https://app.koyeb.com/). Confirm your organization is on **Starter** in **Usage and billing**.
2. Select **Create Web Service** → **GitHub**. Connect GitHub and grant access to this repository. Select the repository and the branch you pushed. [Koyeb GitHub deployment steps](https://www.koyeb.com/docs/build-and-deploy/deploy-with-git)
3. Keep the **Buildpack** builder. The project has a `build` script; leave the optional **Build command** field empty. Set **Run command** to:

   ```sh
   npm run start -- -H 0.0.0.0 -p 3000
   ```

4. Select **Web Service**, the **free** instance, **one instance**, and the **Frankfurt** region (or Washington, D.C. if closer to your participants). The free instance is available only in those two regions. [Koyeb instance types](https://www.koyeb.com/docs/reference/instances)
5. Under **Exposed ports**, set **3000 / HTTP**. Route `/` to port **3000**. Koyeb sets `PORT` to the exposed port if you do not define it yourself. [Koyeb port and environment variable reference](https://www.koyeb.com/docs/build-and-deploy/environment-variables)
6. Under **Environment variables**, add `QUIZ_ADMIN_PASSWORD` with a long, unique value. Use Koyeb's secret or protected value option if offered. Do not add `NEXT_PUBLIC_` to its name. Leave `QUIZ_JOIN_HOST` unset.
7. Name the app, select **Deploy**, and wait for the deployment to show healthy. Open the generated `https://...koyeb.app` URL. [Koyeb Next.js deployment guide](https://www.koyeb.com/docs/deploy/nextjs)

## 3. Check the public demo

1. Sign in using the password configured in Koyeb.
2. Check that the **Networks Demo** and **CVPR Demo** quizzes appear under their categories.
3. Host a quiz and inspect the participant link and QR code. They should use `https://...koyeb.app/game/<four-digit-code>`. The app reads Koyeb's `KOYEB_PUBLIC_DOMAIN` automatically. [Koyeb-provided domain variable](https://www.koyeb.com/docs/build-and-deploy/environment-variables)
4. Open the participant link from a phone on **mobile data** to confirm that it works outside your local Wi-Fi. Join, answer, and check that host and player screens update.
5. Create a poll, submit from the phone, and confirm the chart updates. New quiz and poll rooms each close one hour after creation.

If the generated QR link has the wrong address, add `QUIZ_PUBLIC_ORIGIN=https://your-app.koyeb.app` under the Koyeb service's environment variables and redeploy. Use your actual Koyeb domain, with `https://` and no path or trailing text.

## 4. Update the demo

- Edit quiz JSON files locally, commit, and push to the deployed branch. Koyeb rebuilds on pushes when **Autodeploy** is enabled. A redeploy ends any running room, so update between sessions. [Koyeb autodeploy behavior](https://www.koyeb.com/docs/build-and-deploy/deploy-with-git)
- Change the admin password in Koyeb's service environment variables, then redeploy or restart. Do not commit a `.env.local` file.
- Quiz timing settings saved through the dashboard are stored in `.quiz-settings.json` on the service. The free instance has no persistent volume; these settings revert after a restart, sleep, or redeploy. Set them again before a demo if needed. [Koyeb free storage limit](https://www.koyeb.com/docs/reference/instances)

## Free-tier limits that matter here

- Games, polls, votes, and player identities are held in **server memory**. A restart, sleep, or redeploy ends them. The one-hour app cutoff is a maximum, not a guarantee that a free instance will remain running for a full hour.
- Koyeb's free instance is limited to one web service per organization and can sleep after one hour with no traffic. A held live connection can keep the service active, but a platform restart can still interrupt it. [Koyeb free instances](https://www.koyeb.com/docs/reference/instances) · [Scale to zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero)
- The free instance's 0.1 vCPU can feel slow with many participants. For an important event, use a larger persistent instance and move room state to a shared store before running multiple instances.
- If Koyeb's card verification is unsuitable, [Render's free web service](https://render.com/docs/free) is an alternative. It sleeps after 15 minutes without inbound traffic and has 750 free instance hours per month, so its shorter idle window is less convenient for these in-memory rooms.
