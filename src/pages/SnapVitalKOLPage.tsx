import React, { useState, useMemo, useEffect } from 'react';
import client from '../api/client';

interface KOLChannel {
  channelId: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  avgViewsPerVideo: number;
  uploadFrequencyPerMonth: number;
  engagementRate: number;
  thumbnailUrl: string;
  channelUrl: string;
  businessEmail: string | null;
  country: string;
  category: string;
  matchedKeyword: string;
  status: 'new' | 'contacted' | 'replied' | 'partnered' | 'rejected';
  notes: string;
}

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  new:       { bg: 'rgba(219,234,254,0.8)', color: '#1d4ed8', label: 'New'       },
  contacted: { bg: 'rgba(254,243,199,0.8)', color: '#92400e', label: 'Contacted' },
  replied:   { bg: 'rgba(209,250,229,0.8)', color: '#065f46', label: 'Replied'   },
  partnered: { bg: 'rgba(243,232,255,0.8)', color: '#6d28d9', label: 'Partnered' },
  rejected:  { bg: 'rgba(254,226,226,0.8)', color: '#b91c1c', label: 'Rejected'  },
};

function fmt(n: number | undefined | null) {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return String(v);
}

const CATEGORIES = ['All', 'Blood Pressure', 'Senior Health', 'Medical', 'Health Tech', 'Fitness', 'Nutrition', 'Health & Wellness'];

export default function SnapVitalKOLPage() {
  const [apiKey]          = useState(() => localStorage.getItem('yt_api_key') || '');
  const [channels, setChannels] = useState<KOLChannel[]>([]);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError]       = useState('');
  const [crawlStatus, setCrawlStatus] = useState<{ total: number; withEmail: number; lastCrawledAt: string | null; nextCrawlIn: number } | null>(null);
  const [page, setPage]         = useState(1);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});

  // Filters
  const [hasEmail, setHasEmail]     = useState<'all' | 'yes' | 'no'>('all');
  const [category, setCategory]     = useState('All');
  const [minSubs, setMinSubs]       = useState('');
  const [maxSubs, setMaxSubs]       = useState('');
  const [minViews, setMinViews]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword]       = useState('');

  const PAGE_SIZE = 25;

  // Load stored data on mount
  useEffect(() => {
    loadStoredData();
    fetchCrawlStatus();
  }, []);

  async function loadStoredData() {
    try {
      const res = await client.get('/kol/snapvital/data');
      if (res.data.channels?.length > 0) {
        setChannels(res.data.channels);
        setPage(1);
      }
    } catch { /* no stored data yet */ }
  }

  async function fetchCrawlStatus() {
    try {
      const res = await client.get('/kol/snapvital/status');
      setCrawlStatus(res.data);
    } catch { /* ignore */ }
  }

  async function handleSearch() {
    if (!apiKey) {
      setError('请先在 YouTube KOL 页面配置 API Key');
      return;
    }
    setLoading(true); setError(''); setChannels([]);
    setProgress('正在搜索血压仪相关频道，预计需要 1-2 分钟…');
    try {
      const res = await client.post('/kol/snapvital/search', { apiKey });
      setChannels(res.data.channels ?? []);
      setProgress(`✅ 完成！共 ${res.data.total} 个频道，有邮箱 ${res.data.withEmail} 个，本次新增 ${res.data.newThisCrawl} 个`);
      setPage(1);
      fetchCrawlStatus();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? '搜索失败，请检查 API Key');
      setProgress('');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return channels.filter(ch => {
      if (hasEmail === 'yes' && !ch.businessEmail) return false;
      if (hasEmail === 'no' && ch.businessEmail) return false;
      if (category !== 'All' && ch.category !== category) return false;
      if (minSubs && ch.subscriberCount < parseInt(minSubs) * 1000) return false;
      if (maxSubs && ch.subscriberCount > parseInt(maxSubs) * 1000) return false;
      if (minViews && ch.avgViewsPerVideo < parseInt(minViews) * 1000) return false;
      if (statusFilter !== 'all' && ch.status !== statusFilter) return false;
      if (keyword && !ch.title.toLowerCase().includes(keyword.toLowerCase()) && !ch.description.toLowerCase().includes(keyword.toLowerCase())) return false;
      return true;
    });
  }, [channels, hasEmail, category, minSubs, maxSubs, minViews, statusFilter, keyword]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function updateStatus(channelId: string, status: KOLChannel['status']) {
    setChannels(prev => prev.map(c => c.channelId === channelId ? { ...c, status } : c));
  }

  function saveNotes(channelId: string) {
    setChannels(prev => prev.map(c => c.channelId === channelId ? { ...c, notes: editNotes[channelId] ?? c.notes } : c));
  }

  function exportCsv() {
    const header = 'Channel,Subscribers,AvgViews,EngagementRate,Email,Category,MatchedKeyword,Status,URL';
    const rows = filtered.map(c => [
      c.title, fmt(c.subscriberCount), fmt(c.avgViewsPerVideo),
      (c.engagementRate ?? 0).toFixed(2) + '%',
      c.businessEmail ?? '', c.category, c.matchedKeyword, c.status, c.channelUrl,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'snapvital_kol_list.csv';
    a.click();
  }

  const withEmail = filtered.filter(c => c.businessEmail).length;
  const catCounts = CATEGORIES.slice(1).map(cat => ({
    cat, count: channels.filter(c => c.category === cat).length,
  })).filter(x => x.count > 0);

  return (
    <div className="fade-in" style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>💊</div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
              SnapVital — 血压仪红人库
            </h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              专为 SnapVital 血压仪产品定制 · 美国 YouTube 健康类红人 · 目标 200+ 个
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Filter Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 20 }}>

          {/* Search button */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🔍 抓取红人
            </div>
            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
              使用 20 个血压仪相关关键词批量搜索，筛选美国频道，预计获取 200+ 个红人。
            </p>
            <button
              className="btn btn-sm"
              style={{ width: '100%', background: 'linear-gradient(135deg,#ef4444,#f97316)' }}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? '搜索中…' : channels.length > 0 ? '重新抓取' : '开始抓取'}
            </button>
            {progress && <p style={{ fontSize: 11, color: '#f97316', marginTop: 8 }}>{progress}</p>}
            {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
            {crawlStatus && crawlStatus.lastCrawledAt && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(239,68,68,0.05)', borderRadius: 8, fontSize: 11, color: '#64748b' }}>
                <div>🕐 上次抓取: {new Date(crawlStatus.lastCrawledAt).toLocaleString('zh-CN')}</div>
                <div style={{ marginTop: 2 }}>📅 下次自动抓取: {crawlStatus.nextCrawlIn > 0 ? `${Math.round(crawlStatus.nextCrawlIn / 1000 / 60 / 60)} 小时后` : '需配置 SNAPVITAL_YT_API_KEY'}</div>
              </div>
            )}
          </div>

          {/* Stats */}
          {channels.length > 0 && (
            <div className="card card-flat" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>抓取结果</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#ef4444' }}>{channels.length}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>个频道</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                ✉ 有邮箱: <strong style={{ color: '#ef4444' }}>{channels.filter(c => c.businessEmail).length}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                筛选后: <strong style={{ color: '#7c3aed' }}>{filtered.length}</strong>
              </div>
            </div>
          )}

          {/* Filters */}
          {channels.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>⚡ 筛选</div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>邮箱</label>
                <select value={hasEmail} onChange={e => setHasEmail(e.target.value as 'all' | 'yes' | 'no')} style={{ width: '100%', fontSize: 12 }}>
                  <option value="all">全部</option>
                  <option value="yes">✉ 有邮箱</option>
                  <option value="no">无邮箱</option>
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>类目</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', fontSize: 12 }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? '全部' : c}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>粉丝量 (K)</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input value={minSubs} onChange={e => setMinSubs(e.target.value)} placeholder="最小" style={{ width: '50%', fontSize: 11 }} />
                  <input value={maxSubs} onChange={e => setMaxSubs(e.target.value)} placeholder="最大" style={{ width: '50%', fontSize: 11 }} />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>平均播放 (K)</label>
                <input value={minViews} onChange={e => setMinViews(e.target.value)} placeholder="最小" style={{ width: '100%', fontSize: 12 }} />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>合作状态</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '100%', fontSize: 12 }}>
                  <option value="all">全部</option>
                  {Object.entries(STATUS_CFG).map(([s, c]) => <option key={s} value={s}>{c.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>关键词过滤</label>
                <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="频道名/描述" style={{ width: '100%', fontSize: 12 }} />
              </div>

              <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}
                onClick={() => { setHasEmail('all'); setCategory('All'); setMinSubs(''); setMaxSubs(''); setMinViews(''); setStatusFilter('all'); setKeyword(''); }}>
                重置
              </button>
            </div>
          )}
        </div>

        {/* ── Main Content ── */}
        <div>
          {/* Empty state */}
          {!loading && channels.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#1e1b4b' }}>SnapVital 血压仪红人库</div>
              <div style={{ fontSize: 13, marginBottom: 24 }}>
                点击左侧「开始抓取」，系统将自动搜索推广过血压仪的美国 YouTube 红人
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, maxWidth: 500, margin: '0 auto' }}>
                {['blood pressure monitor', 'health gadget review', 'senior health', 'medical device'].map(kw => (
                  <div key={kw} style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 8, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                    {kw}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 16, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>⏳ {progress}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>正在搜索 50 个关键词，每个关键词最多 50 个频道，目标有邮箱 200+ 个…</div>
              </div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="card" style={{ height: 80, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
                  <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 13, width: '35%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 10, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results header */}
          {!loading && channels.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  显示 <strong>{filtered.length}</strong> / {channels.length} 个频道，
                  有邮箱 <strong style={{ color: '#ef4444' }}>{withEmail}</strong> 个
                </div>
                <button className="btn btn-secondary btn-sm" onClick={exportCsv}>⬇ 导出 CSV</button>
              </div>

              {/* Category breakdown */}
              {catCounts.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {catCounts.map(({ cat, count }) => (
                    <button key={cat} onClick={() => setCategory(category === cat ? 'All' : cat)}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: 'none', transition: 'all 0.15s',
                        background: category === cat ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(239,68,68,0.08)',
                        color: category === cat ? '#fff' : '#ef4444',
                      }}>
                      {cat} ({count})
                    </button>
                  ))}
                </div>
              )}

              {/* Status summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
                {Object.entries(STATUS_CFG).map(([s, c]) => (
                  <div key={s} className="card card-flat" style={{ textAlign: 'center', padding: '10px 6px' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{channels.filter(x => x.status === s).length}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Channel list */}
              {paginated.map(ch => (
                <ChannelRow
                  key={ch.channelId}
                  channel={ch}
                  notes={editNotes[ch.channelId] ?? ch.notes}
                  onNotesChange={v => setEditNotes(p => ({ ...p, [ch.channelId]: v }))}
                  onSaveNotes={() => saveNotes(ch.channelId)}
                  onStatusChange={s => updateStatus(ch.channelId, s)}
                />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, alignItems: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ 上一页</button>
                  <span style={{ fontSize: 13, color: '#64748b' }}>第 {page} / {totalPages} 页</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>下一页 ›</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelRow({ channel: ch, notes, onNotesChange, onSaveNotes, onStatusChange }: {
  channel: KOLChannel;
  notes: string;
  onNotesChange: (v: string) => void;
  onSaveNotes: () => void;
  onStatusChange: (s: KOLChannel['status']) => void;
}) {
  const cfg = STATUS_CFG[ch.status];
  return (
    <div className="card card-hover" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 10 }}>
      <img
        src={ch.thumbnailUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(ch.title)}&size=52&background=ef4444&color=fff`}
        alt={ch.title}
        style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <a href={ch.channelUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{ch.title}</a>
          <span className="badge badge-gray" style={{ fontSize: 10 }}>🇺🇸 {ch.country}</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600 }}>{ch.category}</span>
          {ch.businessEmail
            ? <span className="badge badge-green" style={{ fontSize: 10 }}>✉ 有邮箱</span>
            : <span className="badge badge-gray" style={{ fontSize: 10 }}>无邮箱</span>}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#64748b', flexWrap: 'wrap', marginBottom: 6 }}>
          <span>👥 {fmt(ch.subscriberCount)}</span>
          <span>▶ 均 {fmt(ch.avgViewsPerVideo)} 播放</span>
          <span>💬 {(ch.engagementRate ?? 0).toFixed(1)}% 互动</span>
          <span>📅 {(ch.uploadFrequencyPerMonth ?? 0).toFixed(1)} 次/月</span>
          <span style={{ color: '#94a3b8' }}>关键词: {ch.matchedKeyword}</span>
        </div>
        {ch.businessEmail && (
          <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, marginBottom: 6 }}>✉ {ch.businessEmail}</div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={ch.status} onChange={e => onStatusChange(e.target.value as KOLChannel['status'])}
            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, background: cfg.bg, color: cfg.color, border: 'none', fontWeight: 600 }}>
            {Object.entries(STATUS_CFG).map(([s, c]) => <option key={s} value={s}>{c.label}</option>)}
          </select>
          <input value={notes} onChange={e => onNotesChange(e.target.value)} placeholder="备注（报价、合作进度等）"
            style={{ flex: 1, minWidth: 160, fontSize: 11, padding: '5px 8px' }} />
          <button className="btn btn-secondary btn-sm" onClick={onSaveNotes}>保存</button>
        </div>
      </div>
    </div>
  );
}
