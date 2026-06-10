---
name: Expo Router API routes for Replit
description: Why Expo Router +api.ts routes are required instead of a separate Express server for API calls in Replit dev previews.
---

## Rule
Always use Expo Router API routes (`app/api/route+api.ts`) for server-side logic instead of a separate Express server on a different port.

**Why:** In Replit's webview preview, the URL format is `https://{port}-{uuid}.replit.dev`. Constructing a cross-port URL (e.g. replacing `5000` with `3001` in the origin) is unreliable — port-prefixed subdomain routing through Replit's proxy is not guaranteed to work for all ports, causing "Not found" (non-JSON) responses that break `res.json()`. Using `app/api/+api.ts` routes means the frontend calls a relative URL (`/api/nimbus`) on the same origin/port as the app — zero cross-port issues.

**How to apply:**
- Place API logic in `app/api/<name>+api.ts` exporting `POST`, `GET`, etc.
- Set `web.output: "server"` in `app.json` to fully enable API route support.
- Use plain relative URLs in fetch calls (`/api/nimbus`, not `http://localhost:3001/api/nimbus`).
- A separate Express server (`server/index.js`) can still exist for native mobile builds, but web should always use the Expo Router API routes.
- `groq-sdk` and other Node packages work fine inside `+api.ts` files since they run server-side.
