# Webhook Integration — Demo Guide

A step-by-step script for demoing the PixlPush Webhook integration live, using the
Pixllove backend as the "customer server".

**The story in one line:** a customer connects their own server in 3 steps, and PixlPush
keeps their users, subscriptions and segments in sync every 2 minutes, with no code on
the PixlPush side.

---

## 1. Before the demo (10 minutes, do this first)

You need four things running on your laptop.

| What | Command | Check |
|---|---|---|
| PixlPush backend | `cd ~/Job/pixlpush_backend && npm run dev` | http://localhost:4000/health shows OK |
| PixlPush dashboard | `cd ~/Job/pixlpush_frontend && npm run dev` | http://localhost:3000 opens |
| Pixllove event feed | see 1.1 | `curl` in 1.1 returns JSON |
| Public tunnel | see 1.2 | prints an `https://….trycloudflare.com` URL |

### 1.1 Start the Pixllove feed

The feed is the endpoint PixlPush reads: `GET /api/pixlpush/events`.

1. In `~/Job/pixldevelop/backend/.env`, make sure `PIXLPUSH_FEED_TOKEN` is set to a long
   random value. This is the token you paste into PixlPush.
2. Start only the feed. Don't start the full Pixllove server, because it also starts
   crons that can send emails:
   ```bash
   cd ~/Job/pixldevelop/backend
   npx ts-node --transpile-only tmp/feed-server.ts      # listens on 127.0.0.1:5055
   ```
3. Check it (replace `<TOKEN>`):
   ```bash
   curl -H "Authorization: Bearer <TOKEN>" "http://localhost:5055/api/pixlpush/events?limit=2"
   ```
   You should see `{"data":[…],"next":"…"}`. Without the token you get `401`.

### 1.2 Open a public tunnel

PixlPush only accepts public HTTPS URLs, as a security rule, so expose the feed:

```bash
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:5055
```

Copy the printed URL and add `/api/pixlpush/events`, for example:
`https://something-random.trycloudflare.com/api/pixlpush/events`

> The tunnel URL changes every time you restart `cloudflared`. Start it right before the
> demo and keep the terminal open.

### 1.3 Prepare a clean project

In PixlPush, use the project switcher (top left) → **Create project** → name it, for
example, `Demo – Pixllove`. A fresh project makes the "before/after" obvious.

### 1.4 Dry run

Do the whole demo once alone, then create a new empty project for the real thing.

---

## 2. The demo script (about 8 minutes)

### Step 0: Set the scene (30 seconds)
> "Most of our customers already have a backend with users, subscriptions and segments.
> Today they need a developer to push that data to us. This integration flips it around:
> PixlPush pulls it from them, like our HubSpot sync."

Open **Integrations → Webhook**. Point at the header: *Not connected*.

### Step 1: Copy the AI prompt or email the developer (1 minute)
- Click **Copy AI prompt**.
  > "A non-technical customer pastes this into their AI coding assistant and gets the
  > endpoint built for them."
- Show **Preview instructions** and **Go to developer docs**.
  > "Or they email it to their developer with one click."
- Mention: *We did exactly this for Pixllove; that's the server we're connecting now.*

### Step 2: Paste the URL and token (1 minute)
- Paste the tunnel URL into **Server URL** and the token into **Token**.
- Click the **eye icon** to show the token is correct, then hide it again.
  > "The token is stored encrypted and never shown again."
- Click **Connect**. The button shows *Connecting…* while PixlPush checks the server live.
- The header changes to **Connected**, and the status card shows *Connected and syncing
  every 2 minutes*.

### Step 3: Map data (2 minutes)
Scroll to **3. Map data**.
- **3.1 Segments:** Pixllove's segments (e.g. *Premium Uncanceled*, *Expired Subscribers*)
  appear as **Seen in your data** chips. Click one to map it.
- **3.2 Historical user activity:**
  - Profile fields show as **Matched** automatically (email, name, language, country,
    region, user type, account status).
  - Plans (Pixllove products) appear under *Plans*.
  - Events like `subscription_started` and `trial_started` are **Matched**. The pencil
    lets you remap one or create a custom event with a description.
  > "PixlPush matches the data itself. The customer only reviews it."
- **3.3 Journeys and campaigns:** history from a previous tool can be imported. It is
  shown as *imported* and never counted as a send.

### Step 4: Show the result (2 minutes)
- Go to **Users**. Pixllove users are arriving, with names, emails and last-active dates.
- Open a user and point at:
  - **Account Information:** user type, account status.
  - **Location & Preferences:** country, region, language.
  - **Activity History:** events like `subscription_started` and `segment_entered`,
    labelled **Server**, with the original date.

### Step 5: Close (30 seconds)
> "Connect once, and every new purchase, cancellation or segment change in Pixllove
> shows up in PixlPush within 2 minutes, ready to trigger journeys."

Optional: click **Disconnect** to show it is one click (with a spinner). The data stays.

---

## 3. Likely questions

| Question | Answer |
|---|---|
| Is it secure? | Bearer token, stored encrypted. HTTPS only. Private and local addresses are blocked. The token is never logged. |
| How fresh is the data? | Pulled every 2 minutes, up to 2,500 events per run. |
| What if they send something we don't know? | It is stored under its own name and marked *Needs mapping*, or they create a custom event. |
| Does importing old data send messages? | No. Old events place users in segments but never send anything or start journeys. |
| Push notifications? | Push permission and device tokens come from our SDK in the app; the server can only send push consent. |
| What does the customer have to build? | One GET endpoint: `?limit&since&cursor` → `{ data, next }`. The AI prompt builds it. |

---

## 4. If something goes wrong

| Symptom | Fix |
|---|---|
| "Use a public HTTPS URL" on Connect | You pasted `localhost`. Use the tunnel URL. |
| "Your server could not be reached" | The tunnel or feed stopped. Restart both (1.1, 1.2) and paste the **new** tunnel URL. |
| 401 / "unauthorized" | The token in PixlPush doesn't match `PIXLPUSH_FEED_TOKEN`. Use **Change URL or token**. |
| Step 3 says "Available once the first sync finishes" | Wait ~10 seconds and refresh, or click **Sync now**. |
| Users appear slowly | Expected: PixlPush imports up to 2,500 events every 2 minutes. Show the first users and continue. |
| Timezone or push fields show "—" | That user has no timezone or push token stored in Pixllove; it's not a sync error. |

---

## 5. After the demo

- Stop `cloudflared` and the feed (Ctrl+C in both terminals).
- Delete the demo project if you don't need it: **Project Settings → Delete project**.
