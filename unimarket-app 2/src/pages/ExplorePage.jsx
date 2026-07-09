import { HeartIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { BuildingStorefrontIcon } from "@heroicons/react/24/solid";
import AppHeader from "../components/AppHeader";
import FilterChip from "../components/FilterChip";
import IconButton from "../components/IconButton";
import ProductCard from "../components/ProductCard";
import BottomNav from "../components/BottomNav";

const FILTERS = [
  { label: "Filters", active: true },
  { label: "Fashion", removable: true },
  { label: "Electronics", removable: true },
  { label: "Food", removable: true },
];

const FEATURED = {
  name: "A tote bag.",
  seller: "Okachi Divine",
  price: 20000,
  image:
    "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=900&q=80",
};

const PRODUCTS = [
  {
    id: "social-flyers",
    name: "SOCIAL MEDIA FLYERS",
    seller: "Great Emmanuel",
    price: 6000,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "girlies-purse",
    name: "A girlies go to purse",
    seller: "Uni Market",
    price: 3500,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "chopsticks",
    name: "Chopsticks",
    seller: "AIRIAGBON FAVOUR",
    price: 2000,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "spring-roll",
    name: "Spring roll",
    seller: "The chop treat",
    price: 3000,
    badge: "Excellent",
    image:
      "https://images.unsplash.com/photo-1548340748-6d2b7d7da280?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "tissot",
    name: "Tissot 1853",
    seller: "Chidera Melissa",
    price: 20000,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "vca-bracelet",
    name: "VCA bracelet",
    seller: "Chidera Melissa",
    price: 5500,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "rolex",
    name: "Unisex Rolex Watch",
    seller: "Chidera Melissa",
    price: 15000,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "chanel-watch",
    name: "Chanel Pearl Link watch",
    seller: "Chidera Melissa",
    price: 13000,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "wireless-earbuds",
    name: "Wireless Earbuds",
    seller: "TechHub Campus",
    price: 12500,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "campus-hoodie",
    name: "Campus Hoodie",
    seller: "Uni Market",
    price: 8500,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "textbook-bundle",
    name: "100L Textbook Bundle",
    seller: "Ada Books",
    price: 9000,
    badge: "Good",
    image:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "desk-lamp",
    name: "USB Desk Lamp",
    seller: "TechHub Campus",
    price: 4500,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=500&q=80",
  },
];

export default function ExplorePage({ onSelectProduct, onNavigate }) {
  return (
    <div className="min-h-screen pb-28 md:pb-16">
      <AppHeader variant="home" cartCount={5} wishlistCount={0} />

      <main className="mx-auto max-w-6xl px-6">
        <h1 className="pt-4 text-3xl font-semibold leading-tight text-flora-ink sm:text-4xl">
          Buy &amp; Sell
          <br className="sm:hidden" /> Around Campus
        </h1>

        <div className="mt-5 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((filter) => (
            <FilterChip key={filter.label} {...filter} />
          ))}
        </div>

        {/* Featured deal */}
        <article className="relative mt-6 flex flex-col overflow-hidden rounded-4xl bg-gradient-to-b from-[#bcd9a0] to-[#7fae63] p-4 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6">
          <div className="flex items-center justify-between sm:absolute sm:left-6 sm:right-6 sm:top-6 sm:z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-flora-ink/20 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <BuildingStorefrontIcon className="h-4 w-4" />
              Deal of the Day
            </span>
            <div className="flex items-center gap-2">
              <IconButton icon={HeartIcon} label={`Save ${FEATURED.name}`} size="sm" tone="ghost" />
              <IconButton
                icon={ArrowUpRightIcon}
                label={`View ${FEATURED.name} details`}
                size="sm"
                onClick={onSelectProduct}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onSelectProduct}
            className="mt-4 flex flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-flora-bgFrom/95 text-left shadow-card sm:mt-0 sm:flex-row"
          >
            <img
              src={FEATURED.image}
              alt={`${FEATURED.name} by ${FEATURED.seller}`}
              className="h-56 w-full object-cover sm:h-auto sm:w-64"
            />
            <div className="flex flex-1 flex-col justify-end p-5 sm:justify-center">
              <h2 className="text-2xl font-semibold text-flora-ink sm:text-3xl">{FEATURED.name}</h2>
              <div className="mt-3 flex items-center justify-between sm:mt-4 sm:flex-col sm:items-start sm:gap-1">
                <p className="text-sm text-flora-muted">by {FEATURED.seller}</p>
                <p className="text-xl font-semibold text-flora-ink sm:text-2xl">
                  &#8358;{FEATURED.price.toLocaleString()}
                </p>
              </div>
            </div>
          </button>
        </article>

        {/* Product grid */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-flora-ink">Trending on Campus</h2>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
            ))}
          </div>
        </section>
      </main>

      <BottomNav current="explore" onNavigate={onNavigate} />
    </div>
  );
}
