import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { createToken } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, restaurantName, paymentMethodId, password } = await req.json();

  if (!firstName || !lastName || !email || !restaurantName || !paymentMethodId || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  try {
    // Create Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer: Stripe.Customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    } else {
      customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
        metadata: { type: 'restaurant_partner', restaurant_name: restaurantName },
      });
    }

    // Create product and price
    const productName = 'LocalMint Partner Program';
    const products = await stripe.products.search({ query: `name:"${productName}"` });
    let product: Stripe.Product;

    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: productName,
        description: 'VIP membership program platform for restaurants',
      });
    }

    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
    let price: Stripe.Price;

    if (prices.data.length > 0 && prices.data[0].unit_amount === 19900) {
      price = prices.data[0];
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 19900,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      default_payment_method: paymentMethodId,
      metadata: {
        type: 'restaurant_partner',
        restaurant_name: restaurantName,
        owner_name: `${firstName} ${lastName}`,
        owner_email: email,
      },
    });

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Generate slug from restaurant name
      let slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      
      // Check if slug exists, append number if so
      const { data: existing } = await supabase.from('restaurants').select('slug').eq('slug', slug).single();
      if (existing) {
        slug = slug + '-' + Math.random().toString(36).substring(2, 6);
      }

      // Create restaurant
      const { data: restaurant, error: restError } = await supabase.from('restaurants').insert({
        name: restaurantName,
        slug,
        subscription_price: 29,
        discount_percent: 15,
        is_active: true,
        onboarding_step: 0,
        stripe_account_id: customer.id,
      }).select().single();

      if (restError) {
        console.error('Restaurant creation error:', restError);
        return NextResponse.json({ error: 'Payment succeeded but account setup failed. Contact support.' }, { status: 500 });
      }

      // Create restaurant user account
      const passwordHash = await bcrypt.hash(password, 12);
      
      const { data: user, error: userError } = await supabase.from('restaurant_users').insert({
        restaurant_id: restaurant.id,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: `${firstName} ${lastName}`,
        role: 'owner',
      }).select().single();

      if (userError) {
        console.error('User creation error:', userError);
      }

      // Create auth token
      const token = createToken({
        userId: user?.id || '',
        restaurantId: restaurant.id,
        slug: restaurant.slug,
      });

      const response = NextResponse.json({ 
        status: 'success',
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

    if (subscription.status === 'incomplete') {
      const latestInvoice = await stripe.invoices.retrieve(
        subscription.latest_invoice as string,
        { expand: ['payment_intent'] }
      );
      const invoiceData = latestInvoice as unknown as { payment_intent: Stripe.PaymentIntent };
      const pi = invoiceData.payment_intent;

      if (pi && pi.client_secret) {
        return NextResponse.json({
          status: 'requires_action',
          clientSecret: pi.client_secret,
        });
      }
    }

    return NextResponse.json({ error: 'Payment failed. Please try again.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create subscription';
    console.error('Partner signup error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
