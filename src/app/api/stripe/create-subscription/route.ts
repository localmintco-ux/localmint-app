import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  const { restaurantId, firstName, lastName, email, phone, paymentMethodId } = await req.json();

  if (!restaurantId || !firstName || !lastName || !email || !paymentMethodId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Get restaurant details
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  try {
    // Create or get Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer: Stripe.Customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
      // Attach new payment method
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    } else {
      customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        phone: phone || undefined,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
        metadata: {
          restaurant_id: restaurantId,
          restaurant_name: restaurant.name,
        },
      });
    }

    // Create or find the product and price for this restaurant
    const productName = `${restaurant.name} VIP Membership`;
    const products = await stripe.products.search({ query: `name:"${productName}"` });
    let product: Stripe.Product;

    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: productName,
        description: `${restaurant.discount_percent}% off every visit`,
        metadata: { restaurant_id: restaurantId },
      });
    }

    // Find or create the recurring price
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
    let price: Stripe.Price;

    if (prices.data.length > 0 && prices.data[0].unit_amount === Math.round(restaurant.subscription_price * 100)) {
      price = prices.data[0];
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(restaurant.subscription_price * 100),
        currency: 'usd',
        recurring: { interval: 'month' },
      });
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        restaurant_id: restaurantId,
        first_name: firstName,
        last_name: lastName,
        phone: phone || '',
      },
    });

    const invoice = subscription.latest_invoice as unknown as { payment_intent: Stripe.PaymentIntent };
    const paymentIntent = invoice.payment_intent;

    // If payment requires action (3D Secure etc)
    if (paymentIntent.status === 'requires_action') {
      return NextResponse.json({
        status: 'requires_action',
        clientSecret: paymentIntent.client_secret,
      });
    }

    // Payment succeeded — create member in our database
    if (paymentIntent.status === 'succeeded') {
      await supabase.from('members').upsert({
        restaurant_id: restaurantId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        status: 'active',
      }, {
        onConflict: 'restaurant_id,email',
      });

      return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ status: 'processing' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create subscription';
    console.error('Stripe error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
