import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'localmint-admin-2026';

function checkAdmin(req: NextRequest) {
  const auth = req.cookies.get('admin_auth')?.value;
  return auth === ADMIN_PASSWORD;
}

// GET - list all restaurants
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  // Get member counts per restaurant
  const { data: members } = await supabase
    .from('members')
    .select('restaurant_id, status');

  // Get page view counts per restaurant
  const { data: views } = await supabase
    .from('page_views')
    .select('restaurant_id, page_type');

  const enriched = (restaurants || []).map(r => {
    const rMembers = (members || []).filter(m => m.restaurant_id === r.id);
    const rViews = (views || []).filter(v => v.restaurant_id === r.id);
    return {
      ...r,
      active_members: rMembers.filter(m => m.status === 'active').length,
      total_members: rMembers.length,
      mrr: rMembers.filter(m => m.status === 'active').length * r.subscription_price,
      signup_views: rViews.filter(v => v.page_type === 'signup').length,
      verify_views: rViews.filter(v => v.page_type === 'verify').length,
    };
  });

  return NextResponse.json(enriched);
}

// POST - create new restaurant
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, slug, description, address, phone, subscription_price, discount_percent } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  // Check if slug exists
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      description: description || null,
      address: address || null,
      phone: phone || null,
      subscription_price: subscription_price || 55,
      discount_percent: discount_percent || 35,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT - update restaurant settings
export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, description, subscription_price, discount_percent, onboarding_step } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (subscription_price !== undefined) updateData.subscription_price = subscription_price;
  if (discount_percent !== undefined) updateData.discount_percent = discount_percent;
  if (onboarding_step !== undefined) updateData.onboarding_step = onboarding_step;

  const { data, error } = await supabase
    .from('restaurants')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update restaurant' }, { status: 500 });
  }

  return NextResponse.json(data);
}
