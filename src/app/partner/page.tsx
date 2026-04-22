'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PartnerForm() {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', restaurantName: '', password: '' });
  const [error, setError] = useState('');
  const [slug, setSlug] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.restaurantName || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
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
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Card error. Please check your details.');
        setStep('form');
        return;
      }

      const res = await fetch('/api/stripe/create-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, paymentMethodId: paymentMethod.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to process payment. Please try again.');
        setStep('form');
        return;
      }

      if (data.status === 'requires_action') {
        const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
        if (confirmError) {
          setError(confirmError.message || 'Payment failed. Please try again.');
          setStep('form');
          return;
        }
      }

      if (data.slug) setSlug(data.slug);
      setStep('success');
    } catch {
      setError('Something went wrong. Please try again.');
      setStep('form');
    }
  };

  if (step === 'success') {
    return (
      <div style={s.successPage}>
        <div style={s.successIcon}>&#10003;</div>
        <h1 style={s.successTitle}>Welcome to LocalMint</h1>
        <p style={s.successSub}>Your restaurant is set up and your dashboard is ready. Complete the onboarding steps to launch your VIP membership program.</p>
        <button onClick={() => router.push(`/dashboard/${slug}`)} style={{ ...s.successBtn, border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Go to Your Dashboard</button>
        <div style={s.successFooter}>We&apos;ll also be in touch within 24 hours to help you get started.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={s.heroRow}>
        <div style={s.heroBadge}>Restaurant Partner Program</div>
        <h1 style={s.heroTitle}>Launch your <span style={{ color: '#34D399' }}>VIP membership program</span></h1>
        <p style={s.heroSub}>Everything you need to add subscription revenue to your restaurant — designed, built, and managed for you.</p>
      </div>

      <div style={s.twoCol}>
        {/* LEFT */}
        <div>
          <div style={s.sectionLabel}>What you get</div>
          <div style={s.stack}>
            {[
              { title: 'Custom Offer Design', desc: 'We analyze your menu and margins to build the perfect VIP offer — hook item, discount, and perks engineered to drive visit frequency.', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z' },
              { title: 'Menu & Signage Materials', desc: 'Print-ready VIP menus, table tents, check presenter cards, and QR codes — designed and personalized to your brand.', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
              { title: 'Billing & Payments', desc: 'All subscription billing, cancellations, and failed payment recovery handled. Revenue deposited to your account automatically.', icon: 'M1 4h22v16H1zM1 10h22' },
              { title: 'Customer Signup Portal', desc: 'Mobile-optimized page where customers subscribe in under 60 seconds. No app download needed.', icon: 'M5 2h14v20H5zM12 18h.01' },
              { title: 'Member Verification Tool', desc: 'Server verifies VIP status, delivers the complimentary item, and the discount applies at checkout. Works on any device.', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3' },
              { title: 'Analytics & Ongoing Optimization', desc: 'Real-time dashboard with bi-weekly performance reviews. We monitor conversion, frequency, and recommend adjustments.', icon: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
            ].map((item, i) => (
              <div key={i} style={s.stackItem}>
                <div style={s.stackIcon}>
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#34D399', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d={item.icon} />
                  </svg>
                </div>
                <div>
                  <div style={s.stackTitle}>{item.title}</div>
                  <div style={s.stackDesc}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* GUARANTEE */}
          <div style={s.guarantee}>
            <div style={s.guaranteeBadge}>Performance Guarantee</div>
            <div style={s.guaranteeTitle}><span style={{ color: '#34D399' }}>$1,000/month</span> in new subscription revenue within 90 days — or your money back.</div>
            <div style={s.guaranteeText}>If your VIP program doesn&apos;t generate at least $1,000/month in subscription revenue within 90 days of launch, we refund every dollar of your platform fees. No questions asked. You keep the subscribers, you keep the menus, and we part ways.</div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={s.rightCol}>
          <div style={s.checkoutCard}>
            <div style={s.checkoutBar}></div>
            <div style={s.checkoutTitle}>Start your VIP program</div>
            <div style={s.checkoutSub}>Launch in as little as 2 weeks</div>
            <div style={s.investRow}>
              <span style={s.investAmount}>$199</span>
              <span style={s.investPeriod}>/month</span>
            </div>
            <div style={s.investDetail}>Plus <strong style={{ color: '#B8C7BE' }}>15% of subscription revenue</strong> generated by the program. One-time print cost of ~$300–500 for menus and signage.</div>
            <div style={s.checkoutDivider}></div>

            <form onSubmit={handleSubmit}>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>First Name</label>
                  <input type="text" style={s.formInput} placeholder="John" value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                </div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Last Name</label>
                  <input type="text" style={s.formInput} placeholder="Smith" value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Email</label>
                <input type="email" style={s.formInput} placeholder="john@restaurant.com" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Restaurant Name</label>
                <input type="text" style={s.formInput} placeholder="Mario's Bistro" value={formData.restaurantName}
                  onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })} required />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Create Password</label>
                <input type="password" style={s.formInput} placeholder="Min 6 characters" value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Card Information</label>
                <div style={s.cardField}>
                  <CardElement options={{
                    style: {
                      base: { fontSize: '15px', fontFamily: "'Outfit', sans-serif", color: '#F7FAF8', '::placeholder': { color: '#3A4E42' } },
                      invalid: { color: '#DC2626' },
                    },
                    hidePostalCode: true,
                  }} />
                </div>
              </div>

              {error && <div style={s.formError}>{error}</div>}

              <button type="submit" style={step === 'processing' ? { ...s.submitBtn, opacity: 0.6 } : s.submitBtn}
                disabled={step === 'processing' || !stripe}>
                {step === 'processing' ? 'Processing...' : 'Start My VIP Program — $199/mo'}
              </button>
              <p style={s.terms}>Cancel anytime. Protected by our 90-day performance guarantee. By subscribing you agree to $199/month plus 15% of subscription revenue.</p>

              <div style={s.checkoutGuarantee}>
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: '#34D399', strokeWidth: 2, fill: 'none', flexShrink: 0 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span style={s.checkoutGuaranteeText}>90-day money-back guarantee — $1,000/mo or you pay nothing</span>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        Questions? <a href="https://calendly.com/localmintco/15min" style={s.footerLink}>Book a call</a> &middot; <a href="https://localmint.co" style={s.footerLink}>localmint.co</a>
      </div>
    </div>
  );
}

export default function PartnerPage() {
  return (
    <div style={{ background: '#0A0F0D', minHeight: '100vh' }}>
      <div style={s.page}>
      <div style={s.logo}><span style={{ color: '#34D399' }}>Local</span>Mint</div>
      <Elements stripe={stripePromise}>
        <PartnerForm />
      </Elements>
    </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '48px 32px 60px', fontFamily: "'Outfit', sans-serif", color: '#F7FAF8', minHeight: '100vh' },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 48 },
  heroRow: { marginBottom: 48 },
  heroBadge: { display: 'inline-block', padding: '5px 14px', borderRadius: 100, background: 'rgba(46,139,87,.12)', border: '1px solid rgba(46,139,87,.25)', fontSize: 11, fontWeight: 600, color: '#34D399', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 16 },
  heroTitle: { fontSize: 'clamp(28px,4vw,40px)' as string, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.03em', marginBottom: 12, maxWidth: 600 },
  heroSub: { fontSize: 15, lineHeight: 1.65, color: '#8A9B91', maxWidth: 540 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 420px', gap: 56, alignItems: 'start' },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#34D399', marginBottom: 16 },
  stack: { display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 32 },
  stackItem: { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', background: '#111916', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10 },
  stackIcon: { width: 34, height: 34, borderRadius: 8, background: 'rgba(46,139,87,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stackTitle: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  stackDesc: { fontSize: 12, color: '#8A9B91', lineHeight: 1.5 },
  guarantee: { background: 'linear-gradient(135deg,rgba(46,139,87,.15),rgba(46,139,87,.05))', border: '2px solid rgba(46,139,87,.4)', borderRadius: 16, padding: 28, position: 'relative' as const, overflow: 'hidden' },
  guaranteeBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 6, background: 'rgba(46,139,87,.2)', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#34D399', marginBottom: 12 },
  guaranteeTitle: { fontSize: 20, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 },
  guaranteeText: { fontSize: 13, color: '#B8C7BE', lineHeight: 1.65 },
  rightCol: { position: 'sticky' as const, top: 32 },
  checkoutCard: { background: '#111916', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '32px 28px', position: 'relative' as const, overflow: 'hidden' },
  checkoutBar: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#1B6B4A,#34D399)', borderRadius: '16px 16px 0 0' },
  checkoutTitle: { fontSize: 18, fontWeight: 800, marginBottom: 4 },
  checkoutSub: { fontSize: 13, color: '#8A9B91', marginBottom: 24 },
  investRow: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  investAmount: { fontSize: 32, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" },
  investPeriod: { fontSize: 14, color: '#8A9B91' },
  investDetail: { fontSize: 12, color: '#6B7F73', marginBottom: 24, lineHeight: 1.6 },
  checkoutDivider: { height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 24 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  formGroup: { marginBottom: 12 },
  formLabel: { display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7F73', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '.04em' },
  formInput: { width: '100%', padding: '12px 14px', background: '#0A0F0D', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontSize: 15, fontFamily: "'Outfit', sans-serif", color: '#F7FAF8', outline: 'none' },
  cardField: { padding: '13px 14px', background: '#0A0F0D', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, marginBottom: 12 },
  formError: { background: 'rgba(220,38,38,.1)', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
  submitBtn: { width: '100%', padding: 16, background: 'linear-gradient(135deg,#1B6B4A,#15573C)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif", cursor: 'pointer', boxShadow: '0 4px 20px rgba(27,107,74,.3)', marginTop: 4 },
  terms: { fontSize: 10, color: '#4A5E52', textAlign: 'center' as const, lineHeight: 1.6, marginTop: 12 },
  checkoutGuarantee: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 14px', background: 'rgba(46,139,87,.08)', borderRadius: 8, border: '1px solid rgba(46,139,87,.15)' },
  checkoutGuaranteeText: { fontSize: 11, color: '#34D399', fontWeight: 600 },
  footer: { textAlign: 'center' as const, marginTop: 48, fontSize: 12, color: '#4A5E52' },
  footerLink: { color: '#34D399', textDecoration: 'none' },
  successPage: { textAlign: 'center' as const, padding: '80px 0' },
  successIcon: { width: 72, height: 72, borderRadius: '50%', background: '#1B6B4A', color: '#fff', fontSize: 36, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' },
  successTitle: { fontSize: 28, fontWeight: 800, marginBottom: 10 },
  successSub: { fontSize: 15, color: '#B8C7BE', lineHeight: 1.6, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' },
  successBtn: { display: 'inline-block', padding: '14px 32px', background: '#1B6B4A', color: '#fff', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none', fontFamily: "'Outfit', sans-serif" },
  successFooter: { marginTop: 24, fontSize: 13, color: '#6B7F73' },
};
