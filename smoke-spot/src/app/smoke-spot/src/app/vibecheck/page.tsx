'use client'
import { useEffect } from 'react'

export default function VibecheckPage() {
  useEffect(() => {
    window.location.href = '/vibecheck/index.html'
  }, [])
  return null
}
