import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui/button";

const BRANDS = [
  { name: "SOTO", filename: "soto-logo.png", className: "scale-90", description: "Innovative, high-performance stoves and combustion equipment from Japan." },
  { name: "GSI Outdoors", filename: "gsi-outdoors.webp", className: "scale-100", description: "Innovative cookware and dining solutions designed specifically for the outdoors." },
  { name: "Gear Aid", filename: "gear-aid.webp", className: "scale-110", description: "Essential gear repair and maintenance products to keep your equipment running longer." },
  { name: "Heroclip", filename: "heroclip.webp", className: "scale-75", description: "The versatile hybrid gear clip that lets you hang your gear anywhere." },
  { name: "Hyperlite Mountain Gear", filename: "hyperlite.png", className: "scale-125", description: "Ultralight, durable Dyneema composite shelters and backpacks." },
  { name: "Grand Trunk", filename: "grand-trunk-logo.webp", className: "scale-100", description: "Premium hammocks and shelter systems for the trail." },
  { name: "Big Agnes", filename: "big-agnes.webp", className: "scale-110", description: "Award-winning tents, sleeping bags, and pads for comfortable camping." },
  { name: "Vipole", filename: "vipole.png", className: "scale-100", description: "Lightweight, robust carbon trekking poles crafted with Italian precision." }
];

export const metadata = {
  title: "Our Brands | Backcountry Light",
  description: "Explore the premium outdoor brands we partner with.",
};

export default function BrandsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full bg-muted flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <Image
          src="/tent/tc-philosophy-wingfort.webp"
          alt="Premium Brands"
          fill
          priority
          className="object-cover object-center z-0"
        />
        <div className="relative z-20 text-center px-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium tracking-tight text-white mb-6 drop-shadow-md">
            Our Premium Partners
          </h1>
          <p className="text-lg md:text-xl text-white/90 drop-shadow">
            We partner with industry-leading brands that share our commitment to quality, durability, and lightweight performance.
          </p>
        </div>
      </section>

      {/* Brands Grid */}
      <section className="py-24 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {BRANDS.map((brand) => (
            <Link 
              key={brand.name} 
              href={`/shop?brand=${brand.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="group flex flex-col items-center text-center p-10 bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="h-20 w-full flex items-center justify-center mb-6 relative">
                <BrandLogo name={brand.name} filename={brand.filename} className={brand.className} noGrayscale={true} noInvert={true} />
              </div>
              <h2 className="text-xl font-heading font-medium mb-3">{brand.name}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-grow">
                {brand.description}
              </p>
              <span className="text-sm font-medium tracking-widest uppercase text-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-auto underline underline-offset-4">
                Shop Brand
              </span>
            </Link>
          ))}
        </div>
        
        {/* Partnership CTA */}
        <div className="mt-32 text-center max-w-2xl mx-auto border-t pt-16">
          <h2 className="text-3xl font-heading font-medium mb-6">Become a Partner</h2>
          <p className="text-muted-foreground text-lg mb-10">
            Are you a gear manufacturer building innovative, ultralight equipment? We are always looking to expand our curated collection.
          </p>
          <Button variant="outline" size="lg" className="rounded-none px-12 h-14 text-base">
            Contact Us
          </Button>
        </div>
      </section>
    </div>
  );
}
