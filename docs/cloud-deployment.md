# Deploy a free Quizlet demo on Render

Render can run this full Next.js app as one Node.js **Web Service** with a public HTTPS URL. Its free plan is available without adding a payment method and includes 750 free instance hours per workspace each month. The service sleeps after 15 minutes without inbound traffic; that limitation matters because this app stores live rooms in server memory. [Render free service limits](https://render.com/docs/free) · [Render free-tier overview](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)


## 1. Prepare the repository

1. Use Node.js 22 locally. The project's `package.json` also requests Node 22 for Render. [Render Node version selection](https://render.com/docs/node-version)
2. From the project root, run `npm ci`, `npm run typecheck`, and `npm run build`.
3. Review `git status --short`. Quiz JSON files in `data/` must be committed because Render deploys from Git.
4. Confirm that `.env.local`, `.env`, and `.quiz-settings.json` are absent from the staged changes. The repository ignores them. Keep your admin password out of GitHub.
5. Commit the reviewed files and push the branch you want to deploy:

   ```sh
   git add -A
   git diff --cached --stat
   git commit -m "Prepare Quizlet cloud demo"
   git push origin HEAD
   ```

If your GitHub repository is public, the quiz JSON files are public too. Use a private repository if questions should remain hidden before the demo.

## 2. Create the Render service

1. Sign in at the [Render dashboard](https://dashboard.render.com/) and select **New** → **Web Service**. Do not select **Static Site**; this app needs its API routes and live server. [Render Next.js deployment guide](https://render.com/docs/deploy-nextjs-app)
2. Connect your GitHub account, select this repository, and select the pushed branch.
3. Enter a service name such as `quizlet-demo`. Choose **Node** as the language, a nearby available region, and the **Free** instance type.
4. Set **Build Command** to `npm ci && npm run build`.
5. Set **Start Command** to `npm run start -- -H 0.0.0.0 -p 10000`. Render's default service port is 10000, and web services must listen on `0.0.0.0`. [Render web service port rules](https://render.com/docs/web-services)
6. Under **Environment**, add `QUIZ_ADMIN_PASSWORD` with a long, unique value. Keep it server-side; do not add `NEXT_PUBLIC_` to the variable name. Leave `QUIZ_JOIN_HOST` and `QUIZ_PUBLIC_ORIGIN` unset for the first deployment. [Render environment variables](https://render.com/docs/configure-environment-variables)
7. Select **Create Web Service**. Wait for the build and deployment to finish, then open the generated `https://<service-name>.onrender.com` URL.

The app uses the public address in your browser when you create a room. It can also read proxy headers and Render's `RENDER_EXTERNAL_URL` as fallbacks, so quiz and poll QR codes should use your public HTTPS address without a hardcoded domain. [Render default environment variables](https://render.com/docs/environment-variables)

## 3. Test the public demo

1. Sign in with the password you entered in Render.
2. Confirm that the **Networks Demo** and **CVPR Demo** quizzes appear on Home.
3. Host a **new** quiz and check that its player link begins with the same public origin shown in your browser, followed by `/game/`.
4. Open the link from a phone on **mobile data**. Join and submit an answer; check that the host screen updates.
5. Create a poll, check that its link uses the same public origin and `/poll/`, submit from the phone, and check that its chart updates.

If the QR code has an incorrect domain, set `QUIZ_PUBLIC_ORIGIN=https://<service-name>.onrender.com` in Render's **Environment** section and redeploy. Use your actual domain, including `https://`, without a path. If login fails, check the `QUIZ_ADMIN_PASSWORD` environment variable on the running service.

## 4. Update quizzes and settings

- Edit JSON files under `data/`, commit, and push to the deployed branch. Render rebuilds and redeploys the service on pushes from a connected repository. Do this between live sessions because a redeploy ends rooms stored in memory. [Render web service deployments](https://render.com/docs/web-services)
- Quiz timing settings saved in the dashboard use the local `.quiz-settings.json` file. Render's free filesystem is temporary, so these settings reset after a restart, sleep, or redeploy. Set them again before a demo if needed. [Render free filesystem limits](https://render.com/docs/free)
- Quiz and poll rooms close automatically one hour after creation **while the service remains running**.

## Free-tier limits and other choices

- Render sleeps a free web service after **15 minutes without inbound HTTP requests or WebSocket messages**. This app uses server-sent events, whose heartbeats go **from the server to the browser**. Inference for this app: those heartbeats do not provide inbound traffic, so a quiet room can disappear before the app's one-hour limit. The first new request wakes the service, but its in-memory rooms are gone. Render can also restart a free service at other times. [Render free service behavior](https://render.com/docs/free)
- For a demo that must stay available throughout a one-hour waiting period, [Northflank's Developer Sandbox](https://northflank.com/pricing) advertises two always-on free services. [Northflank says a payment method is required](https://northflank.com/docs/v1/application/billing/pricing-on-northflank), even on its free plan. It is a better fit for uninterrupted in-memory rooms if that requirement is acceptable.
- Vercel can host the Next.js frontend, but this version's in-memory room maps and long-lived event streams do not fit its automatically scaled Functions without a shared data store and a revised realtime design. [Vercel Functions limits](https://vercel.com/docs/functions/limitations)
