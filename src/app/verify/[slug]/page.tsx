'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  subscription_price: number;
  discount_percent: number;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
}

export default function VerifyPage({ params }: { params: Promise<{ slug: string }> }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'verify' | 'cancel'>('verify');

  // Verify state
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [billTotal, setBillTotal] = useState('');

  // Cancel state
  const [cancelSearch, setCancelSearch] = useState('');
  const [cancelResults, setCancelResults] = useState<Member[]>([]);
  const [cancelSearching, setCancelSearching] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState('');

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

  // Live search for verify
  useEffect(() => {
    if (!searchQuery.trim() || !restaurant) { setResults([]); return; }
    const timer = setTimeout(() => performSearch(searchQuery, 'verify'), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, restaurant]);

  // Live search for cancel
  useEffect(() => {
    if (!cancelSearch.trim() || !restaurant) { setCancelResults([]); return; }
    const timer = setTimeout(() => performSearch(cancelSearch, 'cancel'), 300);
    return () => clearTimeout(timer);
  }, [cancelSearch, restaurant]);

  const performSearch = async (value: string, mode: 'verify' | 'cancel') => {
    if (!value.trim() || !restaurant) return;
    if (mode === 'verify') setSearching(true);
    else setCancelSearching(true);

    const query = value.trim().toLowerCase();
    const isPhone = /[\d\(\)\-\+\s]{7,}/.test(query);
    const parts = query.split(' ');

    let dbQuery = supabase
      .from('members')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'active');

    if (isPhone) {
      const digits = query.replace(/\D/g, '');
      dbQuery = dbQuery.ilike('phone', `%${digits.slice(-10)}%`);
    } else if (parts.length >= 2) {
      dbQuery = dbQuery
        .ilike('first_name', `%${parts[0]}%`)
        .ilike('last_name', `%${parts.slice(1).join(' ')}%`);
    } else {
      dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery.limit(10);

    if (mode === 'verify') {
      setResults(error ? [] : data || []);
      setSearching(false);
    } else {
      setCancelResults(error ? [] : data || []);
      setCancelSearching(false);
    }
  };

  const handleCancel = async (member: Member) => {
    if (!confirm(`Cancel membership for ${member.first_name} ${member.last_name}? They will lose their ${restaurant!.discount_percent}% discount.`)) return;
    setCancellingId(member.id);

    const { error } = await supabase
      .from('members')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', member.id);

    if (error) {
      alert('Failed to cancel. Please try again.');
    } else {
      setCancelSuccess(`${member.first_name} ${member.last_name}'s membership has been cancelled.`);
      setCancelResults(prev => prev.filter(m => m.id !== member.id));
      setTimeout(() => setCancelSuccess(''), 4000);
    }
    setCancellingId(null);
  };

  const discountedTotal = billTotal
    ? (parseFloat(billTotal) * (1 - (restaurant?.discount_percent || 0) / 100)).toFixed(2)
    : null;

  if (loading) {
    return <div style={st.container}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34D399' }}></div></div>;
  }

  if (notFound) {
    return <div style={st.container}><div style={st.card}><h1 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' as const }}>Restaurant not found</h1></div></div>;
  }

  return (
    <div style={st.container}>
      <div style={st.card}>
        {/* Header */}
        <div style={st.header}>
          <div style={st.badge}>STAFF TOOL</div>
          <h1 style={st.title}>{restaurant!.name}</h1>
        </div>

        {/* Tabs */}
        <div style={st.tabs}>
          <button
            style={activeTab === 'verify' ? st.tabActive : st.tab}
            onClick={() => { setActiveTab('verify'); setCancelSearch(''); setCancelResults([]); setCancelSuccess(''); }}
          >
            Verify Member
          </button>
          <button
            style={activeTab === 'cancel' ? st.tabCancelActive : st.tab}
            onClick={() => { setActiveTab('cancel'); setSearchQuery(''); setResults([]); setSelectedMember(null); setBillTotal(''); }}
          >
            Cancel Member
          </button>
        </div>

        {/* VERIFY TAB */}
        {activeTab === 'verify' && (
          <div>
            <div style={st.searchBox}>
              <input
                type="text"
                style={st.searchInput}
                placeholder="Name or phone number..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedMember(null); setBillTotal(''); }}
                autoFocus
              />
              {searching && <div style={st.searchSpinner}>...</div>}
            </div>

            {/* Results list */}
            {results.length > 0 && !selectedMember && (
              <div style={st.resultsList}>
                {results.map((member) => (
                  <button key={member.id} style={st.resultItem} onClick={() => setSelectedMember(member)}>
                    <div style={st.resultName}>{member.first_name} {member.last_name}</div>
                    <div style={st.resultBadge}>VIP</div>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {results.length === 0 && searchQuery && !searching && (
              <div style={st.noResult}>
                <div style={st.noResultIcon}>✗</div>
                <div style={st.noResultText}>No active VIP member found</div>
                <div style={st.noResultHint}>Try checking the spelling or ask for their full name</div>
              </div>
            )}

            {/* Selected member + calculator */}
            {selectedMember && (
              <div>
                <div style={st.memberConfirm}>
                  <div style={st.confirmIcon}>✓</div>
                  <div>
                    <div style={st.confirmName}>{selectedMember.first_name} {selectedMember.last_name}</div>
                    <div style={st.confirmStatus}>Active VIP Member</div>
                  </div>
                </div>

                <div style={st.discountInfo}>
                  <div style={st.discountLabel}>MEMBER DISCOUNT</div>
                  <div style={st.discountValue}>{restaurant!.discount_percent}% OFF</div>
                </div>

                <div style={st.calcSection}>
                  <label style={st.calcLabel}>Enter bill total to calculate discount:</label>
                  <div style={st.calcRow}>
                    <span style={st.calcDollar}>$</span>
                    <input type="number" style={st.calcInput} placeholder="0.00" value={billTotal}
                      onChange={(e) => setBillTotal(e.target.value)} inputMode="decimal" />
                  </div>
                  {discountedTotal && (
                    <div style={st.calcResult}>
                      <div style={st.calcResultRow}><span>Original total</span><span>${parseFloat(billTotal).toFixed(2)}</span></div>
                      <div style={st.calcResultRow}><span>VIP discount ({restaurant!.discount_percent}%)</span><span style={{ color: '#1B6B4A' }}>-${(parseFloat(billTotal) - parseFloat(discountedTotal)).toFixed(2)}</span></div>
                      <div style={st.calcResultTotal}><span>Charge this amount</span><span>${discountedTotal}</span></div>
                    </div>
                  )}
                </div>

                <button style={st.newSearchBtn} onClick={() => { setSelectedMember(null); setSearchQuery(''); setResults([]); setBillTotal(''); }}>
                  New Search
                </button>
              </div>
            )}
          </div>
        )}

        {/* CANCEL TAB */}
        {activeTab === 'cancel' && (
          <div>
            <div style={st.searchBox}>
              <input
                type="text"
                style={st.searchInput}
                placeholder="Search member to cancel..."
                value={cancelSearch}
                onChange={(e) => { setCancelSearch(e.target.value); setCancelSuccess(''); }}
                autoFocus
              />
              {cancelSearching && <div style={st.searchSpinner}>...</div>}
            </div>

            {cancelSuccess && (
              <div style={st.successMsg}>{cancelSuccess}</div>
            )}

            {cancelResults.length > 0 && (
              <div style={st.resultsList}>
                {cancelResults.map((member) => (
                  <div key={member.id} style={st.cancelItem}>
                    <div>
                      <div style={st.resultName}>{member.first_name} {member.last_name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{member.email}</div>
                    </div>
                    <button
                      style={st.cancelBtn}
                      onClick={() => handleCancel(member)}
                      disabled={cancellingId === member.id}
                    >
                      {cancellingId === member.id ? '...' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cancelResults.length === 0 && cancelSearch && !cancelSearching && !cancelSuccess && (
              <div style={st.noResult}>
                <div style={st.noResultText}>No active members found</div>
                <div style={st.noResultHint}>Only active memberships can be cancelled</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={st.poweredBy}>Powered by <span style={st.poweredByBrand}>LocalMint</span></div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0A0F0D 0%, #111916 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 16px', fontFamily: "'Outfit', -apple-system, sans-serif" },
  card: { background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 400, width: '100%', color: '#0A0F0D' },
  header: { textAlign: 'center' as const, marginBottom: 20 },
  badge: { display: 'inline-block', background: '#0A0F0D', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '.12em', padding: '4px 10px', borderRadius: 4, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  tabs: { display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #E2E8E5' },
  tab: { flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6B7F73', background: '#F7FAF8', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  tabActive: { flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#1B6B4A', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  tabCancelActive: { flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#DC2626', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, position: 'relative' as const },
  searchInput: { flex: 1, padding: '14px 16px', border: '2px solid #E2E8E5', borderRadius: 12, fontSize: 16, fontFamily: "'Outfit', sans-serif", outline: 'none', color: '#0A0F0D', background: '#F7FAF8' },
  searchSpinner: { fontSize: 14, color: '#1B6B4A', fontWeight: 700 },
  resultsList: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  resultItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#F7FAF8', border: '1.5px solid #E2E8E5', borderRadius: 10, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", width: '100%', textAlign: 'left' as const },
  resultName: { fontSize: 16, fontWeight: 600, color: '#0A0F0D' },
  resultBadge: { fontSize: 10, fontWeight: 700, color: '#1B6B4A', background: '#E8F5EE', padding: '3px 8px', borderRadius: 4, letterSpacing: '.05em' },
  cancelItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#F7FAF8', border: '1.5px solid #E2E8E5', borderRadius: 10 },
  cancelBtn: { fontSize: 12, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  successMsg: { background: '#E8F5EE', color: '#1B6B4A', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: 'center' as const },
  noResult: { textAlign: 'center' as const, padding: '24px 16px' },
  noResultIcon: { width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', color: '#DC2626', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  noResultText: { fontSize: 15, fontWeight: 600, color: '#0A0F0D', marginBottom: 4 },
  noResultHint: { fontSize: 12, color: '#9CA3AF' },
  memberConfirm: { display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: '#E8F5EE', borderRadius: 12, marginBottom: 16 },
  confirmIcon: { width: 44, height: 44, borderRadius: '50%', background: '#1B6B4A', color: '#fff', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  confirmName: { fontSize: 18, fontWeight: 700 },
  confirmStatus: { fontSize: 12, color: '#1B6B4A', fontWeight: 600 },
  discountInfo: { textAlign: 'center' as const, padding: 16, background: 'linear-gradient(135deg,#1B6B4A,#15573C)', borderRadius: 12, color: '#fff', marginBottom: 16 },
  discountLabel: { fontSize: 10, letterSpacing: '.12em', opacity: .7, marginBottom: 4 },
  discountValue: { fontSize: 32, fontWeight: 900 },
  calcSection: { marginBottom: 16 },
  calcLabel: { fontSize: 12, fontWeight: 600, color: '#6B7F73', marginBottom: 8, display: 'block' },
  calcRow: { display: 'flex', alignItems: 'center', border: '2px solid #E2E8E5', borderRadius: 12, overflow: 'hidden', background: '#F7FAF8' },
  calcDollar: { padding: '14px 12px', fontSize: 18, fontWeight: 600, color: '#6B7F73', background: '#EDF3EF' },
  calcInput: { flex: 1, padding: '14px 12px', border: 'none', fontSize: 18, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, outline: 'none', color: '#0A0F0D', background: 'transparent' },
  calcResult: { marginTop: 12, border: '1px solid #E2E8E5', borderRadius: 10, overflow: 'hidden' },
  calcResultRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #E2E8E5', color: '#4A5E52' },
  calcResultTotal: { display: 'flex', justifyContent: 'space-between', padding: '12px 14px', fontSize: 16, fontWeight: 700, background: '#E8F5EE', color: '#1B6B4A' },
  newSearchBtn: { width: '100%', padding: 12, background: '#F7FAF8', border: '1.5px solid #E2E8E5', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif", color: '#6B7F73', cursor: 'pointer' },
  poweredBy: { marginTop: 24, fontSize: 12, color: '#6B7F73' },
  poweredByBrand: { color: '#34D399', fontWeight: 700 },
};
