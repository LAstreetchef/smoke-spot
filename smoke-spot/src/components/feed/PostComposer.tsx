// components/feed/PostComposer.tsx
'use client';

import { useState, useRef } from 'react';
import { createPost, uploadPostImage } from '@/lib/feed';

interface PostComposerProps {
  lat: number;
  lng: number;
  spotId: string | null;
  onPost: () => void;
}

export function PostComposer({ lat, lng, spotId, onPost }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;
  const canPost = charCount >= 1 && charCount <= 500 && !posting;

  async function handlePost() {
    if (!canPost) return;
    setPosting(true);
    setError(null);

    try {
      let image_url: string | undefined;
      if (imageFile) {
        image_url = await uploadPostImage(imageFile);
      }

      await createPost({
        content,
        latitude: lat,
        longitude: lng,
        image_url,
        spot_id: spotId,
      });
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      onPost();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="bg-zinc-800/80 rounded-xl p-4 space-y-3 border border-zinc-700">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={spotId ? 'Say something about this spot...' : "What's happening nearby? 🌿"}
        rows={3}
        maxLength={500}
        className="w-full bg-transparent text-white placeholder-zinc-500 resize-none focus:outline-none text-sm"
        autoFocus
      />

      {imagePreview && (
        <div className="relative inline-block">
          <img
            src={imagePreview}
            alt="Upload preview"
            className="max-h-40 rounded-lg object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-400"
          >
            ✕
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="text-zinc-400 hover:text-emerald-400 transition text-sm"
          >
            📷
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <span className={`text-xs ${charCount > 450 ? 'text-amber-400' : 'text-zinc-500'}`}>
            {charCount}/500
          </span>
        </div>

        <button
          onClick={handlePost}
          disabled={!canPost}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
            canPost
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {posting ? (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              Posting...
            </span>
          ) : (
            'Post'
          )}
        </button>
      </div>
    </div>
  );
}
