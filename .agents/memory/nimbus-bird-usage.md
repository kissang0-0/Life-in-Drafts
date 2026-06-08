---
name: NimbusBird logo usage
description: How and where the Nimbus bird PNG logo is used across the app
---

Asset: `assets/nimbus-logo.png` — full badge logo with transparent outer background.

User confirmed: the full badge (bird + dark circular badge + "LIFE IN DRAFTS") is fine on auth/lock screens. Do NOT crop it.

For in-app inline uses (NimbusMessage widget, home Nimbus messages), simply pass a larger `size` prop (68–72px). The component is `<NimbusBird size={N} />` using `resizeMode="contain"` as a prop (not in style, to avoid deprecation warning).

**Why:** User's exact words: "no logo must is ok just make it a little bigger. only change nimbus inside the app."
