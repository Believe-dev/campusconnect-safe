import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Users,
  Zap,
  Star,
  Quote,
  CheckCircle,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OfflineNotice } from "@/components/ui/offline-notice";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import ProductCard, { type ProductCardProduct } from "@/components/marketplace/ProductCard";
import { useAuth } from "@/hooks/useAuth";
import { useFeaturedProducts } from "@/hooks/useProducts";
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

        {/* Hero — two-column on desktop: copy on the left, a floating-card
            visual on the right that dramatizes the "feels safe" headline
            with verification/escrow badges rather than just asserting it in
            text. Mobile stays a single centered column (no room for the
            visual to breathe at that width). */}
        <section className="relative overflow-hidden px-4 py-16 sm:py-24">
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <h1 className="font-sans text-4xl font-bold tracking-tight leading-tight text-flora-ink sm:text-6xl">
                Your campus deserves
                <span className="block text-flora-leaf">a marketplace that feels safe</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-flora-muted sm:text-xl lg:mx-0">
                Join thousands of students across Nigeria trading textbooks,
                electronics, and more in a safe, verified environment.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
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

            {/* Visual showcase — desktop only. Two tilted listing-card
                mocks (echoing DealOfTheDay's fanned-card language) plus two
                floating badges that put the safety pitch in the picture:
                "Verified Student" and "Escrow Protected". */}
            <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
              <div
                aria-hidden="true"
                className="absolute inset-8 rounded-[3rem] bg-gradient-to-br from-flora-leafBright/25 to-flora-leaf/10 blur-2xl"
              />

              {/* Four-corner pinwheel: cards in the top-left/bottom-right
                  corners, badges in the two corners left empty — nothing
                  overlaps another element. */}
              <div className="absolute left-6 top-6 w-56 -rotate-6 rounded-3xl bg-white p-4 shadow-card">
                {products[0]?.images?.[0] ? (
                  <img
                    src={products[0].images[0]}
                    alt=""
                    className="h-28 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-28 rounded-2xl bg-flora-chip" />
                )}
                {products[0] ? (
                  <p className="mt-3 truncate text-sm font-medium text-flora-ink">
                    {products[0].title}
                  </p>
                ) : (
                  <div className="mt-3 h-3 w-3/4 rounded-full bg-flora-chip" />
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-flora-muted">
                    {products[0] ? "Verified seller" : ""}
                  </span>
                  <span className="text-xs font-semibold text-flora-leaf">
                    ₦{(products[0]?.price ?? 15000).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-6 right-6 w-52 rotate-6 rounded-3xl bg-white p-4 shadow-floating">
                {products[1]?.images?.[0] ? (
                  <img
                    src={products[1].images[0]}
                    alt=""
                    className="h-24 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-24 rounded-2xl bg-flora-chip" />
                )}
                {products[1] ? (
                  <p className="mt-3 truncate text-sm font-medium text-flora-ink">
                    {products[1].title}
                  </p>
                ) : (
                  <div className="mt-3 h-3 w-2/3 rounded-full bg-flora-chip" />
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-flora-muted">
                    {products[1] ? "Verified seller" : ""}
                  </span>
                  <span className="text-xs font-semibold text-flora-leaf">
                    ₦{(products[1]?.price ?? 8500).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="absolute right-2 top-2 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-floating">
                <Shield className="h-4 w-4 text-flora-leaf" strokeWidth={1.5} />
                <span className="text-sm font-medium text-flora-ink">Verified Student</span>
              </div>

              <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-full bg-flora-ink px-4 py-2.5 shadow-floating">
                <CheckCircle className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span className="text-sm font-medium text-white">Escrow Protected</span>
              </div>
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

  // Logged-in users land straight on Marketplace instead of a separate
  // "Home" dashboard - Shop/Cart/Chat/Profile are already one tap away via
  // the bottom nav, so a personal greeting page in between was just an
  // extra stop. The logo link (Header.tsx, "to=/") now effectively goes to
  // Marketplace too as a result, which is the intended behavior, not a
  // side effect to work around.
  if (user) {
    return <Navigate to="/marketplace" replace />;
  }

  return (
    <>
      {homeMeta}
      <LoggedOutHome />
    </>
  );
};

export default Index;
