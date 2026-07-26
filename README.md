# Lilac Desk Command Center

A real, hosted assistant: shows your daily business + workout focus, tracks tasks and
workouts, sends actual push notifications, runs a weekly research digest, and answers
questions through a built-in AI assistant grounded in your real sales and catalog data.

## What's in it now

**Homepage** is a live dashboard: a time-aware greeting, a one-line read on the shape
of your day (computed from actual deadlines/tasks/newsletter status, not a fixed
template), a progress bar for today's two checkable items (business focus, workout),
real Shopify revenue with a week-over-week comparison, a newsletter send-cadence
nudge, your next Fiverr deadline, current Velvet Circle feature, and the task list —
all reactive as you check things off, with a background refresh every 5 minutes to
catch changes made elsewhere.

**A floating AI assistant** sits on every page (bottom-right button). It's grounded in
your real data — current sales, catalog, schedule, latest trend digest, open Fiverr
work, newsletter status — so answers to "what products should I add" or "give me 5
Pinterest post ideas" are based on your actual business, not generic advice. No new
signup: it uses the same `ANTHROPIC_API_KEY` as the research digest.

Seven other pages, one nav bar: **Business** (Shopify sales, marketing campaign log,
weekly trend digest, ideas log), **Fiverr** (client/gig tracker), **Products** (idea →
in development → launched pipeline with a launch checklist), **Velvet Circle** (your
app's dev feature pipeline pre-launch, plus a live stats log for users and revenue
once it's out), **Finances** (income/expense across both businesses + tax set-aside
calculator), **Fitness** (streak, weekly split, logging), **Growth** (learning list,
self-care routine, health habits).

A design note: the homepage got the full visual treatment as the Luna blueprint —
refined type scale, subtle hover states, a live progress indicator. The other pages
share the same design tokens (colors, fonts, spacing) so nothing clashes, but weren't
individually redesigned to that same polish level — worth a dedicated pass later if
you want every page at that bar.

## What you're signing up for

Four things, all with free tiers that comfortably cover this app's usage:

1. **Vercel** (hosting + database + the scheduler) — vercel.com, free Hobby plan
2. **Brave Search API** (powers the weekly research digest) — brave.com/search/api
3. **Anthropic API** (Claude synthesizes the digest and runs the assistant) —
   console.anthropic.com — pay-as-you-go, fractions of a cent per digest
4. **A Shopify custom app** (powers the sales dashboard) — free, a few clicks in your
   existing Shopify admin

Push notifications need no signup — the keys are already generated for you (see
`.env.example`).

## Before you start: adding an environment variable in Vercel

You'll do this several times below for different keys — it's the same five clicks
every time, so here it is once:

1. Go to vercel.com and open your project.
2. Click **Settings** (top of the project page), then **Environment Variables** in
   the left sidebar.
3. In the **Key** field, type the variable name exactly as written in these
   instructions (e.g. `BRAVE_API_KEY`) — capitalization matters.
4. In the **Value** field, paste the actual key/token you were given.
5. Leave all three boxes checked (Production, Preview, Development) unless told
   otherwise.
6. Click **Save**.

Every time a step below says "add X as Y," that means repeat these five steps with
that specific name and value.

## Setup

**1. Deploy it — pick GitHub or go straight from VS Code**

Both options below end in the same place: a Vercel project that fails on its first
build. That's expected — there are no environment variables yet.

**Option A — GitHub-linked (auto-deploys every time you push)**

```
cd lilac-desk-assistant
git init && git add . && git commit -m "Initial commit"
```

Go to github.com, click the **+** in the top right → **New repository**, give it any
name, leave everything else default, click **Create repository**. GitHub will show
you a page with commands — copy the ones under "…or push an existing repository from
the command line" and run them in your terminal. Then go to vercel.com → **Add New**
→ **Project** → find and import that repo. From then on, every `git push` auto-deploys.

**Option B — Straight from VS Code, no GitHub at all**

Open the built-in terminal in VS Code (Terminal menu → New Terminal) and make sure
you're inside the project folder — if you're not sure, run `pwd` and check the path
ends in `lilac-desk-assistant`.

```
npx vercel login
```

This opens your browser to log in — or sign up, it's free, if you don't have a Vercel
account yet. Once the terminal prints "Success!", go back to VS Code.

```
npx vercel
```

This single command both creates the Vercel project and links this folder to it — you
do not need to separately visit vercel.com and click New Project for this path. It'll
ask a few questions right in the terminal; here's what to answer:

- `Set up and deploy "~/.../lilac-desk-assistant"?` → type **Y**, hit enter
- `Which scope should contain your project?` → your account is likely already
  highlighted, just hit enter
- `Link to existing project?` → type **N** — this is a new one
- `What's your project's name?` → hit enter to accept the default
- `In which directory is your code located?` → hit enter to accept `./`
- If it detects Next.js and asks about settings → hit enter to accept the defaults

It'll build and give you a preview URL. It's expected to be broken right now — no
environment variables exist yet. A `.vercel` folder appears in your project after
this; that's the actual link between this folder and the Vercel project, so don't
delete it.

Your project now also exists at vercel.com — log in there in your browser and you'll
see it on your dashboard. Steps 2 onward all happen there, in the web dashboard, not
the terminal.

Whenever you edit code and want the live site updated, from that same folder run:

```
npx vercel --prod
```

If you'd rather not type `npx` every time, install the global command instead:

```
npm install -g vercel
```

If that fails with `EACCES: permission denied` — common on macOS when Node was
installed via the standard installer — this fixes it permanently:
```
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g vercel
```
Or just keep using `npx vercel` — works exactly the same, a few extra keystrokes.

**2. Add a Redis database**

Vercel's standalone "KV" product was discontinued — it's now a Marketplace
integration instead, usually backed by Upstash. The code doesn't care either way; the
`@vercel/kv` package just reads whichever environment variables end up in your
project, and this integration sets the same ones.

Do this in your browser at vercel.com:

1. Open your project → **Storage** tab.
2. Click **Browse Marketplace** (label may say **Connect Database** or **Create
   Database** depending on when you're reading this).
3. Search **Upstash** or **Redis**, click the Upstash Redis integration, then
   **Add Integration** / **Install**.
4. It'll prompt you to create a database — name it anything, pick the free tier, pick
   a region near you.
5. It'll then ask which project(s) to connect the new database to. **This is the
   actual "connecting" step** — check the box next to your project here. Skipping
   this is the single most common reason the env vars don't show up.
6. Confirm it worked: project → Settings → Environment Variables — you should now see
   `KV_URL`, `KV_REST_API_URL`, and a few others already filled in, without you typing
   anything. Nothing to add by hand this step.

If the Storage tab looks completely different from this by the time you're reading
it, search "Redis" in Vercel's integration/marketplace search — that's the part least
likely to have moved.

**3. Get a Brave Search API key**

1. Go to api-dashboard.search.brave.com and sign up (email is fine).
2. You'll land on a page to pick a plan — pick the free or lowest-cost tier, whichever
   is offered when you're reading this; usage here is tiny (about 4 searches, once a
   week).
3. Once you're in the dashboard, look for **API Keys** in the left-side navigation.
4. Click to generate/create a new key. It'll show you a long string once — copy it
   immediately.
5. Add it as `BRAVE_API_KEY` (see "adding an environment variable" above).

**4. Get an Anthropic API key**

1. Go to console.anthropic.com and log in or sign up.
2. Before a key will actually work, you need billing set up: **Settings** → **Billing**
   → add a payment method and add credits. There's no monthly subscription — you're
   charged per use, and this app's usage (one weekly digest, occasional assistant
   chats) is a few cents a month at most.
3. Go to **API Keys** → **Create Key**, give it any name, copy the value shown — like
   Brave, it's only shown once.
4. Add it as `ANTHROPIC_API_KEY` (see "adding an environment variable" above).

**5. Create a Shopify custom app (for the sales dashboard)**

Shopify overhauled this on January 1, 2026 — new custom apps now go through a
separate Dev Dashboard instead of being created directly in your store's Settings,
and instead of copying a token off a screen, the app fetches its own token
automatically. More moving parts than it used to be, but nothing you need to repeat
day to day once it's set up.

1. Shopify admin → **Settings** → **Apps and sales channels** → **Develop apps** →
   **Build apps using Dev Dashboard**. This takes you to a separate Dev Dashboard site.
2. **Create app**, name it anything (e.g. "Command Center").
3. On the app's version/configuration page: set an **App URL** (since this app isn't
   embedded in Shopify's admin, any placeholder works — `https://shopify.dev/apps/default-app-home`
   is fine), pick the latest **Webhook API version**, and under **Scopes** check
   `read_orders`.
4. Click **Release** (or **Save**, wording varies) to publish this version.
5. Set the distribution method to **Custom distribution**, **one store** — this is
   your own store, not something you're distributing to others.
6. Install the app on your store using the install link it gives you.
7. Back in the app's settings in the Dev Dashboard, find **Client ID** and
   **Client secret** — copy both. This replaces the old single "Admin API access
   token" — the app now uses these two values to fetch its own token automatically,
   and refreshes it before it expires, so you're not copying a token by hand.
8. Add three variables (see "adding an environment variable" above, do all three):
   `SHOPIFY_STORE_DOMAIN` (e.g. `lilacdesk.myshopify.com` — no `https://`),
   `SHOPIFY_CLIENT_ID`, and `SHOPIFY_CLIENT_SECRET`.

If you hit an error mentioning `shop_not_permitted`, the app and the store need to be
in the same Dev Dashboard organization — check under **Dev stores** in the Dev
Dashboard sidebar that your store is listed there.

**6. Add the rest of the environment variables**

Open `.env.example` in VS Code — it's a plain text file in the project root. For every
line that has a real value already filled in (the VAPID keys), add it to Vercel using
the same five-step process from above, copying the value exactly as written. For
`CRON_SECRET`, make up any random string yourself (mash the keyboard, or use a
password generator) — its only job is to stop strangers from triggering your reminders.

**7. Set up the reminders + daily briefing triggers**

Vercel's free Hobby plan only allows cron jobs that run once a day, and reminders
need checking more often — so instead of Vercel's own cron, a free external service
calls the endpoints on schedule. This isn't a hypothetical fallback, it's the actual
setup on the free plan. You'll create two jobs on the same service.

Go to cron-job.org, sign up (free, email is fine). Then create these two jobs:

**Job 1 — Reminders (task/workout nudges):**
1. Click **Create cronjob**.
2. **Title**: "Command Center Reminders".
3. **URL**: `https://your-app.vercel.app/api/cron/reminders` — use your actual
   `.vercel.app` domain from step 1.
4. **Schedule**: every 15 minutes (minutes: `*/15`, everything else: `*`).
5. Under **Advanced** or **Headers**, add a header — Name: `Authorization`, Value:
   `Bearer YOUR_CRON_SECRET` (the random string you set as `CRON_SECRET` in step 6,
   with `Bearer ` — including the space — in front).
6. Save and enable.

**Job 2 — Morning & evening briefing (the daily texts):**
1. **Create cronjob** again.
2. **Title**: "Command Center Briefing".
3. **URL**: `https://your-app.vercel.app/api/cron/briefing` — same domain.
4. **Schedule**: hourly (minutes: `0`, everything else: `*`). The endpoint itself
   only sends during the morning window (6–11am) and evening window (6–10pm), once
   each per day — checking hourly just makes sure it catches those windows.
5. Add the same `Authorization` / `Bearer YOUR_CRON_SECRET` header as Job 1.
6. Save and enable.

If you'd rather pay to avoid a third-party service, Vercel Pro ($20/mo) removes the
cron limit and you could move these into `vercel.json` instead — not necessary.

**8. Add an app icon**

Find or create a 512×512 pixel PNG of your Lilac Desk mark. If you already have a
logo file: on a Mac, open it in **Preview**, then **Tools** → **Adjust Size**, set
both width and height to 512 (pixels), uncheck "Scale proportionally" only if it's
not already square, then **File** → **Export**, choose PNG.

In VS Code's file explorer (left sidebar), find the `public` folder, and drag the PNG
file into it. Rename it to exactly `icon.png` (right-click → Rename).

Don't have a logo file handy? Skip this step entirely — the app works fine without
it, notifications just show a generic icon until you come back and add one.

**9. Redeploy**

Option A: commit and push again (or hit **Redeploy** in the Vercel dashboard).
Option B: run `npx vercel --prod` again (or plain `vercel --prod` if you installed the
global command). Either way, this is what picks up all the environment variables you
just added.

**10. Open the app and turn on notifications**

Visit your new `*.vercel.app` URL (find it on your Vercel project dashboard if you're
not sure what it is), tap **Enable Notifications**. On iPhone: **Share** → **Add to
Home Screen** first, then open it from the home screen icon and enable notifications
from there — Safari only allows push notifications from installed PWAs, not a regular
browser tab.

## Verify it actually worked

Once deployed, check these in order — each one confirms a different piece is wired up:

1. **Homepage loads** with a time-based greeting and today's business/workout focus.
   If this is blank, check the Redis database is connected (step 2).
2. **Sales stats show real numbers** on the homepage and Business page, not "Connect
   Shopify to see real revenue here." If they're not showing, double-check
   `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID`, and `SHOPIFY_CLIENT_SECRET`, and that
   the app and store are in the same Dev Dashboard organization.
3. **Tap the floating assistant button** (bottom-right) and ask it anything. An error
   here almost always means `ANTHROPIC_API_KEY` is missing, wrong, or has no billing
   set up.
4. **Enable Notifications**, then wait for the next scheduled reminder (or check
   `/api/cron/reminders` manually in your browser) to confirm a push actually arrives.
5. **Wait for next Wednesday** (or visit `/api/cron/research` manually) to confirm the
   trend digest populates on the Business page. An error here points to
   `BRAVE_API_KEY`.
6. **Log a test transaction, task, and Fiverr client** on their respective pages, then
   reload the page — if they're still there, database persistence is working
   end to end.

If everything above checks out, there's nothing left to configure — the rest is just
using it.

## Connecting Velvet Circle's live stats (once the app is deployed)

Right now the Velvet Circle page shows manual snapshots and its dev feature pipeline.
Once your Velvet Circle app is actually live somewhere, it can report its own numbers
automatically — no manual logging. Here's how to wire that up when you get there:

1. Pick a secret string (like `CRON_SECRET`, mash the keyboard) and add it as
   `VELVET_INGEST_SECRET` in Vercel's environment variables, then redeploy.
2. In your Velvet Circle app's code, add a scheduled job (however that app runs —
   a cron, a serverless function, whatever) that POSTs its current numbers to:
   `https://your-app.vercel.app/api/velvet/ingest`
   with header `Authorization: Bearer <your VELVET_INGEST_SECRET>` and a JSON body
   like `{ "totalUsers": 1240, "revenueTotal": 3800 }`.
3. That's it — each POST becomes a dated snapshot, the homepage and Finances start
   counting Velvet Circle revenue automatically, and the deltas (new users since last
   check, etc.) compute themselves.

Until that's set up, the dashboard just shows "waiting for first data" for the live
feed, and you can still log snapshots by hand in the meantime. When you've got the app
deployed and want help writing the exact code for step 2, come back with where it's
hosted and what it's built in — that part depends entirely on the app itself.

## How the schedule works

Everything — the weekly rhythm, the workout split, and exactly when reminders fire —
lives in `lib/schedule.js`. Change a time, a day, or the exercises there and redeploy;
nothing else needs touching. Saturday's business focus is Velvet Circle dev time (the
homepage shows whatever feature is currently "In Progress" on the Velvet Circle page
there) — that was the one open, unused day before, Monday–Friday are untouched. The
research topics it searches for each week live in `lib/research-queries.js`, same idea.

## A few honest limits

- **The Fiverr tracker is manual.** Fiverr doesn't offer a public API for sellers to
  pull orders/gigs automatically, so this is a place to log clients and deadlines
  yourself — not something that syncs with your actual Fiverr inbox.
- **Velvet Circle's stats are manual too.** There's no App Store/Play Store/analytics
  API wired up, so it's a snapshot log — you check your real numbers wherever they
  live (App Store Connect, your backend, wherever) and log them here periodically.
  Deltas since your last log are computed automatically once you've logged twice.
- **Campaign performance is manual too.** Real per-post revenue attribution needs
  Shopify's customer journey data, which requires an extra "protected customer data"
  approval most custom apps don't have. Rather than ship something that silently fails,
  this stays a log you fill in yourself.
- **The sales dashboard reads orders, not full analytics.** Revenue, order count, and
  top products come straight from your Orders — real numbers. Site traffic and
  conversion rate aren't included; that needs Shopify's Analytics API, which has
  narrower access requirements.
- **Reminders run via an external trigger, not Vercel's own cron.** Vercel's Hobby
  plan doesn't allow cron jobs more frequent than once a day, so step 7 sets up
  cron-job.org to call the reminders endpoint every 15 minutes instead. If reminders
  stop firing, that's the first thing to check — is the cron-job.org job still active.
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
# ld-assistant
