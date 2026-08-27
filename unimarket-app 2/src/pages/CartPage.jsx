import { useState } from "react";
import AppHeader from "../components/AppHeader";
import CartItem from "../components/CartItem";
import OrderSummary from "../components/OrderSummary";

const INITIAL_ITEMS = [
  {
    id: "tote-bag",
    name: "A tote bag.",
    seller: "Okachi Divine",
    condition: "new",
    price: 20000,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "social-flyers",
    name: "SOCIAL MEDIA FLYERS",
    seller: "Great Emmanuel",
    condition: "new",
    price: 6000,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "girlies-purse",
    name: "A girlies go to purse",
    seller: "Uni Market",
    condition: "new",
    price: 3500,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "chopsticks",
    name: "Chopsticks",
    seller: "AIRIAGBON FAVOUR",
    condition: "new",
    price: 2000,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "spring-roll",
    name: "Spring roll",
    seller: "The chop treat",
    condition: "excellent",
    price: 3000,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1548340748-6d2b7d7da280?auto=format&fit=crop&w=200&q=80",
  },
];

export default function CartPage({ onBack, onContinue }) {
  const [items, setItems] = useState(INITIAL_ITEMS);

  function updateQuantity(id, delta) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen pb-16">
      <AppHeader variant="back" title={`Cart (${itemCount})`} onBack={onBack} cartCount={itemCount} />

      <main className="mx-auto max-w-6xl px-6 pt-4 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-8">
        <ul>
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onIncrease={(id) => updateQuantity(id, 1)}
              onDecrease={(id) => updateQuantity(id, -1)}
            />
          ))}
        </ul>

        <OrderSummary
          subtotal={subtotal}
          onContinue={onContinue}
          className="mt-4 lg:sticky lg:top-24 lg:mt-0"
        />
      </main>
    </div>
  );
}
