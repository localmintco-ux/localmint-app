'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  subscription_price: number;
  discount_percent: number;
  onboarding_step: number;
  pos_system: string | null;
  cuisine_type: string | null;
  hours: string | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  menu_url: string | null;
  sales_data_url: string | null;
  offer_approved: boolean;
  materials_approved: boolean;
  hook_item: string | null;
  hook_item_detail: string | null;
  perks: string[] | null;
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
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState({ signupViews: 0, signupViewsMonth: 0, verifyViews: 0 });

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

      // Load analytics
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: totalSignupViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rest.id)
        .eq('page_type', 'signup');

      const { count: monthSignupViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rest.id)
        .eq('page_type', 'signup')
        .gte('created_at', monthStart);

      const { count: totalVerifyViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rest.id)
        .eq('page_type', 'verify');

      setAnalytics({
        signupViews: totalSignupViews || 0,
        signupViewsMonth: monthSignupViews || 0,
        verifyViews: totalVerifyViews || 0,
      });

      setLoading(false);
    }
    load();
  }, [params]);

  const handleCancel = async (memberId: string, memberName: string) => {
    if (!confirm(`Cancel membership for ${memberName}? This will remove their VIP discount.`)) return;
    setCancellingId(memberId);

    const res = await fetch('/api/members/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });

    if (res.ok) {
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, status: 'cancelled' } : m
      ));
    } else {
      alert('Failed to cancel membership. Please try again.');
    }
    setCancellingId(null);
  };

  const handleLogout = async () => {
    document.cookie = 'auth_token=; path=/; max-age=0';
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={st.page}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34D399' }}></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={st.page}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center' as const }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Restaurant not found</h1>
        </div>
      </div>
    );
  }

  const activeMembers = members.filter(m => m.status === 'active');
  const cancelledMembers = members.filter(m => m.status === 'cancelled');
  const mrr = activeMembers.length * (restaurant?.subscription_price || 0);
  const arr = mrr * 12;

  const now = new Date();
  const thisMonth = members.filter(m => {
    const d = new Date(m.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

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
    <div style={st.pageLight}>
      <div style={st.container}>
        {/* Top Bar */}
        <div style={st.topBar}>
          <div>
            <div style={st.topLabel}>DASHBOARD</div>
            <h1 style={st.topTitle}>{restaurant!.name}</h1>
          </div>
          <div style={st.topRight}>
            {restaurant!.onboarding_step >= 3 && (
              <div style={st.programBadge}>
                {restaurant!.discount_percent}% off · ${restaurant!.subscription_price}/mo
              </div>
            )}
            <button style={st.logoutBtn} onClick={handleLogout}>Log Out</button>
          </div>
        </div>

        {/* Onboarding Checklist */}
        {restaurant!.onboarding_step < 3 && (
          <div style={st.onboardingWrap}>
            <div style={st.onboardingHeader}>
              <div>
                <div style={st.onboardingTitle}>Complete Setup to Launch</div>
                <div style={st.onboardingSub}>{restaurant!.onboarding_step} of 3 steps complete</div>
              </div>
              <div style={st.onboardingProgress}>
                <div style={{ ...st.onboardingBar, width: `${(restaurant!.onboarding_step / 3) * 100}%` }}></div>
              </div>
            </div>
            <div style={st.onboardingSteps}>
              {/* Step 1: Restaurant Details */}
              <div style={restaurant!.onboarding_step >= 1 ? st.stepDone : st.stepActive}>
                <div style={restaurant!.onboarding_step >= 1 ? st.stepNumDone : st.stepNum}>{restaurant!.onboarding_step >= 1 ? '✓' : '1'}</div>
                <div style={{ flex: 1 }}>
                  <div style={st.stepTitle}>Restaurant Details</div>
                  <div style={st.stepDesc}>Confirm your address, phone, hours, cuisine type, and POS system</div>
                  {restaurant!.onboarding_step < 1 && (
                    <button style={st.stepBtn} onClick={() => setShowOnboarding('details')}>Complete</button>
                  )}
                </div>
              </div>
              {/* Step 2: Upload Menu */}
              <div style={restaurant!.onboarding_step >= 2 ? st.stepDone : restaurant!.onboarding_step === 1 ? st.stepActive : st.stepLocked}>
                <div style={restaurant!.onboarding_step >= 2 ? st.stepNumDone : st.stepNum}>{restaurant!.onboarding_step >= 2 ? '✓' : '2'}</div>
                <div style={{ flex: 1 }}>
                  <div style={st.stepTitle}>Upload Current Menu</div>
                  <div style={st.stepDesc}>Upload your menu as a PDF or photos so we can design your VIP version</div>
                  {restaurant!.onboarding_step === 1 && (
                    <button style={st.stepBtn} onClick={() => setShowOnboarding('menu')}>Upload</button>
                  )}
                </div>
              </div>
              {/* Step 3: Upload Sales Data */}
              <div style={restaurant!.onboarding_step >= 3 ? st.stepDone : restaurant!.onboarding_step === 2 ? st.stepActive : st.stepLocked}>
                <div style={restaurant!.onboarding_step >= 3 ? st.stepNumDone : st.stepNum}>{restaurant!.onboarding_step >= 3 ? '✓' : '3'}</div>
                <div style={{ flex: 1 }}>
                  <div style={st.stepTitle}>Upload Sales Data</div>
                  <div style={st.stepDesc}>Export last 6-12 months of transaction data from your POS system</div>
                  {restaurant!.onboarding_step === 2 && (
                    <button style={st.stepBtn} onClick={() => setShowOnboarding('sales')}>Upload</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Complete - Pending Your Work */}
        {restaurant!.onboarding_step >= 3 && restaurant!.onboarding_step < 5 && (
          <div style={{ ...st.onboardingWrap, borderColor: '#34D399', background: '#F0FDF9' }}>
            <div style={{ textAlign: 'center' as const, padding: '16px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1B6B4A', color: '#fff', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>✓</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0A0F0D', marginBottom: 4 }}>Setup Complete</div>
              <div style={{ fontSize: 14, color: '#6B7F73', lineHeight: 1.6 }}>We have everything we need. Our team is analyzing your data and designing your custom VIP program. We'll be in touch shortly with your proposed offer and print materials.</div>
            </div>
          </div>
        )}
        {showOnboarding === 'details' && (
          <div style={st.modal}>
            <div style={st.modalCard}>
              <h2 style={st.modalTitle}>Restaurant Details</h2>
              <div style={st.modalForm}>
                <div style={st.modalField}><label style={st.modalLabel}>Address</label><input style={st.modalInput} placeholder="123 Main St, Long Island, NY" id="ob-address" defaultValue={restaurant!.address || ''} /></div>
                <div style={st.modalField}><label style={st.modalLabel}>Phone</label><input style={st.modalInput} placeholder="(516) 555-1234" id="ob-phone" defaultValue={restaurant!.phone || ''} /></div>
                <div style={st.modalField}><label style={st.modalLabel}>Website or Instagram</label><input style={st.modalInput} placeholder="www.mariosbistro.com" id="ob-website" defaultValue={restaurant!.website || ''} /></div>
                <div style={st.modalField}><label style={st.modalLabel}>Hours of Operation</label><input style={st.modalInput} placeholder="Mon-Thu 11-10, Fri-Sat 11-11, Sun 12-9" id="ob-hours" defaultValue={restaurant!.hours || ''} /></div>
                <div style={st.modalField}><label style={st.modalLabel}>Cuisine Type</label><input style={st.modalInput} placeholder="Italian, Seafood, American, etc." id="ob-cuisine" defaultValue={restaurant!.cuisine_type || ''} /></div>
                <div style={st.modalField}>
                  <label style={st.modalLabel}>POS System</label>
                  <select style={st.modalInput} id="ob-pos" defaultValue={restaurant!.pos_system || ''}>
                    <option value="">Select your POS</option>
                    <option value="toast">Toast</option>
                    <option value="square">Square</option>
                    <option value="clover">Clover</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={st.modalActions}>
                  <button style={st.modalCancel} onClick={() => setShowOnboarding(null)}>Cancel</button>
                  <button style={st.modalSubmit} onClick={async () => {
                    const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId: restaurant!.id, action: 'save_details', data: { address: (document.getElementById('ob-address') as HTMLInputElement).value, phone: (document.getElementById('ob-phone') as HTMLInputElement).value, website: (document.getElementById('ob-website') as HTMLInputElement).value, hours: (document.getElementById('ob-hours') as HTMLInputElement).value, cuisineType: (document.getElementById('ob-cuisine') as HTMLInputElement).value, posSystem: (document.getElementById('ob-pos') as HTMLSelectElement).value }})});
                    if (res.ok) { setRestaurant({ ...restaurant!, onboarding_step: 1, address: (document.getElementById('ob-address') as HTMLInputElement).value, phone: (document.getElementById('ob-phone') as HTMLInputElement).value }); setShowOnboarding(null); }
                  }}>Save & Continue</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Modal: Menu Upload */}
        {showOnboarding === 'menu' && (
          <div style={st.modal}>
            <div style={st.modalCard}>
              <h2 style={st.modalTitle}>Upload Your Current Menu</h2>
              <p style={st.modalDesc}>Upload your menu as a PDF or photos. We&apos;ll use this to design your VIP version with dual pricing and QR codes.</p>
              <div style={st.modalField}>
                <label style={st.modalLabel}>Menu File (PDF, JPG, PNG)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="ob-menu-file" style={st.modalInput} />
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Or paste a link to your menu if it&apos;s online:</p>
              <div style={st.modalField}>
                <input style={st.modalInput} placeholder="https://www.yourrestaurant.com/menu" id="ob-menu-url" />
              </div>
              <div style={st.modalActions}>
                <button style={st.modalCancel} onClick={() => setShowOnboarding(null)}>Cancel</button>
                <button style={st.modalSubmit} onClick={async () => {
                  const urlInput = (document.getElementById('ob-menu-url') as HTMLInputElement).value;
                  const fileInput = document.getElementById('ob-menu-file') as HTMLInputElement;
                  const menuUrl = urlInput || (fileInput.files?.[0]?.name ? `uploaded: ${fileInput.files[0].name}` : '');
                  if (!menuUrl) { alert('Please upload a file or provide a URL'); return; }
                  const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId: restaurant!.id, action: 'save_menu_url', data: { url: menuUrl }})});
                  if (res.ok) { setRestaurant({ ...restaurant!, onboarding_step: 2, menu_url: menuUrl }); setShowOnboarding(null); }
                }}>Submit & Continue</button>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Modal: Sales Data Upload */}
        {showOnboarding === 'sales' && (
          <div style={st.modal}>
            <div style={st.modalCard}>
              <h2 style={st.modalTitle}>Upload Sales Data</h2>
              <p style={st.modalDesc}>Export your last 6-12 months of transaction data from your POS system. This helps us analyze your average order value, visit frequency, and customer patterns to design the optimal VIP offer.</p>
              <div style={st.modalField}>
                <label style={st.modalLabel}>Sales Data File (CSV, XLSX, PDF)</label>
                <input type="file" accept=".csv,.xlsx,.xls,.pdf" id="ob-sales-file" style={st.modalInput} />
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Not sure how to export? We can walk you through it on a quick call.</p>
              <div style={st.modalActions}>
                <button style={st.modalCancel} onClick={() => setShowOnboarding(null)}>Cancel</button>
                <button style={st.modalSubmit} onClick={async () => {
                  const fileInput = document.getElementById('ob-sales-file') as HTMLInputElement;
                  const fileName = fileInput.files?.[0]?.name || '';
                  if (!fileName) { alert('Please upload your sales data file'); return; }
                  const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId: restaurant!.id, action: 'save_sales_url', data: { url: `uploaded: ${fileName}` }})});
                  if (res.ok) { setRestaurant({ ...restaurant!, onboarding_step: 3, sales_data_url: `uploaded: ${fileName}` }); setShowOnboarding(null); }
                }}>Submit & Continue</button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={st.statsGrid}>
          <div style={st.statCard}>
            <div style={st.statLabel}>Active Members</div>
            <div style={st.statValue}>{activeMembers.length}</div>
            <div style={st.statSub}>{thisMonth.length} joined this month</div>
          </div>
          <div style={st.statCard}>
            <div style={st.statLabel}>Monthly Recurring Revenue</div>
            <div style={{ ...st.statValue, color: '#1B6B4A' }}>${mrr.toLocaleString()}</div>
            <div style={st.statSub}>${restaurant!.subscription_price} × {activeMembers.length} members</div>
          </div>
          <div style={st.statCard}>
            <div style={st.statLabel}>Annual Revenue Run Rate</div>
            <div style={{ ...st.statValue, color: '#1B6B4A' }}>${arr.toLocaleString()}</div>
            <div style={st.statSub}>projected yearly</div>
          </div>
          <div style={st.statCard}>
            <div style={st.statLabel}>Churn Rate</div>
            <div style={st.statValue}>
              {members.length > 0 ? ((cancelledMembers.length / members.length) * 100).toFixed(1) : '0'}%
            </div>
            <div style={st.statSub}>{cancelledMembers.length} cancelled total</div>
          </div>
        </div>

        {/* Analytics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <div style={st.statCard}>
            <div style={st.statLabel}>Signup Page Views</div>
            <div style={st.statValue}>{analytics.signupViews}</div>
            <div style={st.statSub}>{analytics.signupViewsMonth} this month</div>
          </div>
          <div style={st.statCard}>
            <div style={st.statLabel}>Conversion Rate</div>
            <div style={{ ...st.statValue, color: '#1B6B4A' }}>
              {analytics.signupViews > 0 ? ((members.filter(m => m.status === 'active').length / analytics.signupViews) * 100).toFixed(1) : '0'}%
            </div>
            <div style={st.statSub}>views → active members</div>
          </div>
          <div style={st.statCard}>
            <div style={st.statLabel}>Verification Lookups</div>
            <div style={st.statValue}>{analytics.verifyViews}</div>
            <div style={st.statSub}>staff tool usage</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={st.tabs}>
          <button style={activeTab === 'overview' ? st.tabActive : st.tab} onClick={() => setActiveTab('overview')}>Overview</button>
          <button style={activeTab === 'members' ? st.tabActive : st.tab} onClick={() => setActiveTab('members')}>Members ({members.length})</button>
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div>
            <div style={st.linksGrid}>
              <div style={st.linkCard}>
                <div style={st.linkTitle}>Customer Signup Page</div>
                <div style={st.linkUrl}>app.localmint.co/join/{restaurant!.slug}</div>
                <button style={st.linkBtn} onClick={() => navigator.clipboard.writeText(`https://app.localmint.co/join/${restaurant!.slug}`)}>Copy Link</button>
              </div>
              <div style={st.linkCard}>
                <div style={st.linkTitle}>Staff Verification Tool</div>
                <div style={st.linkUrl}>app.localmint.co/verify/{restaurant!.slug}</div>
                <button style={st.linkBtn} onClick={() => navigator.clipboard.writeText(`https://app.localmint.co/verify/${restaurant!.slug}`)}>Copy Link</button>
              </div>
            </div>

            {/* Current VIP Offer */}
            {(restaurant!.hook_item || restaurant!.onboarding_step >= 3) && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDE9', padding: 20, marginBottom: 32 }}>
                <div style={st.sectionTitle}>Your VIP Offer</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div style={{ padding: '14px 16px', background: '#F7FAF8', borderRadius: 10, textAlign: 'center' as const }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#1B6B4A' }}>${restaurant!.subscription_price}</div>
                    <div style={{ fontSize: 11, color: '#6B7F73', marginTop: 2 }}>per month</div>
                  </div>
                  <div style={{ padding: '14px 16px', background: '#F7FAF8', borderRadius: 10, textAlign: 'center' as const }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#1B6B4A' }}>{restaurant!.discount_percent}%</div>
                    <div style={{ fontSize: 11, color: '#6B7F73', marginTop: 2 }}>menu discount</div>
                  </div>
                  <div style={{ padding: '14px 16px', background: '#F7FAF8', borderRadius: 10, textAlign: 'center' as const }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0F0D' }}>{restaurant!.hook_item || '—'}</div>
                    <div style={{ fontSize: 11, color: '#6B7F73', marginTop: 2 }}>complimentary per visit</div>
                  </div>
                </div>
                {(restaurant!.perks && restaurant!.perks.length > 0) && (
                  <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {restaurant!.perks.map((perk, i) => (
                      <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#1B6B4A', background: '#E8F5EE', padding: '4px 10px', borderRadius: 6 }}>{perk}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={st.sectionTitle}>Recent Members</div>
            {members.length === 0 ? (
              <div style={st.emptyState}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No members yet</div>
                <div style={{ fontSize: 13, color: '#9CA3AF' }}>Share your signup link to start getting VIP members</div>
              </div>
            ) : (
              <div style={st.table}>
                <div style={st.tableHeader}>
                  <span style={{ flex: 2 }}>Name</span>
                  <span style={{ flex: 2 }}>Email</span>
                  <span style={{ flex: 1 }}>Status</span>
                  <span style={{ flex: 1 }}>Joined</span>
                  <span style={{ flex: 0.8, textAlign: 'right' as const }}>Action</span>
                </div>
                {members.slice(0, 10).map(m => (
                  <div key={m.id} style={st.tableRow}>
                    <span style={{ flex: 2, fontWeight: 600 }}>{m.first_name} {m.last_name}</span>
                    <span style={{ flex: 2, color: '#6B7F73', fontSize: 13 }}>{m.email}</span>
                    <span style={{ flex: 1 }}>
                      <span style={m.status === 'active' ? st.statusActive : st.statusCancelled}>{m.status}</span>
                    </span>
                    <span style={{ flex: 1, color: '#6B7F73', fontSize: 13 }}>{formatDate(m.created_at)}</span>
                    <span style={{ flex: 0.8, textAlign: 'right' as const }}>
                      {m.status === 'active' && (
                        <button
                          style={st.cancelBtn}
                          onClick={() => handleCancel(m.id, `${m.first_name} ${m.last_name}`)}
                          disabled={cancellingId === m.id}
                        >
                          {cancellingId === m.id ? '...' : 'Cancel'}
                        </button>
                      )}
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
            <div style={st.memberControls}>
              <input
                style={st.memberSearch}
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div style={st.filterGroup}>
                {(['all', 'active', 'cancelled'] as const).map(status => (
                  <button
                    key={status}
                    style={filterStatus === status ? st.filterActive : st.filterBtn}
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? `All (${members.length})` :
                     status === 'active' ? `Active (${activeMembers.length})` :
                     `Cancelled (${cancelledMembers.length})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <div style={st.emptyState}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>No members match your search</div>
              </div>
            ) : (
              <div style={st.table}>
                <div style={st.tableHeader}>
                  <span style={{ flex: 2 }}>Name</span>
                  <span style={{ flex: 2 }}>Email</span>
                  <span style={{ flex: 1.5 }}>Phone</span>
                  <span style={{ flex: 1 }}>Status</span>
                  <span style={{ flex: 1 }}>Joined</span>
                  <span style={{ flex: 0.8, textAlign: 'right' as const }}>Action</span>
                </div>
                {filteredMembers.map(m => (
                  <div key={m.id} style={st.tableRow}>
                    <span style={{ flex: 2, fontWeight: 600 }}>{m.first_name} {m.last_name}</span>
                    <span style={{ flex: 2, color: '#6B7F73', fontSize: 13 }}>{m.email}</span>
                    <span style={{ flex: 1.5, color: '#6B7F73', fontSize: 13 }}>{m.phone || '—'}</span>
                    <span style={{ flex: 1 }}>
                      <span style={m.status === 'active' ? st.statusActive : st.statusCancelled}>{m.status}</span>
                    </span>
                    <span style={{ flex: 1, color: '#6B7F73', fontSize: 13 }}>{formatDate(m.created_at)}</span>
                    <span style={{ flex: 0.8, textAlign: 'right' as const }}>
                      {m.status === 'active' && (
                        <button
                          style={st.cancelBtn}
                          onClick={() => handleCancel(m.id, `${m.first_name} ${m.last_name}`)}
                          disabled={cancellingId === m.id}
                        >
                          {cancellingId === m.id ? '...' : 'Cancel'}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={st.footer}>
          Powered by <span style={{ color: '#34D399', fontWeight: 700 }}>LocalMint</span>
        </div>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0A0F0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" },
  pageLight: { minHeight: '100vh', background: '#F7FAF8', fontFamily: "'Outfit', -apple-system, sans-serif" },
  container: { maxWidth: 960, width: '100%', margin: '0 auto', padding: '32px 24px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap' as const, gap: 16 },
  topLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#1B6B4A', marginBottom: 4 },
  topTitle: { fontSize: 28, fontWeight: 800, color: '#0A0F0D', margin: 0 },
  topRight: { display: 'flex', alignItems: 'center', gap: 12 },
  programBadge: { fontSize: 12, fontWeight: 600, color: '#1B6B4A', background: '#E8F5EE', padding: '6px 14px', borderRadius: 8 },
  logoutBtn: { fontSize: 12, fontWeight: 600, color: '#6B7F73', background: '#fff', border: '1px solid #E2E8E5', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 },
  statCard: { background: '#fff', borderRadius: 14, padding: '20px 18px', border: '1px solid #E8EDE9' },
  statLabel: { fontSize: 11, fontWeight: 600, color: '#6B7F73', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#0A0F0D', lineHeight: 1, marginBottom: 6 },
  statSub: { fontSize: 11, color: '#9CA3AF' },
  tabs: { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #E8EDE9' },
  tab: { padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#6B7F73', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  tabActive: { padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#1B6B4A', background: 'none', border: 'none', borderBottom: '2px solid #1B6B4A', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  linksGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 },
  linkCard: { background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E8EDE9' },
  linkTitle: { fontSize: 14, fontWeight: 700, color: '#0A0F0D', marginBottom: 6 },
  linkUrl: { fontSize: 12, color: '#1B6B4A', fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, wordBreak: 'break-all' as const },
  linkBtn: { padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#1B6B4A', background: '#E8F5EE', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#0A0F0D', marginBottom: 16 },
  emptyState: { textAlign: 'center' as const, padding: '48px 24px', background: '#fff', borderRadius: 14, border: '1px solid #E8EDE9' },
  table: { background: '#fff', borderRadius: 14, border: '1px solid #E8EDE9', overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#6B7F73', textTransform: 'uppercase' as const, letterSpacing: '0.04em', borderBottom: '1px solid #E8EDE9', background: '#F7FAF8' },
  tableRow: { display: 'flex', padding: '14px 20px', fontSize: 14, color: '#0A0F0D', borderBottom: '1px solid #F3F5F4', alignItems: 'center' },
  statusActive: { fontSize: 11, fontWeight: 600, color: '#1B6B4A', background: '#E8F5EE', padding: '3px 8px', borderRadius: 4 },
  statusCancelled: { fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', padding: '3px 8px', borderRadius: 4 },
  cancelBtn: { fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  memberControls: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const },
  memberSearch: { flex: 1, minWidth: 200, padding: '10px 16px', border: '1.5px solid #E2E8E5', borderRadius: 10, fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: 'none', color: '#0A0F0D', background: '#fff' },
  filterGroup: { display: 'flex', gap: 4 },
  filterBtn: { padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#6B7F73', background: '#fff', border: '1.5px solid #E2E8E5', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  filterActive: { padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#1B6B4A', background: '#E8F5EE', border: '1.5px solid #1B6B4A', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  footer: { textAlign: 'center' as const, padding: '32px 0', fontSize: 12, color: '#9CA3AF' },
  onboardingWrap: { background: '#fff', borderRadius: 14, border: '2px solid #1B6B4A', padding: '24px', marginBottom: 32 },
  onboardingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' as const },
  onboardingTitle: { fontSize: 18, fontWeight: 800, color: '#0A0F0D' },
  onboardingSub: { fontSize: 13, color: '#6B7F73' },
  onboardingProgress: { width: 200, height: 6, background: '#E8EDE9', borderRadius: 3, overflow: 'hidden' },
  onboardingBar: { height: '100%', background: '#1B6B4A', borderRadius: 3, transition: 'width 0.3s' },
  onboardingSteps: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  stepActive: { display: 'flex', gap: 14, padding: '16px', background: '#F7FAF8', border: '1.5px solid #1B6B4A', borderRadius: 10, alignItems: 'flex-start' },
  stepDone: { display: 'flex', gap: 14, padding: '16px', background: '#E8F5EE', border: '1.5px solid #E8F5EE', borderRadius: 10, alignItems: 'flex-start', opacity: 0.7 },
  stepLocked: { display: 'flex', gap: 14, padding: '16px', background: '#F7FAF8', border: '1.5px solid #E8EDE9', borderRadius: 10, alignItems: 'flex-start', opacity: 0.5 },
  stepNum: { width: 28, height: 28, borderRadius: '50%', background: '#E8EDE9', color: '#6B7F73', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumDone: { width: 28, height: 28, borderRadius: '50%', background: '#1B6B4A', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepTitle: { fontSize: 14, fontWeight: 700, color: '#0A0F0D', marginBottom: 2 },
  stepDesc: { fontSize: 12, color: '#6B7F73', lineHeight: 1.5 },
  stepBtn: { marginTop: 8, padding: '6px 16px', fontSize: 12, fontWeight: 600, color: '#fff', background: '#1B6B4A', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  stepPending: { marginTop: 8, fontSize: 11, color: '#92400E', background: '#FFF9E6', padding: '6px 12px', borderRadius: 6, fontWeight: 600 },
  modal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto' as const, color: '#0A0F0D' },
  modalTitle: { fontSize: 20, fontWeight: 800, margin: '0 0 8px' },
  modalDesc: { fontSize: 13, color: '#6B7F73', lineHeight: 1.6, marginBottom: 20 },
  modalForm: { display: 'flex', flexDirection: 'column' as const, gap: 14 },
  modalField: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  modalLabel: { fontSize: 12, fontWeight: 600, color: '#4A5E52' },
  modalInput: { padding: '10px 12px', border: '1.5px solid #E2E8E5', borderRadius: 8, fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: 'none', color: '#0A0F0D', background: '#F7FAF8', width: '100%' },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
  modalCancel: { padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#6B7F73', background: '#F7FAF8', border: '1px solid #E2E8E5', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  modalSubmit: { padding: '10px 24px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
};
