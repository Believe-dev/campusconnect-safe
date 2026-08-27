# UniMarket — responsive, real-device-ready

Home, Product Detail, and Cart, built as real pages (no phone-mockup chrome) that adapt from phone width up through tablet and desktop.

## What changed from the previous version

- **Removed the phone frame and fake status bar.** Those were demo-only device chrome for previewing in this chat — they were never meant to ship, and leaving them in would risk Claude Code treating "9:41 / signal bars / battery icon" as real UI to build. A real mobile browser or WebView already draws its own status bar; the app should just fill the viewport.
- **Added a shared, responsive `AppHeader`** instead of one-off headers per page. On mobile it's compact (logo + search icon, or back button + title). At `md` and up it grows an inline search bar (home) and always-visible wishlist/cart icons, since there's room and a mouse-driven user expects them visible rather than tucked in a tab bar.
- **`BottomNav` is now mobile-only** (`md:hidden`) and fixed to the bottom with safe-area padding for devices with a home indicator. On Product Detail and Cart, the tab bar is hidden in favor of a full-width primary action ("Buy Now" / "Proceed to Checkout") — a deliberate, common mobile-commerce pattern: don't compete with the tab bar for thumb space when there's one clear next action.
- **`BottomNav` now reflects the actual current screen** (`current` prop) instead of hardcoding "Shop" as always-active — small correctness fix so it behaves like real navigation once wired to routing.
- **Every page now has a real desktop layout**, not just a scaled-up phone screen:
  - **Home**: the featured deal card goes from stacked (mobile) to a side-by-side image+details card (`sm:flex-row`), and the product grid scales 2 → 3 → 4 columns (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`).
  - **Product Detail**: stacked image-then-info on mobile; a real two-column layout on `lg:` with the image sticky on scroll, matching how most e-commerce PDPs behave on desktop.
  - **Cart**: stacked list-then-summary on mobile; list + sticky order-summary sidebar on `lg:`, extracted into its own `OrderSummary` component for reuse.
  - All content is wrapped in `max-w-6xl mx-auto` so it doesn't stretch edge-to-edge into an unreadable single column on wide monitors.
- **Home page now has a real catalog**, not just one hero card: 12 products spanning fashion, electronics, food, and books, in a responsive grid below the featured deal.
- **Safe-area handling**: `viewport-fit=cover` in `index.html`, plus `env(safe-area-inset-top/bottom)` padding in `AppHeader` and `BottomNav`, so content doesn't sit under a phone's notch or home indicator.

## Viewing it on your phone

The dev server needs to bind to your network, not just `localhost` — already configured in `vite.config.js` (`server.host: true`).

1. Make sure your phone and computer are on the **same Wi-Fi network**.
2. Find your computer's local IP address:
   - **Mac**: `ipconfig getifaddr en0` (Wi-Fi) — try `en1` if `en0` returns nothing.
   - **Windows**: `ipconfig` and look for "IPv4 Address" under your active adapter.
3. Run the dev server:
   ```bash
   npm install
   npm run dev
   ```
   Vite will print both a `Local` and a `Network` URL — the Network one (e.g. `http://192.168.1.42:5173`) is what your phone needs.
4. Open that Network URL in your phone's browser.

**If it doesn't connect:**
- macOS firewall may be blocking incoming connections to Node — System Settings → Network → Firewall, allow Node.js/your terminal.
- Some routers isolate devices from each other ("AP/client isolation," common on public or campus Wi-Fi) — this would explain a same-network failure and isn't fixable from your laptop; try a personal hotspot instead.
- If you're not on the same network at all (testing over cellular data, showing someone remotely), use a tunnel instead: `npx localtunnel --port 5173` or `npx ngrok http 5173`, either of which gives you a public URL that forwards to your local server.

## Structure

```
src/
  components/
    AppHeader.jsx      # shared responsive header (home + back variants)
    BottomNav.jsx        # mobile-only fixed tab bar
    ProductCard.jsx        # home page grid card
    OrderSummary.jsx         # cart totals + checkout CTA
    CartItem.jsx               # cart line item
    Tag.jsx, IconButton.jsx, FilterChip.jsx, Stepper.jsx, StatBadge.jsx
  pages/
    ExplorePage.jsx    # Home — featured deal + 12-product grid
    ProductDetailPage.jsx  # stacked mobile / two-column desktop
    CartPage.jsx              # stacked mobile / list+sidebar desktop
  App.jsx    # screen switch stands in for real routing — see the comment in the file
```

## Handing this to Claude Code

Same as before — unzip next to your UniMarket repo and point Claude Code at it as a finished reference, merging the `flora` tokens first and then rebuilding your real pages against it with your real data/routing. One addition worth telling it explicitly this time: **replace the `useState`-based screen switch in `App.jsx` with your actual router** — the page components' props (`onBack`, `onSelectProduct`, `onBuyNow`, `onContinue`) are already router-agnostic callbacks, so this should be a thin wiring change, not a rewrite.
