import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Verify auth
  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auth = verifyToken(token);
  if (!auth) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { memberId } = await req.json();

  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
  }

  // Verify member belongs to this restaurant
  const { data: member } = await supabase
    .from('members')
    .select('id, restaurant_id')
    .eq('id', memberId)
    .single();

  if (!member || member.restaurant_id !== auth.restaurantId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Cancel membership
  const { error } = await supabase
    .from('members')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) {
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }

  // In production, also cancel Stripe subscription here

  return NextResponse.json({ success: true });
}
