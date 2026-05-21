import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Lead {
  // common
  intent_score: number;
  lead_source: 'reddit' | 'apollo_search' | 'producthunt';
  email?: string;
  collected_at: string;
  // reddit
  username?: string;
  reddit_url?: string;
  subreddits?: string[];
  signals?: string[];
  sample_text?: string;
  // apollo_search
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  industry?: string;
  country?: string;
  linkedin_url?: string;
  profile_label?: string;
  // producthunt
  headline?: string;
  twitter_username?: string;
  website_url?: string;
  profile_url?: string;
  follower_count?: number;
  source?: string;
  product_name?: string;
}

interface Stats {
  total: number;
  reddit: number;
  apollo_search: number;
  producthunt: number;
  kickstarter: number;
  with_email: number;
  high_intent: number;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  stats: Stats;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SOURCE_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  reddit:        { label: 'Reddit',         color: '#c05c1a', bg: 'rgba(255,108,0,0.12)',  icon: '🔴' },
  apollo_search: { label: 'Apollo Search',  color: '#1d6fa4', bg: 'rgba(29,111,164,0.12)', icon: '🔵' },
  producthunt:   { label: 'Product Hunt',   color: '#b34700', bg: 'rgba(218,89,0,0.12)',   icon: '🟠' },
  kickstarter:   { label: 'Kickstarter',    color: '#1a7a2e', bg: 'rgba(5,150,60,0.12)',   icon: '🟢' },
};

const SCORE_COLOR = (s: number) =>
  s >= 80 ? '#059669' : s >= 60 ? '#0284c7' : s >= 40 ? '#d97706' : '#6b7280';

function ScoreBadge({ score }: { score: number }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      background: SCORE_COLOR(score) + '22', color: SCORE_COLOR(score),
      fontWeight: 700, fontSize: 12, minWidth: 34, textAlign: 'center',
    }}>{score}</span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CFG[source] ?? { label: source, color: '#6b7280', bg: '#f3f4f6', icon: '⚪' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, background: cfg.bg,
      color: cfg.color, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      border: '1px solid #e5e7eb', flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color ?? '#111827' }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadDashboardPage() {
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');

  const [filterSource,   setFilterSource]   = useState('');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [filterKeyword,  setFilterKeyword]  = useState('');
  const [expandedIdx,    setExpandedIdx]    = useState<number | null>(null);
  const [collecting,     setCollecting]     = useState<Record<string, boolean>>({});

  const PAGE_SIZE = 50;

  const fetchLeads = useCallback(async (p = 1) => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { page: String(p), pageSize: String(PAGE_SIZE) };
      if (filterSource)   params['source']   = filterSource;
      if (filterMinScore) params['minScore']  = filterMinScore;

      const r = await client.get<LeadsResponse>('/leads', { params });
      setLeads(r.data.leads);
      setTotal(r.data.total);
      setStats(r.data.stats);
      setPage(p);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to load leads';
      setError(msg);
    } finally { setLoading(false); }
  }, [filterSource, filterMinScore]);

  useEffect(() => { fetchLeads(1); }, [fetchLeads]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const startCollect = async (sourceKey: string) => {
    setCollecting(c => ({ ...c, [sourceKey]: true }));
    try {
      const r = await client.post<{ message: string }>(`/leads/collect/${sourceKey}`, {});
      showToast(r.data.message);
      setTimeout(() => fetchLeads(1), 3000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to start';
      showToast(`❌ ${msg}`);
    } finally { setCollecting(c => ({ ...c, [sourceKey]: false })); }
  };

  // Client-side keyword filter
  const displayLeads = filterKeyword
    ? leads.filter(l => {
        const kw = filterKeyword.toLowerCase();
        return (
          (l.username ?? '').toLowerCase().includes(kw) ||
          (l.name     ?? '').toLowerCase().includes(kw) ||
          (l.title    ?? '').toLowerCase().includes(kw) ||
          (l.company  ?? '').toLowerCase().includes(kw) ||
          (l.headline ?? '').toLowerCase().includes(kw) ||
          (l.product_name ?? '').toLowerCase().includes(kw) ||
          (l.email    ?? '').toLowerCase().includes(kw)
        );
      })
    : leads;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>
            🎯 Unified Lead Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Aggregated leads from Reddit, Apollo Search & Product Hunt
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['reddit', 'apollo', 'producthunt'] as const).map(src => (
            <button
              key={src}
              disabled={collecting[src]}
              onClick={() => startCollect(src)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: collecting[src] ? '#e5e7eb' : '#f0f9ff',
                color: collecting[src] ? '#9ca3af' : '#0369a1',
                cursor: collecting[src] ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600,
              }}
            >
              {collecting[src] ? '⏳' : '▶'}{' '}
              {src === 'reddit' ? 'Reddit' : src === 'apollo' ? 'Apollo' : 'PH'}
            </button>
          ))}
          <button
            onClick={() => fetchLeads(page)}
            disabled={loading}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: '#111827', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {loading ? '⏳' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: '#111827', color: '#fff', padding: '12px 20px',
          borderRadius: 10, fontSize: 13, maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total Leads"      value={stats.total}        color="#111827" />
          <StatCard label="Kickstarter"      value={stats.kickstarter ?? 0} color={SOURCE_CFG.kickstarter.color}    sub="crowdfunding backers" />
          <StatCard label="Reddit"           value={stats.reddit}       color={SOURCE_CFG.reddit.color}        sub="community discussions" />
          <StatCard label="Apollo Search"    value={stats.apollo_search} color={SOURCE_CFG.apollo_search.color} sub="professional profiles" />
          <StatCard label="Product Hunt"     value={stats.producthunt}  color={SOURCE_CFG.producthunt.color}   sub="early adopters" />
          <StatCard label="With Email"       value={stats.with_email}   color="#059669" sub="contactable" />
          <StatCard label="High Intent ≥70"  value={stats.high_intent}  color="#7c3aed" sub="top prospects" />
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center',
        background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e5e7eb',
      }}>
        <select
          value={filterSource}
          onChange={e => { setFilterSource(e.target.value); fetchLeads(1); }}
          style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13 }}
        >
          <option value="">All Sources</option>
          <option value="reddit">Reddit</option>
          <option value="kickstarter">Kickstarter</option>
          <option value="apollo_search">Apollo Search</option>
          <option value="producthunt">Product Hunt</option>
        </select>

        <select
          value={filterMinScore}
          onChange={e => { setFilterMinScore(e.target.value); fetchLeads(1); }}
          style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13 }}
        >
          <option value="">All Scores</option>
          <option value="70">High Intent (≥70)</option>
          <option value="50">Medium+ (≥50)</option>
          <option value="30">Low+ (≥30)</option>
        </select>

        <input
          type="text"
          placeholder="Search name, email, company..."
          value={filterKeyword}
          onChange={e => setFilterKeyword(e.target.value)}
          style={{
            padding: '7px 12px', borderRadius: 7, border: '1px solid #d1d5db',
            fontSize: 13, minWidth: 240, flex: 1,
          }}
        />

        <div style={{ color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>
          {total.toLocaleString()} leads
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
        }}>
          ❌ {error}
        </div>
      )}

      {/* No data */}
      {!loading && displayLeads.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          color: '#6b7280',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No leads yet</div>
          <div style={{ fontSize: 13 }}>
            Click ▶ Reddit, ▶ Apollo, or ▶ PH above to start collecting leads.
          </div>
        </div>
      )}

      {/* Lead list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayLeads.map((lead, idx) => {
          const isExpanded = expandedIdx === idx;
          const displayName = lead.name ?? (lead.username ? `@${lead.username}` : '(unknown)');
          const subInfo = lead.lead_source === 'reddit'
            ? `r/${lead.subreddits?.[0] ?? '?'}`
            : lead.lead_source === 'apollo_search'
            ? `${lead.title ?? ''} ${lead.company ? '@ ' + lead.company : ''}`.trim()
            : lead.lead_source === 'producthunt'
            ? `${lead.headline ?? lead.source ?? ''}`
            : '';

          return (
            <div
              key={idx}
              style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                overflow: 'hidden', transition: 'box-shadow 0.15s',
              }}
            >
              {/* Row */}
              <div
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr auto auto auto auto',
                  alignItems: 'center', gap: 12,
                  padding: '12px 16px', cursor: 'pointer',
                  background: isExpanded ? '#f9fafb' : 'transparent',
                }}
              >
                {/* Expand toggle */}
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>

                {/* Name & sub-info */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {subInfo}
                  </div>
                </div>

                {/* Source badge */}
                <SourceBadge source={lead.lead_source} />

                {/* Email */}
                <div style={{ fontSize: 12, color: lead.email ? '#059669' : '#d1d5db', whiteSpace: 'nowrap' }}>
                  {lead.email ? `✉ ${lead.email}` : '—'}
                </div>

                {/* Country */}
                <div style={{ fontSize: 12, color: '#6b7280', minWidth: 30 }}>
                  {lead.country ?? ''}
                </div>

                {/* Score */}
                <ScoreBadge score={lead.intent_score} />
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{
                  padding: '0 16px 16px', borderTop: '1px solid #f3f4f6',
                  background: '#f9fafb', fontSize: 13,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, paddingTop: 14 }}>
                    {lead.reddit_url && (
                      <div><span style={{ color: '#9ca3af' }}>Reddit: </span>
                        <a href={lead.reddit_url} target="_blank" rel="noreferrer" style={{ color: '#0369a1' }}>
                          u/{lead.username}
                        </a>
                      </div>
                    )}
                    {lead.linkedin_url && (
                      <div><span style={{ color: '#9ca3af' }}>LinkedIn: </span>
                        <a href={lead.linkedin_url} target="_blank" rel="noreferrer" style={{ color: '#0369a1' }}>View Profile</a>
                      </div>
                    )}
                    {lead.profile_url && lead.lead_source === 'producthunt' && (
                      <div><span style={{ color: '#9ca3af' }}>PH Profile: </span>
                        <a href={lead.profile_url} target="_blank" rel="noreferrer" style={{ color: '#0369a1' }}>@{lead.username}</a>
                      </div>
                    )}
                    {lead.twitter_username && (
                      <div><span style={{ color: '#9ca3af' }}>Twitter: </span>@{lead.twitter_username}</div>
                    )}
                    {lead.website_url && (
                      <div><span style={{ color: '#9ca3af' }}>Website: </span>
                        <a href={lead.website_url} target="_blank" rel="noreferrer" style={{ color: '#0369a1' }}>
                          {lead.website_url.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {lead.industry && (
                      <div><span style={{ color: '#9ca3af' }}>Industry: </span>{lead.industry}</div>
                    )}
                    {lead.follower_count != null && (
                      <div><span style={{ color: '#9ca3af' }}>PH Followers: </span>{lead.follower_count.toLocaleString()}</div>
                    )}
                    {lead.product_name && (
                      <div><span style={{ color: '#9ca3af' }}>PH Product: </span>{lead.product_name}</div>
                    )}
                    {lead.profile_label && (
                      <div><span style={{ color: '#9ca3af' }}>Audience: </span>{lead.profile_label}</div>
                    )}
                    {lead.subreddits && lead.subreddits.length > 0 && (
                      <div><span style={{ color: '#9ca3af' }}>Subreddits: </span>{lead.subreddits.join(', ')}</div>
                    )}
                    <div><span style={{ color: '#9ca3af' }}>Collected: </span>
                      {new Date(lead.collected_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Signals */}
                  {lead.signals && lead.signals.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#9ca3af', marginBottom: 4 }}>Signals:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {lead.signals.map((sig, i) => (
                          <span key={i} style={{
                            background: '#eff6ff', color: '#1d4ed8',
                            padding: '2px 8px', borderRadius: 99, fontSize: 11,
                          }}>{sig}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample text */}
                  {lead.sample_text && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#9ca3af', marginBottom: 4 }}>Sample text:</div>
                      <div style={{
                        background: '#fff', border: '1px solid #e5e7eb',
                        borderRadius: 6, padding: '8px 12px',
                        fontSize: 12, color: '#374151', fontStyle: 'italic',
                        maxHeight: 80, overflow: 'auto',
                      }}>
                        {lead.sample_text}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button
            disabled={page <= 1 || loading}
            onClick={() => fetchLeads(page - 1)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: page <= 1 ? '#f9fafb' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer',
              color: page <= 1 ? '#d1d5db' : '#374151', fontWeight: 600, fontSize: 13,
            }}
          >← Prev</button>

          <span style={{ padding: '8px 16px', fontSize: 13, color: '#6b7280' }}>
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page >= totalPages || loading}
            onClick={() => fetchLeads(page + 1)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: page >= totalPages ? '#f9fafb' : '#fff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              color: page >= totalPages ? '#d1d5db' : '#374151', fontWeight: 600, fontSize: 13,
            }}
          >Next →</button>
        </div>
      )}
    </div>
  );
}
