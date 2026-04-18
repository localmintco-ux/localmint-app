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
  status: string;
  created_at: string;
}

export default function VerifyPage({ params }: { params: Promise<{ slug: string }> }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [billTotal, setBillTotal] = useState('');

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

  const handleSearch = async () => {
    if (!searchQuery.trim() || !restaurant) return;
    setSearching(true);
    setSelectedMember(null);
    setBillTotal('');

    const query = searchQuery.trim().toLowerCase();
    const isPhone = /[\d\(\)\-\+\s]{7,}/.test(query);
    const parts = query.split(' ');

    let dbQuery = supabase
      .from('members')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'active');

    if (isPhone) {
      // Search by phone — strip non-digits for matching
      const digits = query.replace(/\D/g, '');
      dbQuery = dbQuery.ilike('phone', `%${digits.slice(-10)}%`);
    } else if (parts.length >= 2) {
      // Search by first and last name
      dbQuery = dbQuery
        .ilike('first_name', `%${parts[0]}%`)
        .ilike('last_name', `%${parts.slice(1).join(' ')}%`);
    } else {
      // Search by first or last name
      dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery.limit(10);

    if (error) {
      console.error(error);
      setResults([]);
    } else {
      setResults(data || []);
    }
    setSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const discountedTotal = billTotal
    ? (parseFloat(billTotal) * (1 - (restaurant?.discount_percent || 0) / 100)).toFixed(2)
    : null;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34D399' }}></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' as const, margin: '0 0 8px' }}>
            Restaurant not found
          </h1>
          <p style={{ fontSize: 14, color: '#6B7F73', textAlign: 'center' as const, margin: 0 }}>
            This verification link doesn't match any active restaurant.
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
          <div style={styles.badge}>STAFF TOOL</div>
          <h1 style={styles.title}>{restaurant!.name}</h1>
          <p style={styles.subtitle}>VIP Member Verification</p>
        </div>

        {/* Search */}
        <div style={styles.searchBox}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            style={styles.searchBtn}
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? '...' : 'Look Up'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && !selectedMember && (
          <div style={styles.resultsList}>
            {results.map((member) => (
              <button
                key={member.id}
                style={styles.resultItem}
                onClick={() => setSelectedMember(member)}
              >
                <div style={styles.resultName}>
                  {member.first_name} {member.last_name}
                </div>
                <div style={styles.resultBadge}>VIP</div>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && searchQuery && !searching && (
          <div style={styles.noResult}>
            <div style={styles.noResultIcon}>✗</div>
            <div style={styles.noResultText}>No active VIP member found for "{searchQuery}"</div>
            <div style={styles.noResultHint}>Try checking the spelling or ask for their full name</div>
          </div>
        )}

        {/* Selected Member */}
        {selectedMember && (
          <div style={styles.memberDetail}>
            <div style={styles.memberConfirm}>
              <div style={styles.confirmIcon}>✓</div>
              <div>
                <div style={styles.confirmName}>
                  {selectedMember.first_name} {selectedMember.last_name}
                </div>
                <div style={styles.confirmStatus}>Active VIP Member</div>
              </div>
            </div>

            <div style={styles.discountInfo}>
              <div style={styles.discountLabel}>MEMBER DISCOUNT</div>
              <div style={styles.discountValue}>{restaurant!.discount_percent}% OFF</div>
            </div>

            {/* Bill calculator */}
            <div style={styles.calcSection}>
              <label style={styles.calcLabel}>Enter bill total to calculate discount:</label>
              <div style={styles.calcRow}>
                <span style={styles.calcDollar}>$</span>
                <input
                  type="number"
                  style={styles.calcInput}
                  placeholder="0.00"
                  value={billTotal}
                  onChange={(e) => setBillTotal(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              {discountedTotal && (
                <div style={styles.calcResult}>
                  <div style={styles.calcResultRow}>
                    <span>Original total</span>
                    <span>${parseFloat(billTotal).toFixed(2)}</span>
                  </div>
                  <div style={styles.calcResultRow}>
                    <span>VIP discount ({restaurant!.discount_percent}%)</span>
                    <span style={{ color: '#1B6B4A' }}>
                      -${(parseFloat(billTotal) - parseFloat(discountedTotal)).toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.calcResultTotal}>
                    <span>Charge this amount</span>
                    <span>${discountedTotal}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              style={styles.newSearchBtn}
              onClick={() => {
                setSelectedMember(null);
                setSearchQuery('');
                setResults([]);
                setBillTotal('');
              }}
            >
              New Search
            </button>
          </div>
        )}
      </div>

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
    justifyContent: 'flex-start',
    padding: '40px 16px',
    fontFamily: "'Outfit', -apple-system, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '28px 20px',
    maxWidth: 400,
    width: '100%',
    color: '#0A0F0D',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  badge: {
    display: 'inline-block',
    background: '#0A0F0D',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    padding: '4px 10px',
    borderRadius: 4,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7F73',
    margin: 0,
  },
  searchBox: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    padding: '14px 16px',
    border: '2px solid #E2E8E5',
    borderRadius: 12,
    fontSize: 16,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    color: '#0A0F0D',
    background: '#F7FAF8',
  },
  searchBtn: {
    padding: '14px 20px',
    background: '#1B6B4A',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: '#F7FAF8',
    border: '1.5px solid #E2E8E5',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    width: '100%',
    textAlign: 'left' as const,
    transition: 'border-color 0.2s',
  },
  resultName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#0A0F0D',
  },
  resultBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#1B6B4A',
    background: '#E8F5EE',
    padding: '3px 8px',
    borderRadius: 4,
    letterSpacing: '0.05em',
  },
  noResult: {
    textAlign: 'center' as const,
    padding: '24px 16px',
  },
  noResultIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#FEF2F2',
    color: '#DC2626',
    fontSize: 24,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  noResultText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#0A0F0D',
    marginBottom: 4,
  },
  noResultHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  memberDetail: {
    marginTop: 4,
  },
  memberConfirm: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px',
    background: '#E8F5EE',
    borderRadius: 12,
    marginBottom: 16,
  },
  confirmIcon: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#1B6B4A',
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  confirmName: {
    fontSize: 18,
    fontWeight: 700,
  },
  confirmStatus: {
    fontSize: 12,
    color: '#1B6B4A',
    fontWeight: 600,
  },
  discountInfo: {
    textAlign: 'center' as const,
    padding: '16px',
    background: 'linear-gradient(135deg, #1B6B4A, #15573C)',
    borderRadius: 12,
    color: '#fff',
    marginBottom: 16,
  },
  discountLabel: {
    fontSize: 10,
    letterSpacing: '0.12em',
    opacity: 0.7,
    marginBottom: 4,
  },
  discountValue: {
    fontSize: 32,
    fontWeight: 900,
  },
  calcSection: {
    marginBottom: 16,
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7F73',
    marginBottom: 8,
    display: 'block',
  },
  calcRow: {
    display: 'flex',
    alignItems: 'center',
    border: '2px solid #E2E8E5',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#F7FAF8',
  },
  calcDollar: {
    padding: '14px 12px',
    fontSize: 18,
    fontWeight: 600,
    color: '#6B7F73',
    background: '#EDF3EF',
  },
  calcInput: {
    flex: 1,
    padding: '14px 12px',
    border: 'none',
    fontSize: 18,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    outline: 'none',
    color: '#0A0F0D',
    background: 'transparent',
  },
  calcResult: {
    marginTop: 12,
    border: '1px solid #E2E8E5',
    borderRadius: 10,
    overflow: 'hidden',
  },
  calcResultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    fontSize: 13,
    borderBottom: '1px solid #E2E8E5',
    color: '#4A5E52',
  },
  calcResultTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 14px',
    fontSize: 16,
    fontWeight: 700,
    background: '#E8F5EE',
    color: '#1B6B4A',
  },
  newSearchBtn: {
    width: '100%',
    padding: '12px',
    background: '#F7FAF8',
    border: '1.5px solid #E2E8E5',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Outfit', sans-serif",
    color: '#6B7F73',
    cursor: 'pointer',
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
};
