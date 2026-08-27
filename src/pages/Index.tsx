import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Users,
  Zap,
  Star,
  Quote,
  CheckCircle,
  Store,
  Plus,
  Search,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OfflineNotice } from "@/components/ui/offline-notice";
import { SellerDocumentReminder } from "@/components/seller/SellerDocumentReminder";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import ProductCard, { type ProductCardProduct } from "@/components/marketplace/ProductCard";
import { DealOfTheDay } from "@/components/marketplace/DealOfTheDay";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { useDealsOfTheDay } from "@/hooks/useDealsOfTheDay";
import { ROUTES } from "@/lib/constants";
import type { Product } from "@/lib/types";

const toCardProduct = (product: Product): ProductCardProduct => ({
  id: product.id,
  title: product.title,
  price: product.price,
  stock_quantity: product.stock_quantity ?? 0,
  images: product.images,
  sellerName: product.seller?.full_name || "Unknown seller",
});

const testimonials = [
  {
    quote:
      "UniMarket made it so easy to sell my old textbooks and buy new ones. The verification process gives me confidence.",
    name: "Adebayo",
    university: "University of Lagos",
  },
  {
    quote:
      "Found my laptop at an amazing price from a fellow student. The escrow system made the transaction super safe.",
    name: "Fatima",
    university: "Ahmadu Bello University",
  },
  {
    quote:
      "As a seller, I love how quickly I can list items and connect with buyers on campus. Great platform!",
    name: "Chidi",
    university: "University of Nigeria",
  },
];

// Shared by the desktop fanned layout and the mobile flashcard (see
// LoggedOutHome below) so the card markup only exists once. Defined at
// module scope rather than inline — not strictly required here (it doesn't
// use layoutId), but keeps it consistent with the rest of the codebase's
// convention for anything rendered as a JSX component tag.
const TestimonialCard = ({
  quote,
  name,
  university,
  className,
}: {
  quote: string;
  name: string;
  university: string;
  className?: string;
}) => (
  <div className={cn("relative overflow-hidden rounded-4xl bg-white p-7 shadow-card", className)}>
    <Quote
      aria-hidden="true"
      className="absolute -right-3 -top-3 h-24 w-24 text-flora-chip"
      fill="currentColor"
      strokeWidth={0}
    />
    <div className="relative">
      <div className="mb-4 flex text-amber-400">
        {Array.from({ length: 5 }).map((_, star) => (
          <Star key={star} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="leading-relaxed text-flora-muted">&ldquo;{quote}&rdquo;</p>
      <div className="mt-6 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-chip text-sm font-semibold text-flora-leaf">
          {name[0]}
        </span>
        <div className="min-w-0">
          <div className="font-medium text-flora-ink">{name}</div>
          <div className="truncate text-xs text-flora-muted">{university}</div>
        </div>
      </div>
    </div>
  </div>
);

// Logged-out visitors need a conversion-focused marketing page — hero
// pitch, trust stats, feature highlights, real inventory, testimonials,
// closing CTA. Reskinned to flora tokens but keeps the same content
// structure the page already had.
const LoggedOutHome = () => {
  const { products, loading } = useFeaturedProducts();
  const navigate = useNavigate();

  // Mobile flashcard auto-cycle — the fanned/overlapping desktop layout
  // doesn't work stacked on a narrow column, so mobile instead shows one
  // testimonial at a time and rotates through them on a timer.
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={async () => {}} className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <OfflineNotice />
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-16 sm:py-24">
          <div className="relative mx-auto max-w-4xl text-center">
            <h1 className="font-display text-4xl font-semibold leading-tight text-flora-ink sm:text-6xl">
              Your campus deserves
              <span className="block text-flora-leaf">a marketplace that feels safe</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-flora-muted sm:text-xl">
              Join thousands of students across Nigeria trading textbooks,
              electronics, and more in a safe, verified environment.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to={ROUTES.auth}
                className="flex items-center justify-center gap-2 rounded-full bg-flora-ink px-8 py-4 text-base font-medium text-white transition hover:brightness-110"
              >
                Start Shopping <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/marketplace"
                className="flex items-center justify-center gap-2 rounded-full border border-flora-ink/20 px-8 py-4 text-base font-medium text-flora-ink transition hover:bg-white/60"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials, directly under the hero — matches the reference's
            own layout (its overlapping question cards sit right below the
            headline, before any section heading). Two different layouts
            per breakpoint since a fanned/rotated deck doesn't work stacked
            on a narrow column: desktop gets the fanned cards, mobile gets
            a one-at-a-time flashcard that auto-advances on a timer. */}
        <section className="px-4 pb-16 pt-4 sm:pb-20">
          <div className="mx-auto max-w-5xl">
            {/* Desktop/tablet — fanned, genuinely overlapping (negative
                margins on the outer two, not just tilted in their own grid
                column), the middle one raised, highlighted, and
                un-rotated. Hovering a card straightens it back to 0deg,
                the "pick one up" motion a real fanned deck would give. */}
            <div className="hidden gap-6 sm:grid sm:grid-cols-3 sm:items-center sm:gap-0">
              {testimonials.map((t, i) => {
                const featured = i === 1;
                const rotate = i === 0 ? "sm:-rotate-6" : i === 2 ? "sm:rotate-6" : "";
                const overlap = i === 0 ? "sm:mr-[-1.75rem]" : i === 2 ? "sm:ml-[-1.75rem]" : "";
                return (
                  <TestimonialCard
                    key={t.name}
                    {...t}
                    className={cn(
                      "transition-transform duration-300 sm:hover:z-30 sm:hover:!rotate-0 sm:hover:-translate-y-2",
                      rotate,
                      overlap,
                      featured ? "sm:z-20 sm:-translate-y-3 sm:shadow-floating" : "sm:z-10"
                    )}
                  />
                );
              })}
            </div>

            {/* Mobile — one flashcard at a time, auto-advancing every 4.5s
                (see the effect above), with tappable dots to jump directly
                to a testimonial (which also resets the timer's read of
                "current", since it's driven off the same state). */}
            <div className="sm:hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <TestimonialCard {...testimonials[activeTestimonial]} />
                </motion.div>
              </AnimatePresence>
              <div className="mt-5 flex justify-center gap-1.5">
                {testimonials.map((t, i) => (
                  <button
                    key={t.name}
                    type="button"
                    aria-label={`Show testimonial from ${t.name}`}
                    onClick={() => setActiveTestimonial(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === activeTestimonial ? "w-6 bg-flora-leaf" : "w-1.5 bg-flora-chip"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features — the reference's grid isn't a uniform 2x2 of equal
            boxes, it's an asymmetric bento pattern: row 1 is narrow-then-
            wide, row 2 is wide-then-narrow, which gives the section a
            staggered rhythm instead of four identical tiles. Reproduced
            here with a 5-column grid (span 2/3 per card) rather than a
            plain grid-cols-2. */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-3xl font-semibold text-flora-ink sm:text-4xl">
                A path to buying and selling better
              </h2>
              <p className="mt-3 text-lg text-flora-muted">
                Built specifically for Nigerian students, by students
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-5">
              {[
                {
                  icon: Shield,
                  title: "100% Secure",
                  copy: "Student ID verification, escrow payments, and monitored transactions ensure your safety.",
                  color: "text-flora-leaf",
                  span: "sm:col-span-2",
                },
                {
                  icon: Users,
                  title: "Campus Community",
                  copy: "Connect with verified students from your university and nearby campuses.",
                  color: "text-flora-ink",
                  span: "sm:col-span-3",
                },
                {
                  icon: Zap,
                  title: "Instant Deals",
                  copy: "Real-time messaging, quick payments, and same-day pickup options.",
                  color: "text-flora-leaf",
                  span: "sm:col-span-3",
                },
                {
                  icon: Percent,
                  title: "Zero Commission",
                  copy: "Sellers keep 100% of every sale — no cuts, no hidden fees, ever.",
                  color: "text-flora-ink",
                  span: "sm:col-span-2",
                },
              ].map(({ icon: Icon, title, copy, color, span }) => (
                <div
                  key={title}
                  className={cn(
                    "relative overflow-hidden rounded-4xl bg-white p-7 shadow-card sm:p-8",
                    span
                  )}
                >
                  {/* Just the line icon, no fill/tile/background behind it
                      — a boxed or backgrounded icon is the one thing every
                      template does, a plain stroke mark reads as more
                      considered/editorial instead. */}
                  <Icon className={cn("mb-6 h-9 w-9", color)} strokeWidth={1.5} />
                  <h3 className="mb-2 text-xl font-semibold text-flora-ink">{title}</h3>
                  <p className="leading-relaxed text-flora-muted">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Latest products preview — real ProductCard, not the old
            components/home/ProductGrid duplicate (removed as dead code, see
            summary). No filter UI here on purpose: this is a teaser, not
            the browse experience — that's what Marketplace is for. */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-semibold text-flora-ink sm:text-4xl">
                Latest Products
              </h2>
              <p className="mt-3 text-lg text-flora-muted">
                Fresh listings from students across Nigeria
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-card">
                    <div className="h-32 bg-flora-chip sm:h-40" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-3/4 rounded bg-flora-chip" />
                      <div className="h-4 w-1/2 rounded bg-flora-chip" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-6">
                {products.slice(0, 8).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={toCardProduct(product)}
                    isInCart={false}
                    onSelect={() => navigate(`/product/${product.id}`)}
                    onToggleCart={() => navigate(ROUTES.auth)}
                  />
                ))}
              </div>
            )}

            <div className="mt-12 text-center">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 rounded-full border border-flora-ink/20 px-8 py-4 text-base font-medium text-flora-ink transition hover:bg-white/60"
              >
                View All Products <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA — a couple of soft glow blobs instead of one flat
            solid-ink block, so it reads as a lit-up feature moment rather
            than a plain color rectangle with text centered in it. */}
        <section className="relative mx-4 mb-16 overflow-hidden rounded-4xl bg-flora-ink px-4 py-16 text-center sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-flora-leafBright/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-flora-leaf/30 blur-3xl"
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Join Nigeria's Largest Student Marketplace
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              Start buying and selling with verified students today. It's free to
              join!
            </p>
            <Link
              to={ROUTES.auth}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-flora-ink transition hover:brightness-95"
            >
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white/80">
              {["Free to join", "Verified students only", "Secure payments"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </PullToRefresh>
    </div>
  );
};

// Logged-in users already have Shop/Live/Cart/Chat/Profile one tap away via
// the bottom nav — repeating the marketing pitch and a second product grid
// here would just be duplicate surface area. This is a lightweight,
// personal landing instead: a greeting, today's deals, and quick entry
// points into the app's actual functionality.
const LoggedInHome = () => {
  const { profile } = useProfile();
  const { deals, loading: dealsLoading } = useDealsOfTheDay();
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const canSell =
    profile?.account_type !== "buyer" && profile?.seller_status === "approved";

  const secondaryActions = [
    { to: "/live-feed", icon: Zap, label: "Live", copy: "See what's new" },
    canSell
      ? { to: "/sell", icon: Plus, label: "Sell", copy: "List an item" }
      : { to: "/sellers", icon: Search, label: "Sellers", copy: "Find a seller" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={async () => {}} className="min-h-screen">
        <main className="mx-auto max-w-6xl px-3 pt-6 sm:px-6 sm:pt-8">
          <OfflineNotice />
          <SellerDocumentReminder />

          <h1 className="text-3xl font-semibold leading-tight text-flora-ink sm:text-4xl">
            Hi, {firstName} 👋
          </h1>
          <p className="mt-1 text-flora-muted">
            Here's what's new around campus today.
          </p>

          {!dealsLoading && deals.length > 0 && <DealOfTheDay products={deals} onSelect={(id) => navigate(`/product/${id}`)} />}

          {/* Bento layout instead of three identical icon-in-a-circle
              cards: Shop is the thing most people open this page to do,
              so it gets a full-bleed green feature card matching the Deal
              of the Day treatment above it; Live/Sell are secondary, so
              they stay small and share the remaining column. */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:grid-rows-2 sm:gap-4">
            <Link
              to="/marketplace"
              className="col-span-2 flex flex-col justify-between overflow-hidden rounded-4xl bg-gradient-to-br from-flora-leafBright to-flora-leaf p-6 text-white shadow-floating transition hover:brightness-105 sm:col-span-2 sm:row-span-2 sm:p-8"
            >
              <Store className="h-9 w-9" />
              <div>
                <h3 className="mt-6 text-2xl font-semibold">Shop the Marketplace</h3>
                <p className="mt-1 text-white/80">Browse listings from students near you</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                  Browse now <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>

            {secondaryActions.map(({ to, icon: Icon, label, copy }) => (
              <Link
                key={label}
                to={to}
                className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-card transition hover:brightness-105"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flora-chip">
                  <Icon className="h-5 w-5 text-flora-leaf" />
                </span>
                <div className="mt-4">
                  <div className="font-medium text-flora-ink">{label}</div>
                  <div className="text-xs text-flora-muted">{copy}</div>
                </div>
              </Link>
            ))}
          </div>

          <div className="h-10" aria-hidden="true" />
        </main>
      </PullToRefresh>
    </div>
  );
};

const Index = () => {
  const { user, loading } = useAuth();

  const homeMeta = (
    <Helmet>
      <title>UniMarket – Nigerian University Marketplace | Founded October 22, 2025</title>
      <meta
        name="description"
        content="UniMarket is a Nigerian university marketplace solo-founded and fully built by Joshua Friday. Officially launched October 22, 2025."
      />
      <link rel="canonical" href="https://unimarket.com.ng/" />
    </Helmet>
  );

  if (loading) {
    return (
      <>
        {homeMeta}
        <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo" />
      </>
    );
  }

  return (
    <>
      {homeMeta}
      {user ? <LoggedInHome /> : <LoggedOutHome />}
    </>
  );
};

export default Index;
