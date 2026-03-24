import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-primary">
      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-screen">
        {/* Background image - mobile uses portrait crop, desktop uses wide */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-secondary">
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <nav className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-lg shadow-lg shadow-accent/30 bg-accent flex items-center justify-center text-xl">🚬</span>
              <span className="font-display text-2xl font-bold text-neutral">Smoke Spot</span>
            </div>
            <div className="flex gap-4">
              <Link 
                href="/auth/login" 
                className="px-4 py-2 text-neutral/80 hover:text-neutral transition"
              >
                Log In
              </Link>
              <Link 
                href="/auth/signup" 
                className="px-4 py-2 bg-accent text-white rounded-full hover:bg-accent/90 transition"
              >
                Sign Up
              </Link>
            </div>
          </nav>

          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-display text-5xl sm:text-7xl font-bold text-neutral mb-6">
              Find Your Perfect <span className="text-accent">Smoke Spot</span>
            </h1>
            <p className="text-xl text-neutral/70 mb-10 max-w-xl mx-auto">
              Discover smoking-friendly locations near you. Share hidden gems. Join the community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/app" 
                className="px-8 py-4 bg-accent text-white text-lg font-semibold rounded-full hover:bg-accent/90 transition shadow-lg shadow-accent/30"
              >
                Explore the Map
              </Link>
              <Link 
                href="/advertise" 
                className="px-8 py-4 bg-secondary text-neutral text-lg font-semibold rounded-full hover:bg-secondary/80 transition border border-neutral/20"
              >
                Advertise Your Business
              </Link>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-4 gap-6 mt-20">
            <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl p-6 border border-neutral/10">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="font-display text-xl font-bold text-neutral mb-2">Discover Spots</h3>
              <p className="text-neutral/60">Find verified smoking spots near you with ratings, photos, and vibes.</p>
            </div>
            <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl p-6 border border-neutral/10">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="font-display text-xl font-bold text-neutral mb-2">Share & Earn</h3>
              <p className="text-neutral/60">Refer local businesses and earn commission on their ad spend.</p>
            </div>
            <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl p-6 border border-neutral/10">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-display text-xl font-bold text-neutral mb-2">NFC Sharing</h3>
              <p className="text-neutral/60">Tap phones to share your favorite spots instantly.</p>
            </div>
            <Link href="/vibecheck" className="bg-secondary/50 backdrop-blur-sm rounded-2xl p-6 border border-neutral/10 hover:border-accent/50 transition group">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="font-display text-xl font-bold text-neutral mb-2 group-hover:text-accent transition">Vibe Check</h3>
              <p className="text-neutral/60">Find like-minded people near you. Answer 5 questions, get your vibe type, scan the room.</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral/10 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-neutral/50 text-sm">
          © 2025 Smoke Spot. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
