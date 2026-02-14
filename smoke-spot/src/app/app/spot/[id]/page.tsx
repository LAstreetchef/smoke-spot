'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ShareSheet from '@/components/ShareSheet'
import { useToast } from '@/components/Toast'
import { PostComposer } from '@/components/feed/PostComposer'
import { FeedCard } from '@/components/feed/FeedCard'
import { FeedSortToggle } from '@/components/feed/FeedSortToggle'
import { fetchSpotFeed } from '@/lib/feed'
import type { FeedPost, FeedSort } from '@/types/feed'

interface Spot {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  address: string
  spot_type: string
  vibe_tags: string[]
  amenities: string[]
  photos: string[]
  avg_rating: number
  total_reviews: number
  is_verified: boolean
  operating_hours: string | null
  created_at: string
  created_by: string
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  user: {
    username: string
    avatar_url: string
  }
}

export default function SpotDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  // Core state
  const [spot, setSpot] = useState<Spot | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'ring'>('details')
  
  // Feed state (Smoke Ring)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedSort, setFeedSort] = useState<FeedSort>('new')
  
  // UI state
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', photos: [] as File[] })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [canAddPhotos, setCanAddPhotos] = useState(false)
  const [bannerAd, setBannerAd] = useState<{ id: string; creative_url: string; click_url: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSpot()
    fetchUser()
  }, [params.id])

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
    if (data.user) {
      checkSaved(data.user.id)
      checkCanAddPhotos(data.user.id)
    }
  }

  const checkCanAddPhotos = async (userId: string) => {
    if (userId) {
      setCanAddPhotos(true)
    }
  }

  const fetchSpot = async () => {
    const { data: spotData, error } = await supabase
      .from('smoke_spots')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !spotData) {
      router.push('/app')
      return
    }

    setSpot(spotData)

    // Fetch ads for this location
    try {
      const adsResponse = await fetch(`/api/ads?lat=${spotData.latitude}&lng=${spotData.longitude}`)
      if (adsResponse.ok) {
        const adsData = await adsResponse.json()
        if (adsData.banners?.length > 0) {
          setBannerAd(adsData.banners[0])
          fetch('/api/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: adsData.banners[0].id,
              event_type: 'impression',
              latitude: spotData.latitude,
              longitude: spotData.longitude,
            }),
          }).catch(() => {})
        }
      }
    } catch (e) {}

    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        user:users(username, avatar_url)
      `)
      .eq('spot_id', params.id)
      .order('created_at', { ascending: false })

    if (reviewsData) {
      setReviews(reviewsData as any)
    }

    setLoading(false)
  }

  // Load Smoke Ring feed
  const loadFeed = useCallback(async () => {
    if (!params.id) return
    setFeedLoading(true)
    try {
      const data = await fetchSpotFeed({
        spot_id: params.id as string,
        sort: feedSort,
      })
      setPosts(data)
    } catch (err) {
      console.error('Failed to load feed:', err)
    } finally {
      setFeedLoading(false)
    }
  }, [params.id, feedSort])

  // Load feed when tab switches to ring or sort changes
  useEffect(() => {
    if (activeTab === 'ring' && spot) {
      loadFeed()
    }
  }, [activeTab, feedSort, spot, loadFeed])

  // Auto-refresh feed every 30s when on ring tab
  useEffect(() => {
    if (activeTab !== 'ring') return
    const interval = setInterval(loadFeed, 30000)
    return () => clearInterval(interval)
  }, [activeTab, loadFeed])

  const checkSaved = async (userId: string) => {
    const { data } = await supabase
      .from('saved_spots')
      .select('id')
      .eq('user_id', userId)
      .eq('spot_id', params.id)
      .single()

    setIsSaved(!!data)
  }

  const toggleSave = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (isSaved) {
      await supabase
        .from('saved_spots')
        .delete()
        .eq('user_id', user.id)
        .eq('spot_id', params.id)
    } else {
      await supabase
        .from('saved_spots')
        .insert({ user_id: user.id, spot_id: params.id })
    }

    setIsSaved(!isSaved)
  }

  const submitReview = async () => {
    if (!user || !spot) {
      router.push('/auth/login')
      return
    }

    setSubmittingReview(true)

    try {
      const uploadedUrls: string[] = []
      for (const file of reviewForm.photos) {
        const ext = file.name.split('.').pop()
        const fileName = `${spot.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        
        const { error: uploadError } = await supabase.storage
          .from('spot-photos')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('spot-photos')
            .getPublicUrl(fileName)
          uploadedUrls.push(publicUrl)
        }
      }

      if (uploadedUrls.length > 0) {
        const currentPhotos = spot.photos || []
        await supabase
          .from('smoke_spots')
          .update({ photos: [...currentPhotos, ...uploadedUrls] })
          .eq('id', spot.id)
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          spot_id: params.id,
          user_id: user.id,
          rating: reviewForm.rating,
          comment: reviewForm.comment || null,
        })

      if (error) {
        if (error.code === '23505') {
          showToast('You already reviewed this spot', 'info')
        } else {
          showToast('Failed to submit review', 'error')
        }
        setSubmittingReview(false)
        return
      }

      setShowReviewForm(false)
      setReviewForm({ rating: 5, comment: '', photos: [] })
      setCanAddPhotos(true)
      fetchSpot()
    } catch (err) {
      console.error('Review submit error:', err)
      showToast('Failed to submit review', 'error')
    }
    
    setSubmittingReview(false)
  }

  const openDirections = () => {
    if (!spot) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`
    window.open(url, '_blank')
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !spot || !user) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
      return
    }

    setUploadingPhoto(true)

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${spot.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('spot-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        showToast('Failed to upload photo', 'error')
        setUploadingPhoto(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('spot-photos')
        .getPublicUrl(fileName)

      const currentPhotos = spot.photos || []
      const { error: updateError } = await supabase
        .from('smoke_spots')
        .update({ photos: [...currentPhotos, publicUrl] })
        .eq('id', spot.id)

      if (updateError) {
        showToast('Failed to save photo', 'error')
        setUploadingPhoto(false)
        return
      }

      setSpot({ ...spot, photos: [...currentPhotos, publicUrl] })
      setCurrentPhotoIndex(currentPhotos.length)
    } catch (err) {
      showToast('Failed to upload photo', 'error')
    }

    setUploadingPhoto(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-neutral/50">Loading...</div>
      </main>
    )
  }

  if (!spot) return null

  return (
    <main className="min-h-screen bg-primary">
      {/* Header */}
      <header className="sticky top-0 bg-secondary/90 backdrop-blur-sm border-b border-neutral/10 px-4 py-3 flex items-center justify-between z-10">
        <Link href="/app" className="text-neutral/70 hover:text-neutral">
          ← Back
        </Link>
        <button
          onClick={toggleSave}
          className={`text-2xl ${isSaved ? 'text-accent' : 'text-neutral/50'}`}
        >
          {isSaved ? '❤️' : '🤍'}
        </button>
      </header>

      {/* Hero Image */}
      <div className="h-48 bg-primary relative">
        {spot.photos?.length > 0 ? (
          <>
            <img 
              src={spot.photos[currentPhotoIndex]} 
              alt={spot.name} 
              className="w-full h-full object-cover" 
            />
            {spot.photos.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentPhotoIndex(i => i > 0 ? i - 1 : spot.photos.length - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentPhotoIndex(i => i < spot.photos.length - 1 ? i + 1 : 0)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
                >
                  ›
                </button>
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
                  {currentPhotoIndex + 1} / {spot.photos.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full relative">
            <img 
              src={`https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${spot.latitude},${spot.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`}
              alt={`Street view of ${spot.name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Spot Name & Quick Info */}
      <div className="px-4 py-3 border-b border-neutral/10">
        <div className="flex items-start justify-between mb-1">
          <h1 className="font-display text-xl font-bold text-neutral">{spot.name}</h1>
          {spot.is_verified && (
            <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">✓ Verified</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-yellow-400">★</span>
          <span className="text-neutral font-medium">{spot.avg_rating?.toFixed(1) || 'New'}</span>
          <span className="text-neutral/50">({spot.total_reviews})</span>
          <span className="text-neutral/30">•</span>
          <span className="text-neutral/60 capitalize">{spot.spot_type}</span>
        </div>
        <p className="text-neutral/50 text-sm mt-1">{spot.address}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral/10 sticky top-[57px] bg-primary z-10">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === 'details' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-neutral/50 hover:text-neutral/70'
          }`}
        >
          📍 Details
        </button>
        <button
          onClick={() => setActiveTab('ring')}
          className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
            activeTab === 'ring' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-neutral/50 hover:text-neutral/70'
          }`}
        >
          💨 Smoke Ring
          {posts.length > 0 && (
            <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
              {posts.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        // ─── DETAILS TAB ───
        <div className="p-4">
          {/* Photo Thumbnails */}
          {(spot.photos?.length > 0 || canAddPhotos) && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
              {spot.photos?.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPhotoIndex(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                    i === currentPhotoIndex ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              {canAddPhotos && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-14 h-14 rounded-lg bg-primary border-2 border-dashed border-neutral/30 flex items-center justify-center flex-shrink-0 hover:border-accent transition disabled:opacity-50"
                >
                  {uploadingPhoto ? '...' : '+'}
                </button>
              )}
            </div>
          )}

          {/* Description */}
          {spot.description && (
            <p className="text-neutral/80 mb-4">{spot.description}</p>
          )}

          {/* Vibe Tags */}
          {spot.vibe_tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {spot.vibe_tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-accent/20 text-accent text-sm rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Amenities */}
          {spot.amenities?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-neutral/50 text-sm mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {spot.amenities.map((amenity) => (
                  <span key={amenity} className="px-3 py-1 bg-secondary text-neutral/70 text-sm rounded-full border border-neutral/10">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={openDirections}
              className="flex-1 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition"
            >
              🧭 Directions
            </button>
            <button
              onClick={() => setShowShareSheet(true)}
              className="px-4 py-3 bg-secondary border border-neutral/20 text-neutral rounded-xl hover:bg-secondary/80 transition"
            >
              📤
            </button>
          </div>

          <ShareSheet
            isOpen={showShareSheet}
            onClose={() => setShowShareSheet(false)}
            shareType="spot"
            payloadId={spot.id}
            title={spot.name}
          />

          {/* Banner Ad */}
          {bannerAd && (
            <a
              href={bannerAd.click_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                fetch('/api/ads', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    campaign_id: bannerAd.id,
                    event_type: 'click',
                    latitude: spot.latitude,
                    longitude: spot.longitude,
                  }),
                })
              }}
              className="block mb-6 bg-secondary/80 rounded-xl p-3 border border-neutral/10 hover:border-accent/50 transition"
            >
              <div className="flex items-center gap-3">
                <img src={bannerAd.creative_url} alt="" className="h-10 w-auto rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-neutral text-sm font-medium truncate">{bannerAd.name}</p>
                  <p className="text-neutral/50 text-xs">Sponsored</p>
                </div>
              </div>
            </a>
          )}

          {/* Reviews Section */}
          <div className="border-t border-neutral/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-neutral">Reviews</h2>
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="text-accent text-sm hover:underline"
              >
                + Add Review
              </button>
            </div>

            {showReviewForm && (
              <div className="bg-secondary rounded-xl p-4 mb-4 border border-neutral/10">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                      className={`text-2xl ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-neutral/30'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience..."
                  rows={3}
                  className="w-full px-3 py-2 bg-primary border border-neutral/20 rounded-lg text-neutral text-sm placeholder:text-neutral/40 focus:outline-none focus:border-accent resize-none mb-3"
                />
                
                <div className="mb-3">
                  <div className="flex gap-2 flex-wrap">
                    {reviewForm.photos.map((file, i) => (
                      <div key={i} className="relative w-14 h-14">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover rounded-lg" />
                        <button
                          onClick={() => setReviewForm(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {reviewForm.photos.length < 4 && (
                      <label className="w-14 h-14 rounded-lg bg-primary border-2 border-dashed border-neutral/30 flex items-center justify-center cursor-pointer hover:border-accent transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file && file.size <= 5 * 1024 * 1024) {
                              setReviewForm(prev => ({ ...prev, photos: [...prev.photos, file] }))
                            }
                            e.target.value = ''
                          }}
                        />
                        📷
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowReviewForm(false); setReviewForm({ rating: 5, comment: '', photos: [] }) }}
                    className="px-4 py-2 text-neutral/60 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReview}
                    disabled={submittingReview}
                    className="px-4 py-2 bg-accent text-white text-sm rounded-lg disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}

            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-secondary/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                        {(review.user as any)?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-neutral font-medium text-sm">
                        {(review.user as any)?.username || 'Anonymous'}
                      </span>
                      <div className="flex text-yellow-400 text-xs">
                        {'★'.repeat(review.rating)}
                        <span className="text-neutral/30">{'★'.repeat(5 - review.rating)}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-neutral/70 text-sm">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral/50 text-center py-6 text-sm">No reviews yet. Be the first!</p>
            )}
          </div>
        </div>
      ) : (
        // ─── SMOKE RING TAB ───
        <div className="flex flex-col h-[calc(100vh-240px)]">
          {/* Composer */}
          <div className="p-3 border-b border-neutral/10">
            <PostComposer
              lat={spot.latitude}
              lng={spot.longitude}
              spotId={spot.id}
              onPost={loadFeed}
            />
          </div>

          {/* Sort Toggle */}
          <div className="px-3 py-2 flex justify-center border-b border-neutral/10">
            <FeedSortToggle sort={feedSort} onSortChange={setFeedSort} />
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {feedLoading && posts.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-secondary/50 rounded-lg h-20 animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💨</div>
                <p className="text-neutral/60 mb-1">No messages yet</p>
                <p className="text-neutral/40 text-sm">Start the conversation about this spot!</p>
              </div>
            ) : (
              posts.map((post) => (
                <FeedCard key={post.id} post={post} onVote={loadFeed} showDistance={false} />
              ))
            )}
          </div>

          {/* Refresh button */}
          {!feedLoading && posts.length > 0 && (
            <button
              onClick={loadFeed}
              className="py-2 text-neutral/50 hover:text-neutral/80 text-sm transition border-t border-neutral/10"
            >
              ↻ Refresh
            </button>
          )}
        </div>
      )}
    </main>
  )
}
