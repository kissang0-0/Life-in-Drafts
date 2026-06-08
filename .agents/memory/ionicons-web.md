---
name: Ionicons Valid Names
description: Some icon names that seem intuitive are not valid in the Ionicons v5 set used by @expo/vector-icons on web and produce a runtime warning.
---

## Rule
Always use icon names from the Ionicons v5 set. Invalid names produce a runtime `WARN` on web but silently fail to render.

## Known invalid names
- `"quote"` → use `"text-outline"` or `"chatbubble-outline"` instead

## How to apply
When adding a new Ionicons name, verify it exists at https://ionic.io/ionicons or grep existing usage in the codebase for reference. Pay attention to `-outline` vs filled variants.

**Why:** The Expo web bundler does not throw at build time for invalid icon names — it only warns at runtime, making it easy to miss.
