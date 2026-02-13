'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/app'
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleLogin called', { email })
    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('signIn result:', { data, error })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      setMessage({ type: 'success', text: 'Logged in! Redirecting...' })
      router.refresh()
      router.push(redirect)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  return (
    <>
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'
        }`}>
          {message.text}
        </div>
      )}

      {/* Google OAuth */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-lg font-medium hover:bg-neutral transition disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-4 my-4 sm:my-6">
        <div className="flex-1 h-px bg-neutral/20" />
        <span className="text-neutral/50 text-sm">or</span>
        <div className="flex-1 h-px bg-neutral/20" />
      </div>

      {/* Email/Password Login */}
      <form onSubmit={handleLogin}>
        <label className="block text-neutral/70 text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-primary border border-neutral/20 rounded-lg text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent transition mb-3 sm:mb-4 text-sm sm:text-base"
        />

        <label className="block text-neutral/70 text-sm mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-primary border border-neutral/20 rounded-lg text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent transition mb-3 sm:mb-4 text-sm sm:text-base"
        />

        <button
          type="submit"
          disabled={loading}
          onClick={() => console.log('Login button clicked!')}
          className="w-full px-4 py-2 sm:py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen relative flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      {/* Background image - guy POV perspective */}
      <div className="absolute inset-0">
        <img src="/bg-guy.png" alt="" className="w-full h-full object-cover object-bottom" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/40" />
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-secondary/70 backdrop-blur-sm rounded-2xl p-4 sm:p-8 border border-neutral/10">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral/90 text-center mb-3 sm:mb-6">
            Smoke Spot
          </h1>

          <Suspense fallback={<div className="text-neutral/50 text-center py-4">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Sign up link */}
        <p className="text-center text-neutral/60 mt-3 sm:mt-6 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
