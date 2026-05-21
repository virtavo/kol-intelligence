import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';

interface ProjectComment {
  project_id: string;
  project_title: string;
  project_category: string;
  comment_count: number;
  first_comment_date: string;
  last_comment_date: string;
  sample_comments: string[];
}

interface Backer {
  id: string;
  username: string;
  kickstarter_url: string;
  avatar_url: string;
  is_super_backer: boolean;
  region: string;
  total_backed: number;
  value_score: number;
  segments: string[];
  activity_level: string;
  total_comments: number;
  category_distribution: { category_slug: string; count: number; percentage: number }[];
  supported_projects: { id: string; title: string; category: string; pledged_at: string; amount: number; comment_count: number }[];
  projects_commented: ProjectComment[];
  first_seen: string;
  last_seen: string;
}

const ACTIVITY_COLORS: Record<string, string> = {
  super_active: '#ef4444',
  very_active: '#f59e0b',
  active: '#10b981',
  moderate: '#3b82f6',
  casual: '#9ca3af',
};

export default function BackerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [backer, setBacker] = useState<Backer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    client.get(`/backers/${id}`)
      .then((res) => setBacker(res.data.data ?? res.data))
      .catch(() => setError('Failed to load backer.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: '#666' }}>Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!backer) return null;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to="/backers" style={{ fontSize: 13, color: '#666' }}>← Back to Backers</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#666', overflow: 'hidden', flexShrink: 0,
        }}>
          {backer.avatar_url ? (
            <img src={backer.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : backer.username[0]?.toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            {backer.username}
            {backer.is_super_backer && <span title="Super Backer" style={{ fontSize: 18 }}>⭐</span>}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: `${ACTIVITY_COLORS[backer.activity_level] ?? '#9ca3af'}20`,
              color: ACTIVITY_COLORS[backer.activity_level] ?? '#9ca3af',
            }}>
              {(backer.activity_level ?? 'casual').replace('_', ' ')}
            </span>
            {(backer.segments ?? []).map((s) => (
              <span key={s} className="badge badge-blue" style={{ fontSize: 11 }}>{s.replace(/_/g, ' ')}</span>
            ))}
            <a href={backer.kickstarter_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#3b82f6' }}>
              View on Kickstarter →
            </a>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Projects Backed', value: (backer.total_backed ?? 0).toLocaleString(), color: '#3b82f6' },
          { label: 'Total Comments', value: (backer.total_comments ?? 0).toLocaleString(), color: '#10b981' },
          { label: 'Active Categories', value: String(backer.category_distribution?.length ?? 0), color: '#8b5cf6' },
          { label: 'Active Since', value: backer.first_seen ? new Date(backer.first_seen).toLocaleDateString() : '—', color: '#f59e0b' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Category Preferences */}
        {backer.category_distribution?.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Category Preferences</h3>
            {backer.category_distribution.map((c) => (
              <div key={c.category_slug} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                  <span style={{ fontWeight: 500 }}>{c.category_slug}</span>
                  <span style={{ color: '#666' }}>{c.count} projects · {((c.percentage ?? 0) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${Math.max((c.percentage ?? 0) * 100, 2)}%`,
                    background: '#3b82f6',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile Info */}
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Profile</h3>
          <table>
            <tbody>
              <tr>
                <td style={{ color: '#666', width: 140, fontSize: 13 }}>Kickstarter URL</td>
                <td>
                  <a href={backer.kickstarter_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#3b82f6' }}>
                    {backer.kickstarter_url}
                  </a>
                </td>
              </tr>
              <tr>
                <td style={{ color: '#666', fontSize: 13 }}>Total Backed</td>
                <td style={{ fontSize: 13 }}>{(backer.total_backed ?? 0).toLocaleString()} projects</td>
              </tr>
              <tr>
                <td style={{ color: '#666', fontSize: 13 }}>Super Backer</td>
                <td style={{ fontSize: 13 }}>{backer.is_super_backer ? '⭐ Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', fontSize: 13 }}>First Seen</td>
                <td style={{ fontSize: 13 }}>{backer.first_seen ? new Date(backer.first_seen).toLocaleDateString() : '—'}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', fontSize: 13 }}>Last Active</td>
                <td style={{ fontSize: 13 }}>{backer.last_seen ? new Date(backer.last_seen).toLocaleDateString() : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Projects & Comments */}
      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Project Activity & Comments</h3>
        {!backer.projects_commented?.length && !backer.supported_projects?.length ? (
          <p style={{ color: '#888' }}>No project activity found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Category</th>
                <th>Comments</th>
                <th>First Active</th>
                <th>Last Active</th>
                <th>Sample Comment</th>
              </tr>
            </thead>
            <tbody>
              {(backer.projects_commented ?? backer.supported_projects ?? []).map((p: ProjectComment | Backer['supported_projects'][0]) => {
                const pc = p as ProjectComment;
                return (
                  <tr key={pc.project_id ?? (p as Backer['supported_projects'][0]).id}>
                    <td style={{ fontWeight: 500 }}>
                      {pc.project_title ?? (p as Backer['supported_projects'][0]).title}
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>
                        {pc.project_category ?? (p as Backer['supported_projects'][0]).category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{pc.comment_count ?? 0}</td>
                    <td style={{ fontSize: 12, color: '#666' }}>
                      {pc.first_comment_date ? new Date(pc.first_comment_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: '#666' }}>
                      {pc.last_comment_date ? new Date(pc.last_comment_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: '#555', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pc.sample_comments?.[0] ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
