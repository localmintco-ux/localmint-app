import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { restaurantId, action, data } = body;

  if (!restaurantId || !action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (action === 'save_details') {
    const { error } = await supabase.from('restaurants').update({
      address: data.address || null,
      phone: data.phone || null,
      website: data.website || null,
      hours: data.hours || null,
      cuisine_type: data.cuisineType || null,
      pos_system: data.posSystem || null,
      onboarding_step: 1,
    }).eq('id', restaurantId);

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'save_menu_url') {
    const { error } = await supabase.from('restaurants').update({
      menu_url: data.url,
      onboarding_step: 2,
    }).eq('id', restaurantId);

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'save_sales_url') {
    const { error } = await supabase.from('restaurants').update({
      sales_data_url: data.url,
      onboarding_step: 3,
    }).eq('id', restaurantId);

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'approve_offer') {
    const { error } = await supabase.from('restaurants').update({
      offer_approved: true,
      onboarding_step: 4,
    }).eq('id', restaurantId);

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'approve_materials') {
    const { error } = await supabase.from('restaurants').update({
      materials_approved: true,
      onboarding_step: 5,
    }).eq('id', restaurantId);

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
