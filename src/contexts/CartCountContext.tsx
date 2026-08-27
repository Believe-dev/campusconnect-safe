import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CartCountContextType {
  cartCount: number;
  loading: boolean;
  refetch: () => void;
  updateOptimistically: (delta: number) => void;
}

const CartCountContext = createContext<CartCountContextType | undefined>(undefined);

// Was a plain hook (useCartCount) that every consumer called independently
// — Header, BottomNav, etc. each ran their own Supabase subscription and,
// worse, each overwrote the same `window.updateCartCountOptimistically` /
// `window.refreshCartCount` globals that Marketplace/Search/ProductDetails
// call after an add/remove-from-cart action. Whichever instance's effect
// ran last "won" that global, so only *one* of Header/BottomNav ever
// actually got the instant optimistic bump — the other had to wait for its
// own realtime round-trip, which is exactly why one felt slower than the
// other. A single provider means one subscription, one piece of state, and
// every consumer (including the optimistic-update call sites) reads and
// writes the same count.
export const CartCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCartCount = async () => {
    if (!user) {
      setCartCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("cart")
        .select(
          `
          quantity,
          products!inner(id)
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      const validItems = data?.filter((item) => item.products?.id) || [];
      const totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(totalItems);
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateOptimistically = (delta: number) => {
    setCartCount((prev) => Math.max(0, prev + delta));
  };

  useEffect(() => {
    if (!user) {
      setCartCount(0);
      setLoading(false);
      return;
    }

    fetchCartCount();

    const channel = supabase
      .channel(`cart_count_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCartCount();
        }
      )
      .subscribe();

    // Cart.tsx, Checkout.tsx, and a couple of realtime hooks all dispatch
    // this after mutating the cart directly (not through this context), so
    // it still needs a listener here to pick those changes up.
    const handleCartUpdate = () => fetchCartCount();
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, [user]);

  return (
    <CartCountContext.Provider
      value={{ cartCount, loading, refetch: fetchCartCount, updateOptimistically }}
    >
      {children}
    </CartCountContext.Provider>
  );
};

export const useCartCount = () => {
  const context = useContext(CartCountContext);
  if (!context) {
    throw new Error("useCartCount must be used within CartCountProvider");
  }
  return context;
};
