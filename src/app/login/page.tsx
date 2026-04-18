'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    restaurantSlug: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister
      ? formData
      : { email: formData.email, password: formData.password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      router.push(`/dashboard/${data.slug}`);
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>
          Local<span style={s.logoAccent}>Mint</span>
        </div>
        <h1 style={s.title}>{isRegister ? 'Create Account' : 'Restaurant Dashboard'}</h1>
        <p style={s.subtitle}>
          {isRegister ? 'Set up your dashboard access' : 'Sign in to manage your VIP program'}
        </p>

        <form onSubmit={handleSubmit} style={s.form}>
          {isRegister && (
            <>
              <div style={s.field}>
                <label style={s.label}>Your Name</label>
                <input
                  type="text"
                  style={s.input}
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Restaurant Slug</label>
                <div style={s.slugRow}>
                  <span style={s.slugPrefix}>app.localmint.co/dashboard/</span>
                  <input
                    type="text"
                    style={s.slugInput}
                    placeholder="marios"
                    value={formData.restaurantSlug}
                    onChange={(e) => setFormData({ ...formData, restaurantSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    required
                  />
                </div>
              </div>
            </>
          )}
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              style={s.input}
              placeholder="you@restaurant.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              style={s.input}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" style={s.submitBtn} disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={s.switchRow}>
          {isRegister ? (
            <span>Already have an account? <button style={s.switchBtn} onClick={() => { setIsRegister(false); setError(''); }}>Sign in</button></span>
          ) : (
            <span>Need an account? <button style={s.switchBtn} onClick={() => { setIsRegister(true); setError(''); }}>Create one</button></span>
          )}
        </div>
      </div>
      <div style={s.footer}>
        Powered by <span style={{ color: '#34D399', fontWeight: 700 }}>LocalMint</span>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
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
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '36px 28px',
    maxWidth: 400,
    width: '100%',
    color: '#0A0F0D',
  },
  logo: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0A0F0D',
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  logoAccent: {
    color: '#1B6B4A',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    textAlign: 'center' as const,
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7F73',
    textAlign: 'center' as const,
    margin: '0 0 28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
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
    fontSize: 15,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    color: '#0A0F0D',
    background: '#F7FAF8',
    width: '100%',
  },
  slugRow: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #E2E8E5',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#F7FAF8',
  },
  slugPrefix: {
    fontSize: 11,
    color: '#9CA3AF',
    padding: '12px 8px 12px 12px',
    whiteSpace: 'nowrap' as const,
    background: '#EDF3EF',
  },
  slugInput: {
    flex: 1,
    padding: '12px 12px 12px 4px',
    border: 'none',
    fontSize: 15,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 600,
    outline: 'none',
    color: '#1B6B4A',
    background: 'transparent',
  },
  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #1B6B4A 0%, #15573C 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    marginTop: 4,
  },
  switchRow: {
    textAlign: 'center' as const,
    marginTop: 20,
    fontSize: 13,
    color: '#6B7F73',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#1B6B4A',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    fontSize: 13,
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: '#6B7F73',
  },
};
