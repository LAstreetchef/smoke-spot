'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface ShareSheetProps {
  isOpen: boolean
  onClose: () => void
  shareType: 'spot' | 'profile'
  payloadId: string
  title: string
}

export default function ShareSheet({ isOpen, onClose, shareType, payloadId, title }: ShareSheetProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shortCode, setShortCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(false)
  const [nfcWriting, setNfcWriting] = useState(false)
  const [nfcStatus, setNfcStatus] = useState<string | null>(null)

  // Check NFC support
  useEffect(() => {
    setNfcSupported('NDEFReader' in window)
  }, [])

  // Generate share link when opened
  useEffect(() => {
    if (isOpen && !shareUrl) {
      generateShareLink()
    }
  }, [isOpen])

  const generateShareLink = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_type: shareType,
          payload_id: payloadId,
        }),
      })

      const data = await response.json()
      if (data.share_url) {
        setShareUrl(data.share_url)
        setShortCode(data.short_code)
      }
    } catch (error) {
      console.error('Error generating share link:', error)
    }
    setLoading(false)
  }

  const copyToClipboard = async () => {
    if (!shareUrl) return
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const shareNative = async () => {
    if (!shareUrl || !navigator.share) return

    try {
      await navigator.share({
        title: `Smoke Spot: ${title}`,
        text: `Check out this smoke spot on Smoke Spot!`,
        url: shareUrl,
      })
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error)
      }
    }
  }

  const writeNFC = async () => {
    if (!shareUrl || !('NDEFReader' in window)) return

    setNfcWriting(true)
    setNfcStatus('Tap another phone or NFC tag...')

    try {
      // @ts-ignore - NDEFReader is not in TypeScript types yet
      const ndef = new NDEFReader()
      await ndef.write({
        records: [{ recordType: 'url', data: shareUrl }]
      })
      setNfcStatus('✓ NFC write successful!')
      setTimeout(() => setNfcStatus(null), 3000)
    } catch (error) {
      console.error('NFC write failed:', error)
      setNfcStatus('NFC write failed. Try again.')
      setTimeout(() => setNfcStatus(null), 3000)
    }
    setNfcWriting(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-secondary rounded-t-3xl z-50 animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-neutral/30 rounded-full" />
        </div>

        <div className="px-6 pb-8">
          <h2 className="font-display text-xl font-bold text-neutral text-center mb-2">
            Share {shareType === 'spot' ? 'Spot' : 'Profile'}
          </h2>
          <p className="text-neutral/60 text-center text-sm mb-6">{title}</p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-neutral/50">Generating link...</div>
            </div>
          ) : shareUrl ? (
            <>
              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG 
                    value={shareUrl} 
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Share URL */}
              <div className="flex items-center gap-2 bg-primary/50 rounded-xl p-3 mb-4">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-neutral text-sm truncate focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    copied 
                      ? 'bg-success/20 text-success' 
                      : 'bg-accent text-white hover:bg-accent/90'
                  }`}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Native Share */}
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={shareNative}
                    className="py-3 bg-primary/50 text-neutral rounded-xl font-medium hover:bg-primary/70 transition flex items-center justify-center gap-2"
                  >
                    📤 Share
                  </button>
                )}

                {/* NFC Write */}
                {nfcSupported && (
                  <button
                    onClick={writeNFC}
                    disabled={nfcWriting}
                    className="py-3 bg-primary/50 text-neutral rounded-xl font-medium hover:bg-primary/70 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    📱 {nfcWriting ? 'Writing...' : 'NFC Tap'}
                  </button>
                )}
              </div>

              {/* NFC Status */}
              {nfcStatus && (
                <p className="text-center text-sm mt-4 text-accent">{nfcStatus}</p>
              )}

              {/* Short code display */}
              <p className="text-center text-neutral/40 text-xs mt-4">
                Code: {shortCode}
              </p>
            </>
          ) : (
            <div className="text-center py-8 text-accent">
              Failed to generate share link
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
