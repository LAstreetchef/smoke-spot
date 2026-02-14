'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  { icon: '📍', title: 'Drop a Spot', desc: 'Find a chill smoke spot. Pin it on the map. Add photos & vibes.' },
  { icon: '📈', title: 'Build Your Rep', desc: 'More spots = more followers. Top spotters get verified badges.' },
  { icon: '💰', title: 'Get Paid', desc: 'Local businesses pay to advertise at your spots. You get the bag.' },
];

const EARNINGS = [
  { spots: '5 spots', range: '$25-50/mo', tier: 'Starter' },
  { spots: '15 spots', range: '$100-300/mo', tier: 'Scout' },
  { spots: '50+ spots', range: '$500+/mo', tier: 'Legend' },
];

const TESTIMONIALS = [
  { name: 'jaylen_23', school: 'Howard U', text: 'dropped 12 spots my first week. already got $80 from a dispensary ad 🤑', avatar: '🧑🏾' },
  { name: 'mari.smokes', school: 'UCLA', text: 'literally just walking around campus finding spots between classes lol', avatar: '👩🏻' },
  { name: 'dro.king', school: 'UT Austin', text: 'my rooftop spot got 200+ saves. businesses DM me now', avatar: '🧔🏽' },
];

function FloatingSmoke({ delay }: { delay: number }) {
  const [style, setStyle] = useState({});
  
  useEffect(() => {
    setStyle({
      left: `${10 + Math.random() * 80}%`,
      fontSize: `${16 + Math.random() * 20}px`,
    });
  }, []);

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        ...style,
        bottom: -20,
        opacity: 0,
        animation: `smokeRise ${8 + Math.random() * 6}s ease-out ${delay}s infinite`,
      }}
    >
      🌿
    </div>
  );
}

function JoinPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeEarning, setActiveEarning] = useState(1);
  const [visibleSections, setVisibleSections] = useState(new Set<string>());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Get referral source from URL params (for QR/NFC tracking)
  const referralSource = searchParams.get('ref') || searchParams.get('src') || 'direct';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = (entry.target as HTMLElement).dataset.section;
            if (section) {
              setVisibleSections((prev) => new Set([...prev, section]));
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  async function handleSubmit() {
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({
          email: email.toLowerCase().trim(),
          referral_source: referralSource,
        });
      
      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate email
          setError('You\'re already on the list! 🎉');
        } else {
          setError('Something went wrong. Try again.');
          console.error(insertError);
        }
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError('Something went wrong. Try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{
        background: '#0a0a0a',
        fontFamily: "'Satoshi', 'General Sans', -apple-system, sans-serif",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=general-sans@400,500,600&display=swap" rel="stylesheet" />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(34,197,94,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Floating smoke particles */}
        {Array.from({ length: 8 }, (_, i) => (
          <FloatingSmoke key={i} delay={i * 1.5} />
        ))}

        {/* Content */}
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              animation: 'fadeSlideDown 0.6s ease-out both',
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#22c55e' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#22c55e' }} />
            </span>
            <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 500, letterSpacing: '0.02em' }}>
              Now recruiting on your campus
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(3rem, 10vw, 6rem)',
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
              color: '#fafafa',
              animation: 'fadeSlideUp 0.8s ease-out 0.2s both',
            }}
          >
            GET PAID
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #86efac 40%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              TO SMOKE
            </span>
          </h1>

          {/* Sub */}
          <p
            className="mt-6 mx-auto"
            style={{
              maxWidth: 420,
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
              color: '#a1a1aa',
              lineHeight: 1.5,
              fontWeight: 400,
              animation: 'fadeSlideUp 0.8s ease-out 0.4s both',
            }}
          >
            Find smoke spots. Pin them on the map.
            <br />
            Earn money when businesses advertise there.
          </p>

          {/* CTA */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center gap-3 justify-center"
            style={{ animation: 'fadeSlideUp 0.8s ease-out 0.6s both' }}
          >
            {!submitted ? (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="your@college.edu"
                  className="w-full sm:w-72 px-5 py-4 rounded-2xl text-sm focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fafafa',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-bold transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(34,197,94,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {submitting ? 'JOINING...' : 'START EARNING →'}
                </button>
              </>
            ) : (
              <div
                className="px-8 py-4 rounded-2xl text-sm font-bold"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#22c55e',
                  animation: 'scaleIn 0.4s ease-out',
                }}
              >
                🎉 You&apos;re in! Check your email to get started.
              </div>
            )}
          </div>
          
          {/* Error message */}
          {error && (
            <p className="mt-3 text-sm" style={{ color: error.includes('🎉') ? '#22c55e' : '#ef4444' }}>
              {error}
            </p>
          )}

          {/* Social proof */}
          <div
            className="mt-8 flex items-center justify-center gap-2"
            style={{ animation: 'fadeSlideUp 0.8s ease-out 0.8s both' }}
          >
            <div className="flex -space-x-2">
              {['🧑🏾', '👩🏻', '🧔🏽', '👩🏿', '🧑🏼'].map((e, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid #0a0a0a',
                  }}
                >
                  {e}
                </div>
              ))}
            </div>
            <span style={{ color: '#71717a', fontSize: 13 }}>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>2,847</span> spotters earning this month
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ animation: 'bounce 2s ease-in-out infinite' }}
        >
          <div
            className="w-6 h-10 rounded-full flex items-start justify-center pt-2"
            style={{ border: '2px solid rgba(255,255,255,0.15)' }}
          >
            <div
              className="w-1.5 h-3 rounded-full"
              style={{ background: 'rgba(255,255,255,0.3)', animation: 'scrollDot 2s ease-in-out infinite' }}
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section
        ref={(el) => { sectionRefs.current.how = el; }}
        data-section="how"
        className="relative py-24 px-6"
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-center mb-2"
            style={{
              color: '#22c55e',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: isVisible('how') ? 1 : 0,
              transform: isVisible('how') ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease-out',
            }}
          >
            Dead simple
          </p>
          <h2
            className="text-center mb-16"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 900,
              color: '#fafafa',
              letterSpacing: '-0.03em',
              opacity: isVisible('how') ? 1 : 0,
              transform: isVisible('how') ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease-out 0.1s',
            }}
          >
            Three steps to the bag
          </h2>

          <div className="grid gap-6">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-5 p-6 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  opacity: isVisible('how') ? 1 : 0,
                  transform: isVisible('how') ? 'translateX(0)' : 'translateX(-30px)',
                  transition: `all 0.6s ease-out ${0.2 + i * 0.15}s`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{
                    background: `rgba(34,197,94,${0.06 + i * 0.03})`,
                    border: '1px solid rgba(34,197,94,0.1)',
                  }}
                >
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                    >
                      {i + 1}
                    </span>
                    <h3 style={{ color: '#fafafa', fontSize: 18, fontWeight: 700 }}>{step.title}</h3>
                  </div>
                  <p style={{ color: '#71717a', fontSize: 15, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EARNINGS ─────────────────────────────────── */}
      <section
        ref={(el) => { sectionRefs.current.earn = el; }}
        data-section="earn"
        className="relative py-24 px-6"
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(34,197,94,0.03) 50%, transparent 100%)',
          }}
        />
        <div className="max-w-3xl mx-auto relative">
          <p
            className="text-center mb-2"
            style={{
              color: '#fbbf24',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: isVisible('earn') ? 1 : 0,
              transition: 'all 0.6s ease-out',
            }}
          >
            Show me the money
          </p>
          <h2
            className="text-center mb-16"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 900,
              color: '#fafafa',
              letterSpacing: '-0.03em',
              opacity: isVisible('earn') ? 1 : 0,
              transition: 'all 0.6s ease-out 0.1s',
            }}
          >
            Your spots = your income
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {EARNINGS.map((e, i) => (
              <button
                key={i}
                onClick={() => setActiveEarning(i)}
                className="relative p-5 rounded-2xl text-center transition-all duration-300"
                style={{
                  background: activeEarning === i
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${activeEarning === i ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                  transform: activeEarning === i ? 'scale(1.03)' : 'scale(1)',
                  opacity: isVisible('earn') ? 1 : 0,
                  transition: `opacity 0.6s ease-out ${0.2 + i * 0.1}s, transform 0.3s, background 0.3s, border 0.3s`,
                }}
              >
                <p
                  className="text-xs font-bold mb-2 px-2 py-1 rounded-full mx-auto w-fit"
                  style={{
                    background: activeEarning === i ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                    color: activeEarning === i ? '#22c55e' : '#52525b',
                  }}
                >
                  {e.tier}
                </p>
                <p
                  style={{
                    fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                    fontWeight: 900,
                    color: activeEarning === i ? '#22c55e' : '#a1a1aa',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {e.range}
                </p>
                <p style={{ color: '#52525b', fontSize: 13, marginTop: 4 }}>{e.spots}</p>
              </button>
            ))}
          </div>

          <p
            className="text-center mt-6"
            style={{ color: '#3f3f46', fontSize: 13 }}
          >
            Earnings based on average ad spend in your area. Top spotters earn more.
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────── */}
      <section
        ref={(el) => { sectionRefs.current.proof = el; }}
        data-section="proof"
        className="py-24 px-6"
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-center mb-2"
            style={{
              color: '#22c55e',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: isVisible('proof') ? 1 : 0,
              transition: 'all 0.6s ease-out',
            }}
          >
            Real spotters
          </p>
          <h2
            className="text-center mb-16"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 900,
              color: '#fafafa',
              letterSpacing: '-0.03em',
              opacity: isVisible('proof') ? 1 : 0,
              transition: 'all 0.6s ease-out 0.1s',
            }}
          >
            They&apos;re already cashing in
          </h2>

          <div className="grid gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  opacity: isVisible('proof') ? 1 : 0,
                  transform: isVisible('proof') ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s ease-out ${0.15 + i * 0.12}s`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p style={{ color: '#fafafa', fontSize: 14, fontWeight: 600 }}>@{t.name}</p>
                    <p style={{ color: '#3f3f46', fontSize: 12 }}>{t.school}</p>
                  </div>
                </div>
                <p style={{ color: '#a1a1aa', fontSize: 15, lineHeight: 1.6 }}>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────── */}
      <section
        ref={(el) => { sectionRefs.current.faq = el; }}
        data-section="faq"
        className="py-24 px-6"
      >
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-center mb-12"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
              fontWeight: 900,
              color: '#fafafa',
              letterSpacing: '-0.03em',
              opacity: isVisible('faq') ? 1 : 0,
              transition: 'all 0.6s ease-out',
            }}
          >
            yeah but...
          </h2>

          {[
            { q: 'Is this actually legal?', a: "We're not selling anything illegal. You're just sharing locations and earning ad revenue — like a hyperlocal Yelp for smokers." },
            { q: 'How do I get paid?', a: 'Cash out anytime to PayPal or Venmo. Tips from other users hit your balance instantly. Ad revenue pays monthly.' },
            { q: 'What kind of businesses advertise?', a: 'Smoke shops, dispensaries, CBD brands, rolling paper companies, local cafes near spots — anyone who wants to reach your audience.' },
            { q: 'Do I need followers?', a: 'Nope. Your spots earn based on foot traffic and saves, not your social media following.' },
            { q: 'Can I do this between classes?', a: "That's literally the whole point. Find spots on your way to class, pin them in 30 seconds, earn while you learn." },
          ].map((item, i) => (
            <div
              key={i}
              className="py-5"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                opacity: isVisible('faq') ? 1 : 0,
                transform: isVisible('faq') ? 'translateY(0)' : 'translateY(15px)',
                transition: `all 0.5s ease-out ${0.1 + i * 0.08}s`,
              }}
            >
              <p style={{ color: '#fafafa', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{item.q}</p>
              <p style={{ color: '#71717a', fontSize: 14, lineHeight: 1.7 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────── */}
      <section
        ref={(el) => { sectionRefs.current.cta = el; }}
        data-section="cta"
        className="relative py-32 px-6 text-center"
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(34,197,94,0.08) 0%, transparent 70%)',
          }}
        />
        <div
          className="relative max-w-xl mx-auto"
          style={{
            opacity: isVisible('cta') ? 1 : 0,
            transform: isVisible('cta') ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s ease-out',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(2rem, 6vw, 3.5rem)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: '#fafafa',
              marginBottom: 16,
            }}
          >
            Your campus.
            <br />
            <span style={{ color: '#22c55e' }}>Your spots.</span>
            <br />
            Your money.
          </h2>
          <p style={{ color: '#52525b', fontSize: 15, marginBottom: 32 }}>
            Join 2,847 college students already earning.
          </p>

          {!submitted ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="your@college.edu"
                className="w-full sm:w-72 px-5 py-4 rounded-2xl text-sm focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fafafa',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-bold transition-all duration-300 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(34,197,94,0.3)',
                  letterSpacing: '0.02em',
                }}
              >
                {submitting ? 'JOINING...' : "I'M IN →"}
              </button>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold"
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e',
              }}
            >
              🎉 Welcome to the squad. Check your email!
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ color: '#27272a', fontSize: 12 }}>
          © 2026 Smoke Spot · <span style={{ color: '#3f3f46' }}>findsmokespot.com</span>
        </p>
      </footer>

      <style>{`
        @keyframes smokeRise {
          0% { opacity: 0; transform: translateY(0) rotate(0deg); }
          15% { opacity: 0.4; }
          100% { opacity: 0; transform: translateY(-100vh) rotate(30deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        @keyframes scrollDot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(4px); }
        }
        input::placeholder { color: #3f3f46 !important; }
      `}</style>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Loading...</div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
