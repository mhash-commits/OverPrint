# Overprint

A small Chrome extension (Manifest V3) for designers, marketers and sales teams. Pick an ad slot on any web page, replace it with your own creative, and capture a screenshot for decks and proposals. Everything runs locally in your browser.

## Features

- **Display banners**: upload images; the size is read from the filename (`banner_728x90.png`). Files without a size in the name default to 300 × 250.
- **Pick a slot on the page**: choose a creative, click the button, then click any element on the page to replace it. Press `Esc` to cancel.
- **Undo**: `Ctrl/Cmd+Z` restores the last swap (and any ads that were hidden). Ignored while typing in a text field.
- **Hide other ads** (optional, on by default): hides other known ad slots on the page so they don't distract from your mockup.
- **Copy screenshot**: copies a screenshot of the visible tab to the clipboard.

## Install (development)

1. Clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Capture the visible tab and act on the current tab when you click the extension. |
| `scripting` | Inject the content script into the current tab on demand. |
| `storage`, `unlimitedStorage` | Store your creatives (as data URLs) locally. |

The extension has no host permissions, makes no network requests and sends no data anywhere.

## Known limitations

- It can't run on `chrome://` pages, the Chrome Web Store, or other pages Chrome blocks extensions from.
- It replaces the whole element you click. It can't edit the inside of a cross-origin ad iframe.
- "Hide other ads" uses a fixed list of common ad patterns (Google, Amazon, Taboola, Outbrain and similar). Ads that don't match those patterns stay visible.
- Zooming the page changes the creative's pixel size in a screenshot, because it scales with the page like any other content.
- Creatives are stored in the browser's local extension storage, up to 50 per library.

## Responsible use

Overprint is meant for **mockups and presentations**: showing a prospect or stakeholder how a creative would look in context. Don't use screenshots to misrepresent real placements, publisher endorsements or campaign results.

## Project layout

```
manifest.json        extension manifest
content.js           element picker, swap, undo
popup.html/css/js    toolbar popup
options.html/css/js  creative library and settings
theme.css            shared design tokens (colors) – edit to re-theme
icons/               extension icon (icon.svg is the source, PNGs are exported from it)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Ideas welcome: custom selector lists, per-site settings, export/import of the library.

## License

[MIT](LICENSE). The icon is original artwork released under the same license.
