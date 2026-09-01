import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, CreditCard, CheckCircle, BookOpen, Store, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/common/PullToRefresh";

const secondaryFeatures = [
  {
    title: "Built-in messaging",
    copy: "Talk directly with buyers and sellers before you commit.",
  },
  {
    title: "Campus delivery",
    copy: "Meet on campus or arrange delivery within your university area.",
  },
  {
    title: "Rating system",
    copy: "Every trade builds a public track record you can trust.",
  },
  {
    title: "Campus community",
    copy: "Trade with students from your own university first.",
  },
];

const roles = {
  buyer: {
    label: "For Buyers",
    icon: BookOpen,
    steps: [
      { title: "Browse", copy: "Search listings from verified student sellers." },
      { title: "Contact", copy: "Ask questions and negotiate over chat." },
      { title: "Pay", copy: "Your payment sits in escrow until you confirm." },
      { title: "Receive", copy: "Meet on campus or arrange delivery." },
    ],
  },
  seller: {
    label: "For Sellers",
    icon: Store,
    steps: [
      { title: "Get verified", copy: "Submit your student ID and a photo." },
      { title: "List", copy: "Add photos and a description once approved." },
      { title: "Manage", copy: "Respond to buyers from your dashboard." },
      { title: "Get paid", copy: "Funds release once the buyer confirms." },
    ],
  },
} as const;

const safetyColumns = [
  [
    {
      title: "Identity verification",
      copy: "Every seller verifies their student status before listing.",
    },
    {
      title: "Escrow protection",
      copy: "Payments are held until both sides are satisfied.",
    },
  ],
  [
    {
      title: "Campus-only access",
      copy: "Only verified university students can participate.",
    },
    {
      title: "Responsive support",
      copy: "We respond when we can to help resolve any issues.",
    },
  ],
];

export default function LearnMore() {
  const [activeRole, setActiveRole] = useState<"buyer" | "seller">("buyer");
  const role = roles[activeRole];

  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          {/* Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-sans text-4xl font-bold tracking-tight leading-tight text-flora-ink sm:text-5xl">
              How <span className="text-flora-leaf">UniMarket</span> works
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-flora-muted">
              A secure marketplace built for university students to buy and
              sell textbooks, electronics, and other campus essentials safely
              within their academic community.
            </p>
          </div>

          {/* Trust — a lead panel for the two things that actually make this
              safe (verification + escrow), then the rest as a Relume
              "Layout 611" numbered list (bold ghost numeral, no icon boxes,
              one rule under the panel on desktop, per-row rules on mobile)
              rather than a grid of identical icon cards. */}
          <div className="mt-14">
            <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-flora-leafBright to-flora-leaf p-8 text-white shadow-floating sm:p-10">
              <Shield className="h-10 w-10" strokeWidth={1.5} />
              <h2 className="mt-6 text-2xl font-semibold sm:text-3xl">
                Verified sellers. Escrow-protected payments.
              </h2>
              <p className="mt-3 max-w-2xl text-white/85">
                Every seller confirms their student ID before they can list
                anything, and every payment sits in escrow until you confirm
                the item arrived. Those two rules are the foundation
                everything else is built on.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4" />
                Secure payments, every time
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-x-16 sm:grid-cols-2 sm:border-t sm:border-flora-ink/10 sm:pt-8">
              {secondaryFeatures.map(({ title, copy }, i) => (
                <div
                  key={title}
                  className="flex gap-6 border-t border-flora-ink/10 py-6 first:border-none sm:border-none sm:py-0 sm:[&:nth-child(n+3)]:mt-8"
                >
                  <span className="flex-none font-sans text-3xl font-bold text-flora-leaf/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-semibold text-flora-ink">{title}</h3>
                    <p className="mt-1 text-sm text-flora-muted">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works — a role toggle instead of showing both paths at
              once, and a numeral-led step row instead of numbered circles
              in cards. */}
          <div className="mt-20">
            <div className="flex flex-col items-center">
              <h2 className="font-display text-3xl font-semibold text-flora-ink sm:text-4xl">
                How it works
              </h2>
              <div className="mt-6 inline-flex rounded-full bg-white p-1 shadow-card">
                {(Object.keys(roles) as Array<keyof typeof roles>).map((key) => {
                  const Icon = roles[key].icon;
                  const active = key === activeRole;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveRole(key)}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition",
                        active ? "bg-flora-ink text-white" : "text-flora-ink hover:bg-flora-chip"
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      {roles[key].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
              {role.steps.map((step, i) => (
                <div
                  key={step.title}
                  className={cn("px-0 lg:px-6", i !== 0 && "lg:border-l lg:border-flora-ink/10")}
                >
                  <span className="font-display text-4xl font-semibold text-flora-leaf/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-flora-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-flora-muted">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Safety — same plain description-list treatment as the trust
              section above, not a second white card box. */}
          <div className="mt-20">
            <h2 className="font-display text-3xl font-semibold text-flora-ink sm:text-4xl">
              Safety, built in
            </h2>
            <div className="mt-8 grid gap-x-12 sm:grid-cols-2">
              {safetyColumns.map((column, colIndex) => (
                <div key={colIndex} className="divide-y divide-flora-ink/10">
                  {column.map((point) => (
                    <div key={point.title} className="flex items-start gap-3 py-4 first:pt-0">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-flora-leaf" strokeWidth={1.5} />
                      <div>
                        <h3 className="font-semibold text-flora-ink">{point.title}</h3>
                        <p className="text-sm text-flora-muted">{point.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Closing — text-only, no dark box. */}
          <div className="mt-24 text-center">
            <h2 className="font-display text-3xl font-semibold text-flora-ink sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-flora-muted">
              Join students already using UniMarket to buy and sell safely on
              campus.
            </p>
            <Link
              to="/marketplace"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-flora-ink px-8 py-4 text-base font-medium text-white transition hover:brightness-110"
            >
              Browse Marketplace <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
}
