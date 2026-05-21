import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

interface Backer {
  id: string;
  username: string;
  email: string;
  kickstarter_url: string;
  avatar_url: string;
  is_super_backer: boolean;
  total_backed: number;
  value_score: number;
  segment: string;
  segments: string[];
  activity_level: string;
  total_comments: number;
  categories_active: { category: string; project_count: number; comment_count: number }[];
  last_active: string;
  region: string;
}

type Segment = 'all' | 'heavy_supporter' | 'category_focused' | 'early_backer' | 'serial_backer' | 'super_backer' | 'commentator' | 'high_value';

const SEGMENTS: { key: Segment; label: string; color: string }[] = [
  { key: 'all', label: '全部', color: '#555' },
  { key: 'super_backer', label: '⭐ 超级支持者', color: '#f59e0b' },
  { key: 'heavy_supporter', label: '重度支持者', color: '#3b82f6' },
  { key: 'serial_backer', label: '连续支持者', color: '#8b5cf6' },
  { key: 'commentator', label: '活跃评论者', color: '#10b981' },
  { key: 'category_focused', label: '类别专注型', color: '#ec4899' },
  { key: 'high_value', label: '高价值', color: '#ef4444' },
];

const ACTIVITY_COLORS: Record<string, string> = {
  super_active: '#ef4444',
  very_active: '#f59e0b',
  active: '#10b981',
  moderate: '#3b82f6',
  casual: '#9ca3af',
};

type SortKey = 'username' | 'total_backed' | 'total_comments' | 'value_score' | 'last_active';

export default function BackerListPage() {
  const [backers, setBackers] = useState<Backer[]>([]);
  const [total, setTotal] = useState(0);
  const [segment, setSegment] = useState<Segment>('all');
  const [sortBy, setSortBy] = useState<SortKey>('total_comments');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pageSize = 20;

  const fetchBackers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: pageSize, sort: sortBy, dir: sortDir };
      if (segment !== 'all') params.segment = segment;
      const res = await client.get('/backers', { params });
      setBackers(res.data.data ?? res.data.backers ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      setError('Failed to load backers.');
    } finally {
      setLoading(false);
    }
  }, [segment, sortBy, sortDir, page]);

  useEffect(() => { fetchBackers(); }, [fetchBackers]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('desc'); }
    setPage(1);
  };

  const sortIcon = (key: SortKey) => sortBy === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 style={{ marginBottom: 4, fontSize: 22 }}>支持者分析</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
        追踪各项目活跃支持者 — 他们的活动、偏好类别和互动模式
      </p>

      {/* Segment tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => { setSegment(s.key); setPage(1); }}
            style={{
              padding: '8px 14px',
              border: 'none',
              borderBottom: segment === s.key ? `2px solid ${s.color}` : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontWeight: segment === s.key ? 600 : 400,
              color: segment === s.key ? s.color : '#555',
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading ? (
        <p style={{ color: '#666' }}>Loading…</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{total} 位支持者</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('username')}>支持者{sortIcon('username')}</th>
                  <th>邮箱</th>
                  <th>国家</th>
                  <th>活跃度</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('total_backed')}>支持项目数{sortIcon('total_backed')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('total_comments')}>评论数{sortIcon('total_comments')}</th>
                  <th>偏好类别</th>
                  <th>标签</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('last_active')}>最近活跃{sortIcon('last_active')}</th>
                </tr>
              </thead>
              <tbody>
                {backers.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: '#888', padding: 24 }}>暂无数据</td></tr>
                ) : backers.map((b) => (
                  <tr key={b.id}>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, color: '#666', overflow: 'hidden',
                      }}>
                        {b.avatar_url ? (
                          <img src={b.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : b.username[0]?.toUpperCase()}
                      </div>
                    </td>
                    <td>
                      <Link to={`/backers/${b.id}`} style={{ fontWeight: 500 }}>
                        {b.username}
                        {b.is_super_backer && <span title="Super Backer" style={{ marginLeft: 4 }}>⭐</span>}
                      </Link>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        <a href={b.kickstarter_url} target="_blank" rel="noopener noreferrer" style={{ color: '#999' }}>
                          Profile →
                        </a>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#555' }}>
                      {b.email ? <a href={`mailto:${b.email}`} style={{ color: '#3b82f6' }}>{b.email}</a> : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>{b.region || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                        fontSize: 11, fontWeight: 600,
                        background: `${ACTIVITY_COLORS[b.activity_level] ?? '#9ca3af'}20`,
                        color: ACTIVITY_COLORS[b.activity_level] ?? '#9ca3af',
                      }}>
                        {(b.activity_level ?? 'casual').replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{(b.total_backed ?? 0).toLocaleString()}</td>
                    <td>{(b.total_comments ?? 0).toLocaleString()}</td>
                    <td style={{ fontSize: 12 }}>
                      {(b.categories_active ?? []).slice(0, 2).map((c) => (
                        <span key={c.category} className="badge badge-gray" style={{ marginRight: 3, fontSize: 11 }}>
                          {c.category}
                        </span>
                      ))}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {(b.segments ?? []).slice(0, 2).map((s) => (
                        <span key={s} className="badge badge-blue" style={{ marginRight: 3, fontSize: 11 }}>
                          {s.replace('_', ' ')}
                        </span>
                      ))}
                    </td>
                    <td style={{ fontSize: 12, color: '#666' }}>
                      {b.last_active ? new Date(b.last_active).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13 }}>Page {page} / {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
