import { HeartIcon, StarIcon, TruckIcon, ShieldCheckIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
import AppHeader from "../components/AppHeader";
import IconButton from "../components/IconButton";
import StatBadge from "../components/StatBadge";
import Tag from "../components/Tag";

const TAGS = ["New", "Campus Verified", "50 Available"];

export default function ProductDetailPage({ onBack, onBuyNow }) {
  return (
    <div className="min-h-screen pb-16">
      <AppHeader variant="back" title="Product Details" onBack={onBack} cartCount={5} />

      <main className="mx-auto max-w-6xl px-6 pt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12 lg:pt-6">
        <div className="relative lg:sticky lg:top-24">
          <div className="relative aspect-square w-full overflow-hidden rounded-4xl bg-white/40 sm:aspect-[4/3] lg:aspect-square">
            <img
              src="https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=900&q=80"
              alt="A tote bag by Okachi Divine"
              className="h-full w-full object-cover"
            />

            <StatBadge icon={StarIcon} label="Seller Rating" progress={92} className="left-4 top-4" />
            <StatBadge
              icon={ShieldCheckIcon}
              label="Escrow Protected"
              progress={100}
              className="left-2 top-[46%]"
            />
            <StatBadge
              icon={TruckIcon}
              label="Fast Delivery"
              progress={78}
              className="right-2 top-[38%]"
            />
          </div>
        </div>

        <section className="mt-6 rounded-4xl bg-white/70 px-6 py-6 shadow-card backdrop-blur-sm sm:px-8 sm:py-8 lg:mt-0">
          <div className="flex items-center justify-between">
            <Tag variant="outline" icon={CheckBadgeIcon}>
              by Okachi Divine
            </Tag>
            <IconButton icon={HeartIcon} label="Save A tote bag." tone="light" />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-flora-ink sm:text-3xl">A tote bag.</h1>
            <p className="text-xl font-semibold text-flora-ink sm:text-2xl">&#8358;20,000</p>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-flora-muted">
            A spacious everyday tote in soft neutral canvas — roomy enough for lecture
            notes and laptop, sturdy enough for a market run. Pickup or campus delivery
            available.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {TAGS.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>

          <button
            type="button"
            onClick={onBuyNow}
            className="mt-6 w-full rounded-full bg-flora-ink py-4 text-base font-medium text-white transition hover:brightness-110 active:scale-[0.99] lg:max-w-sm"
          >
            Buy Now
          </button>
        </section>
      </main>
    </div>
  );
}
