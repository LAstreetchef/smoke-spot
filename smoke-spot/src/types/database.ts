export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'smoker' | 'business' | 'staff' | 'admin'
export type SpotType = 'outdoor' | 'indoor' | 'covered' | 'rooftop' | 'balcony' | 'alley' | 'park' | 'other'
export type SpotStatus = 'pending' | 'approved' | 'flagged' | 'removed'
export type BusinessType = 'smoke_shop' | 'dispensary' | 'bar' | 'lounge' | 'restaurant' | 'vape_shop' | 'brand' | 'other'
export type AdType = 'banner' | 'featured_spot' | 'sponsored_pin' | 'interstitial' | 'fire_sale'
export type AdStatus = 'draft' | 'active' | 'paused' | 'completed'
export type AdEventType = 'impression' | 'click'
export type ReferralStatus = 'pending' | 'qualified' | 'paid'
export type ShareType = 'spot' | 'profile' | 'contact'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          avatar_url: string | null
          role: UserRole
          bio: string | null
          referral_code: string
          referred_by: string | null
          nfc_card_id: string | null
          total_spots_created: number
          total_affiliate_earnings: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          avatar_url?: string | null
          role?: UserRole
          bio?: string | null
          referral_code: string
          referred_by?: string | null
          nfc_card_id?: string | null
          total_spots_created?: number
          total_affiliate_earnings?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          avatar_url?: string | null
          role?: UserRole
          bio?: string | null
          referral_code?: string
          referred_by?: string | null
          nfc_card_id?: string | null
          total_spots_created?: number
          total_affiliate_earnings?: number
          created_at?: string
          updated_at?: string
        }
      }
      smoke_spots: {
        Row: {
          id: string
          created_by: string
          name: string
          description: string
          latitude: number
          longitude: number
          address: string
          spot_type: SpotType
          vibe_tags: string[]
          amenities: string[]
          photos: string[]
          avg_rating: number
          total_reviews: number
          is_verified: boolean
          is_active: boolean
          operating_hours: string | null
          status: SpotStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by: string
          name: string
          description: string
          latitude: number
          longitude: number
          address: string
          spot_type: SpotType
          vibe_tags?: string[]
          amenities?: string[]
          photos?: string[]
          avg_rating?: number
          total_reviews?: number
          is_verified?: boolean
          is_active?: boolean
          operating_hours?: string | null
          status?: SpotStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string
          name?: string
          description?: string
          latitude?: number
          longitude?: number
          address?: string
          spot_type?: SpotType
          vibe_tags?: string[]
          amenities?: string[]
          photos?: string[]
          avg_rating?: number
          total_reviews?: number
          is_verified?: boolean
          is_active?: boolean
          operating_hours?: string | null
          status?: SpotStatus
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          spot_id: string
          user_id: string
          rating: number
          comment: string | null
          photos: string[]
          helpful_count: number
          created_at: string
        }
        Insert: {
          id?: string
          spot_id: string
          user_id: string
          rating: number
          comment?: string | null
          photos?: string[]
          helpful_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          spot_id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          photos?: string[]
          helpful_count?: number
          created_at?: string
        }
      }
      advertisers: {
        Row: {
          id: string
          user_id: string
          business_name: string
          business_type: BusinessType
          logo_url: string
          website_url: string | null
          stripe_account_id: string
          is_verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          business_type: BusinessType
          logo_url: string
          website_url?: string | null
          stripe_account_id: string
          is_verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          business_type?: BusinessType
          logo_url?: string
          website_url?: string | null
          stripe_account_id?: string
          is_verified?: boolean
          created_at?: string
        }
      }
      ad_campaigns: {
        Row: {
          id: string
          advertiser_id: string
          name: string
          ad_type: AdType
          creative_url: string
          click_url: string
          target_radius_km: number
          target_center_lat: number
          target_center_lng: number
          budget_cents: number
          spent_cents: number
          cpm_cents: number
          status: AdStatus
          start_date: string
          end_date: string
          created_at: string
          deal_text: string | null  // For fire_sale: "BOGO Lighters", "Free Rolling Papers", etc.
        }
        Insert: {
          id?: string
          advertiser_id: string
          name: string
          ad_type: AdType
          creative_url: string
          click_url: string
          target_radius_km: number
          target_center_lat: number
          target_center_lng: number
          budget_cents: number
          spent_cents?: number
          cpm_cents: number
          status?: AdStatus
          start_date: string
          end_date: string
          created_at?: string
          deal_text?: string | null
        }
        Update: {
          id?: string
          advertiser_id?: string
          name?: string
          ad_type?: AdType
          creative_url?: string
          click_url?: string
          target_radius_km?: number
          target_center_lat?: number
          target_center_lng?: number
          budget_cents?: number
          spent_cents?: number
          cpm_cents?: number
          status?: AdStatus
          start_date?: string
          end_date?: string
          created_at?: string
          deal_text?: string | null
        }
      }
      ad_events: {
        Row: {
          id: string
          campaign_id: string
          user_id: string | null
          event_type: AdEventType
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id?: string | null
          event_type: AdEventType
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string | null
          event_type?: AdEventType
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
      }
      affiliate_referrals: {
        Row: {
          id: string
          referrer_user_id: string
          referred_advertiser_id: string
          status: ReferralStatus
          commission_cents: number
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          referrer_user_id: string
          referred_advertiser_id: string
          status?: ReferralStatus
          commission_cents?: number
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          referrer_user_id?: string
          referred_advertiser_id?: string
          status?: ReferralStatus
          commission_cents?: number
          paid_at?: string | null
          created_at?: string
        }
      }
      nfc_shares: {
        Row: {
          id: string
          sender_user_id: string
          share_type: ShareType
          payload_id: string
          short_code: string
          scans: number
          created_at: string
        }
        Insert: {
          id?: string
          sender_user_id: string
          share_type: ShareType
          payload_id: string
          short_code: string
          scans?: number
          created_at?: string
        }
        Update: {
          id?: string
          sender_user_id?: string
          share_type?: ShareType
          payload_id?: string
          short_code?: string
          scans?: number
          created_at?: string
        }
      }
      saved_spots: {
        Row: {
          id: string
          user_id: string
          spot_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          spot_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          spot_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      spot_type: SpotType
      spot_status: SpotStatus
      business_type: BusinessType
      ad_type: AdType
      ad_status: AdStatus
      ad_event_type: AdEventType
      referral_status: ReferralStatus
      share_type: ShareType
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type SmokeSpot = Database['public']['Tables']['smoke_spots']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Advertiser = Database['public']['Tables']['advertisers']['Row']
export type AdCampaign = Database['public']['Tables']['ad_campaigns']['Row']
export type AdEvent = Database['public']['Tables']['ad_events']['Row']
export type AffiliateReferral = Database['public']['Tables']['affiliate_referrals']['Row']
export type NFCShare = Database['public']['Tables']['nfc_shares']['Row']
export type SavedSpot = Database['public']['Tables']['saved_spots']['Row']
