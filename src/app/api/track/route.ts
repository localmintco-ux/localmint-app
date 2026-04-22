import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, pageType, visitorId } = await req.json();

    if (!pageType) {
      return NextResponse.json({ error: 'Missing pageType' }, { status: 400 });
    }

    await supabase.from('page_views').insert({
      restaurant_id: restaurantId || null,
      page_type: pageType,
      visitor_id: visitorId || null,
      user_agent: req.headers.get('user-agent') || null,
      referrer: req.headers.get('referer') || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Fail silently — tracking should never break the page
  }
}
