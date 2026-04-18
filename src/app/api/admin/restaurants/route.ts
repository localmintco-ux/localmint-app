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

  const enriched = (restaurants || []).map(r => {
    const rMembers = (members || []).filter(m => m.restaurant_id === r.id);
    return {
      ...r,
      active_members: rMembers.filter(m => m.status === 'active').length,
      total_members: rMembers.length,
      mrr: rMembers.filter(m => m.status === 'active').length * r.subscription_price,
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
