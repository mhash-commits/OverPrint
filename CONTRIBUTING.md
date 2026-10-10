# Contributing

Thanks for helping out! The project has no build step: it's plain JavaScript, HTML and CSS.

## Getting started

1. Fork and clone the repo.
2. Load it unpacked from `chrome://extensions` (Developer mode on).
3. After editing, click the reload icon on the extension card. Reload the target page too, since content scripts are injected per page.

## Guidelines

- Keep it dependency-free and Manifest V3 compliant.
- Don't add host permissions or network calls without discussing it in an issue first.
- Build DOM with `textContent`/`createElement`, never `innerHTML` with user-controlled strings (file names, etc.).
- Colors live in `theme.css` as `--as-*` variables; don't hard-code new ones in page CSS.
- Keep changes small and describe how you tested them (page type, Chrome version).

## Reporting bugs

Please include the page URL (or a similar public page), what you clicked, and any console errors.
