---
name: Expo Web Dependencies
description: Packages that require special handling for Expo SDK 56 + web bundling
---

## react-native-reanimated v4
Requires `react-native-worklets` as a separate package — must be installed explicitly.
`npm install react-native-worklets --legacy-peer-deps`

**Why:** reanimated v4 split worklets into its own package; Metro cannot resolve it automatically.

## react-native-keyboard-controller
Crashes Metro web bundling because it imports reanimated which tries to load native worklets.
**Fix:** Remove `KeyboardProvider` wrapper from `app/_layout.tsx` entirely for web builds.

**How to apply:** If keyboard avoidance is needed on web, use React Native's built in `KeyboardAvoidingView` instead.

## expo-linking
Must be installed explicitly — expo-router depends on it but doesn't bundle it.
`npm install expo-linking expo-constants expo-asset --legacy-peer-deps`

## General
All packages need `--legacy-peer-deps` due to react-dom peer conflict with React 19.
