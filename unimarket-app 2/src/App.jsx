import { useState } from "react";
import ExplorePage from "./pages/ExplorePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";

/**
 * NOTE for integration: this state-based screen switch stands in for real
 * routing. When wiring this into the actual app, replace `screen` with
 * your router (React Router / Next.js routes) — the page components
 * themselves don't need to change, they just need `onBack` /
 * `onSelectProduct` / `onBuyNow` / `onContinue` wired to navigation calls
 * instead of setState.
 */
export default function App() {
  const [screen, setScreen] = useState("explore");

  function handleNavigate(key) {
    if (key === "explore" || key === "cart") setScreen(key);
    // "wishlist" / "profile" intentionally no-ops here — wire to real
    // routes when this is merged into the app.
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      {screen === "explore" && (
        <ExplorePage
          onSelectProduct={() => setScreen("product")}
          onNavigate={handleNavigate}
        />
      )}
      {screen === "product" && (
        <ProductDetailPage
          onBack={() => setScreen("explore")}
          onBuyNow={() => setScreen("cart")}
        />
      )}
      {screen === "cart" && (
        <CartPage onBack={() => setScreen("product")} onContinue={() => setScreen("explore")} />
      )}
    </div>
  );
}
