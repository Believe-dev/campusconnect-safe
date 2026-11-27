-- Flutterwave product checkout (Phase 1)
--
-- These records are service-role-only. The browser receives only a hosted
-- checkout link and can never mark an order as paid itself.

CREATE TABLE public.order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  selected_size text,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_line_items_order_id_idx ON public.order_line_items (order_id);

ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.flutterwave_order_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  cart_item_ids uuid[] NOT NULL,
  payment_reference text NOT NULL UNIQUE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  flutterwave_transaction_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX flutterwave_order_payment_attempts_buyer_status_idx
  ON public.flutterwave_order_payment_attempts (buyer_id, status);

ALTER TABLE public.flutterwave_order_payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.flutterwave_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flutterwave_webhook_events ENABLE ROW LEVEL SECURITY;
