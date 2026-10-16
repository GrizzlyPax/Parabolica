# Moving to playaceamerica.com (#701)

The game is **Ace America** at **playaceamerica.com**. playparabolica.com keeps working, then redirects. Pax registered playaceamerica.com on Cloudflare on Oct 10, in the same account as playparabolica.com.

## The order (why it matters)

Saves live in the browser's storage, and that storage belongs to one domain. A 301 redirect happens before the game loads, so once it is on, nobody can reach their old save. So:

1. **Serve the game on both domains** (step A). The old domain's menu shows *"Ace America has moved"* with a **Move my save** button: one tap opens playaceamerica.com with the save in the link, and the new domain keeps it (it never overwrites a save already there). The code is `src/storage/carry.ts`.
2. **Point the league API at the new domain** (step B).
3. **Wait a week or so** (Pax's call), so players can move their saves.
4. **Turn on the 301** (step C). After that, the old domain only redirects.

## A · Serve the game at playaceamerica.com (Pax, about 5 minutes)

1. Open **dash.cloudflare.com** and sign in.
2. In the left sidebar, click **Workers & Pages**.
3. Click the **Pages project** that serves playparabolica.com today (the one this repo deploys to).
4. Open the **Custom domains** tab.
5. Click **Set up a custom domain**, type `playaceamerica.com`, click **Continue**, then **Activate domain**. The domain is in the same account, so Cloudflare adds the DNS record itself.
6. Do it again for `www.playaceamerica.com`.
7. Wait until both rows say **Active** (SSL can take a few minutes).
8. Open **https://playaceamerica.com**: the menu's sash says **Ace America**.

## B · The league API on the new domain (Hub's PR, Pit merges)

`server/wrangler.toml` routes `/api/*` per domain. The server PR adds `playaceamerica.com/api/*` and `www.playaceamerica.com/api/*`. Merging it deploys the Worker (`.github/workflows/deploy-api.yml`). If that deploy fails with a permissions error, the Cloudflare API token in the repo secrets needs the new zone:

1. dash.cloudflare.com → your profile (top right) → **My Profile** → **API Tokens**.
2. Find the token the deploy uses → **Edit**.
3. Under **Zone Resources**, add **playaceamerica.com** (or choose **All zones**) → **Continue to summary** → **Update token**.
4. Re-run the failed deploy (or push any change under `server/`).

No screen uses the league server today, so this step can wait; it just keeps shared league links working.

## C · Redirect playparabolica.com (Pax, after the grace week)

1. dash.cloudflare.com → click the **playparabolica.com** domain.
2. Left sidebar: **Rules** → **Overview** → **Create rule** → **Redirect Rule**.
3. **Rule name:** `To Ace America`.
4. **If incoming requests match:** choose **Custom filter expression**, and set **Hostname** · **equals** · `playparabolica.com`, then **Or**, **Hostname** · **equals** · `www.playparabolica.com`.
5. **Then:** **Type** · **Dynamic**. **Expression:** `concat("https://playaceamerica.com", http.request.uri.path)`. **Status code:** **301**. Tick **Preserve query string**.
6. Click **Deploy**.
7. Check: open **https://playparabolica.com/** and you land on **https://playaceamerica.com/**.

Links with a `#…` part (a league link, a page address like `#/world-deck/cards`) keep it: browsers carry the part after `#` across a redirect.

## What stays the old name

The repo (`GrizzlyPax/Parabolica`), code identifiers and the save keys (`parabolica.*`). Renaming those would orphan every save for nothing.
