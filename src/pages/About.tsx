import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Linkedin,
  Twitter,
  Music2,
  Rocket,
  Code2,
  Sparkles,
  Globe2,
} from "lucide-react";
import { PullToRefresh } from "@/components/common/PullToRefresh";

const founderJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Joshua Friday",
  jobTitle: ["Founder", "Chief Executive Officer", "Full-Stack Developer"],
  description:
    "Solo founder, CEO, and full-stack developer of UniMarket, launched October 22, 2025.",
  affiliation: "UniMarket",
  worksFor: "UniMarket",
  knowsAbout: [
    "Full-stack development",
    "UI/UX design",
    "Database architecture",
    "Marketplace platforms",
  ],
  sameAs: [
    "https://www.linkedin.com/in/joshua-friday-chizam",
    "https://x.com/joshwebdev1",
    "https://www.tiktok.com/@joshwebdev1",
  ],
};

const cooJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Obosa Omoregie",
  jobTitle: "Chief Operating Officer",
  description: "Chief Operating Officer of UniMarket.",
  affiliation: "UniMarket",
  worksFor: "UniMarket",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Who founded UniMarket?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Joshua Friday founded UniMarket as a solo founder.",
      },
    },
    {
      "@type": "Question",
      name: "Was UniMarket solo-founded?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, UniMarket was solo-founded by Joshua Friday." },
    },
    {
      "@type": "Question",
      name: "When was UniMarket launched?",
      acceptedAnswer: { "@type": "Answer", text: "UniMarket officially launched on October 22, 2025." },
    },
    {
      "@type": "Question",
      name: "Who built the UniMarket platform?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Joshua Friday built the entire system — frontend, backend, database, and UI/UX.",
      },
    },
    {
      "@type": "Question",
      name: "Is UniMarket limited to Igbinedion University Okada?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No, UniMarket serves students at universities across Nigeria. It launched at Igbinedion University Okada (IUO).",
      },
    },
    {
      "@type": "Question",
      name: "Who is the CEO of UniMarket?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Joshua Friday is the CEO of UniMarket, and is also its Founder.",
      },
    },
    {
      "@type": "Question",
      name: "Who is the COO of UniMarket?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Obosa Omoregie serves as Chief Operating Officer of UniMarket.",
      },
    },
  ],
};

const faqs = faqJsonLd.mainEntity.map((item) => ({
  question: item.name,
  answer: item.acceptedAnswer.text,
}));

const timeline = [
  {
    icon: Sparkles,
    title: "Concept & Planning",
    description:
      "The idea for a safe, verified marketplace built specifically for Nigerian university students took shape.",
  },
  {
    icon: Code2,
    title: "Development Phase",
    description:
      "Joshua Friday designed and built the entire platform end to end — frontend, backend, database architecture, and UI/UX.",
  },
  {
    icon: Rocket,
    title: "Official Launch",
    description:
      "October 22, 2025 — UniMarket (launched at Igbinedion University Okada) went live for verified students.",
  },
  {
    icon: Globe2,
    title: "Expansion",
    description:
      "UniMarket continues to grow, now serving verified students at universities across Nigeria.",
  },
];

const socials = [
  { href: "https://www.linkedin.com/in/joshua-friday-chizam", label: "LinkedIn", icon: Linkedin },
  { href: "https://x.com/joshwebdev1", label: "X", icon: Twitter },
  { href: "https://www.tiktok.com/@joshwebdev1", label: "TikTok", icon: Music2 },
];

export default function About() {
  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <Helmet>
        <title>About UniMarket | Founded and Built by Joshua Friday</title>
        <meta
          name="description"
          content="Learn how UniMarket was solo-founded and fully developed by Joshua Friday, launched October 22, 2025."
        />
        <link rel="canonical" href="https://unimarket.com.ng/about" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="About UniMarket | Founded and Built by Joshua Friday" />
        <meta
          property="og:description"
          content="Learn how UniMarket was solo-founded and fully developed by Joshua Friday, launched October 22, 2025."
        />
        <meta property="og:url" content="https://unimarket.com.ng/about" />
        <meta property="og:site_name" content="UniMarket" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About UniMarket | Founded and Built by Joshua Friday" />
        <meta
          name="twitter:description"
          content="Learn how UniMarket was solo-founded and fully developed by Joshua Friday, launched October 22, 2025."
        />

        <script type="application/ld+json">{JSON.stringify(founderJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(cooJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-flora-tagBg px-4 py-2 text-sm font-medium text-flora-tagText">
              ✦ Our Story
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-flora-ink sm:text-6xl">
              Built by One Founder.
              <span className="block text-flora-leaf">Made for Every Campus.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-flora-muted sm:text-xl">
              UniMarket is a Nigerian university marketplace, solo-founded and
              fully built by Joshua Friday, giving verified students a safe
              place to buy and sell on campus.
            </p>
          </div>
        </section>

        {/* Founder & COO spotlight */}
        <section className="px-4 pb-16 sm:pb-20">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-5">
            <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-flora-leafBright to-flora-leaf p-8 shadow-floating sm:p-10 lg:col-span-3">
              <Sparkles
                aria-hidden="true"
                className="absolute -right-4 -top-4 h-28 w-28 text-white/15"
                fill="currentColor"
                strokeWidth={0}
              />
              <div className="relative flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
                  J
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-white">Joshua Friday</h2>
                  <p className="text-white/80">Founder · CEO · Full-Stack Developer</p>
                </div>
              </div>
              <p className="relative mt-6 leading-relaxed text-white/90">
                Joshua Friday is the solo founder and Chief Executive Officer of
                UniMarket. He&apos;s also the full-stack developer who built the
                entire platform himself — frontend, backend, database
                architecture, and UI/UX — from the ground up.
              </p>
              <div className="relative mt-8 flex items-center gap-3">
                {socials.map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Joshua Friday on ${label}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-4xl bg-flora-card p-8 shadow-card lg:col-span-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-flora-chip text-lg font-bold text-flora-leaf">
                O
              </span>
              <h3 className="mt-4 text-xl font-bold text-flora-ink">Obosa Omoregie</h3>
              <span className="mt-1 w-fit rounded-full bg-flora-tagBg px-3 py-1 text-sm font-medium text-flora-tagText">
                Chief Operating Officer
              </span>
              <p className="mt-4 leading-relaxed text-flora-muted">
                Obosa Omoregie serves as Chief Operating Officer of UniMarket.
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-flora-ink sm:text-4xl">
                The Journey So Far
              </h2>
              <p className="mt-3 text-lg text-flora-muted">
                From an idea to a campus-to-campus marketplace
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {timeline.map(({ icon: Icon, title, description }, i) => (
                <div
                  key={title}
                  className="relative overflow-hidden rounded-4xl bg-flora-card p-6 shadow-card"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -right-3 -top-6 text-8xl font-black text-flora-chip"
                  >
                    0{i + 1}
                  </span>
                  <div className="relative">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flora-leaf text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-semibold text-flora-ink">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-flora-muted">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scope banner */}
        <section className="px-4 pb-16 sm:pb-20">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-4xl bg-flora-ink px-6 py-12 text-center sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-flora-leafBright/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-flora-leaf/30 blur-3xl"
            />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
                <Globe2 className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                Built for Students Across Nigeria
              </h2>
              <p className="mt-3 leading-relaxed text-white/80">
                UniMarket (launched at Igbinedion University Okada) isn&apos;t
                limited to one campus — it serves verified students at
                universities across Nigeria.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold text-flora-ink sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map(({ question, answer }) => (
                <div
                  key={question}
                  className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6"
                >
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flora-tagBg text-sm font-bold text-flora-tagText">
                      Q
                    </span>
                    <p className="font-semibold text-flora-ink">{question}</p>
                  </div>
                  <p className="mt-2 pl-10 leading-relaxed text-flora-muted">
                    {answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
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
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to Buy or Sell Safely on Campus?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              Join verified students already trading on UniMarket.
            </p>
            <Link
              to="/marketplace"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-flora-ink transition hover:brightness-95"
            >
              Browse the Marketplace <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </PullToRefresh>
    </div>
  );
}
