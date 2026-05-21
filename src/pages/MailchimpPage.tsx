import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface McStatus {
  connected: boolean; accountName?: string; email?: string;
  message?: string; lists?: { id: string; name: string; memberCount: number }[];
  config_required?: string[];
}
interface Template { id: string; name: string; subject: string; description: string; }
interface Campaign {
  id: string; subject: string; status: string; segmentTag?: string;
  recipientCount?: number; createdAt: string; sentAt?: string;
}
interface SyncRecord { id: string; timestamp: string; backerCount: number; status: string; message?: string; autoTriggered?: number; }
interface AutomationItem {
  type: string; status: string; tag?: string; workflowId?: string;
  triggeredCount?: number; enrolledCount?: number; createdAt?: string;
}
interface CrawlState {
  status: 'idle' | 'running' | 'done' | 'error';
  startedAt?: string; finishedAt?: string;
  backersFound: number; projectsCrawled: number; log: string[]; error?: string;
}

const SEGMENT_OPTIONS = [
  { value: '', label: 'All Backers' },
  { value: 'super_backer', label: '⭐ Super Backers' },
  { value: 'heavy_supporter', label: 'Heavy Supporters' },
  { value: 'serial_backer', label: 'Serial Backers' },
  { value: 'commentator', label: 'Commentators' },
  { value: 'category_focused', label: 'Category Focused' },
  { value: 'early_backer', label: 'Early Backers' },
  { value: 'casual_backer', label: 'Casual Backers' },
];

const AUTOMATION_TYPES = [
  { type: 'WELCOME',       label: 'Welcome Series',      icon: '👋', desc: '3-email onboarding sequence for newly synced backers', color: '#7c3aed' },
  { type: 'PROJECT_ALERT', label: 'Project Alert',        icon: '🔔', desc: 'Single email when a new project matches backer preferences', color: '#2563eb' },
  { type: 'RE_ENGAGE',     label: 'Re-engagement',        icon: '♻️', desc: '2-email win-back for backers inactive 90+ days', color: '#d97706' },
  { type: 'SUPER_BACKER',  label: 'Super Backer VIP',     icon: '⭐', desc: 'Exclusive VIP sequence for serial & super backers', color: '#059669' },
];

export default function MailchimpPage() {
  const [status, setStatus] = useState<McStatus | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncRecord[]>([]);
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [crawlState, setCrawlState] = useState<CrawlState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'campaigns' | 'sync' | 'automation' | 'crawl'>('automation');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | ''>('');

  // Compose
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [fromName, setFromName] = useState('KIP Platform');
  const [segment, setSegment] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  // Automation
  const [triggeringType, setTriggeringType] = useState<string | null>(null);
  const [setupType, setSetupType] = useState<string | null>(null);
  const [triggerSegment, setTriggerSegment] = useState('');

  const showMsg = (text: string, type: 'success' | 'error') => { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 6000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, templatesRes, campaignsRes, syncRes, autoRes, crawlRes] = await Promise.all([
        client.get('/mailchimp/status'),
        client.get('/mailchimp/templates'),
        client.get('/mailchimp/campaigns'),
        client.get('/mailchimp/sync-history'),
        client.get('/mailchimp/automations').catch(() => ({ data: { automations: [] } })),
        client.get('/crawl/status').catch(() => ({ data: null })),
      ]);
      setStatus(statusRes.data);
      setTemplates(templatesRes.data.templates ?? []);
      setCampaigns(campaignsRes.data.campaigns ?? []);
      setSyncHistory(syncRes.data.history ?? []);
      setAutomations(autoRes.data.automations ?? []);
      if (crawlRes.data) setCrawlState(crawlRes.data);
    } catch { showMsg('Failed to load data.', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll crawl status while running
  useEffect(() => {
    if (crawlState?.status !== 'running') return;
    const interval = setInterval(async () => {
      try {
        const res = await client.get('/crawl/status');
        setCrawlState(res.data);
        if (res.data.status !== 'running') { clearInterval(interval); fetchAll(); }
      } catch { clearInterval(interval); }
    }, 2000);
    return () => clearInterval(interval);
  }, [crawlState?.status, fetchAll]);

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplate(tplId);
    const tpl = templates.find(t => t.id === tplId);
    if (tpl) { setSubject(tpl.subject); setHtmlContent(getTemplateHtml(tplId)); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await client.post('/mailchimp/sync', { segment: segment || undefined });
      const auto = res.data.autoTriggered ? ` + ${res.data.autoTriggered} welcome emails queued` : '';
      showMsg(`Synced ${res.data.backerCount} backers${auto}`, 'success');
      fetchAll();
    } catch { showMsg('Sync failed.', 'error'); }
    finally { setSyncing(false); }
  };

  const handleSend = async (sendNow: boolean) => {
    if (!subject || !htmlContent) { showMsg('Subject and content required.', 'error'); return; }
    setSending(true);
    try {
      const res = await client.post('/mailchimp/campaigns', { subject, previewText, fromName, htmlContent, segmentTag: segment || undefined, sendNow });
      showMsg(sendNow ? `Campaign sent! ID: ${res.data.id}` : `Draft saved. ID: ${res.data.id}`, 'success');
      setSubject(''); setHtmlContent(''); setPreviewText(''); setSelectedTemplate('');
      fetchAll();
    } catch { showMsg('Failed to create campaign.', 'error'); }
    finally { setSending(false); }
  };

  const handleSetupAutomation = async (type: string) => {
    setSetupType(type);
    try {
      const res = await client.post('/mailchimp/automations/setup', { type, fromName: 'KIP Platform', replyTo: 'noreply@kip.dev' });
      showMsg(res.data.message ?? `Automation "${type}" configured.`, 'success');
      fetchAll();
    } catch { showMsg('Setup failed.', 'error'); }
    finally { setSetupType(null); }
  };

  const handleTriggerAutomation = async (type: string) => {
    setTriggeringType(type);
    try {
      const payload: Record<string, unknown> = { type };
      if (triggerSegment) payload.segment = triggerSegment;
      const res = await client.post('/mailchimp/automations/trigger', payload);
      showMsg(`Triggered for ${res.data.triggered} backers (${res.data.failed} failed). Method: ${res.data.method ?? 'tag_trigger'}`, 'success');
    } catch { showMsg('Trigger failed.', 'error'); }
    finally { setTriggeringType(null); }
  };

  const handleStartCrawl = async () => {
    try {
      await client.post('/crawl/start');
      setCrawlState({ status: 'running', backersFound: 0, projectsCrawled: 0, log: ['Starting crawler…'] });
      showMsg('Crawler started! This may take 5–15 minutes.', 'success');
    } catch { showMsg('Failed to start crawler.', 'error'); }
  };

  if (loading) return <div style={{ color: '#94a3b8', padding: 40 }}>Loading…</div>;

  const tabs = [
    { key: 'automation' as const, label: '⚡ Automation'  },
    { key: 'crawl'     as const, label: '🕷 Crawl Backers' },
    { key: 'compose'   as const, label: '✏️ Compose'       },
    { key: 'campaigns' as const, label: '📋 Campaigns'     },
    { key: 'sync'      as const, label: '🔄 Sync'          },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>Email Campaigns</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>Sync backers, automate email sequences, and send targeted campaigns via Mailchimp.</p>
      </div>

      {/* Connection status */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: status?.connected ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
        {status?.connected ? (
          <span style={{ fontSize: 13 }}>
            Connected — <strong>{status.accountName}</strong> ({status.email})
            {status.lists?.[0] && <span style={{ color: '#64748b' }}> · {status.lists[0].memberCount} contacts in "{status.lists[0].name}"</span>}
          </span>
        ) : (
          <span style={{ fontSize: 13 }}>
            <strong>Mailchimp not connected.</strong> Add <code style={{ background: '#f3e8ff', color: '#6d28d9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>MAILCHIMP_API_KEY</code>, <code style={{ background: '#f3e8ff', color: '#6d28d9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>MAILCHIMP_SERVER</code>, <code style={{ background: '#f3e8ff', color: '#6d28d9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>MAILCHIMP_LIST_ID</code> to .env
            <span style={{ color: '#94a3b8', display: 'block', fontSize: 12, marginTop: 2 }}>All actions will be simulated in dev mode.</span>
          </span>
        )}
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', marginBottom: 20, borderRadius: 10, fontSize: 13,
          background: msgType === 'success' ? 'rgba(209,250,229,0.8)' : 'rgba(254,226,226,0.8)',
          color: msgType === 'success' ? '#065f46' : '#b91c1c',
          border: `1px solid ${msgType === 'success' ? 'rgba(167,243,208,0.6)' : 'rgba(252,165,165,0.6)'}`,
        }}>{msg}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '9px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            borderBottom: activeTab === tab.key ? '2px solid #7c3aed' : '2px solid transparent',
            background: 'none', fontWeight: activeTab === tab.key ? 700 : 400,
            color: activeTab === tab.key ? '#7c3aed' : '#64748b', transition: 'all 0.15s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── AUTOMATION TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'automation' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <select value={triggerSegment} onChange={e => setTriggerSegment(e.target.value)} style={{ width: 200 }}>
              <option value="">All synced backers</option>
              {SEGMENT_OPTIONS.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Target segment for triggers below</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
            {AUTOMATION_TYPES.map(at => {
              const state = automations.find(a => a.type === at.type);
              const isActive = state?.status === 'active';
              const isSetup = setupType === at.type;
              const isTrigger = triggeringType === at.type;
              return (
                <div key={at.type} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${at.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{at.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>{at.label}</div>
                        <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                          {isActive ? 'Active' : 'Not configured'}
                        </span>
                      </div>
                    </div>
                    {state?.triggeredCount != null && state.triggeredCount > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: at.color }}>{state.triggeredCount}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>triggered</div>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>{at.desc}</p>
                  {at.type === 'WELCOME' && !isActive && (
                    <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px dashed rgba(124,58,237,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 11, color: '#6d28d9', lineHeight: 1.5 }}>
                      <strong>Setup in Mailchimp:</strong> Automations → Classic → "When a subscriber is added to an audience" → tag: <code style={{ background: 'rgba(124,58,237,0.1)', padding: '1px 4px', borderRadius: 3 }}>auto:welcome</code>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" disabled={isSetup}
                      onClick={() => handleSetupAutomation(at.type)} style={{ flex: 1 }}>
                      {isSetup ? 'Configuring…' : isActive ? '↻ Reconfigure' : '⚙ Configure'}
                    </button>
                    <button className="btn btn-sm" disabled={isTrigger}
                      onClick={() => handleTriggerAutomation(at.type)}
                      style={{ flex: 1, background: `linear-gradient(135deg, ${at.color}, ${at.color}cc)` }}>
                      {isTrigger ? 'Triggering…' : '▶ Trigger Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Automation guide */}
          <div className="card" style={{ padding: 20, background: 'rgba(248,245,255,0.8)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#4c1d95' }}>📖 How automation works</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { step: '1', title: 'Crawl Backers', desc: 'Run the crawler (Crawl tab) to collect real KS commenters' },
                { step: '2', title: 'Sync to Mailchimp', desc: 'Sync backers with tags. Each backer gets segment & activity tags' },
                { step: '3', title: 'Emails go out', desc: 'Mailchimp automation fires on tag → sends the sequence automatically' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CRAWL TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'crawl' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>🕷 Kickstarter Backer Crawler</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
                Crawls comment sections across 22 real Kickstarter projects. Collects all backers who commented in the <strong>last 6 months</strong> using the public GraphQL API.
              </p>
              <div style={{ background: 'rgba(254,243,199,0.6)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                ⚠️ <strong>Note:</strong> Kickstarter does not expose backer email addresses publicly. Emails are generated from usernames for demo. In production, add your HUNTER_API_KEY for email enrichment.
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="btn" onClick={handleStartCrawl}
                  disabled={crawlState?.status === 'running'}
                  style={{ background: crawlState?.status === 'running' ? '#94a3b8' : 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                  {crawlState?.status === 'running' ? '⏳ Crawling…' : '▶ Start Crawl'}
                </button>
                {crawlState?.status === 'done' && (
                  <span className="badge badge-green">Last run: {crawlState.finishedAt ? new Date(crawlState.finishedAt).toLocaleTimeString() : 'complete'}</span>
                )}
                {crawlState?.status === 'error' && (
                  <span className="badge badge-red">Error: {crawlState.error?.slice(0, 40)}</span>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Current Data</h3>
              {[
                { label: 'Backers in database', value: crawlState?.backersFound ?? 80 },
                { label: 'Projects crawled', value: crawlState?.projectsCrawled ?? 22 },
                { label: 'Date range', value: 'Last 6 months' },
                { label: 'Last crawl', value: crawlState?.finishedAt ? new Date(crawlState.finishedAt).toLocaleDateString() : 'On startup' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(226,232,240,0.4)', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Crawl log */}
          {crawlState && (crawlState.log?.length > 0 || crawlState.status === 'running') && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600 }}>Crawler Log</h4>
                {crawlState.status === 'running' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7c3aed' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                    Running — {crawlState.backersFound} backers found
                  </div>
                )}
              </div>
              <div style={{ background: '#0f0f1a', borderRadius: 8, padding: 14, fontFamily: 'monospace', fontSize: 12, color: '#a5f3fc', maxHeight: 240, overflowY: 'auto', lineHeight: 1.7 }}>
                {crawlState.log.map((line, i) => <div key={i}>{line}</div>)}
                {crawlState.status === 'running' && <div style={{ color: '#818cf8' }}>▌</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COMPOSE TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>Campaign Settings</h3>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template</label>
            <select style={{ width: '100%', marginBottom: 12 }} value={selectedTemplate} onChange={e => handleTemplateSelect(e.target.value)}>
              <option value="">Custom email</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Segment</label>
            <select style={{ width: '100%', marginBottom: 12 }} value={segment} onChange={e => setSegment(e.target.value)}>
              {SEGMENT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From Name</label>
            <input style={{ width: '100%', marginBottom: 12 }} value={fromName} onChange={e => setFromName(e.target.value)} />
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
            <input style={{ width: '100%', marginBottom: 12 }} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject…" />
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview Text</label>
            <input style={{ width: '100%', marginBottom: 16 }} value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Brief preview…" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: 12 }} disabled={sending} onClick={() => handleSend(false)}>Save Draft</button>
              <button className="btn" style={{ flex: 1, fontSize: 12 }} disabled={sending} onClick={() => handleSend(true)}>🚀 Send</button>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>HTML Content</h3>
            <textarea style={{ width: '100%', minHeight: 380, fontFamily: 'monospace', fontSize: 12, padding: 12, border: '1.5px solid rgba(203,213,225,0.6)', borderRadius: 10, resize: 'vertical' }}
              value={htmlContent} onChange={e => setHtmlContent(e.target.value)} placeholder="Paste HTML email content…" />
            {htmlContent && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Preview:</div>
                <div style={{ border: '1px solid rgba(226,232,240,0.6)', borderRadius: 10, padding: 16, background: '#fff', maxHeight: 280, overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CAMPAIGNS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'campaigns' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Subject</th><th>Segment</th><th>Recipients</th><th>Status</th><th>Created</th><th>Sent</th></tr></thead>
            <tbody>
              {campaigns.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>No campaigns yet — create one in Compose.</td></tr>
                : campaigns.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.subject}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{c.segmentTag || 'all'}</span></td>
                    <td>{c.recipientCount ?? '—'}</td>
                    <td><span className={`badge ${c.status === 'sent' ? 'badge-green' : 'badge-gray'}`}>{c.status}</span></td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{c.sentAt ? new Date(c.sentAt).toLocaleString() : '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* ── SYNC TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'sync' && (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Sync Backers → Mailchimp</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
              Push backer profiles to your Mailchimp audience with segment/activity tags. Welcome automation fires automatically after sync.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select value={segment} onChange={e => setSegment(e.target.value)} style={{ width: 200 }}>
                {SEGMENT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn" onClick={handleSync} disabled={syncing}>
                {syncing ? '🔄 Syncing…' : '🔄 Sync to Mailchimp'}
              </button>
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Sync ID</th><th>Backers</th><th>Auto-triggered</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {syncHistory.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: 28 }}>No sync history.</td></tr>
                  : syncHistory.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{s.id}</td>
                      <td>{s.backerCount}</td>
                      <td>{s.autoTriggered != null ? <span className="badge badge-purple">{s.autoTriggered} welcome</span> : '—'}</td>
                      <td><span className={`badge ${s.status === 'completed' ? 'badge-green' : s.status === 'simulated' ? 'badge-blue' : 'badge-gray'}`}>{s.status}</span></td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{new Date(s.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getTemplateHtml(id: string): string {
  const t: Record<string, string> = {
    'tpl-welcome': `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#7c3aed">Welcome! 🎉</h1><p>Thank you for being an active Kickstarter backer. Stay tuned for exciting project updates!</p><p style="color:#666">— The KIP Team</p></body></html>`,
    'tpl-update':  `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#1e1b4b">Project Update 📢</h1><p>We have exciting news about a project you've been following!</p><a href="#" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">View Project →</a></body></html>`,
    'tpl-launch':  `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#1e1b4b">New Launch Alert 🔔</h1><p>Based on your backing history, we think you'll love this new project:</p><a href="#" style="display:inline-block;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Back This Project →</a></body></html>`,
    'tpl-thankyou': `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#1e1b4b">Thank You! 🙏</h1><p>We appreciate your incredible support. Backers like you make innovation possible.</p><p style="color:#666">— The KIP Team</p></body></html>`,
    'tpl-survey':  `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#1e1b4b">We Value Your Feedback 📝</h1><p>As an active backer, your opinion matters. Please take 2 minutes:</p><a href="#" style="display:inline-block;background:#8b5cf6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Take Survey →</a></body></html>`,
  };
  return t[id] ?? '';
}
