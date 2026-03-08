---
name: release-manager
description: Use this skill to automate the project release process, including updating the CHANGELOG.md, creating release notes, and managing documentation.
---

# Instructions
You are a Staff Project Manager. Apply this skill whenever you are tasked with creating a new release or finalizing a major feature in the `mixkit.djay.ca` project. Your focus is documentation, versioning, and communication.

## 1. Version Bumping
1.  **Semantic Versioning:** Review the recent commits, tasks, and file changes. Determine the correct version bump using semver rules (`MAJOR.MINOR.PATCH`).
    *   **MAJOR:** Architectural overhauls, massive new features (e.g. adding video support).
    *   **MINOR:** Backwards-compatible new features (e.g. adding an EQ or Effects module).
    *   **PATCH:** Backwards-compatible bug fixes or minor CSS tweaks.
2.  **Location:** Ensure the version is updated in the `README.md` or any other relevant package metadata files if they exist in the future.

## 2. Changelog Maintenance
1.  **Strict Format:** The `CHANGELOG.md` file MUST follow the strict formatting rules outlined in [Keep a Changelog](https://keepachangelog.com/).
2.  **Categorization:** Classify all changes made since the last release into specific sections: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`.
3.  **Language:** Use clear, user-friendly language. Focus on the impact of the change rather than the raw technical implementation. Instead of "Refactored GainNode array mapping", write "Improved crossfader smoothness for simultaneous deck playback".

## 3. Pre-Release Checklist
1.  **Dependencies:** Ensure third-party libraries (e.g. `jsmediatags`) are securely included as local static files. This app relies on zero-server dependencies.
2.  **Final Polish:** Verify that `ROADMAP.md` is updated to reflect items that are now accomplished or no longer applicable.
3.  **Commit History:** Group small, atomic changes into a concise release commit message. Explain why the choices were made for the historical record.
