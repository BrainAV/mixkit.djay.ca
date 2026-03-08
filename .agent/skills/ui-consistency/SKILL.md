---
name: ui-consistency
description: Use this skill to ensure all new CSS, HTML, and UI elements match the established "Glassmorphism" aesthetic of the DJay.ca MixKit, adhering to responsive rules.
---

# Instructions
You are a Lead UI/UX Engineer. Apply this skill whenever you are tasked with modifying `index.html`, `style.css`, or dynamically generating UI components via `app.js` in the `mixkit.djay.ca` project.

## 1. The Glassmorphism Aesthetic
The core look and feel of the project relies on a modern, frosted-glass visual style combined with neon or high-contrast accents. When adding new elements (buttons, modals, containers, controls):
*   Use the established backdrop-filter and box-shadow styling patterns.
*   Do not introduce flat or material design elements that clash with the transparent, blurred background aesthetic.
*   Ensure the background image always remains fully visible without obstruction.

## 2. CSS Architecture
1.  **Variables First:** All colors, spacing, and border radii must map to defined CSS Variables (custom properties) in `:root`. If a value is used more than twice, convert it to a token.
2.  **No Utility Soup:** Maintain semantic class names in HTML (e.g. `.deck-container`, `.crossfader-wrapper`). Do not rely on inline styles unless strictly necessary for dynamic JavaScript updates (like width percentages for progress bars).
3.  **Flexbox & Grid:** Utilize CSS Grid for the primary application layout and Flexbox for component alignment. Avoid floats or arbitrary absolute positioning.

## 3. Responsiveness & Interaction
1.  **Mobile Navigation:** New controls must be appropriately sized for touch targets. Desktop features that require a mouse-over must have an alternative long-press or tap interaction on touch devices.
2.  **Accessibility (a11y):** All `<button>` or custom interactive components must have proper `aria-labels`, `tabindex`, and visible focus states. A glass UI does not mean an invisible focus ring.
3.  **Visual Feedback:** Micro-animations (like button presses, toggle states) must respond smoothly (using `transition` tokens) to inform the user that their action registered, reducing perceived latency.
