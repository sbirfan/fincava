export function HeroPreview() {
  const logo = "/__mockup/fincava-logo.png";
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Fincava Logo" className="h-12 w-auto object-contain" />
          <span className="text-xs font-medium text-gray-400 border border-gray-200 rounded px-2 py-0.5">Commerce OS</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium text-gray-700">
          <span>Products</span>
          <span>Platform</span>
          <span>Supplier Network</span>
          <span>Markets</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Log in</span>
          <button className="bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <div
        className="flex-1 relative flex flex-col items-center justify-center text-center px-8"
        style={{
          background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=80') center/cover no-repeat",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <img src={logo} alt="Fincava" className="h-36 w-auto object-contain drop-shadow-2xl" />
          <span className="text-white/70 text-sm font-medium tracking-widest uppercase border border-white/20 rounded-full px-4 py-1">Colombia meets the world</span>
          <h1 className="text-white text-5xl font-bold leading-tight max-w-3xl">
            Colombia's best producers.<br />
            <span className="text-emerald-400">The world's best buyers.</span><br />
            One platform.
          </h1>
          <p className="text-white/70 max-w-xl text-lg">
            Fincava connects verified Colombian agricultural producers with global buyers, with compliance documentation and distribution built in.
          </p>
          <div className="flex gap-4 mt-2">
            <button className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg">Get Started</button>
            <button className="border border-white/30 text-white font-semibold px-6 py-3 rounded-lg">Browse Products</button>
          </div>
        </div>
      </div>
    </div>
  );
}
