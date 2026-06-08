---
name: AnimatedButton pattern
description: Spring-scale press animation component for React Native buttons
---

Use `Pressable` (not `TouchableWithoutFeedback`, which is deprecated in RN/Expo).
Wrap children in `Animated.View` with a `scale` spring on `onPressIn`/`onPressOut`.

**Why:** TouchableWithoutFeedback triggers a deprecation warning in Expo Web.

**How to apply:** Import `{ AnimatedButton }` from `@/components/AnimatedButton`. Wrap any button content (including LinearGradient) inside it instead of TouchableOpacity when you want the scale-bounce effect.
