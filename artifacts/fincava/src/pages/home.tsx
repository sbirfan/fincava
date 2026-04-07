import { useListFeaturedProducts, useGetPlatformStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ShieldCheck, Globe, TrendingUp, Sprout, Handshake, Users, Leaf, ArrowRight } from "lucide-react";

export default function Home() {
  const { data: featuredProducts, isLoading: isLoadingFeatured } = useListFeaturedProducts();
  const { data: stats } = useGetPlatformStats();

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center min-h-[80vh] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero.png" 
            alt="Colombian coffee farm sunrise" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm mb-8"
          >
            <Handshake className="w-4 h-4" />
            Direct from Colombian farmers — no brokers, no middlemen
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold mb-6 tracking-tight"
          >
            From Colombian soil,<br />to your supply chain.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto mb-10 text-white/90 font-light"
          >
            The premium B2B sourcing marketplace connecting Colombian agricultural producers with international buyers across the Middle East, Asia, and Africa.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/marketplace" className="bg-primary text-primary-foreground px-8 py-4 rounded-md text-lg font-medium hover:bg-primary/90 transition-colors">
              Explore Marketplace
            </Link>
            <Link href="/register" className="bg-white/10 text-white backdrop-blur-md border border-white/20 px-8 py-4 rounded-md text-lg font-medium hover:bg-white/20 transition-colors">
              Become a Partner
            </Link>
          </motion.div>

          {/* Inline trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-white/70"
          >
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Verified Suppliers</span>
            <span className="flex items-center gap-1.5"><Leaf className="w-4 h-4 text-primary" /> Traceable Origins</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> 85+ Families Supported</span>
          </motion.div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Verified Suppliers</h3>
              <p className="text-muted-foreground">Every producer is vetted for quality, capacity, and ethical practices.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Global Reach</h3>
              <p className="text-muted-foreground">Seamlessly connecting Colombia to the Middle East, Asia, and Africa.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                <Sprout className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Direct from Origin</h3>
              <p className="text-muted-foreground">Transparent supply chains that maximize value for farmers and buyers.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Market Intelligence</h3>
              <p className="text-muted-foreground">Data-driven insights for strategic sourcing and international expansion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY FINCAVA EXISTS — Mission Section */}
      <section className="py-24 bg-card border-y border-border overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: image + floating stat */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=800"
                  alt="Colombian farmer Carlos Andres Muñoz"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-6 -right-4 md:right-8 bg-primary text-primary-foreground rounded-2xl p-5 shadow-xl max-w-[200px]">
                <div className="text-3xl font-bold mb-1">40–70%</div>
                <div className="text-sm text-primary-foreground/80">Farm-gate premium above commodity price</div>
              </div>
            </div>

            {/* Right: narrative */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 block">Why Fincava Exists</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 leading-tight">
                The farmer should earn<br />more than the broker.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Colombia grows some of the world's finest coffee, cacao, and superfoods. Yet the farmers behind those products routinely receive less than 5% of the final retail value — while 3 to 5 intermediary layers capture everything in between.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Fincava exists to close that gap. We connect international buyers directly to the farm. No brokers. No commodity price race-to-the-bottom. Just transparent, accountable trade that pays farmers fairly and gives buyers full traceability of what they're sourcing.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { value: "0", label: "Brokers between you and the farm" },
                  { value: "85+", label: "Families earning stable income" },
                  { value: "6", label: "Regions, fully traceable" },
                ].map(stat => (
                  <div key={stat.label} className="text-center p-4 bg-background rounded-xl border">
                    <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                    <div className="text-xs text-muted-foreground leading-tight">{stat.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/impact">
                <span className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
                  See our full impact report <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Featured Exports</h2>
              <p className="text-muted-foreground text-lg">Premium agricultural products ready for international shipping, sourced directly from verified Colombian producers.</p>
            </div>
            <Link href="/marketplace" className="hidden md:block text-primary font-medium hover:underline">
              View all products &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingFeatured ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[250px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              ))
            ) : featuredProducts?.length ? (
              featuredProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No featured products available at the moment.
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <Link href="/marketplace" className="text-primary font-medium hover:underline">
              View all products &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-serif font-bold mb-2">{stats?.verifiedSuppliers || "0"}</div>
              <div className="text-primary-foreground/80 font-medium">Verified Suppliers</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-serif font-bold mb-2">{stats?.totalProducts || "0"}</div>
              <div className="text-primary-foreground/80 font-medium">Premium Products</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-serif font-bold mb-2">{stats?.exportDestinations || "0"}</div>
              <div className="text-primary-foreground/80 font-medium">Export Destinations</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-serif font-bold mb-2">${((stats?.facilitatedTradeUSD || 0) / 1000000).toFixed(1)}M+</div>
              <div className="text-primary-foreground/80 font-medium">Facilitated Trade</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
