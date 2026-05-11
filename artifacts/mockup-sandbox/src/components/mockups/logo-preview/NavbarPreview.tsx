export function NavbarPreview() {
  const logo = "/__mockup/fincava-logo.png";
  return (
    <div className="min-h-screen bg-white flex flex-col">
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 text-sm">
        <p>↑ Logo in navbar (above)</p>
      </div>
    </div>
  );
}
