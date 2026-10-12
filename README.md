# WhatsApp Smooth Scroll

A standalone Chrome/Chromium extension that reduces scrolling stutter in WhatsApp Web message history while hardware acceleration stays enabled.

## Install

1. Download and extract `whatsapp-smooth-scroll.zip`.
2. Open `chrome://extensions` in Chrome, Chromium, Brave, or Edge.
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select the extracted folder containing `manifest.json`.
5. Open or reload WhatsApp Web.

Smooth scrolling is enabled by default. Click the extension's toolbar icon to turn it off or on. The preference applies immediately to open WhatsApp tabs and survives browser restarts. After installing an update, reload the extension and WhatsApp.

For a source checkout, load the `extension` folder.

## Why scrolling lagged and how the workaround helps

The reported lag occurred when scrolling a chat's message history with hardware acceleration enabled. Disabling the browser's GPU removed it. That points to a rendering or compositing problem in WhatsApp's message viewport. The exact underlying WhatsApp bug has not been established.

The extension applies this CSS only to the message viewport:

```css
html:not([data-wa-smooth-scroll-disabled]) #main [data-testid="conversation-panel-messages"] {
  transform: translateZ(0) !important;
}
```

`translateZ(0)` encourages the browser to give the viewport its own GPU compositing layer without moving it. Changing how the browser composites this area made scrolling smoother in the tested session while hardware acceleration stayed enabled. Disabling the rule brought the lag back.

The original message scroller, wheel/keyboard/touch handling, scrollbar, and message virtualization remain in place. The conversation list and composer receive no rendering override. The rule automatically applies when WhatsApp replaces a message pane.

The extension does not disable the browser's GPU, remove image blur, alter bubble shadows, or change the chat background.

This is a workaround for message scrolling, not a universal fix for every WhatsApp slowdown. Effectiveness depends on the browser and GPU. WhatsApp can change the viewport selector; if it no longer matches, the rule has no effect. Turning the switch off removes the override. Reload WhatsApp after disabling or uninstalling the extension.

## Privacy and permissions

The only permission is `storage`, used for one boolean preference: enabled or disabled. The content script runs only on `https://web.whatsapp.com/*`.

There is no chat scraping, chat-model access, account export, analytics, remote code, external backend, or message-sending functionality. The extension does not read message text or chat names. It uses a scoped CSS rule and a document attribute to enable or disable it. The popup writes the preference directly to Chrome extension storage. There are no runtime dependencies bundled with the extension.

## Validation

```sh
npm ci
npx playwright install chromium
npm run check
npm test
npm run package
```

Browser tests load the actual unpacked extension against a synthetic chat. They cover its default state, popup controls, persistence across tabs and reloads, unchanged viewport geometry and scroll position, draft and text-selection preservation, native wheel scrolling, menu/media interactions, replacement message panes, disposal, and light/dark popup rendering. These tests verify behavior, not GPU performance on every machine.

In a signed-in WhatsApp session with hardware acceleration enabled, the message-history scrolling was smoother with the viewport layer enabled. Disabling that same rule brought the lag back. During that comparison, the 95th percentile of sampled animation-frame intervals while scrolling was approximately 18 ms with the layer and 103 ms without it. These are frame-callback measurements from unequal manual scroll runs, not a controlled cross-platform benchmark or direct GPU presentation measurements. They corroborate the user's on/off comparison. Some stalls remained.

## Package

`npm run package` creates `dist/whatsapp-smooth-scroll.zip` from the extension files only. Tests, dependencies, diagnostics, and browser data are excluded. Icons can be regenerated with `node scripts/create-icons.cjs` after installing Chromium for Playwright.
