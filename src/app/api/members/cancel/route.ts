import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { memberId } = await req.json();

  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
  }

  // Check for auth token (dashboard users) — optional for verify tool
  const token = req.cookies.get('auth_token')?.value;
  let authRestaurantId: string | null = null;

  if (token) {
    const auth = verifyToken(token);
    if (auth) {
      authRestaurantId = auth.restaurantId;
    }
  }

  // Get the member
  const { data: member } = await supabase
    .from('members')
    .select('id, restaurant_id, stripe_subscription_id')
    .eq('id', memberId)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // If authed, verify member belongs to their restaurant
  if (authRestaurantId && member.restaurant_id !== authRestaurantId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Cancel membership using service role or direct update
  const { error } = await supabase
    .from('members')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) {
    console.error('Cancel error:', error);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }

  // Cancel Stripe subscription if exists
  if (member.stripe_subscription_id) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-03-25.dahlia',
      });
      await stripe.subscriptions.cancel(member.stripe_subscription_id);
    } catch (err) {
      console.error('Stripe cancel error:', err);
      // Don't fail the request if Stripe cancel fails
    }
  }

  return NextResponse.json({ success: true });
}
