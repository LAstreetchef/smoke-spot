'use client';

export default function RecruiterPlaybook() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-amber-500/10 border border-amber-500/30">
            <span className="text-amber-400 text-sm font-medium">🔒 Internal Playbook — Recruiters Only</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            How to Sign Up Any Smoke Shop{' '}
            <span className="text-emerald-400">in 10 Minutes</span>
          </h1>
          
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Your complete guide to walking into any store, building rapport, showing the value, and closing the deal.
          </p>
        </div>
      </section>

      {/* ── SECTION 1: KNOW WHAT YOU'RE SELLING ─────── */}
      <section className="py-16 px-6 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-emerald-400">01</h2>
          <h3 className="text-3xl font-bold mb-8">Know What You're Selling</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {/* Sponsored Pin */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">📍</span>
                <span className="text-emerald-400 font-bold">$20/1k views</span>
              </div>
              <h4 className="font-bold text-lg mb-2">Sponsored Pin</h4>
              <p className="text-zinc-400 text-sm">
                "Your store glows on the map when someone's nearby looking for a spot."
              </p>
            </div>
            
            {/* Featured Spot */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">⭐</span>
                <span className="text-emerald-400 font-bold">$40/1k views</span>
              </div>
              <h4 className="font-bold text-lg mb-2">Featured Spot</h4>
              <p className="text-zinc-400 text-sm">
                "When someone searches 'smoke shop,' you're the first thing they see."
              </p>
            </div>
            
            {/* Banner Ad */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🖼️</span>
                <span className="text-emerald-400 font-bold">$15/1k views</span>
              </div>
              <h4 className="font-bold text-lg mb-2">Banner Ad</h4>
              <p className="text-zinc-400 text-sm">
                "Big, beautiful ad right on the map. Everyone who opens the app sees you."
              </p>
            </div>
            
            {/* Fire Sale */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-emerald-500/30 bg-gradient-to-br from-zinc-900 to-emerald-950/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🔥</span>
                <span className="text-emerald-400 font-bold">$30/1k views</span>
              </div>
              <h4 className="font-bold text-lg mb-2">Fire Sale</h4>
              <p className="text-zinc-400 text-sm">
                "A popup hits everyone nearby: 'BOGO wraps at your store — 0.2 miles away.' They walk in."
              </p>
            </div>
          </div>
          
          {/* Math Box */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-amber-500/10 rounded-xl p-6 border border-emerald-500/20">
            <h4 className="font-bold text-lg mb-4 text-center">💡 The Math That Closes Deals</h4>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <p className="text-3xl font-black text-emerald-400">$50</p>
                <p className="text-zinc-500 text-sm">budget</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">2,500</p>
                <p className="text-zinc-500 text-sm">views</p>
              </div>
              <div>
                <p className="text-3xl font-black text-amber-400">25</p>
                <p className="text-zinc-500 text-sm">walk-ins (1%)</p>
              </div>
            </div>
            <p className="text-center text-zinc-400">
              <span className="text-emerald-400 font-bold">Cost per customer: $2.00</span>
            </p>
            <p className="text-center text-zinc-500 text-sm mt-3">
              Compare to Google Ads: $3–$5 per click (and most shops can't even run Google/Instagram ads for tobacco)
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: THE WALK-IN ─────────────────── */}
      <section className="py-16 px-6 border-t border-zinc-800 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-emerald-400">02</h2>
          <h3 className="text-3xl font-bold mb-8">The Walk-In</h3>
          
          {/* Scenario A */}
          <div className="mb-10">
            <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-sm">A</span>
              Corner Store / Smoke Shop Approach
            </h4>
            <div className="space-y-4 pl-10">
              <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-emerald-500">
                <p className="text-zinc-300">
                  <strong className="text-white">Step 1:</strong> Walk in, buy something small (lighter, wraps). Build rapport.
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-zinc-600">
                <p className="text-zinc-300">
                  <strong className="text-white">Step 2:</strong> At checkout, ask casually: <em>"You guys do any online advertising?"</em>
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-zinc-600">
                <p className="text-zinc-300">
                  <strong className="text-white">When they say no</strong> (or mention Google won't let them):
                </p>
                <p className="text-white mt-2 italic">
                  "Yeah, Google's strict about tobacco. That's actually why I stopped by. I work with Smoke Spot — it's like Google Maps but specifically for people looking for smoke-friendly spots and shops."
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-zinc-600">
                <p className="text-zinc-300">
                  <strong className="text-white">When they ask about price:</strong>
                </p>
                <p className="text-white mt-2 italic">
                  "Twenty bucks for a thousand people seeing your shop. Fifty bucks gets you over two thousand local smokers. Every single person is on the app because they're already looking for a spot."
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-emerald-500">
                <p className="text-zinc-300">
                  <strong className="text-white">Step 3:</strong> Pull out your phone. Show the app map. Point to where their shop would appear. Demo the Fire Sale popup concept.
                </p>
              </div>
            </div>
          </div>
          
          {/* Scenario B */}
          <div>
            <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm">B</span>
              Dispensary Approach
            </h4>
            <div className="space-y-4 pl-10">
              <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-purple-500">
                <p className="text-zinc-300">
                  <strong className="text-white">Lead with their pain:</strong>
                </p>
                <p className="text-white mt-2 italic">
                  "How are you handling digital marketing? I know cannabis ads are banned on all the major platforms."
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-zinc-600">
                <p className="text-zinc-300">
                  <strong className="text-white">Position as the solution:</strong>
                </p>
                <p className="text-white mt-2 italic">
                  "We built Smoke Spot specifically because shops like yours can't run normal ads. Our entire user base is people actively looking for smoke-friendly places. Way cheaper than Weedmaps too."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: SHOW THE MATH ─────────────────── */}
      <section className="py-16 px-6 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-emerald-400">03</h2>
          <h3 className="text-3xl font-bold mb-8">Show the Math</h3>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Fire Sale ROI */}
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                🔥 Fire Sale Example
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Spend:</span>
                  <span className="font-bold">$75</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Views:</span>
                  <span>2,500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tap the deal (5% CTR):</span>
                  <span>125</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Walk in (20% conversion):</span>
                  <span>25</span>
                </div>
                <div className="flex justify-between border-t border-zinc-700 pt-2 mt-2">
                  <span className="text-zinc-400">Revenue @ $18–$25 avg:</span>
                  <span className="text-emerald-400 font-bold">$450–$625</span>
                </div>
              </div>
            </div>
            
            {/* Sponsored Pin ROI */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/20">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                📍 Sponsored Pin Starter
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Spend:</span>
                  <span className="font-bold">$40</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Views:</span>
                  <span>2,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tap for details (3% CTR):</span>
                  <span>60</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Walk in:</span>
                  <span>12</span>
                </div>
                <div className="flex justify-between border-t border-zinc-700 pt-2 mt-2">
                  <span className="text-zinc-400">Cost per customer:</span>
                  <span className="text-emerald-400 font-bold">$3.33</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* The Script */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-700">
            <h4 className="font-bold mb-3">📝 Say This:</h4>
            <p className="text-lg italic text-zinc-300 leading-relaxed">
              "For forty bucks you could bring in a dozen new customers. <span className="text-emerald-400">One sale pays for the whole ad.</span> These people are already out looking for a smoke shop."
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: HANDLE OBJECTIONS ─────────────── */}
      <section className="py-16 px-6 border-t border-zinc-800 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-emerald-400">04</h2>
          <h3 className="text-3xl font-bold mb-8">Handle Objections</h3>
          
          <div className="space-y-4">
            {[
              {
                q: "I don't do online advertising",
                a: "No posting, no hashtags. Pick an ad type, set budget, upload photo. Five minutes."
              },
              {
                q: "How many people are on the app?",
                a: "Community-driven, growing fast. A small targeted audience beats a million random Instagram followers. Every person on Smoke Spot is actively looking for a spot or shop."
              },
              {
                q: "I can't afford it",
                a: "No contract, no monthly fee. Start at $25. If it doesn't work, you're out the price of a pack of premiums."
              },
              {
                q: "I already have Weedmaps / Leafly",
                a: "We're the last mile. Weedmaps gets them thinking about a dispensary. We get them to YOU while they're already out smoking, looking for the nearest spot."
              },
              {
                q: "Let me think about it",
                a: "Shops that sign up first get the most visibility before competitors claim the area. $25 test run — if you don't like results, don't spend another dollar."
              }
            ].map((item, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-xl overflow-hidden">
                <div className="bg-red-500/10 px-6 py-3 border-l-4 border-red-500">
                  <p className="font-bold text-red-400">❌ "{item.q}"</p>
                </div>
                <div className="px-6 py-4 border-l-4 border-emerald-500">
                  <p className="text-zinc-300">
                    <span className="text-emerald-400 font-bold">→</span> {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: CLOSE THE DEAL ─────────────────── */}
      <section className="py-16 px-6 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-emerald-400">05</h2>
          <h3 className="text-3xl font-bold mb-8">Close the Deal</h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Soft Close */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-400">🤝</span>
              </div>
              <h4 className="font-bold mb-3">Soft Close</h4>
              <p className="text-zinc-400 text-sm italic">
                "Let me show you how quick this is. Two minutes on my phone. Pick Sponsored Pin, $40 budget, snap a storefront photo, you're live today."
              </p>
            </div>
            
            {/* Fire Sale Close */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-orange-500/30">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-orange-400">🔥</span>
              </div>
              <h4 className="font-bold mb-3">Fire Sale Close</h4>
              <p className="text-zinc-400 text-sm italic">
                "Run a one-time BOGO deal. $30 for 1,000 views. If ten people walk in you've made your money back five times over."
              </p>
            </div>
            
            {/* Transparency Close */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-emerald-400">💯</span>
              </div>
              <h4 className="font-bold mb-3">Transparency Close</h4>
              <p className="text-zinc-400 text-sm italic">
                "Full transparency — I get a commission when shops sign up through me. So my incentive is for this to actually bring you customers."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: YOUR EARNINGS ─────────────────── */}
      <section className="py-16 px-6 border-t border-zinc-800 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-emerald-400">06</h2>
          <h3 className="text-3xl font-bold mb-8">Your Earnings</h3>
          
          <div className="text-center mb-10">
            <p className="text-6xl font-black text-emerald-400 mb-2">20%</p>
            <p className="text-xl text-zinc-400">recurring commission on all ad spend</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { shops: 1, spend: 50, earn: 10 },
              { shops: 5, spend: 50, earn: 50 },
              { shops: 10, spend: 100, earn: 200 },
              { shops: 20, spend: 100, earn: 400 },
            ].map((tier, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-4 text-center border border-zinc-800">
                <p className="text-zinc-500 text-sm">{tier.shops} shop{tier.shops > 1 ? 's' : ''} @ ${tier.spend}/mo</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">${tier.earn}/mo</p>
              </div>
            ))}
          </div>
          
          <div className="bg-emerald-500/10 rounded-xl p-6 border border-emerald-500/20 text-center">
            <p className="text-emerald-400 font-bold text-lg">
              💰 This is recurring passive income. Sign them up once, earn every month they advertise.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: PRO TIPS ─────────────────────── */}
      <section className="py-16 px-6 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-emerald-400">07</h2>
          <h3 className="text-3xl font-bold mb-8">Pro Tips</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { emoji: "🛒", tip: "Buy something first before pitching. Builds rapport and you look like a customer, not a salesman." },
              { emoji: "📱", tip: "Show the app on your phone. Don't just describe it — demo it live. Show their location on the map." },
              { emoji: "🏃", tip: "Use first-mover urgency: \"You'd be the first shop in this area on the platform.\"" },
              { emoji: "💵", tip: "Start small. Suggest $25–$50. Let them upgrade after seeing results." },
              { emoji: "📅", tip: "Visit Tuesday–Thursday afternoons when it's slow. Don't pitch during rush hour." },
              { emoji: "📇", tip: "If they don't close on the spot, leave a card or text the signup link. Follow up in 3 days." },
            ].map((item, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 flex gap-4">
                <span className="text-2xl">{item.emoji}</span>
                <p className="text-zinc-300 text-sm">{item.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-zinc-800 text-center">
        <p className="text-zinc-600 text-sm">
          Internal document • Not for public distribution • findsmokespot.com
        </p>
      </footer>
    </div>
  );
}
