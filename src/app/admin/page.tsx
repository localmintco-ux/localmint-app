'use client';

import { useState, useEffect } from 'react';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  subscription_price: number;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  active_members: number;
  total_members: number;
  mrr: number;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    slug: '',
    description: '',
    address: '',
    phone: '',
    subscription_price: 55,
    discount_percent: 35,
  });

  const handleLogin = () => {
    document.cookie = `admin_auth=${password}; path=/; max-age=${60 * 60 * 24 * 7}`;
    setAuthed(true);
    loadRestaurants();
  };

  const loadRestaurants = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/restaurants');
    if (res.ok) {
      const data = await res.json();
      setRestaurants(data);
    } else if (res.status === 401) {
      setAuthed(false);
      setAuthError('Invalid password');
    }
    setLoading(false);
  };

  useEffect(() => {
    // Check if already authed
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('admin_auth='));
    if (cookie) {
      setAuthed(true);
      loadRestaurants();
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    const res = await fetch('/api/admin/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRestaurant),
    });

    const data = await res.json();

    if (!res.ok) {
      setCreateError(data.error || 'Failed to create');
      setCreating(false);
      return;
    }

    setShowCreate(false);
    setNewRestaurant({ name: '', slug: '', description: '', address: '', phone: '', subscription_price: 55, discount_percent: 35 });
    setCreating(false);
    loadRestaurants();
  };

  const handleLogout = () => {
    document.cookie = 'admin_auth=; path=/; max-age=0';
    setAuthed(false);
    setRestaurants([]);
  };

  const totalMRR = restaurants.reduce((sum, r) => sum + r.mrr, 0);
  const totalMembers = restaurants.reduce((sum, r) => sum + r.active_members, 0);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Login screen
  if (!authed) {
    return (
      <div style={s.loginContainer}>
        <div style={s.loginCard}>
          <div style={s.logo}>Local<span style={{ color: '#1B6B4A' }}>Mint</span></div>
          <h1 style={s.loginTitle}>Admin Panel</h1>
          <p style={s.loginSub}>Internal use only</p>
          <div style={s.loginForm}>
            <input
              type="password"
              style={s.loginInput}
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            {authError && <div style={s.error}>{authError}</div>}
            <button style={s.loginBtn} onClick={handleLogin}>Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.headerLabel}>LOCALMINT ADMIN</div>
            <h1 style={s.headerTitle}>Restaurant Management</h1>
          </div>
          <div style={s.headerRight}>
            <button style={s.createBtn} onClick={() => setShowCreate(true)}>+ Add Restaurant</button>
            <button style={s.logoutBtn} onClick={handleLogout}>Log Out</button>
          </div>
        </div>

        {/* Platform Stats */}
        <div style={s.platformStats}>
          <div style={s.pStat}>
            <div style={s.pStatValue}>{restaurants.length}</div>
            <div style={s.pStatLabel}>Restaurants</div>
          </div>
          <div style={s.pStat}>
            <div style={s.pStatValue}>{totalMembers}</div>
            <div style={s.pStatLabel}>Total Members</div>
          </div>
          <div style={s.pStat}>
            <div style={{ ...s.pStatValue, color: '#1B6B4A' }}>${totalMRR.toLocaleString()}</div>
            <div style={s.pStatLabel}>Platform MRR</div>
          </div>
          <div style={s.pStat}>
            <div style={{ ...s.pStatValue, color: '#1B6B4A' }}>${(totalMRR * 12).toLocaleString()}</div>
            <div style={s.pStatLabel}>Platform ARR</div>
          </div>
        </div>

        {/* Create Restaurant Modal */}
        {showCreate && (
          <div style={s.modal}>
            <div style={s.modalCard}>
              <h2 style={s.modalTitle}>Add New Restaurant</h2>
              <form onSubmit={handleCreate} style={s.modalForm}>
                <div style={s.fieldRow}>
                  <div style={s.field}>
                    <label style={s.label}>Restaurant Name *</label>
                    <input style={s.input} placeholder="Tony's Pizzeria" value={newRestaurant.name}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value, slug: newRestaurant.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') })} required />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>URL Slug *</label>
                    <input style={s.input} placeholder="tonys" value={newRestaurant.slug}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} required />
                    <div style={s.slugPreview}>localmint.co/join/{newRestaurant.slug || '...'}</div>
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Description</label>
                  <input style={s.input} placeholder="Family-owned Italian restaurant since 1985" value={newRestaurant.description}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, description: e.target.value })} />
                </div>
                <div style={s.fieldRow}>
                  <div style={s.field}>
                    <label style={s.label}>Address</label>
                    <input style={s.input} placeholder="123 Main St, Long Island, NY" value={newRestaurant.address}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, address: e.target.value })} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Phone</label>
                    <input style={s.input} placeholder="(516) 555-1234" value={newRestaurant.phone}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, phone: e.target.value })} />
                  </div>
                </div>
                <div style={s.fieldRow}>
                  <div style={s.field}>
                    <label style={s.label}>Subscription Price ($/mo)</label>
                    <input style={s.input} type="number" value={newRestaurant.subscription_price}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, subscription_price: Number(e.target.value) })} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Member Discount (%)</label>
                    <input style={s.input} type="number" value={newRestaurant.discount_percent}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, discount_percent: Number(e.target.value) })} />
                  </div>
                </div>
                {createError && <div style={s.error}>{createError}</div>}
                <div style={s.modalActions}>
                  <button type="button" style={s.modalCancel} onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" style={s.modalSubmit} disabled={creating}>{creating ? 'Creating...' : 'Create Restaurant'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Restaurant List */}
        {loading ? (
          <div style={{ textAlign: 'center' as const, padding: 40, color: '#9CA3AF' }}>Loading...</div>
        ) : restaurants.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No restaurants yet</div>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>Click "Add Restaurant" to onboard your first client</div>
          </div>
        ) : (
          <div style={s.restaurantList}>
            {restaurants.map(r => (
              <div key={r.id} style={s.rCard}>
                <div style={s.rCardTop}>
                  <div>
                    <div style={s.rName}>{r.name}</div>
                    <div style={s.rSlug}>/{r.slug}</div>
                  </div>
                  <div style={s.rBadge}>{r.discount_percent}% off · ${r.subscription_price}/mo</div>
                </div>
                <div style={s.rStats}>
                  <div style={s.rStat}>
                    <div style={s.rStatValue}>{r.active_members}</div>
                    <div style={s.rStatLabel}>Members</div>
                  </div>
                  <div style={s.rStat}>
                    <div style={{ ...s.rStatValue, color: '#1B6B4A' }}>${r.mrr.toLocaleString()}</div>
                    <div style={s.rStatLabel}>MRR</div>
                  </div>
                  <div style={s.rStat}>
                    <div style={s.rStatValue}>{formatDate(r.created_at)}</div>
                    <div style={s.rStatLabel}>Added</div>
                  </div>
                </div>
                <div style={s.rLinks}>
                  <a href={`/join/${r.slug}`} target="_blank" style={s.rLink}>Signup Page</a>
                  <a href={`/verify/${r.slug}`} target="_blank" style={s.rLink}>Verify Tool</a>
                  <a href={`/dashboard/${r.slug}`} target="_blank" style={s.rLink}>Dashboard</a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={s.footer}>LocalMint Admin · Internal Use Only</div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  loginContainer: { minHeight: '100vh', background: '#0A0F0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Outfit', sans-serif" },
  loginCard: { background: '#fff', borderRadius: 20, padding: '36px 28px', maxWidth: 380, width: '100%', color: '#0A0F0D' },
  logo: { fontSize: 24, fontWeight: 800, textAlign: 'center' as const, marginBottom: 24 },
  loginTitle: { fontSize: 20, fontWeight: 800, textAlign: 'center' as const, margin: '0 0 4px' },
  loginSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' as const, margin: '0 0 24px' },
  loginForm: { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  loginInput: { padding: '12px 14px', border: '1.5px solid #E2E8E5', borderRadius: 10, fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: 'none', color: '#0A0F0D', background: '#F7FAF8', width: '100%' },
  loginBtn: { background: '#1B6B4A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  page: { minHeight: '100vh', background: '#F7FAF8', fontFamily: "'Outfit', -apple-system, sans-serif" },
  container: { maxWidth: 1000, width: '100%', margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap' as const, gap: 16 },
  headerLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#1B6B4A', marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: 800, color: '#0A0F0D', margin: 0 },
  headerRight: { display: 'flex', gap: 8 },
  createBtn: { padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#1B6B4A', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  logoutBtn: { padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6B7F73', background: '#fff', border: '1px solid #E2E8E5', borderRadius: 10, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  platformStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 },
  pStat: { background: '#fff', borderRadius: 12, padding: '16px 14px', border: '1px solid #E8EDE9', textAlign: 'center' as const },
  pStatValue: { fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#0A0F0D', marginBottom: 4 },
  pStatLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: 500 },
  modal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 20, padding: '32px 28px', maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto' as const },
  modalTitle: { fontSize: 20, fontWeight: 800, margin: '0 0 24px' },
  modalForm: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#4A5E52' },
  input: { padding: '10px 12px', border: '1.5px solid #E2E8E5', borderRadius: 8, fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: 'none', color: '#0A0F0D', background: '#F7FAF8', width: '100%' },
  slugPreview: { fontSize: 10, color: '#1B6B4A', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 },
  error: { background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
  modalCancel: { padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#6B7F73', background: '#F7FAF8', border: '1px solid #E2E8E5', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  modalSubmit: { padding: '10px 24px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  empty: { textAlign: 'center' as const, padding: '48px 24px', background: '#fff', borderRadius: 14, border: '1px solid #E8EDE9' },
  restaurantList: { display: 'flex', flexDirection: 'column' as const, gap: 14 },
  rCard: { background: '#fff', borderRadius: 14, border: '1px solid #E8EDE9', overflow: 'hidden' },
  rCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 20px' },
  rName: { fontSize: 18, fontWeight: 700, color: '#0A0F0D' },
  rSlug: { fontSize: 12, color: '#1B6B4A', fontFamily: "'JetBrains Mono', monospace" },
  rBadge: { fontSize: 11, fontWeight: 600, color: '#1B6B4A', background: '#E8F5EE', padding: '4px 10px', borderRadius: 6 },
  rStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderTop: '1px solid #F3F5F4', borderBottom: '1px solid #F3F5F4' },
  rStat: { padding: '14px 20px', textAlign: 'center' as const, borderRight: '1px solid #F3F5F4' },
  rStatValue: { fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#0A0F0D', marginBottom: 2 },
  rStatLabel: { fontSize: 10, color: '#9CA3AF' },
  rLinks: { display: 'flex', gap: 8, padding: '14px 20px' },
  rLink: { fontSize: 12, fontWeight: 600, color: '#1B6B4A', background: '#E8F5EE', padding: '6px 12px', borderRadius: 6, textDecoration: 'none' },
  footer: { textAlign: 'center' as const, padding: '32px 0', fontSize: 11, color: '#BCBCBC' },
};
