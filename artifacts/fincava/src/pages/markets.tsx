export default function Markets() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Market Intelligence</h1>
        <p className="text-lg text-muted-foreground">Data-driven insights to help Colombian producers and international buyers understand global demand and trade dynamics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-card border rounded-xl overflow-hidden hover-elevate transition-all">
          <div className="h-48 bg-muted relative">
            <img src="/images/hero.png" alt="UAE/Gulf Market" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <h2 className="text-2xl font-serif font-bold text-white">UAE & The Gulf</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-muted-foreground mb-6">High-growth market for specialty coffee and premium exotic fruits. Direct shipping routes established via Jebel Ali Port.</p>
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Top Imports</div>
                <div className="font-medium">Specialty Coffee, Hass Avocado</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">YoY Growth</div>
                <div className="font-medium text-primary">+24.5%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden hover-elevate transition-all">
          <div className="h-48 bg-muted relative">
            <div className="absolute inset-0 bg-primary/20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <h2 className="text-2xl font-serif font-bold text-white">China & East Asia</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-muted-foreground mb-6">Explosive demand for specialty coffee and healthy superfoods. Increasing focus on origin traceability and organic certifications.</p>
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Top Imports</div>
                <div className="font-medium">Cacao, Processed Coffee, Quinoa</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">YoY Growth</div>
                <div className="font-medium text-primary">+38.2%</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-card border rounded-xl overflow-hidden hover-elevate transition-all">
          <div className="h-48 bg-muted relative">
            <div className="absolute inset-0 bg-secondary/20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <h2 className="text-2xl font-serif font-bold text-white">South Korea</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-muted-foreground mb-6">Sophisticated coffee culture demanding the highest cupping scores. Strong preference for single-estate and micro-lot production.</p>
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Top Imports</div>
                <div className="font-medium">Geisha Coffee, Cacao Nibs</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">YoY Growth</div>
                <div className="font-medium text-primary">+18.7%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden hover-elevate transition-all">
          <div className="h-48 bg-muted relative">
            <div className="absolute inset-0 bg-accent/30"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <h2 className="text-2xl font-serif font-bold text-white">West Africa</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-muted-foreground mb-6">Emerging hub for processed agricultural goods and B2B trade partnerships. Growing bilateral agreements supporting direct trade.</p>
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Top Imports</div>
                <div className="font-medium">Agricultural Inputs, Processed Foods</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">YoY Growth</div>
                <div className="font-medium text-primary">+12.4%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
