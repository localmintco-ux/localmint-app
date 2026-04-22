'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';
import { trackPageView } from '@/lib/tracking';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  subscription_price: number;
  discount_percent: number;
  logo_url: string | null;
}

function JoinForm({ restaurant }: { restaurant: Restaurant }) {
  const stripe = useStripe();
  const elements = useElements();
  const [step, setStep] = useState<'info' | 'processing' | 'success'>('info');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!stripe || !elements) {
      setError('Payment is loading. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Please enter your card information.');
      return;
    }

    setStep('processing');

    try {
      // Create payment method from card
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone || undefined,
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Card error. Please check your details.');
        setStep('info');
        return;
      }

      // Create subscription on our server
      const res = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          paymentMethodId: paymentMethod.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create membership. Please try again.');
        setStep('info');
        return;
      }

      if (data.status === 'requires_action') {
        // Handle 3D Secure
        const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
        if (confirmError) {
          setError(confirmError.message || 'Payment failed. Please try again.');
          setStep('info');
          return;
        }
      }

      setStep('success');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setStep('info');
    }
  };

  if (step === 'success') {
    return (
      <div style={s.card}>
        <div style={s.successIcon}>✓</div>
        <h1 style={s.successTitle}>Welcome to the VIP!</h1>
        <p style={s.successText}>
          You're now a VIP member at <strong>{restaurant.name}</strong>.
          Show your name to your server to receive <strong>{restaurant.discount_percent}% off</strong> every visit.
        </p>
        <div style={s.memberCard}>
          <div style={s.mcLabel}>VIP MEMBER</div>
          <div style={s.mcName}>{formData.firstName} {formData.lastName}</div>
          <div style={s.mcRestaurant}>{restaurant.name}</div>
          <div style={s.mcDiscount}>{restaurant.discount_percent}% OFF EVERY VISIT</div>
        </div>
        <p style={s.instruction}>Just tell your server your name at checkout. They'll look you up and apply your discount instantly.</p>
      </div>
    );
  }

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.badge}>VIP MEMBERSHIP</div>
        <h1 style={s.restaurantName}>{restaurant.name}</h1>
        {restaurant.description && <p style={s.restaurantDesc}>{restaurant.description}</p>}
      </div>

      <div style={s.offerBox}>
        <div style={s.offerDiscount}>{restaurant.discount_percent}% OFF</div>
        <div style={s.offerDetail}>Every meal. Every visit. Every time.</div>
        <div style={s.offerPrice}>
          <span style={s.priceAmount}>${restaurant.subscription_price}</span>
          <span style={s.pricePeriod}>/month</span>
        </div>
        <div style={s.offerCancel}>Cancel anytime — no commitment</div>
      </div>

      <div style={s.howItWorks}>
        <div style={s.howStep}><div style={s.howNum}>1</div><div style={s.howText}>Sign up below</div></div>
        <div style={s.howStep}><div style={s.howNum}>2</div><div style={s.howText}>Tell your server your name</div></div>
        <div style={s.howStep}><div style={s.howNum}>3</div><div style={s.howText}>Get {restaurant.discount_percent}% off instantly</div></div>
      </div>

      <form onSubmit={handleSubmit} style={s.form}>
        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>First Name *</label>
            <input type="text" style={s.input} value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="John" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Last Name *</label>
            <input type="text" style={s.input} value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Smith" required />
          </div>
        </div>
        <div style={s.field}>
          <label style={s.label}>Email *</label>
          <input type="email" style={s.input} value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@email.com" required />
        </div>
        <div style={s.field}>
          <label style={s.label}>Phone (optional)</label>
          <input type="tel" style={s.input} value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(516) 555-1234" />
        </div>

        <div style={s.field}>
          <label style={s.label}>Card Information *</label>
          <div style={s.cardElementWrapper}>
            <CardElement options={{
              style: {
                base: {
                  fontSize: '16px',
                  fontFamily: "'Outfit', sans-serif",
                  color: '#0A0F0D',
                  '::placeholder': { color: '#9CA3AF' },
                },
                invalid: { color: '#DC2626' },
              },
              hidePostalCode: true,
            }} />
          </div>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button type="submit" style={step === 'processing' ? { ...s.submitBtn, opacity: 0.7 } : s.submitBtn}
          disabled={step === 'processing' || !stripe}>
          {step === 'processing' ? 'Processing payment...' : `Join VIP — $${restaurant.subscription_price}/mo`}
        </button>

        <p style={s.terms}>
          By joining, you agree to be charged ${restaurant.subscription_price}/month until you cancel.
          Cancel anytime from your member portal.
        </p>
      </form>
    </div>
  );
}

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { slug } = await params;
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !data) { setNotFound(true); }
      else { setRestaurant(data); trackPageView('signup', data.id); }
      setLoading(false);
    }
    load();
  }, [params]);

  if (loading) {
    return <div style={s.container}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34D399' }}></div></div>;
  }

  if (notFound) {
    return <div style={s.container}><div style={s.card}><h1 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' as const }}>Restaurant not found</h1><p style={{ fontSize: 14, color: '#6B7F73', textAlign: 'center' as const, marginTop: 8 }}>This VIP signup link doesn't match any active restaurant.</p></div></div>;
  }

  return (
    <div style={s.container}>
      <Elements stripe={stripePromise}>
        <JoinForm restaurant={restaurant!} />
      </Elements>
      <div style={s.poweredBy}>Powered by <span style={s.poweredByBrand}>LocalMint</span></div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0A0F0D 0%, #111916 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Outfit', -apple-system, sans-serif" },
  card: { background: '#fff', borderRadius: 20, padding: '32px 24px', maxWidth: 420, width: '100%', color: '#0A0F0D', overflow: 'hidden' },
  header: { textAlign: 'center' as const, marginBottom: 24 },
  badge: { display: 'inline-block', background: '#E8F5EE', color: '#1B6B4A', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', padding: '4px 12px', borderRadius: 4, marginBottom: 12 },
  restaurantName: { fontSize: 28, fontWeight: 800, color: '#0A0F0D', margin: '0 0 6px', lineHeight: 1.1 },
  restaurantDesc: { fontSize: 14, color: '#6B7F73', margin: 0 },
  offerBox: { background: 'linear-gradient(135deg, #1B6B4A 0%, #15573C 100%)', borderRadius: 14, padding: '24px 20px', textAlign: 'center' as const, color: '#fff', marginBottom: 24 },
  offerDiscount: { fontSize: 36, fontWeight: 900, lineHeight: 1, marginBottom: 4 },
  offerDetail: { fontSize: 13, opacity: .8, marginBottom: 16 },
  offerPrice: { marginBottom: 6 },
  priceAmount: { fontSize: 32, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" },
  pricePeriod: { fontSize: 16, opacity: .7 },
  offerCancel: { fontSize: 11, opacity: .5 },
  howItWorks: { display: 'flex', justifyContent: 'space-between', marginBottom: 28, gap: 8 },
  howStep: { textAlign: 'center' as const, flex: 1 },
  howNum: { width: 28, height: 28, borderRadius: '50%', background: '#E8F5EE', color: '#1B6B4A', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' },
  howText: { fontSize: 11, color: '#6B7F73', lineHeight: 1.3 },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 4, minWidth: 0 },
  label: { fontSize: 12, fontWeight: 600, color: '#4A5E52' },
  input: { padding: '12px 14px', border: '1.5px solid #E2E8E5', borderRadius: 10, fontSize: 16, fontFamily: "'Outfit', sans-serif", outline: 'none', color: '#0A0F0D', background: '#F7FAF8', width: '100%', minWidth: 0 },
  cardElementWrapper: { padding: '14px 14px', border: '1.5px solid #E2E8E5', borderRadius: 10, background: '#F7FAF8' },
  error: { background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500 },
  submitBtn: { background: 'linear-gradient(135deg, #1B6B4A 0%, #15573C 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 24px', fontSize: 17, fontWeight: 700, fontFamily: "'Outfit', sans-serif", cursor: 'pointer', boxShadow: '0 4px 16px rgba(27,107,74,.3)' },
  terms: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' as const, lineHeight: 1.5, margin: 0 },
  poweredBy: { marginTop: 24, fontSize: 12, color: '#6B7F73' },
  poweredByBrand: { color: '#34D399', fontWeight: 700 },
  successIcon: { width: 64, height: 64, borderRadius: '50%', background: '#1B6B4A', color: '#fff', fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  successTitle: { fontSize: 24, fontWeight: 800, textAlign: 'center' as const, margin: '0 0 8px' },
  successText: { fontSize: 14, color: '#6B7F73', textAlign: 'center' as const, lineHeight: 1.6, marginBottom: 24 },
  memberCard: { background: 'linear-gradient(135deg, #1B6B4A 0%, #0D3B24 100%)', borderRadius: 14, padding: '24px 20px', textAlign: 'center' as const, color: '#fff', marginBottom: 20 },
  mcLabel: { fontSize: 10, letterSpacing: '.15em', opacity: .6, marginBottom: 8 },
  mcName: { fontSize: 24, fontWeight: 800, marginBottom: 4 },
  mcRestaurant: { fontSize: 13, opacity: .7, marginBottom: 12 },
  mcDiscount: { fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,.15)', display: 'inline-block', padding: '6px 16px', borderRadius: 6 },
  instruction: { fontSize: 13, color: '#6B7F73', textAlign: 'center' as const, lineHeight: 1.6, margin: 0 },
};
