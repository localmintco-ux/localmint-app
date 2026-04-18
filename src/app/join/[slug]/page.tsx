'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<'info' | 'processing' | 'success'>('info');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { slug } = await params;
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setRestaurant(data);
      }
      setLoading(false);
    }
    load();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in all required fields.');
      return;
    }

    setStep('processing');

    try {
      // Insert member into Supabase
      const { error: insertError } = await supabase
        .from('members')
        .insert({
          restaurant_id: restaurant!.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          status: 'active',
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This email is already registered as a VIP member.');
          setStep('info');
          return;
        }
        throw insertError;
      }

      // In production, Stripe payment would happen here
      // For now, we create the member directly
      setStep('success');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setStep('info');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingDot}></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.errorTitle}>Restaurant not found</h1>
          <p style={styles.errorText}>This VIP signup link doesn't match any active restaurant.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.successTitle}>Welcome to the VIP!</h1>
          <p style={styles.successText}>
            You're now a VIP member at <strong>{restaurant!.name}</strong>.
            Show your name to your server to receive <strong>{restaurant!.discount_percent}% off</strong> every visit.
          </p>
          <div style={styles.memberCard}>
            <div style={styles.memberCardLabel}>VIP MEMBER</div>
            <div style={styles.memberCardName}>
              {formData.firstName} {formData.lastName}
            </div>
            <div style={styles.memberCardRestaurant}>{restaurant!.name}</div>
            <div style={styles.memberCardDiscount}>{restaurant!.discount_percent}% OFF EVERY VISIT</div>
          </div>
          <p style={styles.instructionText}>
            Just tell your server your name at checkout. They'll look you up and apply your discount instantly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>VIP MEMBERSHIP</div>
          <h1 style={styles.restaurantName}>{restaurant!.name}</h1>
          {restaurant!.description && (
            <p style={styles.restaurantDesc}>{restaurant!.description}</p>
          )}
        </div>

        {/* Offer */}
        <div style={styles.offerBox}>
          <div style={styles.offerDiscount}>{restaurant!.discount_percent}% OFF</div>
          <div style={styles.offerDetail}>Every meal. Every visit. Every time.</div>
          <div style={styles.offerPrice}>
            <span style={styles.priceAmount}>${restaurant!.subscription_price}</span>
            <span style={styles.pricePeriod}>/month</span>
          </div>
          <div style={styles.offerCancel}>Cancel anytime — no commitment</div>
        </div>

        {/* How it works */}
        <div style={styles.howItWorks}>
          <div style={styles.howStep}>
            <div style={styles.howNum}>1</div>
            <div style={styles.howText}>Sign up below</div>
          </div>
          <div style={styles.howStep}>
            <div style={styles.howNum}>2</div>
            <div style={styles.howText}>Tell your server your name</div>
          </div>
          <div style={styles.howStep}>
            <div style={styles.howNum}>3</div>
            <div style={styles.howText}>Get {restaurant!.discount_percent}% off instantly</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldRow}>
            <div style={styles.field}>
              <label style={styles.label}>First Name *</label>
              <input
                type="text"
                style={styles.input}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Last Name *</label>
              <input
                type="text"
                style={styles.input}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Smith"
                required
              />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              style={styles.input}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@email.com"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Phone (optional)</label>
            <input
              type="tel"
              style={styles.input}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(516) 555-1234"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {/* Payment section placeholder */}
          <div style={styles.paymentNote}>
            Payment processing will be connected via Stripe.
            For demo purposes, clicking below will create your membership.
          </div>

          <button
            type="submit"
            style={step === 'processing' ? { ...styles.submitBtn, opacity: 0.7 } : styles.submitBtn}
            disabled={step === 'processing'}
          >
            {step === 'processing' ? 'Processing...' : `Join VIP — $${restaurant!.subscription_price}/mo`}
          </button>

          <p style={styles.terms}>
            By joining, you agree to be charged ${restaurant!.subscription_price}/month until you cancel.
            Cancel anytime from your member portal.
          </p>
        </form>
      </div>

      {/* Powered by */}
      <div style={styles.poweredBy}>
        Powered by <span style={styles.poweredByBrand}>LocalMint</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0A0F0D 0%, #111916 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Outfit', -apple-system, sans-serif",
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#34D399',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '32px 24px',
    maxWidth: 420,
    width: '100%',
    color: '#0A0F0D',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  badge: {
    display: 'inline-block',
    background: '#E8F5EE',
    color: '#1B6B4A',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '4px 12px',
    borderRadius: 4,
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0A0F0D',
    margin: '0 0 6px',
    lineHeight: 1.1,
  },
  restaurantDesc: {
    fontSize: 14,
    color: '#6B7F73',
    margin: 0,
  },
  offerBox: {
    background: 'linear-gradient(135deg, #1B6B4A 0%, #15573C 100%)',
    borderRadius: 14,
    padding: '24px 20px',
    textAlign: 'center' as const,
    color: '#fff',
    marginBottom: 24,
  },
  offerDiscount: {
    fontSize: 36,
    fontWeight: 900,
    lineHeight: 1,
    marginBottom: 4,
  },
  offerDetail: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 16,
  },
  offerPrice: {
    marginBottom: 6,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 800,
    fontFamily: "'JetBrains Mono', monospace",
  },
  pricePeriod: {
    fontSize: 16,
    opacity: 0.7,
  },
  offerCancel: {
    fontSize: 11,
    opacity: 0.5,
  },
  howItWorks: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 8,
  },
  howStep: {
    textAlign: 'center' as const,
    flex: 1,
  },
  howNum: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#E8F5EE',
    color: '#1B6B4A',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 6px',
  },
  howText: {
    fontSize: 11,
    color: '#6B7F73',
    lineHeight: 1.3,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#4A5E52',
  },
  input: {
    padding: '12px 14px',
    border: '1.5px solid #E2E8E5',
    borderRadius: 10,
    fontSize: 16,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#0A0F0D',
    background: '#F7FAF8',
  },
  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  paymentNote: {
    background: '#FFF9E6',
    color: '#92400E',
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 1.5,
    textAlign: 'center' as const,
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #1B6B4A 0%, #15573C 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '16px 24px',
    fontSize: 17,
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 16px rgba(27,107,74,0.3)',
  },
  terms: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    lineHeight: 1.5,
    margin: 0,
  },
  poweredBy: {
    marginTop: 24,
    fontSize: 12,
    color: '#6B7F73',
  },
  poweredByBrand: {
    color: '#34D399',
    fontWeight: 700,
  },
  // Success page
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#1B6B4A',
    color: '#fff',
    fontSize: 32,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 800,
    textAlign: 'center' as const,
    margin: '0 0 8px',
  },
  successText: {
    fontSize: 14,
    color: '#6B7F73',
    textAlign: 'center' as const,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  memberCard: {
    background: 'linear-gradient(135deg, #1B6B4A 0%, #0D3B24 100%)',
    borderRadius: 14,
    padding: '24px 20px',
    textAlign: 'center' as const,
    color: '#fff',
    marginBottom: 20,
  },
  memberCardLabel: {
    fontSize: 10,
    letterSpacing: '0.15em',
    opacity: 0.6,
    marginBottom: 8,
  },
  memberCardName: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 4,
  },
  memberCardRestaurant: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 12,
  },
  memberCardDiscount: {
    fontSize: 14,
    fontWeight: 700,
    background: 'rgba(255,255,255,0.15)',
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: 6,
  },
  instructionText: {
    fontSize: 13,
    color: '#6B7F73',
    textAlign: 'center' as const,
    lineHeight: 1.6,
    margin: 0,
  },
  // Error page
  errorTitle: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center' as const,
    margin: '0 0 8px',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7F73',
    textAlign: 'center' as const,
    margin: 0,
  },
};
