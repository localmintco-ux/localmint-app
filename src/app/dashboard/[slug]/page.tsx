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

export default function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled'>('all');

  useEffect(() => {
    async function load() {
      const { slug } = await params;
      const { data: rest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!rest) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRestaurant(rest);

      const { data: mems } = await supabase
        .from('members')
        .select('*')
        .eq('restaurant_id', rest.id)
        .order('created_at', { ascending: false });

      setMembers(mems || []);
      setLoading(false);
    }
    load();
  }, [params]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34D399' }}></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={s.page}>
        <div style={s.card}><h1 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' as const }}>Restaurant not found</h1></div>
      </div>
    );
  }

  const activeMembers = members.filter(m => m.status === 'active');
  const cancelledMembers = members.filter(m => m.status === 'cancelled');
  const mrr = activeMembers.length * (restaurant?.subscription_price || 0);
  const arr = mrr * 12;

  // Members joined this month
  const now = new Date();
  const thisMonth = members.filter(m => {
    const d = new Date(m.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Filtered member list
  const filteredMembers = members.filter(m => {
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    const matchesSearch = !searchQuery ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Top Bar */}
        <div style={s.topBar}>
          <div>
            <div style={s.topLabel}>DASHBOARD</div>
            <h1 style={s.topTitle}>{restaurant!.name}</h1>
          </div>
          <div style={s.topRight}>
            <div style={s.programBadge}>
              {restaurant!.discount_percent}% off · ${restaurant!.subscription_price}/mo
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Active Members</div>
            <div style={s.statValue}>{activeMembers.length}</div>
            <div style={s.statSub}>{thisMonth.length} joined this month</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Monthly Recurring Revenue</div>
            <div style={{ ...s.statValue, color: '#1B6B4A' }}>${mrr.toLocaleString()}</div>
            <div style={s.statSub}>${restaurant!.subscription_price} × {activeMembers.length} members</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Annual Revenue Run Rate</div>
            <div style={{ ...s.statValue, color: '#1B6B4A' }}>${arr.toLocaleString()}</div>
            <div style={s.statSub}>projected yearly</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Churn Rate</div>
            <div style={s.statValue}>
              {members.length > 0 ? ((cancelledMembers.length / members.length) * 100).toFixed(1) : '0'}%
            </div>
            <div style={s.statSub}>{cancelledMembers.length} cancelled total</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button
            style={activeTab === 'overview' ? s.tabActive : s.tab}
            onClick={() => setActiveTab('overview')}
          >Overview</button>
          <button
            style={activeTab === 'members' ? s.tabActive : s.tab}
            onClick={() => setActiveTab('members')}
          >Members ({members.length})</button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Quick Links */}
            <div style={s.linksGrid}>
              <div style={s.linkCard}>
                <div style={s.linkTitle}>Customer Signup Page</div>
                <div style={s.linkUrl}>app.localmint.co/join/{restaurant!.slug}</div>
                <button style={s.linkBtn} onClick={() => navigator.clipboard.writeText(`https://app.localmint.co/join/${restaurant!.slug}`)}>
                  Copy Link
                </button>
              </div>
              <div style={s.linkCard}>
                <div style={s.linkTitle}>Staff Verification Tool</div>
                <div style={s.linkUrl}>app.localmint.co/verify/{restaurant!.slug}</div>
                <button style={s.linkBtn} onClick={() => navigator.clipboard.writeText(`https://app.localmint.co/verify/${restaurant!.slug}`)}>
                  Copy Link
                </button>
              </div>
            </div>

            {/* Recent Members */}
            <div style={s.sectionTitle}>Recent Members</div>
            {members.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>👥</div>
                <div style={s.emptyText}>No members yet</div>
                <div style={s.emptyHint}>Share your signup link to start getting VIP members</div>
              </div>
            ) : (
              <div style={s.table}>
                <div style={s.tableHeader}>
                  <span style={{ flex: 2 }}>Name</span>
                  <span style={{ flex: 2 }}>Email</span>
                  <span style={{ flex: 1 }}>Status</span>
                  <span style={{ flex: 1, textAlign: 'right' as const }}>Joined</span>
                </div>
                {members.slice(0, 10).map(m => (
                  <div key={m.id} style={s.tableRow}>
                    <span style={{ flex: 2, fontWeight: 600 }}>{m.first_name} {m.last_name}</span>
                    <span style={{ flex: 2, color: '#6B7F73', fontSize: 13 }}>{m.email}</span>
                    <span style={{ flex: 1 }}>
                      <span style={m.status === 'active' ? s.statusActive : s.statusCancelled}>
                        {m.status}
                      </span>
                    </span>
                    <span style={{ flex: 1, textAlign: 'right' as const, color: '#6B7F73', fontSize: 13 }}>
                      {formatDate(m.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            {/* Search & Filter */}
            <div style={s.memberControls}>
              <input
                style={s.memberSearch}
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div style={s.filterGroup}>
                {(['all', 'active', 'cancelled'] as const).map(status => (
                  <button
                    key={status}
                    style={filterStatus === status ? s.filterActive : s.filterBtn}
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? `All (${members.length})` :
                     status === 'active' ? `Active (${activeMembers.length})` :
                     `Cancelled (${cancelledMembers.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Member List */}
            {filteredMembers.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyText}>No members match your search</div>
              </div>
            ) : (
              <div style={s.table}>
                <div style={s.tableHeader}>
                  <span style={{ flex: 2 }}>Name</span>
                  <span style={{ flex: 2 }}>Email</span>
                  <span style={{ flex: 1.5 }}>Phone</span>
                  <span style={{ flex: 1 }}>Status</span>
                  <span style={{ flex: 1, textAlign: 'right' as const }}>Joined</span>
                </div>
                {filteredMembers.map(m => (
                  <div key={m.id} style={s.tableRow}>
                    <span style={{ flex: 2, fontWeight: 600 }}>{m.first_name} {m.last_name}</span>
                    <span style={{ flex: 2, color: '#6B7F73', fontSize: 13 }}>{m.email}</span>
                    <span style={{ flex: 1.5, color: '#6B7F73', fontSize: 13 }}>{m.phone || '—'}</span>
                    <span style={{ flex: 1 }}>
                      <span style={m.status === 'active' ? s.statusActive : s.statusCancelled}>
                        {m.status}
                      </span>
                    </span>
                    <span style={{ flex: 1, textAlign: 'right' as const, color: '#6B7F73', fontSize: 13 }}>
                      {formatDate(m.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={s.footer}>
          Powered by <span style={{ color: '#34D399', fontWeight: 700 }}>LocalMint</span>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#F7FAF8',
    fontFamily: "'Outfit', -apple-system, sans-serif",
    display: 'flex',
    justifyContent: 'center',
  },
  container: {
    maxWidth: 960,
    width: '100%',
    padding: '32px 24px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  topLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#1B6B4A',
    marginBottom: 4,
  },
  topTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0A0F0D',
    margin: 0,
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  programBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1B6B4A',
    background: '#E8F5EE',
    padding: '6px 14px',
    borderRadius: 8,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '20px 18px',
    border: '1px solid #E8EDE9',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7F73',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#0A0F0D',
    lineHeight: 1,
    marginBottom: 6,
  },
  statSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 24,
    borderBottom: '1px solid #E8EDE9',
  },
  tab: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#6B7F73',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  tabActive: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#1B6B4A',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #1B6B4A',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  linksGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 32,
  },
  linkCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '20px',
    border: '1px solid #E8EDE9',
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0A0F0D',
    marginBottom: 6,
  },
  linkUrl: {
    fontSize: 12,
    color: '#1B6B4A',
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 12,
    wordBreak: 'break-all' as const,
  },
  linkBtn: {
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#1B6B4A',
    background: '#E8F5EE',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0A0F0D',
    marginBottom: 16,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #E8EDE9',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#0A0F0D',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  table: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #E8EDE9',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: '12px 20px',
    fontSize: 11,
    fontWeight: 700,
    color: '#6B7F73',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    borderBottom: '1px solid #E8EDE9',
    background: '#F7FAF8',
  },
  tableRow: {
    display: 'flex',
    padding: '14px 20px',
    fontSize: 14,
    color: '#0A0F0D',
    borderBottom: '1px solid #F3F5F4',
    alignItems: 'center',
  },
  statusActive: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1B6B4A',
    background: '#E8F5EE',
    padding: '3px 8px',
    borderRadius: 4,
  },
  statusCancelled: {
    fontSize: 11,
    fontWeight: 600,
    color: '#DC2626',
    background: '#FEF2F2',
    padding: '3px 8px',
    borderRadius: 4,
  },
  memberControls: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap' as const,
  },
  memberSearch: {
    flex: 1,
    minWidth: 200,
    padding: '10px 16px',
    border: '1.5px solid #E2E8E5',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    color: '#0A0F0D',
    background: '#fff',
  },
  filterGroup: {
    display: 'flex',
    gap: 4,
  },
  filterBtn: {
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7F73',
    background: '#fff',
    border: '1.5px solid #E2E8E5',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  filterActive: {
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#1B6B4A',
    background: '#E8F5EE',
    border: '1.5px solid #1B6B4A',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  footer: {
    textAlign: 'center' as const,
    padding: '32px 0',
    fontSize: 12,
    color: '#9CA3AF',
  },
};
