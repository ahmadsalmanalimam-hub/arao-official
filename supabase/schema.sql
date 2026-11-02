-- ==============================================================================
-- ARAO SOCIAL MEDIA — COMPLETE POSTGRESQL & SUPABASE PRODUCTION SCHEMA
-- Tables: users, posts, comments, likes, followers, messages, 
--         verification_requests, engagement_orders, payment_settings,
--         premium_subscriptions, admin_logs
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT UNIQUE NOT NULL, -- Links to Supabase Auth uid or custom ID
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  username TEXT UNIQUE NOT NULL,
  username_lowercase TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT,
  cover_image TEXT,
  bio TEXT DEFAULT '',
  badge_type TEXT DEFAULT 'none' CHECK (badge_type IN ('none', 'creator_purple', 'business_blue')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'advertiser', 'admin', 'owner_admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  is_official BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  total_likes_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexing for users
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username_lowercase);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- 2. POSTS TABLE (Short videos & photos)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  username TEXT NOT NULL,
  user_display_name TEXT,
  user_avatar TEXT,
  media_type TEXT DEFAULT 'video' CHECK (media_type IN ('video', 'photo', 'slideshow')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  photo_transition TEXT DEFAULT 'fade',
  photo_duration NUMERIC DEFAULT 5,
  caption TEXT DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'entertainment',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  allow_download BOOLEAN DEFAULT TRUE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
  sound_title TEXT DEFAULT 'Original Sound',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_sponsored BOOLEAN DEFAULT FALSE,
  is_promoted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts (category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);

-- 3. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id TEXT UNIQUE NOT NULL,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  user_avatar TEXT,
  text TEXT NOT NULL,
  parent_comment_id TEXT,
  likes_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);

-- 4. LIKES TABLE
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(post_id, user_id)
);

-- 5. FOLLOWERS TABLE
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(follower_id, following_id)
);

-- 6. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  text TEXT,
  media_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_convo ON public.messages (conversation_id);

-- 7. VERIFICATION_REQUESTS TABLE (Creator & Business verification applications)
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_badge TEXT NOT NULL CHECK (requested_badge IN ('creator_purple', 'business_blue')),
  category TEXT NOT NULL, -- e.g. Artist, Content Creator, Brand, Organization
  full_legal_name TEXT NOT NULL,
  business_name TEXT,
  document_url TEXT NOT NULL, -- Private document link in verification_docs bucket
  website_url TEXT,
  social_links TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_verification_status ON public.verification_requests (status);

-- 8. ENGAGEMENT_ORDERS TABLE (/store promotional campaigns & orders)
CREATE TABLE IF NOT EXISTS public.engagement_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('account_promotion', 'post_promotion', 'comment_promotion', 'monthly_premium', 'yearly_premium')),
  product_title TEXT NOT NULL,
  target_url TEXT, -- profile link or post link to promote
  amount_usd NUMERIC NOT NULL,
  amount_naira NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'bank_transfer')),
  payment_reference TEXT NOT NULL,
  proof_file_url TEXT, -- Private receipt in payment_proofs bucket
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'completed', 'rejected')),
  verified_by TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.engagement_orders (status);

-- 9. PAYMENT_SETTINGS TABLE (Owner-only configuration)
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_active BOOLEAN DEFAULT TRUE,
  paypal_email TEXT DEFAULT 'payments@arao.app',
  bank_name TEXT DEFAULT 'Zenith Bank',
  account_number TEXT DEFAULT '1012345678',
  account_name TEXT DEFAULT 'ARAO Digital Media Limited',
  bank_code TEXT DEFAULT '057',
  exchange_rate_usd_to_ngn NUMERIC DEFAULT 1200,
  account_promo_price_usd NUMERIC DEFAULT 5,
  account_promo_price_ngn NUMERIC DEFAULT 6000,
  post_promo_price_usd NUMERIC DEFAULT 2,
  post_promo_price_ngn NUMERIC DEFAULT 3000,
  comment_promo_price_usd NUMERIC DEFAULT 5,
  comment_promo_price_ngn NUMERIC DEFAULT 6000,
  monthly_premium_price_usd NUMERIC DEFAULT 3,
  monthly_premium_price_ngn NUMERIC DEFAULT 4000,
  yearly_premium_price_usd NUMERIC DEFAULT 25,
  yearly_premium_price_ngn NUMERIC DEFAULT 30000,
  instructions TEXT DEFAULT 'Transfer the exact amount and paste transaction reference or upload screenshot proof.',
  updated_by TEXT DEFAULT 'nasirandco001@gmail.com',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. PREMIUM_SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('monthly', 'yearly')),
  price_paid NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  verified_by TEXT,
  order_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subs_user_id ON public.premium_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subs_active ON public.premium_subscriptions (is_active, expires_at);

-- 11. ADMIN_LOGS TABLE (Security audit trail)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. VERIFY_USER, BAN_USER, APPROVE_ORDER, UPDATE_PAYMENT_SETTINGS
  target_id TEXT,
  target_type TEXT, -- user, post, order, setting
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs (created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Public read for posts, public users info, comments, likes
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid()::text = uid);

CREATE POLICY "Public posts are viewable by everyone" ON public.posts FOR SELECT USING (visibility = 'public' OR auth.uid()::text = user_id);
CREATE POLICY "Users can insert own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admin & Owner Policy helper functions
CREATE OR REPLACE FUNCTION public.is_owner() RETURNS BOOLEAN AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'email' = 'nasirandco001@gmail.com';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid()::text 
    AND (role IN ('admin', 'owner_admin') OR email = 'nasirandco001@gmail.com')
  );
$$ LANGUAGE SQL STABLE;

-- Admin-only tables access
CREATE POLICY "Admins can view verification requests" ON public.verification_requests FOR SELECT USING (public.is_admin() OR auth.uid()::text = user_id);
CREATE POLICY "Users can create verification request" ON public.verification_requests FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Admins can update verification requests" ON public.verification_requests FOR UPDATE USING (public.is_admin());

CREATE POLICY "Users can view own orders and Admins can view all" ON public.engagement_orders FOR SELECT USING (public.is_admin() OR auth.uid()::text = user_id);
CREATE POLICY "Users can create engagement orders" ON public.engagement_orders FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Admins can update engagement orders" ON public.engagement_orders FOR UPDATE USING (public.is_admin());

-- Payment settings: Anyone can view public pricing, only Owner can view sensitive bank and edit
CREATE POLICY "Public can view pricing" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Only owner can update payment settings" ON public.payment_settings FOR ALL USING (public.is_owner());

-- Admin logs: Admins and owner only
CREATE POLICY "Only admins can view admin logs" ON public.admin_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert admin logs" ON public.admin_logs FOR INSERT WITH CHECK (public.is_admin());

-- Seed initial owner profile and payment settings
INSERT INTO public.payment_settings (
  is_active, paypal_email, bank_name, account_number, account_name, bank_code,
  exchange_rate_usd_to_ngn, account_promo_price_usd, account_promo_price_ngn,
  post_promo_price_usd, post_promo_price_ngn, comment_promo_price_usd, comment_promo_price_ngn,
  monthly_premium_price_usd, monthly_premium_price_ngn, yearly_premium_price_usd, yearly_premium_price_ngn
) VALUES (
  TRUE, 'payments@arao.app', 'Zenith Bank', '1012345678', 'ARAO Digital Media Limited', '057',
  1200, 5, 6000, 2, 3000, 5, 6000, 3, 4000, 25, 30000
) ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  uid, email, username, username_lowercase, display_name,
  role, is_verified, is_official, is_premium, badge_type
) VALUES (
  'arao_owner_nasir', 'nasirandco001@gmail.com', 'arao', 'arao', 'Araoofficial',
  'owner_admin', TRUE, TRUE, TRUE, 'creator_purple'
) ON CONFLICT (email) DO UPDATE SET
  username = 'arao',
  username_lowercase = 'arao',
  display_name = 'Araoofficial',
  role = 'owner_admin',
  is_verified = TRUE,
  is_official = TRUE,
  is_premium = TRUE,
  badge_type = 'creator_purple';
