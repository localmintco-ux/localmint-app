import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, restaurantName, paymentMethodId } = await req.json();

  if (!firstName || !lastName || !email || !restaurantName || !paymentMethodId) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  try {
    // Create or get Stripe customer
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
        metadata: {
          type: 'restaurant_partner',
          restaurant_name: restaurantName,
        },
      });
    }

    // Create or find the LocalMint Partner product
    const productName = 'LocalMint Partner Program';
    const products = await stripe.products.search({ query: `name:"${productName}"` });
    let product: Stripe.Product;

    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: productName,
        description: 'VIP membership program platform for restaurants — $199/month + 15% of subscription revenue',
      });
    }

    // Find or create the $199/month price
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

    // Create the subscription
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
      return NextResponse.json({ status: 'success' });
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
