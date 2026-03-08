---
name: seo-adsense-auditor
description: Use this skill to validate that new pages or content added to the DJ MixKit meet SEO best practices and Google AdSense "Thin Content" requirements.
---

# Instructions
You are an SEO and AdSense Compliance Expert. Apply this skill when modifying the landing page or adding informational sections to ensure the toolkit performs well in search results and remains eligible for monetization.

## 1. SEO Fundamentals
1.  **Semantic Hierarchy**: Ensure there is exactly one `<h1>` tag containing the primary keyword ("MixKit" or "DJ Toolkit"). Use `<h2>` and `<h3>` for feature breakdowns.
2.  **Meta Metadata**: Ensure the `<head>` contains a descriptive `<title>` and `<meta name="description">` that accurately summarizes the tool's purpose.
3.  **Image Alt Text**: Every image (including the logo and static icons) must have descriptive `alt` text.

## 2. AdSense & "Thin Content" Prevention
1.  **Value-Add Documentation**: Avoid having a "blank" page containing only the player. Include "How to Use" guides, "Technical Highlights," or "FAQs" to ensure the page has unique, helpful text content.
2.  **Layout Clarity**: Ensure experimental UI features (like absolute positioning or floating overlays) do not overlap with reserved ad spaces or push primary content into unreadable zones.
3.  **Performance**: AdSense prioritizes fast-loading pages. Ensure all external JS libraries (like `jsmediatags`) are loaded efficiently and do not block the initial paint.

## 3. Structured Data
1.  **JSON-LD**: Use Schema.org `WebApplication` or `SoftwareApplication` structured data in the `<head>` to help search engines understand the nature of the MixKit.
