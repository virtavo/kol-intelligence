import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/client';

interface KOLChannel {
  channelId: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  avgViewsPerVideo: number;
  uploadFrequencyPerMonth: number;
  engagementRate: number;
  thumbnailUrl: string;
  channelUrl: string;
  businessEmail: string | null;
  country: string;
  customUrl: string;
  category: string;
  status: 'new' | 'contacted' | 'replied' | 'partnered' | 'rejected';
  notes: string;
}

interface Filters {
  hasEmail: 'all' | 'yes' | 'no';
  country: string;
  category: string;
  minSubs: string;
  maxSubs: string;
  minAvgViews: string;
  minEngagement: string;
  minFrequency: string;
  keyword: string;
}

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  new:       { bg: 'rgba(219,234,254,0.8)', color: '#1d4ed8', label: 'New'       },
  contacted: { bg: 'rgba(254,243,199,0.8)', color: '#92400e', label: 'Contacted' },
  replied:   { bg: 'rgba(209,250,229,0.8)', color: '#065f46', label: 'Replied'   },
  partnered: { bg: 'rgba(243,232,255,0.8)', color: '#6d28d9', label: 'Partnered' },
  rejected:  { bg: 'rgba(254,226,226,0.8)', color: '#b91c1c', label: 'Rejected'  },
};

const COUNTRIES = ['All','US','GB','CA','AU','DE','FR','JP','KR','IN','BR','MX','SG','NL','SE','NO','DK','ES','IT','PL'];
const CATEGORIES = ['All','Technology','Gaming','Home & Garden','DIY & Crafts','Security & Safety','Smart Home','Gadgets','Reviews','Lifestyle','Education'];

function fmt(n: number | undefined | null) {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v/1_000_000).toFixed(1)+'M';
  if (v >= 1_000) return (v/1_000).toFixed(1)+'K';
  return String(v);
}

const DEFAULT_FILTERS: Filters = {
  hasEmail: 'all', country: 'All', category: 'All',
  minSubs: '', maxSubs: '', minAvgViews: '', minEngagement: '', minFrequency: '', keyword: '',
};

export default function YouTubeKOLPage() {
  const [apiKey, setApiKey]         = useState(() => localStorage.getItem('yt_api_key') || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiSetup, setShowApiSetup] = useState(!localStorage.getItem('yt_api_key'));
  const [allChannels, setAllChannels] = useState<KOLChannel[]>([]);
  const [saved, setSaved]           = useState<KOLChannel[]>([]);
  const [loading, setLoading]       = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError]           = useState('');
  const [importMsg, setImportMsg]   = useState('');
  const [filters, setFilters]       = useState<Filters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab]   = useState<'list' | 'saved' | 'import'>('list');
  const [searchKw, setSearchKw]     = useState('');
  const [page, setPage]             = useState(1);
  const [editNotes, setEditNotes]   = useState<Record<string, string>>({});
  const PAGE_SIZE = 20;

  // Default keyword presets covering broad creator categories
  const PRESET_KEYWORDS = [
    'security camera review', 'smart home gadgets', 'home security system',
    'window camera', 'surveillance camera', 'tech gadget review',
    'smart home devices', 'home automation', 'kickstarter product review',
    'crowdfunding gadgets',
  ];

  // Auto-load on mount if API key exists — but don't crash if it fails
  useEffect(() => {
    if (apiKey) {
      loadAllPresets(apiKey).catch(() => {});
    }
  }, []); // eslint-disable-line

  // Load all preset keywords in sequence, merge & deduplicate
  async function loadAllPresets(key: string): Promise<void> {
    setLoading(true); setError(''); setAllChannels([]);
    const seen = new Set<string>();
    const merged: KOLChannel[] = [];
    for (let i = 0; i < PRESET_KEYWORDS.length; i++) {
      const kw = PRESET_KEYWORDS[i];
      setLoadingProgress(`正在加载 (${i + 1}/${PRESET_KEYWORDS.length}): ${kw}…`);
      try {
        const res = await client.post('/kol/youtube/search', { keyword: kw, apiKey: key });
        const channels: KOLChannel[] = res.data.channels ?? [];
        for (const ch of channels) {
          if (!seen.has(ch.channelId)) {
            seen.add(ch.channelId);
            merged.push(ch);
          }
        }
        setAllChannels([...merged]);
      } catch {
        // skip failed keyword, continue
      }
    }
    setLoadingProgress('');
    setLoading(false);
    setPage(1);
  }

  async function loadChannels(key: string, kw: string): Promise<void> {
    if (!kw.trim()) { await loadAllPresets(key); return; }
    setLoading(true); setError(''); setLoadingProgress(`搜索: ${kw}…`);
    try {
      const res = await client.post('/kol/youtube/search', { keyword: kw, apiKey: key });
      setAllChannels(res.data.channels ?? []);
      setPage(1);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? '搜索失败，请检查 API Key 是否已启用 YouTube Data API v3');
      setAllChannels([]);
    } finally { setLoading(false); setLoadingProgress(''); }
  }

  function saveApiKey() {
    if (!apiKeyInput.trim()) return;
    const key = apiKeyInput.trim();
    localStorage.setItem('yt_api_key', key);
    setApiKey(key);
    setShowApiSetup(false);
    setTimeout(() => loadAllPresets(key), 100);
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allChannels.filter(ch => {
      if (filters.hasEmail === 'yes' && !ch.businessEmail) return false;
      if (filters.hasEmail === 'no'  &&  ch.businessEmail) return false;
      if (filters.country !== 'All' && ch.country !== filters.country) return false;
      if (filters.category !== 'All' && ch.category !== filters.category) return false;
      if (filters.minSubs && ch.subscriberCount < parseInt(filters.minSubs.replace(/,/g,''))*1000) return false;
      if (filters.maxSubs && ch.subscriberCount > parseInt(filters.maxSubs.replace(/,/g,''))*1000) return false;
      if (filters.minAvgViews && ch.avgViewsPerVideo < parseInt(filters.minAvgViews.replace(/,/g,''))*1000) return false;
      if (filters.minEngagement && ch.engagementRate < parseFloat(filters.minEngagement)) return false;
      if (filters.minFrequency && ch.uploadFrequencyPerMonth < parseFloat(filters.minFrequency)) return false;
      if (filters.keyword) {
        const kws = filters.keyword.toLowerCase().split(/\s+/).filter(Boolean);
        const searchText = [ch.title, ch.description, ch.businessEmail ?? '', ch.category, ch.country].join(' ').toLowerCase();
        // Any keyword matches = include (OR logic, more inclusive)
        const anyMatch = kws.some(kw => searchText.includes(kw));
        if (!anyMatch) return false;
      }
      return true;
    });
  }, [allChannels, filters]);

  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function setF(k: keyof Filters, v: string) { setFilters(f => ({...f, [k]: v})); setPage(1); }

  // ── CSV Import ────────────────────────────────────────────────────────────
  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { setImportMsg('❌ 文件为空或格式不正确'); return; }

      const header = lines[0].split(',').map(h => h.replace(/"/g,'').trim().toLowerCase());
      const colIdx = (names: string[]) => names.map(n => header.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;

      const iTitle    = colIdx(['channel name','channel','title','name','频道名']);
      const iSubs     = colIdx(['subscriber','subs','followers','粉丝']);
      const iEmail    = colIdx(['email','邮箱','contact']);
      const iCountry  = colIdx(['country','region','国家']);
      const iUrl      = colIdx(['url','link','channel url','频道链接']);
      const iViews    = colIdx(['avg view','average view','播放']);
      const iEngage   = colIdx(['engagement','互动']);
      const iCategory = colIdx(['category','niche','类目']);

      const imported: KOLChannel[] = [];
      const seen = new Set(allChannels.map(c => c.channelId));

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line handling quoted fields
        const cols: string[] = [];
        let cur = '', inQ = false;
        for (let ci = 0; ci < lines[i].length; ci++) {
          const ch2 = lines[i][ci];
          if (ch2 === '"') { inQ = !inQ; }
          else if (ch2 === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
          else { cur += ch2; }
        }
        cols.push(cur.trim());
        const get = (idx: number) => idx >= 0 ? (cols[idx] ?? '') : '';

        const title = get(iTitle);
        if (!title) continue;

        const channelId = `import-${Date.now()}-${i}`;
        if (seen.has(channelId)) continue;
        seen.add(channelId);

        const subsRaw = get(iSubs).replace(/[^0-9.KMkm]/g,'');
        let subs = 0;
        if (subsRaw.toLowerCase().endsWith('m')) subs = parseFloat(subsRaw) * 1_000_000;
        else if (subsRaw.toLowerCase().endsWith('k')) subs = parseFloat(subsRaw) * 1_000;
        else subs = parseInt(subsRaw) || 0;

        const url = get(iUrl) || `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;

        imported.push({
          channelId,
          title,
          description: '',
          subscriberCount: subs,
          videoCount: 0,
          viewCount: 0,
          avgViewsPerVideo: parseInt(get(iViews).replace(/[^0-9]/g,'')) || 0,
          uploadFrequencyPerMonth: 0,
          engagementRate: parseFloat(get(iEngage).replace(/[^0-9.]/g,'')) || 0,
          thumbnailUrl: '',
          channelUrl: url,
          customUrl: '',
          country: get(iCountry),
          category: get(iCategory) || 'Imported',
          businessEmail: get(iEmail) || null,
          status: 'new',
          notes: '',
        });
      }

      setAllChannels(prev => {
        const existingIds = new Set(prev.map(c => c.channelId));
        const newOnes = imported.filter(c => !existingIds.has(c.channelId));
        return [...prev, ...newOnes];
      });
      setImportMsg(`✅ 成功导入 ${imported.length} 个频道`);
      setActiveTab('list');
      setPage(1);
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function saveChannel(ch: KOLChannel) {
    if (saved.find(s => s.channelId === ch.channelId)) return;
    setSaved(prev => [...prev, {...ch, status:'new', notes:''}]);
  }

  function exportCsv() {
    const header = 'Channel,Subscribers,AvgViews,EngagementRate,UploadFreq/mo,Email,Country,Category,Status,URL';
    const rows = saved.map(c => [
      c.title, fmt(c.subscriberCount), fmt(c.avgViewsPerVideo),
      (c.engagementRate ?? 0).toFixed(2)+'%', (c.uploadFrequencyPerMonth ?? 0).toFixed(1),
      c.businessEmail??'', c.country, c.category, c.status, c.channelUrl,
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
    const blob = new Blob([[header,...rows].join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'kol_list.csv'; a.click();
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding:'8px 20px', borderRadius:10, fontSize:13, fontWeight:600,
    border:'none', cursor:'pointer', transition:'all 0.18s',
    background: active ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(139,92,246,0.07)',
    color: active ? '#fff' : '#7c3aed',
    boxShadow: active ? '0 4px 14px rgba(124,58,237,0.28)' : 'none',
  });

  // ── API Key setup modal ────────────────────────────────────────────────────
  if (showApiSetup) return (
    <div className="fade-in" style={{maxWidth:520, margin:'60px auto'}}>
      <div className="card" style={{textAlign:'center', padding:40}}>
        <div style={{fontSize:40, marginBottom:16}}>🎬</div>
        <h2 style={{fontSize:20, fontWeight:800, marginBottom:8}}>YouTube KOL 红人管理</h2>
        <p style={{color:'#64748b', fontSize:13, marginBottom:24}}>
          输入 YouTube Data API Key 开始使用。API Key 仅保存在本地浏览器中。
          <br/><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{color:'#7c3aed'}}>免费获取 API Key →</a>
        </p>
        <div style={{display:'flex', gap:10}}>
          <input value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&saveApiKey()}
            placeholder="AIza..." style={{flex:1}} type="password" />
          <button className="btn" onClick={saveApiKey}>确认</button>
        </div>
        <p style={{fontSize:11, color:'#94a3b8', marginTop:12}}>
          需要启用 YouTube Data API v3，每天免费 10,000 次配额
        </p>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{maxWidth:1200}}>
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
        <div>
          <h2 style={{fontSize:22, fontWeight:800, letterSpacing:'-0.02em', marginBottom:4}}>🎬 YouTube KOL 红人管理</h2>
          <p style={{color:'#64748b', fontSize:13}}>搜索并筛选 YouTube 频道，收集公开业务邮箱，管理合作进度</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={()=>setShowApiSetup(true)}>⚙ 更换 API Key</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:8, marginBottom:20}}>
        <button style={tabBtn(activeTab==='list')}  onClick={()=>setActiveTab('list')}>🔍 红人列表 {allChannels.length>0&&`(${filtered.length}/${allChannels.length})`}</button>
        <button style={tabBtn(activeTab==='import')} onClick={()=>setActiveTab('import')}>📥 导入数据库</button>
        <button style={tabBtn(activeTab==='saved')} onClick={()=>setActiveTab('saved')}>📋 我的 KOL {saved.length>0&&`(${saved.length})`}</button>
      </div>

      {activeTab === 'list' && (
        <div style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:20, alignItems:'start'}}>

          {/* ── Filter Panel ── */}
          <div style={{display:'flex', flexDirection:'column', gap:12, position:'sticky', top:20}}>
            <div className="card" style={{padding:16}}>
              <div style={{fontSize:12, fontWeight:700, color:'#7c3aed', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em'}}>🔎 搜索</div>

              <div style={{marginBottom:10}}>
                <label style={{fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4}}>追加搜索关键词（可选）</label>
                <input value={searchKw} onChange={e=>setSearchKw(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&loadChannels(apiKey,searchKw)}
                  placeholder="输入关键词追加搜索…" style={{width:'100%', fontSize:12}} />
              </div>
              <div style={{display:'flex', gap:8}}>
                <button className="btn btn-sm" style={{flex:1}} onClick={()=>loadChannels(apiKey,searchKw)} disabled={loading}>
                  {loading ? '加载中…' : searchKw ? '搜索' : '刷新全部'}
                </button>
                {searchKw && (
                  <button className="btn btn-secondary btn-sm" onClick={()=>{setSearchKw('');loadAllPresets(apiKey);}} disabled={loading} title="清除并重新加载全部">✕</button>
                )}
              </div>
              {loadingProgress && (
                <p style={{fontSize:11, color:'#7c3aed', marginTop:8}}>{loadingProgress}</p>
              )}
            </div>

            <div className="card" style={{padding:16}}>
              <div style={{fontSize:12, fontWeight:700, color:'#7c3aed', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em'}}>⚡ 筛选</div>

              <FilterRow label="邮箱">
                <select value={filters.hasEmail} onChange={e=>setF('hasEmail',e.target.value)} style={{width:'100%',fontSize:12}}>
                  <option value="all">全部</option>
                  <option value="yes">✉ 有邮箱</option>
                  <option value="no">无邮箱</option>
                </select>
              </FilterRow>

              <FilterRow label="国家/地区">
                <select value={filters.country} onChange={e=>setF('country',e.target.value)} style={{width:'100%',fontSize:12}}>
                  {COUNTRIES.map(c=><option key={c} value={c}>{c==='All'?'全部':c}</option>)}
                </select>
              </FilterRow>

              <FilterRow label="类目">
                <select value={filters.category} onChange={e=>setF('category',e.target.value)} style={{width:'100%',fontSize:12}}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c==='All'?'全部':c}</option>)}
                </select>
              </FilterRow>

              <FilterRow label="粉丝量 (K)">
                <div style={{display:'flex', gap:4}}>
                  <input value={filters.minSubs} onChange={e=>setF('minSubs',e.target.value)} placeholder="最小" style={{width:'50%',fontSize:11}} />
                  <input value={filters.maxSubs} onChange={e=>setF('maxSubs',e.target.value)} placeholder="最大" style={{width:'50%',fontSize:11}} />
                </div>
              </FilterRow>

              <FilterRow label="平均播放 (K)">
                <input value={filters.minAvgViews} onChange={e=>setF('minAvgViews',e.target.value)} placeholder="最小" style={{width:'100%',fontSize:12}} />
              </FilterRow>

              <FilterRow label="互动率 (%)">
                <input value={filters.minEngagement} onChange={e=>setF('minEngagement',e.target.value)} placeholder="最小 e.g. 2" style={{width:'100%',fontSize:12}} />
              </FilterRow>

              <FilterRow label="发布频率 (次/月)">
                <input value={filters.minFrequency} onChange={e=>setF('minFrequency',e.target.value)} placeholder="最小 e.g. 4" style={{width:'100%',fontSize:12}} />
              </FilterRow>

              <FilterRow label="关键词过滤（名称/描述/邮箱）">
                <input value={filters.keyword} onChange={e=>setF('keyword',e.target.value)} placeholder="多词空格分隔，任一匹配" style={{width:'100%',fontSize:12}} />
              </FilterRow>

              <button className="btn btn-secondary btn-sm" style={{width:'100%', marginTop:8}}
                onClick={()=>{setFilters(DEFAULT_FILTERS);setPage(1);}}>重置筛选</button>
            </div>

            {/* Stats */}
            {allChannels.length > 0 && (
              <div className="card card-flat" style={{padding:14}}>
                <div style={{fontSize:11, color:'#94a3b8', marginBottom:8, fontWeight:600}}>筛选结果</div>
                <div style={{fontSize:22, fontWeight:800, color:'#7c3aed'}}>{filtered.length}</div>
                <div style={{fontSize:11, color:'#94a3b8'}}>个频道</div>
                <div style={{marginTop:8, fontSize:12, color:'#64748b'}}>
                  ✉ 有邮箱: <strong style={{color:'#7c3aed'}}>{filtered.filter(c=>c.businessEmail).length}</strong>
                </div>
              </div>
            )}
          </div>

          {/* ── Channel List ── */}
          <div>
            {error && <div className="card" style={{padding:16, marginBottom:16, borderLeft:'3px solid #ef4444'}}><p className="error">{error}</p></div>}

            {loading && (
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {[1,2,3,4,5].map(i=>(
                  <div key={i} className="card" style={{height:88, display:'flex', gap:16, alignItems:'center'}}>
                    <div className="skeleton" style={{width:56,height:56,borderRadius:12,flexShrink:0}} />
                    <div style={{flex:1}}>
                      <div className="skeleton" style={{height:14,width:'40%',marginBottom:8}} />
                      <div className="skeleton" style={{height:11,width:'70%'}} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && allChannels.length === 0 && !loadingProgress && (
              <div className="card" style={{textAlign:'center', padding:48, color:'#94a3b8'}}>
                <div style={{fontSize:32, marginBottom:12}}>🎬</div>
                <div style={{fontSize:14, marginBottom:8}}>正在自动加载红人列表…</div>
                <div style={{fontSize:12}}>如未自动加载，点击左侧「刷新全部」按钮</div>
              </div>
            )}

            {!loading && allChannels.length > 0 && filtered.length === 0 && (
              <div className="card" style={{textAlign:'center', padding:32, color:'#94a3b8'}}>
                <div style={{fontSize:24, marginBottom:8}}>🔍</div>
                <div style={{fontSize:13}}>没有符合筛选条件的频道，请调整筛选条件</div>
              </div>
            )}

            {!loading && paginated.map(ch => (
              <ChannelCard key={ch.channelId} channel={ch}
                onSave={()=>saveChannel(ch)}
                isSaved={!!saved.find(s=>s.channelId===ch.channelId)} />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{display:'flex', justifyContent:'center', gap:8, marginTop:20, alignItems:'center'}}>
                <button className="btn btn-secondary btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ 上一页</button>
                <span style={{fontSize:13, color:'#64748b'}}>第 {page} / {totalPages} 页</span>
                <button className="btn btn-secondary btn-sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>下一页 ›</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Import Tab ── */}
      {activeTab === 'import' && (
        <div style={{maxWidth: 800}}>
          <div className="card" style={{marginBottom: 20, padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>📥 从第三方平台导入 KOL 数据</h3>
            <p style={{fontSize: 13, color: '#64748b', marginBottom: 20}}>
              支持从 Social Blade、Modash、Heepsy、Influencer Marketing Hub 等平台导出的 CSV 文件。
              导入后可在红人列表中统一筛选和管理。
            </p>

            {/* Platform guides */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24}}>
              {[
                { name: 'Social Blade', url: 'https://socialblade.com', color: '#f97316', desc: '搜索频道 → 导出 Top Charts CSV', fields: 'Channel, Subscribers, Views, Country' },
                { name: 'Modash', url: 'https://modash.io', color: '#8b5cf6', desc: '筛选后点 Export → CSV', fields: 'Name, Subscribers, Email, Country, Engagement' },
                { name: 'Heepsy', url: 'https://heepsy.com', color: '#06b6d4', desc: '搜索结果页 → Export List', fields: 'Channel, Followers, Email, Category, Country' },
                { name: 'Influencer Hub', url: 'https://influencermarketinghub.com', color: '#10b981', desc: '搜索后导出 Excel/CSV', fields: 'Name, Subscribers, Niche, Contact' },
                { name: 'NoxInfluencer', url: 'https://noxinfluencer.com', color: '#ef4444', desc: '频道列表 → Batch Export', fields: 'Channel, Subs, Avg Views, Email, Country' },
                { name: '自定义 CSV', url: '', color: '#64748b', desc: '任意 CSV，平台自动识别列', fields: 'channel/name, subscribers, email, country, url...' },
              ].map(p => (
                <div key={p.name} className="card card-flat" style={{padding: 14, borderLeft: `3px solid ${p.color}`}}>
                  <div style={{fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 4}}>
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer" style={{color: p.color}}>{p.name} →</a> : p.name}
                  </div>
                  <div style={{fontSize: 11, color: '#64748b', marginBottom: 6}}>{p.desc}</div>
                  <div style={{fontSize: 10, color: '#94a3b8', fontFamily: 'monospace'}}>{p.fields}</div>
                </div>
              ))}
            </div>

            {/* Upload area */}
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '32px 24px', border: '2px dashed rgba(124,58,237,0.3)', borderRadius: 16,
              cursor: 'pointer', background: 'rgba(139,92,246,0.03)', transition: 'all 0.2s',
            }}>
              <div style={{fontSize: 36, marginBottom: 12}}>📂</div>
              <div style={{fontSize: 14, fontWeight: 600, color: '#7c3aed', marginBottom: 4}}>点击选择 CSV 文件</div>
              <div style={{fontSize: 12, color: '#94a3b8'}}>支持 .csv 格式，文件大小不限</div>
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleCsvImport} style={{display: 'none'}} />
            </label>

            {importMsg && (
              <div style={{marginTop: 16, padding: '12px 16px', borderRadius: 10,
                background: importMsg.startsWith('✅') ? 'rgba(209,250,229,0.8)' : 'rgba(254,226,226,0.8)',
                color: importMsg.startsWith('✅') ? '#065f46' : '#b91c1c', fontSize: 13, fontWeight: 600}}>
                {importMsg}
              </div>
            )}
          </div>

          {/* Column mapping guide */}
          <div className="card" style={{padding: 20}}>
            <h4 style={{fontSize: 14, fontWeight: 700, marginBottom: 12}}>📋 自动识别的列名</h4>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8}}>
              {[
                ['频道名称', 'channel name / channel / title / name / 频道名'],
                ['粉丝/订阅量', 'subscribers / subs / followers / 粉丝'],
                ['业务邮箱', 'email / 邮箱 / contact'],
                ['国家/地区', 'country / region / 国家'],
                ['频道链接', 'url / link / channel url / 频道链接'],
                ['平均播放量', 'avg views / average views / 播放'],
                ['互动率', 'engagement / 互动'],
                ['类目/垂类', 'category / niche / 类目'],
              ].map(([field, cols]) => (
                <div key={field} style={{display: 'flex', gap: 8, fontSize: 12, padding: '6px 0', borderBottom: '1px solid rgba(226,232,240,0.5)'}}>
                  <span style={{fontWeight: 600, color: '#7c3aed', minWidth: 80}}>{field}</span>
                  <span style={{color: '#94a3b8', fontFamily: 'monospace', fontSize: 11}}>{cols}</span>
                </div>
              ))}
            </div>
            <p style={{fontSize: 11, color: '#94a3b8', marginTop: 12}}>
              💡 列名不区分大小写，包含关键词即可识别。粉丝量支持 1.2M、500K 等格式。
            </p>
          </div>
        </div>
      )}

      {/* ── Saved Tab ── */}
      {activeTab === 'saved' && (
        <div>
          {saved.length === 0 ? (
            <div className="card" style={{textAlign:'center', padding:48, color:'#94a3b8'}}>
              <div style={{fontSize:32, marginBottom:12}}>📋</div>
              <div style={{fontSize:14}}>还没有保存任何 KOL，去红人列表添加吧</div>
            </div>
          ) : (
            <>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div style={{fontSize:13, color:'#64748b'}}>
                  共 <strong>{saved.length}</strong> 个 KOL，有邮箱 <strong style={{color:'#7c3aed'}}>{saved.filter(s=>s.businessEmail).length}</strong> 个
                </div>
                <button className="btn btn-secondary btn-sm" onClick={exportCsv}>⬇ 导出 CSV</button>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20}}>
                {Object.entries(STATUS_CFG).map(([s,c])=>(
                  <div key={s} className="card card-flat" style={{textAlign:'center', padding:'12px 8px'}}>
                    <div style={{fontSize:20, fontWeight:800, color:c.color}}>{saved.filter(x=>x.status===s).length}</div>
                    <div style={{fontSize:11, color:'#94a3b8', marginTop:2}}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {saved.map(ch=>(
                  <SavedCard key={ch.channelId} channel={ch}
                    notes={editNotes[ch.channelId]??ch.notes}
                    onNotesChange={v=>setEditNotes(p=>({...p,[ch.channelId]:v}))}
                    onSaveNotes={()=>setSaved(p=>p.map(c=>c.channelId===ch.channelId?{...c,notes:editNotes[ch.channelId]??c.notes}:c))}
                    onStatusChange={s=>setSaved(p=>p.map(c=>c.channelId===ch.channelId?{...c,status:s}:c))}
                    onRemove={()=>setSaved(p=>p.filter(c=>c.channelId!==ch.channelId))} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FilterRow({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div style={{marginBottom:10}}>
      <label style={{fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4}}>{label}</label>
      {children}
    </div>
  );
}

function ChannelCard({channel:ch, onSave, isSaved}: {channel:KOLChannel; onSave:()=>void; isSaved:boolean}) {
  return (
    <div className="card card-hover" style={{display:'flex', gap:14, alignItems:'flex-start', marginBottom:10}}>
      <img src={ch.thumbnailUrl||`https://ui-avatars.com/api/?name=${encodeURIComponent(ch.title)}&size=56&background=7c3aed&color=fff`}
        alt={ch.title} style={{width:52,height:52,borderRadius:10,objectFit:'cover',flexShrink:0}} />
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5}}>
          <a href={ch.channelUrl} target="_blank" rel="noreferrer" style={{fontSize:14,fontWeight:700,color:'#1e1b4b'}}>{ch.title}</a>
          {ch.country && <span className="badge badge-gray" style={{fontSize:10}}>{ch.country}</span>}
          {ch.category && <span className="badge badge-purple" style={{fontSize:10}}>{ch.category}</span>}
          {ch.businessEmail ? <span className="badge badge-green" style={{fontSize:10}}>✉ 有邮箱</span> : <span className="badge badge-gray" style={{fontSize:10}}>无邮箱</span>}
        </div>
        <div style={{display:'flex', gap:14, fontSize:11, color:'#64748b', flexWrap:'wrap', marginBottom:4}}>
          <span>👥 {fmt(ch.subscriberCount)}</span>
          <span>▶ 均 {fmt(ch.avgViewsPerVideo)} 播放</span>
          <span>💬 {(ch.engagementRate ?? 0).toFixed(1)}% 互动</span>
          <span>📅 {(ch.uploadFrequencyPerMonth ?? 0).toFixed(1)} 次/月</span>
          <span>🎬 {fmt(ch.videoCount)} 视频</span>
        </div>
        {ch.businessEmail && <div style={{fontSize:12,color:'#7c3aed',fontWeight:600}}>✉ {ch.businessEmail}</div>}
      </div>
      <button className={isSaved?'btn btn-secondary btn-sm':'btn btn-sm'} onClick={onSave} disabled={isSaved} style={{flexShrink:0}}>
        {isSaved?'✓ 已保存':'+ 保存'}
      </button>
    </div>
  );
}

function SavedCard({channel:ch, notes, onNotesChange, onSaveNotes, onStatusChange, onRemove}: {
  channel:KOLChannel; notes:string; onNotesChange:(v:string)=>void;
  onSaveNotes:()=>void; onStatusChange:(s:KOLChannel['status'])=>void; onRemove:()=>void;
}) {
  const cfg = STATUS_CFG[ch.status];
  return (
    <div className="card" style={{display:'flex', gap:12, alignItems:'flex-start'}}>
      <img src={ch.thumbnailUrl||`https://ui-avatars.com/api/?name=${encodeURIComponent(ch.title)}&size=48&background=7c3aed&color=fff`}
        alt={ch.title} style={{width:44,height:44,borderRadius:8,objectFit:'cover',flexShrink:0}} />
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6}}>
          <a href={ch.channelUrl} target="_blank" rel="noreferrer" style={{fontSize:13,fontWeight:700,color:'#1e1b4b'}}>{ch.title}</a>
          <span style={{fontSize:11,color:'#64748b'}}>👥 {fmt(ch.subscriberCount)}</span>
          {ch.businessEmail && <span style={{fontSize:11,color:'#7c3aed',fontWeight:600}}>✉ {ch.businessEmail}</span>}
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <select value={ch.status} onChange={e=>onStatusChange(e.target.value as KOLChannel['status'])}
            style={{fontSize:11,padding:'4px 8px',borderRadius:8,background:cfg.bg,color:cfg.color,border:'none',fontWeight:600}}>
            {Object.entries(STATUS_CFG).map(([s,c])=><option key={s} value={s}>{c.label}</option>)}
          </select>
          <input value={notes} onChange={e=>onNotesChange(e.target.value)} placeholder="备注（报价、进度等）"
            style={{flex:1,minWidth:160,fontSize:11,padding:'5px 8px'}} />
          <button className="btn btn-secondary btn-sm" onClick={onSaveNotes}>保存</button>
          <button className="btn btn-danger btn-sm" onClick={onRemove}>移除</button>
        </div>
      </div>
    </div>
  );
}
