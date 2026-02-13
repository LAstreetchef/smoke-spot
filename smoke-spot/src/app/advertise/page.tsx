import Link from 'next/link'

export default function AdvertiseLandingPage() {
  return (
    <main className="min-h-screen bg-primary">
      {/* Hero with guy POV background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/bg-guy-v3.png" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/80 to-primary" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20">
          {/* Nav */}
          <nav className="flex justify-between items-center mb-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🚬</span>
              <span className="font-display text-xl font-bold text-neutral">Smoke Spot</span>
            </Link>
            <Link 
              href="/advertise/signup" 
              className="px-4 py-2 bg-accent text-white rounded-full hover:bg-accent/90 transition"
            >
              Get Started
            </Link>
          </nav>

          {/* Hero Content */}
          <div className="text-center">
            <h1 className="font-display text-4xl sm:text-6xl font-bold text-neutral mb-6">
              Put Your Business in Front of <span className="text-accent">Every Smoker</span> Nearby
            </h1>
            <p className="text-xl text-neutral/70 mb-10 max-w-2xl mx-auto">
              Reach thousands of smokers actively looking for spots near your business. 
              Geo-targeted ads that actually convert.
            </p>
            <Link 
              href="/advertise/signup" 
              className="inline-block px-8 py-4 bg-accent text-white text-lg font-semibold rounded-full hover:bg-accent/90 transition shadow-lg shadow-accent/30"
            >
              Start Advertising →
            </Link>
          </div>

          {/* Map Preview */}
          <div className="mt-16 bg-secondary/50 rounded-2xl p-4 border border-neutral/10">
            <div className="aspect-video rounded-xl relative overflow-hidden bg-[#1d2c4d]">
              {/* Fake map grid lines */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(#304a7d 1px, transparent 1px), linear-gradient(90deg, #304a7d 1px, transparent 1px)', backgroundSize: '50px 50px'}} />
              </div>
              {/* Fake roads */}
              <div className="absolute top-1/3 left-0 right-0 h-1 bg-[#304a7d]" />
              <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-[#304a7d]" />
              <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-[#304a7d]" />
              <div className="absolute left-2/3 top-0 bottom-0 w-0.5 bg-[#304a7d]" />
              {/* Scatter some fake pins */}
              <div className="absolute top-1/4 left-1/5 w-3 h-3 bg-green-400 rounded-full opacity-60" />
              <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-blue-400 rounded-full opacity-60" />
              <div className="absolute top-3/4 left-3/4 w-3 h-3 bg-purple-400 rounded-full opacity-60" />
              <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-pink-400 rounded-full opacity-60" />
              {/* Sponsored pin in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative">
                    <img src="/logo.png" alt="Smoke Spot" className="w-20 h-20 mx-auto rounded-xl shadow-lg shadow-accent/50 border-4 border-accent animate-pulse" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-accent" />
                  </div>
                  <p className="text-neutral font-medium mt-6">Your sponsored pin stands out</p>
                  <div className="mt-3 inline-block px-4 py-2 bg-accent text-white rounded-full text-sm font-semibold">
                    🔥 Sponsored
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <section className="py-20 border-t border-neutral/10">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-neutral text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                1️⃣
              </div>
              <h3 className="font-display text-lg font-bold text-neutral mb-2">Register</h3>
              <p className="text-neutral/60 text-sm">Sign up and connect your business details</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                2️⃣
              </div>
              <h3 className="font-display text-lg font-bold text-neutral mb-2">Create Campaign</h3>
              <p className="text-neutral/60 text-sm">Set your target area, budget, and creative</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                3️⃣
              </div>
              <h3 className="font-display text-lg font-bold text-neutral mb-2">Go Live</h3>
              <p className="text-neutral/60 text-sm">Your ads appear to nearby smokers instantly</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-neutral text-center mb-4">
            Simple Pricing
          </h2>
          <p className="text-neutral/60 text-center mb-12">
            Pay only for the impressions you get
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Sponsored Pin */}
            <div className="bg-secondary rounded-2xl p-6 border border-neutral/10">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-display text-lg font-bold text-neutral mb-2">Sponsored Pin</h3>
              <p className="text-neutral/60 text-sm mb-4">Your business appears as a highlighted pin on the map</p>
              <p className="text-2xl font-bold text-accent">$5<span className="text-sm text-neutral/50">/1000 views</span></p>
            </div>

            {/* Featured Spot */}
            <div className="bg-secondary rounded-2xl p-6 border-2 border-accent relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-white text-xs rounded-full">
                Popular
              </div>
              <div className="text-3xl mb-3">⭐</div>
              <h3 className="font-display text-lg font-bold text-neutral mb-2">Featured Spot</h3>
              <p className="text-neutral/60 text-sm mb-4">Appear at the top of search results in your area</p>
              <p className="text-2xl font-bold text-accent">$10<span className="text-sm text-neutral/50">/1000 views</span></p>
            </div>

            {/* Banner Ad */}
            <div className="bg-secondary rounded-2xl p-6 border border-neutral/10">
              <div className="text-3xl mb-3">🖼️</div>
              <h3 className="font-display text-lg font-bold text-neutral mb-2">Banner Ad</h3>
              <p className="text-neutral/60 text-sm mb-4">Full-width banner shown to users in your target area</p>
              <p className="text-2xl font-bold text-accent">$8<span className="text-sm text-neutral/50">/1000 views</span></p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link 
              href="/advertise/signup" 
              className="inline-block px-8 py-4 bg-accent text-white font-semibold rounded-full hover:bg-accent/90 transition"
            >
              Start Your Campaign
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-neutral mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-neutral/60 mb-8">
            Join hundreds of smoke shops, dispensaries, and lounges already advertising on Smoke Spot.
          </p>
          <Link 
            href="/advertise/signup" 
            className="inline-block px-8 py-4 bg-accent text-white text-lg font-semibold rounded-full hover:bg-accent/90 transition shadow-lg shadow-accent/30"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral/10 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-neutral/50 text-sm">
          © 2025 Smoke Spot. All rights reserved.
        </div>
      </footer>
    </main>
  )
}
