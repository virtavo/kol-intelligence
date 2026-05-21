import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@kip.dev');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { email, password });
      const { accessToken, user } = res.data;
      login(accessToken, user);
      navigate('/projects');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'stretch',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        padding: '60px 80px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: '-120px', left: '-80px',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', right: '-60px',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo mark */}
        <div style={{ marginBottom: 48, position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 16, marginBottom: 20,
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
          }}>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>K</span>
          </div>

          <div style={{
            fontSize: 42, fontWeight: 900, letterSpacing: '-0.04em',
            lineHeight: 1.0, marginBottom: 12,
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>KICKSTARTER</span>
            <br />
            <span style={{ color: '#1e1b4b' }}>INTELLIGENCE</span>
          </div>

          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, maxWidth: 360 }}>
            Uncover market trends, track high-value backers, and launch precision email campaigns — all in one platform.
          </p>
        </div>

        {/* Feature pills */}
        {[
          { icon: '⬡', text: '32 live projects tracked' },
          { icon: '◎', text: '40 backer profiles analyzed' },
          { icon: '◻', text: 'Mailchimp campaign integration' },
        ].map(f => (
          <div key={f.text} style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7c3aed', fontSize: 14,
            }}>{f.icon}</div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{f.text}</span>
          </div>
        ))}
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '-8px 0 48px rgba(124,58,237,0.06)',
      }}>
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6, color: '#1e1b4b' }}>
            Sign in
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 32 }}>
            Welcome back. Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required style={{ width: '100%' }}
                placeholder="you@example.com"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                required style={{ width: '100%' }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(254,226,226,0.7)', color: '#b91c1c',
                fontSize: 13, border: '1px solid rgba(239,68,68,0.2)',
              }}>{error}</div>
            )}

            <button type="submit" className="btn btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            Dev mode: any credentials work
          </p>
        </div>
      </div>
    </div>
  );
}
