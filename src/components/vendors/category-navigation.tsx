import Link from "next/link";
import { ArrowUpRight, Camera, Flower2, Gem, HandPlatter, Music2, Trees } from "lucide-react";

const categories = [
  { slug: "venues", label: "Wedding Venues & Gardens", icon: Trees },
  { slug: "photography-content", label: "Photography & Content", icon: Camera },
  { slug: "music-entertainment", label: "Music & Entertainment", icon: Music2 },
  { slug: "beauty-attire", label: "Beauty & Attire", icon: Gem },
  { slug: "design-flowers", label: "Design & Flowers", icon: Flower2 },
  { slug: "event-services", label: "Event Services", icon: HandPlatter },
];

export function CategoryNavigation({ selected }: { selected?: string }) {
  return (
    <section className="directory-categories" aria-labelledby="category-heading">
      <h2 id="category-heading">Browse by Category</h2>
      <nav aria-label="Browse vendor categories" className="category-navigation">
        {categories.map(({ slug, label, icon: Icon }) => (
          <Link key={slug} href={`/vendors?category=${slug}#marketplace-results`} className="category-link" aria-current={selected === slug ? "page" : undefined}>
            <Icon className="category-icon" size={38} strokeWidth={1.15} aria-hidden="true" />
            <span>{label}</span>
            <ArrowUpRight className="category-arrow" size={14} strokeWidth={1.25} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
