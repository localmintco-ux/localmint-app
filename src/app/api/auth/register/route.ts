import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password, name, restaurantSlug } = await req.json();

  if (!email || !password || !name || !restaurantSlug) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }

  // Find restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('slug', restaurantSlug)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  // Check if user exists
  const { data: existing } = await supabase
    .from('restaurant_users')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('restaurant_id', restaurant.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Account already exists' }, { status: 409 });
  }

  // Hash password & create user
  const password_hash = await bcrypt.hash(password, 12);

  const { data: user, error } = await supabase
    .from('restaurant_users')
    .insert({
      email: email.toLowerCase(),
      password_hash,
      name,
      restaurant_id: restaurant.id,
      role: 'owner',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }

  const token = createToken({
    userId: user.id,
    restaurantId: restaurant.id,
    slug: restaurant.slug,
  });

  const response = NextResponse.json({
    success: true,
    slug: restaurant.slug,
  });

  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
