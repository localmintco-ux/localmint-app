'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface MemberInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  restaurant: {
    name: string;
    subscription_price: number;
    discount_percent: number;
  };
}

export default function AccountPage() {
  const [step, setStep] = useState<'lookup' | 'view'>('lookup');
  const [email, setEmail] = useState('');
  const [memberships, setMemberships] = useState<MemberInfo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from('members')
      .select('*, restaurant:restaurants(name, subscription_price, discount_percent)')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false });

    if (fetchError || !data || data.length === 0) {
      setError('No memberships found for this email address.');
      setLoading(false);
      return;
    }

    setMemberships(data.map(d => ({
      ...d,
      restaurant: Array.isArray(d.restaurant) ? d.restaurant[0] : d.restaurant,
    })));
    setStep('view');
    setLoading(false);
  };

  const handleCancel = async (membershipId: string, restaurantName: string) => {
    if (!confirm(`Cancel your VIP membership at ${restaurantName}? You will lose your ${memberships.find(m => m.id === membershipId)?.restaurant.discount_percent}% discount.`)) return;

    setCancellingId(membershipId);

    const { error } = await supabase
      .from('members')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', membershipId);

    if (error) {
      alert('Failed to cancel. Please try again or contact the restaurant.');
    } else {
      setMemberships(prev => prev.map(m =>
        m.id === membershipId ? { ...m, status: 'cancelled' } : m
      ));
    }
    setCancellingId(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (step === 'lookup') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.logo}>Local<span style={s.logoAccent}>Mint</span></div>
          <h1 style={s.title}>Manage Your Membership</h1>
          <p style={s.subtitle}>Enter the email you used to sign up for your VIP membership.</p>
          <form onSubmit={handleLookup} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Email Address</label>
              <input
                type="email"
                style={s.input}
                placeholder="john@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading ? 'Looking up...' : 'Find My Membership'}
            </button>
          </form>
        </div>
        <div style={s.footer}>Powered by <span style={{ color: '#34D399', fontWeight: 700 }}>LocalMint</span></div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.cardWide}>
        <div style={s.logo}>Local<span style={s.logoAccent}>Mint</span></div>
        <h1 style={s.title}>Your Memberships</h1>
        <p style={s.subtitle}>{email}</p>

        <div style={s.membershipList}>
          {memberships.map(m => (
            <div key={m.id} style={s.membershipCard}>
              <div style={s.mcHeader}>
                <div>
                  <div style={s.mcRestaurant}>{m.restaurant.name}</div>
                  <div style={s.mcMember}>{m.first_name} {m.last_name}</div>
                </div>
                <span style={m.status === 'active' ? s.statusActive : s.statusCancelled}>
                  {m.status}
                </span>
              </div>

              <div style={s.mcDetails}>
                <div style={s.mcDetailRow}>
                  <span style={s.mcDetailLabel}>Discount</span>
                  <span style={s.mcDetailValue}>{m.restaurant.discount_percent}% off every visit</span>
                </div>
                <div style={s.mcDetailRow}>
                  <span style={s.mcDetailLabel}>Monthly Price</span>
                  <span style={s.mcDetailValue}>${m.restaurant.subscription_price}/mo</span>
                </div>
                <div style={s.mcDetailRow}>
                  <span style={s.mcDetailLabel}>Member Since</span>
                  <span style={s.mcDetailValue}>{formatDate(m.created_at)}</span>
                </div>
              </div>

              {m.status === 'active' && (
                <div style={s.mcActions}>
                  <div style={s.mcHowTo}>
                    Show your name to your server at checkout to receive your discount.
                  </div>
                  <button
                    style={s.cancelMemberBtn}
                    onClick={() => handleCancel(m.id, m.restaurant.name)}
                    disabled={cancellingId === m.id}
                  >
                    {cancellingId === m.id ? 'Cancelling...' : 'Cancel Membership'}
                  </button>
                </div>
              )}

              {m.status === 'cancelled' && (
                <div style={s.cancelledNote}>
                  This membership has been cancelled. Your discount is no longer active.
                </div>
              )}
            </div>
          ))}
        </div>

        <button style={s.backBtn} onClick={() => { setStep('lookup'); setEmail(''); setMemberships([]); }}>
          Look up a different email
        </button>
      </div>
      <div style={s.footer}>Powered by <span style={{ color: '#34D399', fontWeight: 700 }}>LocalMint</span></div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0A0F0D 0%, #111916 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Outfit', -apple-system, sans-serif" },
  card: { background: '#fff', borderRadius: 20, padding: '36px 28px', maxWidth: 400, width: '100%', color: '#0A0F0D' },
  cardWide: { background: '#fff', borderRadius: 20, padding: '36px 28px', maxWidth: 500, width: '100%', color: '#0A0F0D' },
  logo: { fontSize: 24, fontWeight: 800, color: '#0A0F0D', textAlign: 'center' as const, marginBottom: 24 },
  logoAccent: { color: '#1B6B4A' },
  title: { fontSize: 22, fontWeight: 800, textAlign: 'center' as const, margin: '0 0 6px' },
  subtitle: { fontSize: 13, color: '#6B7F73', textAlign: 'center' as const, margin: '0 0 28px' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#4A5E52' },
  input: { padding: '12px 14px', border: '1.5px solid #E2E8E5', borderRadius: 10, fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: 'none', color: '#0A0F0D', background: '#F7FAF8', width: '100%' },
  error: { background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500 },
  submitBtn: { background: 'linear-gradient(135deg, #1B6B4A 0%, #15573C 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif", cursor: 'pointer', marginTop: 4 },
  membershipList: { display: 'flex', flexDirection: 'column' as const, gap: 16, marginBottom: 20 },
  membershipCard: { border: '1.5px solid #E2E8E5', borderRadius: 14, overflow: 'hidden' },
  mcHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 20px', background: '#F7FAF8' },
  mcRestaurant: { fontSize: 18, fontWeight: 700, color: '#0A0F0D', marginBottom: 2 },
  mcMember: { fontSize: 13, color: '#6B7F73' },
  statusActive: { fontSize: 11, fontWeight: 600, color: '#1B6B4A', background: '#E8F5EE', padding: '4px 10px', borderRadius: 6 },
  statusCancelled: { fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', padding: '4px 10px', borderRadius: 6 },
  mcDetails: { padding: '16px 20px' },
  mcDetailRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F5F4', fontSize: 14 },
  mcDetailLabel: { color: '#6B7F73' },
  mcDetailValue: { fontWeight: 600, color: '#0A0F0D' },
  mcActions: { padding: '16px 20px', borderTop: '1px solid #E2E8E5' },
  mcHowTo: { fontSize: 12, color: '#6B7F73', background: '#F7FAF8', padding: '10px 14px', borderRadius: 8, marginBottom: 12, lineHeight: 1.5, textAlign: 'center' as const },
  cancelMemberBtn: { width: '100%', padding: '10px', fontSize: 13, fontWeight: 600, color: '#DC2626', background: '#fff', border: '1.5px solid #FECACA', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  cancelledNote: { padding: '16px 20px', borderTop: '1px solid #E2E8E5', fontSize: 13, color: '#9CA3AF', textAlign: 'center' as const },
  backBtn: { width: '100%', padding: '12px', fontSize: 14, fontWeight: 600, color: '#6B7F73', background: '#F7FAF8', border: '1px solid #E2E8E5', borderRadius: 10, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  footer: { marginTop: 24, fontSize: 12, color: '#6B7F73' },
};
