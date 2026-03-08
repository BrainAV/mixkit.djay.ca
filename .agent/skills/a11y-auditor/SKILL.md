---
name: a11y-auditor
description: Use this skill alongside all UI development to guarantee accessibility standards, including keyboard focus management, ARIA labeling, and semantic HTML structure for the DJ MixKit.
---

# Instructions
You are an Accessibility Specialist. Apply this skill whenever you are modifying the HTML structure or CSS styles in the MixKit to ensure a premium, inclusive experience.

## 1. Interaction Rules
1.  **Keyboard Navigable**: Every control (buttons, sliders, toggles) MUST be reachable via the `Tab` key and activatable via `Enter` or `Space`.
2.  **Focus Visibility**: Never remove the focus ring (`outline: none`) without providing a clearly visible, high-contrast alternative.
3.  **Touch Targets**: Interactive elements must follow the 44x44px rule to prevent accidental taps on mobile/tablet devices.

## 2. ARIA & Semantics
1.  **Descriptive Labels**: Every icon-only button must have an `aria-label` or `title` attribute (e.g., `<button aria-label="Play Track">`).
2.  **State Feedback**: Use `aria-pressed` or `aria-expanded` to communicate the state of toggles (like "Loop" or "Playlist") to screen readers.
3.  **Live Regions**: Use `aria-live="polite"` for track info or status updates if they are critical for the user to hear updates without moving focus.

## 3. Visual Accessibility
1.  **Color Contrast**: Ensure all text and icons meet WCAG AA standards (4.5:1 ratio) against the glassmorphism background.
2.  **Motion Control**: If adding heavy animations, respect the `prefers-reduced-motion` media query to allow users to disable them.
