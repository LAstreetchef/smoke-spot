import Link from 'next/link'

export default function ShareNotFound() {
  return (
    <main className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="font-display text-2xl font-bold text-neutral mb-2">
          Link Not Found
        </h1>
        <p className="text-neutral/60 mb-6">
          This share link doesn&apos;t exist or has expired.
        </p>
        <Link
          href="/app"
          className="inline-block px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition"
        >
          Explore Smoke Spots
        </Link>
      </div>
    </main>
  )
}
