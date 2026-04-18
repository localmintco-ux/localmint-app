-- LocalMint Database Schema
-- Run this in Supabase SQL Editor (supabase.com > your project > SQL Editor)

-- Restaurants table
CREATE TABLE restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- used in URLs: /join/marios
  logo_url TEXT,
  description TEXT,
  address TEXT,
  phone TEXT,
  subscription_price DECIMAL(10,2) NOT NULL DEFAULT 55.00,
  discount_percent INTEGER NOT NULL DEFAULT 35,
  stripe_account_id TEXT, -- Stripe Connect account
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Members table
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(restaurant_id, email)
);

-- Restaurant owners/admins
CREATE TABLE restaurant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff')),
  UNIQUE(restaurant_id, email)
);

-- Indexes for fast lookups
CREATE INDEX idx_members_restaurant ON members(restaurant_id);
CREATE INDEX idx_members_status ON members(restaurant_id, status);
CREATE INDEX idx_members_name ON members(restaurant_id, lower(first_name), lower(last_name));
CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- Enable Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_users ENABLE ROW LEVEL SECURITY;

-- Public read access for restaurants (needed for signup page)
CREATE POLICY "Restaurants are publicly readable" ON restaurants
  FOR SELECT USING (is_active = true);

-- Public insert for members (needed for signup)
CREATE POLICY "Anyone can create a member" ON members
  FOR INSERT WITH CHECK (true);

-- Public read for members by restaurant (needed for verification tool)
CREATE POLICY "Members readable by restaurant" ON members
  FOR SELECT USING (true);

-- Insert the demo restaurant: Mario's Bistro
INSERT INTO restaurants (name, slug, description, address, subscription_price, discount_percent)
VALUES (
  'Mario''s Bistro',
  'marios',
  'Fine Italian dining on Long Island. EST. 2019.',
  '123 Main St, Long Island, NY',
  55.00,
  35
);
