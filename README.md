# Lilac Desk Command Center

A real, hosted assistant: shows your daily business + workout focus, tracks tasks and
workouts, sends actual push notifications, runs a weekly research digest, and answers
questions through a built-in AI assistant grounded in your real sales and catalog data.

## What's in it now

**Homepage** is now a real live dashboard: a time-aware greeting, a one-line read on
the shape of your day (computed from actual deadlines/tasks/newsletter status, not a
fixed template), a progress bar for today's two checkable items (business focus,
workout), real Shopify revenue with a week-over-week comparison, a newsletter
send-cadence nudge, your next Fiverr deadline, and the task list — all reactive as you
check things off, with a light background refresh every 5 minutes to catch changes
made elsewhere.

**A floating AI assistant** sits on every page (bottom-right button). It's grounded in
your real data — current sales, catalog, schedule, latest trend digest, open Fiverr
work, newsletter status — so answers to "what products should I add" or "give me 5
Pinterest post ideas" are based on your actual business, not generic advice. No new
signup: it uses the same `ANTHROPIC_API_KEY` as the research digest.

Six other pages, one nav bar: **Business** (Shopify sales, marketing campaign log,
weekly trend digest, ideas log), **Fiverr** (client/gig tracker), **Products** (idea →
in development → launched pipeline with a launch checklist), **Finances**
(income/expense across both businesses + tax set-aside calculator), **Fitness**
(streak, weekly split, logging), **Growth** (learning list, self-care routine, health
habits).

A design note: the homepage got the full visual treatment as the Luna blueprint —
refined type scale, subtle hover states, a live progress indicator. The other six
pages share the same design tokens (colors, fonts, spacing) so they're visually
consistent, but weren't individually redesigned with the same level of polish this
round — worth a dedicated pass later if you want every page at that bar.

## What you're signing up for

Four things now, all with free tiers that comfortably cover this app's usage:

1. **Vercel** (hosting + database + the scheduler) — vercel.com, free Hobby plan
2. **Brave Search API** (powers the weekly research digest) — brave.com/search/api
3. **Anthropic API** (Claude synthesizes the digest) — console.anthropic.com — pay-as-you-go, fractions of a cent per weekly run
4. **A Shopify custom app** (powers the sales dashboard) — free, just a few clicks in your existing Shopify admin

Push notifications need no signup — the keys are already generated (see `.env.example`).

## Setup

**1. Deploy it — pick GitHub or go straight from VS Code**

You've got two options. Both end in the same place: a Vercel project that fails on
its first build (expected — no environment variables yet).

**Option A — GitHub-linked (auto-deploys every time you push)**

```
cd lilac-desk-assistant
git init && git add . && git commit -m "Initial commit"
```

Create a new empty repo on GitHub, push to it, then in Vercel: New Project → import
that repo. From then on, every `git push` auto-deploys.

**Option B — Straight from VS Code, no GitHub at all**

```
npm install -g vercel
cd lilac-desk-assistant
vercel login
vercel --prod
```

`vercel login` opens your browser to authenticate once. `vercel --prod` creates the
Vercel project and deploys directly from the files on your Mac — no repo, no push.
Whenever you edit code in VS Code and want the live site updated, just run
`vercel --prod` again — that's the entire redeploy step from here on. A local git repo
is still worth having just so you've got your own history and can undo a bad edit
(`git init` and commit as you go), but it's optional — Vercel doesn't need it.

**2. Add Vercel KV (the database)**

- In your Vercel project → Storage tab → Create Database → KV.
- Connect it to this project. Vercel auto-fills the `KV_*` environment variables for you.

**3. Get a Brave Search API key**

- api-dashboard.search.brave.com → sign up → subscribe to a plan (check current
  pricing, it changes) → API Keys → generate a token.
- Add it as `BRAVE_API_KEY` in Vercel → Settings → Environment Variables.

**4. Get an Anthropic API key**

- console.anthropic.com → API Keys → create one.
- Add it as `ANTHROPIC_API_KEY` in Vercel env vars.

**5. Create a Shopify custom app (for the sales dashboard)**

- In your Shopify admin: Settings → Apps and sales channels → Develop apps → Create an app.
- Name it (e.g. "Command Center"), then under Configuration → Admin API scopes, enable
  `read_orders`. Nothing else is needed.
- Install the app, then open the API credentials tab and copy the Admin API access token
  — Shopify only shows it once, so save it immediately.
- Add `SHOPIFY_STORE_DOMAIN` (e.g. `lilacdesk.myshopify.com`) and `SHOPIFY_ADMIN_TOKEN`
  to Vercel env vars.

**6. Add the rest of the environment variables**

Copy everything from `.env.example` into Vercel → Settings → Environment Variables —
the VAPID keys are already real and ready to use. Make up your own random string for
`CRON_SECRET`.

**7. Add an app icon**

Drop a 512x512 PNG at `public/icon.png` (your Lilac Desk mark works well).

**8. Redeploy**

Option A: commit and push again (or just hit Redeploy in the Vercel dashboard).
Option B: run `vercel --prod` again. Either way, this is what picks up all the
environment variables you just added.

**9. Open the app and turn on notifications**

Visit your new `*.vercel.app` URL, tap **Enable Notifications**. On iPhone: Share →
Add to Home Screen first, then enable notifications from the installed app — Safari
only allows push from installed PWAs, not the browser tab.

## Verify it actually worked

Once deployed, check these in order — each one confirms a different piece is wired up:

1. **Homepage loads** with a time-based greeting and today's business/workout focus.
   If this is blank, check Vercel KV is connected.
2. **Sales stats show real numbers** on the homepage and Business page, not "Connect
   Shopify to see real revenue here." If they're not showing, double-check
   `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_TOKEN`.
3. **Tap the floating assistant button** (bottom-right) and ask it anything. An error
   here almost always means `ANTHROPIC_API_KEY` is missing or wrong.
4. **Enable Notifications**, then wait for the next scheduled reminder (or check
   `/api/cron/reminders` manually) to confirm a push actually arrives.
5. **Wait for next Wednesday** (or trigger `/api/cron/research` manually) to confirm
   the trend digest populates on the Business page. An error here points to
   `BRAVE_API_KEY`.
6. **Log a test transaction, task, and Fiverr client** on their respective pages, then
   reload the page — if they're still there, KV persistence is working end to end.

If everything above checks out, there's nothing left to configure — the rest is just
using it.

## How the schedule works

Everything — the weekly rhythm, the workout split, and exactly when reminders fire —
lives in `lib/schedule.js`. Change a time, a day, or the exercises there and redeploy;
nothing else needs touching. The research topics it searches for each week live in
`lib/research-queries.js`, same idea.

## A few honest limits

- **The Fiverr tracker is manual.** Fiverr doesn't offer a public API for sellers to
  pull orders/gigs automatically, so this is a place to log clients and deadlines
  yourself — not something that syncs with your actual Fiverr inbox.
- **Campaign performance is manual too.** Real per-post revenue attribution needs
  Shopify's customer journey data, which requires an extra "protected customer data"
  approval most custom apps don't have. Rather than ship something that silently fails,
  this stays a log you fill in yourself.
- **The sales dashboard reads orders, not full analytics.** Revenue, order count, and
  top products come straight from your Orders — real numbers. Site traffic and
  conversion rate aren't included; that needs Shopify's Analytics API, which has
  narrower access requirements.
- **Cron frequency on Vercel's free plan can be restricted.** If reminders aren't
  firing on time, check your plan's current cron limits in the Vercel docs — the
  fallback is a free external trigger like cron-job.org hitting
  `your-app.vercel.app/api/cron/reminders` on your own schedule instead.
- **One push subscription at a time.** This is built for one person on one device. If
  you install it on your phone and your laptop, whichever subscribes second is the one
  that gets notifications.
- **The research digest is only as good as what's searchable.** It's a starting point
  for your Wednesday research block, not a replacement for actually reading it.
- **The AI assistant doesn't remember past conversations.** Each chat resets when you
  reload the page — it's grounded in live business data every time, just not in what
  you talked about yesterday. Worth adding persistence later if that matters to you.
- **The tax set-aside is a calculator, not advice.** You set the percentage; talk to an
  accountant about what it should actually be for your situation.
- **I couldn't test any of this end-to-end** — it needs a live HTTPS domain and real
  API keys, neither of which exist until you deploy it. The code follows the standard,
  documented patterns for each piece, but budget some time for troubleshooting on
  first deploy.
