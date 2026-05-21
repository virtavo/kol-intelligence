import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';

interface Project {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  status: string;
  funded_amount_usd: number;
  funding_goal_usd: number;
  percent_funded: number;
  backer_count: number;
  comment_count: number;
  update_count: number;
  category_canonical: string;
  category_raw: string;
  country: string;
  currency: string;
  launch_date: string;
  end_date: string;
  has_video: boolean;
  staff_pick: boolean;
  photo_url: string;
  tags: string[];
  creator_id: string;
  creator_name: string;
  platform_id: string;
  external_id: string;
}

interface AiSummary {
  oneLiner: string;
  sellingPoints: string[];
  targetAudience: string;
  risks: string[];
  differentiation: string;
  generatedAt: string;
}

interface AiSentiment {
  overallSentiment: string;
  topics: { topic: string; sentiment: string; count: number }[];
  generatedAt: string;
}

type Tab = 'overview' | 'trends' | 'similar' | 'ai';

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function daysLeft(endDate: string): string {
  if (!endDate) return '—';
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Ended';
  if (diff === 0) return 'Last day!';
  return `${diff} days left`;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [project, setProject] = useState<Project | null>(null);
  const [similar, setSimilar] = useState<Project[]>([]);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [aiSentiment, setAiSentiment] = useState<AiSentiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    client.get(`/projects/${id}`)
      .then((res) => setProject(res.data.data ?? res.data))
      .catch(() => setError('Failed to load project.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === 'similar' && id && similar.length === 0) {
      client.get(`/projects/${id}/similar`).then((r) => setSimilar(r.data.projects ?? [])).catch(() => {});
    }
    if (tab === 'ai' && id) {
      if (!aiSummary) client.get(`/ai/summary/${id}`).then((r) => setAiSummary(r.data)).catch(() => {});
      if (!aiSentiment) client.get(`/ai/sentiment/${id}`).then((r) => setAiSentiment(r.data)).catch(() => {});
    }
  }, [tab, id, similar.length, aiSummary, aiSentiment]);


  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 16px', border: 'none',
    borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
    background: 'none', cursor: 'pointer',
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? '#3b82f6' : '#555', fontSize: 14,
  });

  if (loading) return <p style={{ color: '#666' }}>Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!project) return null;

  const pct = project.percent_funded ?? (project.funding_goal_usd > 0
    ? Math.round((project.funded_amount_usd / project.funding_goal_usd) * 100) : 0);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to="/projects" style={{ fontSize: 13, color: '#666' }}>← Back to Projects</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        {project.photo_url ? (
          <img src={project.photo_url} alt="" style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div style={{ width: 160, height: 100, background: '#e5e7eb', borderRadius: 6, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            {project.title}
            {project.staff_pick && <span title="Staff Pick" style={{ fontSize: 14 }}>⭐</span>}
            <span className={`badge ${project.status === 'successful' ? 'badge-green' : project.status === 'live' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 11 }}>
              {project.status}
            </span>
          </h1>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>{project.subtitle}</p>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#888' }}>
            <span>by {project.creator_name || project.creator_id}</span>
            <span>·</span>
            <span>{project.category_canonical || project.category_raw}</span>
            <span>·</span>
            <span>{project.country}</span>
            {project.url && (
              <>
                <span>·</span>
                <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                  View on Kickstarter →
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 20, display: 'flex', gap: 4 }}>
        {(['overview', 'trends', 'similar', 'ai'] as Tab[]).map((t) => (
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
            {t === 'ai' ? '🤖 AI Insights' : t === 'similar' ? '🔗 Similar' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>


      {/* Overview Tab */}
      {tab === 'overview' && (
        <>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#3b82f6' }}>{fmt(project.funded_amount_usd)}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Funded</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#6b7280' }}>{fmt(project.funding_goal_usd)}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Goal</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: pct >= 100 ? '#10b981' : '#f59e0b' }}>{pct.toLocaleString()}%</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Funded</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#8b5cf6' }}>{(project.backer_count ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Backers</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{fmt(project.funded_amount_usd)} raised of {fmt(project.funding_goal_usd)}</span>
              <span style={{ color: '#666' }}>{daysLeft(project.end_date)}</span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{
                background: pct >= 100 ? '#10b981' : '#3b82f6',
                height: '100%', borderRadius: 6,
                width: `${Math.min(pct, 100)}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Project Details</h3>
              <table>
                <tbody>
                  <tr><td style={{ color: '#666', width: 140, fontSize: 13 }}>Category</td><td style={{ fontSize: 13 }}>{project.category_raw || project.category_canonical}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Canonical</td><td style={{ fontSize: 13 }}><span className="badge badge-gray">{project.category_canonical}</span></td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Country</td><td style={{ fontSize: 13 }}>{project.country || '—'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Currency</td><td style={{ fontSize: 13 }}>{project.currency || 'USD'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Launch Date</td><td style={{ fontSize: 13 }}>{project.launch_date || '—'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>End Date</td><td style={{ fontSize: 13 }}>{project.end_date || '—'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Has Video</td><td style={{ fontSize: 13 }}>{project.has_video ? '✅ Yes' : '❌ No'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Staff Pick</td><td style={{ fontSize: 13 }}>{project.staff_pick ? '⭐ Yes' : 'No'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Comments</td><td style={{ fontSize: 13 }}>{(project.comment_count ?? 0).toLocaleString()}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Updates</td><td style={{ fontSize: 13 }}>{(project.update_count ?? 0).toLocaleString()}</td></tr>
                  {project.tags?.length > 0 && (
                    <tr><td style={{ color: '#666', fontSize: 13 }}>Tags</td><td style={{ fontSize: 13 }}>{project.tags.map(t => <span key={t} className="badge badge-gray" style={{ marginRight: 4, fontSize: 11 }}>{t}</span>)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Creator</h3>
              <table>
                <tbody>
                  <tr><td style={{ color: '#666', width: 120, fontSize: 13 }}>Name</td><td style={{ fontSize: 13, fontWeight: 500 }}>{project.creator_name || '—'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Creator ID</td><td style={{ fontSize: 13, fontFamily: 'monospace' }}>{project.creator_id || '—'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>Platform</td><td style={{ fontSize: 13 }}>{project.platform_id || 'kickstarter'}</td></tr>
                  <tr><td style={{ color: '#666', fontSize: 13 }}>External ID</td><td style={{ fontSize: 13, fontFamily: 'monospace' }}>{project.external_id || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}


      {/* Trends Tab */}
      {tab === 'trends' && (
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Funding Snapshot</h3>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Current funding status as of the latest data crawl.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{fmt(project.funded_amount_usd)}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Current Funding</div>
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{(project.backer_count ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Total Backers</div>
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {project.backer_count > 0 ? `$${Math.round(project.funded_amount_usd / project.backer_count).toLocaleString()}` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>Avg Pledge</div>
            </div>
          </div>
        </div>
      )}

      {/* Similar Projects Tab */}
      {tab === 'similar' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr><th>Title</th><th>Category</th><th style={{ textAlign: 'right' }}>Funded</th><th style={{ textAlign: 'right' }}>%</th><th style={{ textAlign: 'right' }}>Backers</th></tr>
            </thead>
            <tbody>
              {similar.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 24 }}>Loading similar projects…</td></tr>
              ) : similar.map((s) => (
                <tr key={s.id}>
                  <td><Link to={`/projects/${s.id}`}>{s.title}</Link></td>
                  <td><span className="badge badge-gray" style={{ fontSize: 11 }}>{s.category_canonical ?? ''}</span></td>
                  <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(Number(s.funded_amount_usd ?? 0))}</td>
                  <td style={{ textAlign: 'right', fontSize: 13 }}>{Number(s.percent_funded ?? 0).toLocaleString()}%</td>
                  <td style={{ textAlign: 'right' }}>{Number(s.backer_count ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Insights Tab */}
      {tab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>
              AI Summary
              <span style={{ fontSize: 11, background: '#fff3cd', color: '#856404', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>AI-generated</span>
            </h3>
            {!aiSummary ? <p style={{ color: '#888' }}>Loading…</p> : (
              <>
                <p style={{ marginBottom: 12, fontSize: 14 }}>{aiSummary.oneLiner}</p>
                {aiSummary.sellingPoints?.length > 0 && (
                  <>
                    <strong style={{ fontSize: 13 }}>Key Selling Points</strong>
                    <ul style={{ marginTop: 6, paddingLeft: 20, fontSize: 13 }}>
                      {aiSummary.sellingPoints.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </>
                )}
                <strong style={{ fontSize: 13, display: 'block', marginTop: 10 }}>Target Audience</strong>
                <p style={{ fontSize: 13, color: '#555' }}>{aiSummary.targetAudience}</p>
                <strong style={{ fontSize: 13, display: 'block', marginTop: 10 }}>Differentiation</strong>
                <p style={{ fontSize: 13, color: '#555' }}>{aiSummary.differentiation}</p>
                {aiSummary.risks?.length > 0 && (
                  <>
                    <strong style={{ fontSize: 13, display: 'block', marginTop: 10 }}>Risks</strong>
                    <ul style={{ marginTop: 6, paddingLeft: 20, fontSize: 13, color: '#dc2626' }}>
                      {aiSummary.risks.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>
              Sentiment Analysis
              <span style={{ fontSize: 11, background: '#fff3cd', color: '#856404', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>AI-generated</span>
            </h3>
            {!aiSentiment ? <p style={{ color: '#888' }}>Loading…</p> : (
              <>
                <p style={{ marginBottom: 10, fontSize: 14 }}>
                  Overall:
                  <span style={{
                    marginLeft: 8, padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: aiSentiment.overallSentiment === 'positive' ? '#ecfdf5' : '#fef2f2',
                    color: aiSentiment.overallSentiment === 'positive' ? '#065f46' : '#991b1b',
                  }}>
                    {aiSentiment.overallSentiment}
                  </span>
                </p>
                {aiSentiment.topics?.length > 0 && (
                  <table>
                    <thead><tr><th>Topic</th><th>Sentiment</th><th>Mentions</th></tr></thead>
                    <tbody>
                      {aiSentiment.topics.map((t, i) => (
                        <tr key={i}>
                          <td>{t.topic}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: 10, fontSize: 11,
                              background: t.sentiment === 'positive' ? '#ecfdf5' : t.sentiment === 'negative' ? '#fef2f2' : '#f3f4f6',
                              color: t.sentiment === 'positive' ? '#065f46' : t.sentiment === 'negative' ? '#991b1b' : '#374151',
                            }}>
                              {t.sentiment}
                            </span>
                          </td>
                          <td>{t.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
