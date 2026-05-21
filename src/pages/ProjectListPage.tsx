import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

interface Project {
  id: string;
  title: string;
  subtitle: string;
  category_canonical: string;
  category_raw: string;
  status: string;
  funding_goal_usd: number;
  funded_amount_usd: number;
  percent_funded: number;
  backer_count: number;
  launch_date: string;
  end_date: string;
  country: string;
  photo_url: string;
  staff_pick: boolean;
  url: string;
}

interface Filters {
  keyword: string;
  category: string;
  country: string;
  status: string;
  date_from: string;
  date_to: string;
  funding_min: string;
  funding_max: string;
  backers_min: string;
  backers_max: string;
  semantic: boolean;
}

const CATEGORIES = [
  '', 'art', 'comics', 'crafts', 'dance', 'design', 'fashion', 'film-video',
  'food', 'games', 'journalism', 'music', 'photography', 'publishing',
  'technology', 'theater',
];

const STATUSES = ['', 'live', 'successful', 'failed', 'canceled', 'suspended'];

function fmt(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function daysLeft(endDate: string): string {
  if (!endDate) return '—';
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (86400000));
  if (diff < 0) return 'Ended';
  if (diff === 0) return 'Last day';
  return `${diff}d left`;
}

export default function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>({
    keyword: '', category: '', country: '', status: '',
    date_from: '', date_to: '', funding_min: '', funding_max: '',
    backers_min: '', backers_max: '', semantic: false,
  });

  const pageSize = 20;

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number | boolean> = { page, limit: pageSize };
      if (filters.keyword) params[filters.semantic ? 'q_semantic' : 'q'] = filters.keyword;
      if (filters.category) params.category = filters.category;
      if (filters.country) params.country = filters.country;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.launched_after = filters.date_from;
      if (filters.date_to) params.launched_before = filters.date_to;
      if (filters.funding_min) params.pledged_min = filters.funding_min;
      if (filters.funding_max) params.pledged_max = filters.funding_max;
      if (filters.backers_min) params.backers_min = filters.backers_min;
      if (filters.backers_max) params.backers_max = filters.backers_max;
      const res = await client.get('/projects', { params });
      setProjects(res.data.data ?? res.data.projects ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const setFilter = (key: keyof Filters, value: string | boolean) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 style={{ marginBottom: 16, fontSize: 22 }}>项目库</h1>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input style={{ flex: 1 }} placeholder="搜索项目…" value={filters.keyword}
          onChange={(e) => setFilter('keyword', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchProjects()} />
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={filters.semantic} onChange={(e) => setFilter('semantic', e.target.checked)} />
          Semantic search
        </label>
        <button className="btn" onClick={() => { setPage(1); fetchProjects(); }}>搜索</button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Filter panel */}
        <aside style={{ width: 200, flexShrink: 0 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>筛选条件</h3>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>类别</label>
            <select style={{ width: '100%', marginBottom: 10 }} value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'All'}</option>)}
            </select>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>国家</label>
            <input style={{ width: '100%', marginBottom: 10 }} placeholder="e.g. US" value={filters.country} onChange={(e) => setFilter('country', e.target.value)} />
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>状态</label>
            <select style={{ width: '100%', marginBottom: 10 }} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
            </select>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>上线日期从</label>
            <input type="date" style={{ width: '100%', marginBottom: 6 }} value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} />
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>至</label>
            <input type="date" style={{ width: '100%', marginBottom: 10 }} value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} />
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>筹资金额 最低</label>
            <input type="number" style={{ width: '100%', marginBottom: 6 }} placeholder="0" value={filters.funding_min} onChange={(e) => setFilter('funding_min', e.target.value)} />
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>最高</label>
            <input type="number" style={{ width: '100%', marginBottom: 10 }} placeholder="∞" value={filters.funding_max} onChange={(e) => setFilter('funding_max', e.target.value)} />
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>支持者数 最低</label>
            <input type="number" style={{ width: '100%', marginBottom: 6 }} placeholder="0" value={filters.backers_min} onChange={(e) => setFilter('backers_min', e.target.value)} />
            <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>最高</label>
            <input type="number" style={{ width: '100%', marginBottom: 12 }} placeholder="∞" value={filters.backers_max} onChange={(e) => setFilter('backers_max', e.target.value)} />
            <button className="btn" style={{ width: '100%' }} onClick={() => { setPage(1); fetchProjects(); }}>应用筛选</button>
          </div>
        </aside>


        {/* Results */}
        <div style={{ flex: 1 }}>
          {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
          {loading ? (
            <p style={{ color: '#666' }}>Loading…</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{total} 个项目</p>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th>项目名称</th>
                      <th>类别</th>
                      <th>状态</th>
                      <th style={{ textAlign: 'right' }}>目标</th>
                      <th style={{ textAlign: 'right' }}>已筹</th>
                      <th style={{ textAlign: 'right' }}>%</th>
                      <th style={{ textAlign: 'right' }}>支持者</th>
                      <th>上线</th>
                      <th>截止</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', color: '#888', padding: 24 }}>暂无项目</td></tr>
                    ) : projects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {p.photo_url ? (
                              <img src={p.photo_url} alt="" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 3 }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div style={{ width: 40, height: 30, background: '#e5e7eb', borderRadius: 3, flexShrink: 0 }} />
                            )}
                            <div>
                              <Link to={`/projects/${p.id}`} style={{ fontWeight: 500 }}>
                                {p.title}
                                {p.staff_pick && <span title="Staff Pick" style={{ marginLeft: 4, fontSize: 11 }}>⭐</span>}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-gray" style={{ fontSize: 11 }}>{p.category_canonical || p.category_raw}</span></td>
                        <td>
                          <span className={`badge ${p.status === 'successful' ? 'badge-green' : p.status === 'live' ? 'badge-blue' : 'badge-gray'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(p.funding_goal_usd ?? 0)}</td>
                        <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{fmt(p.funded_amount_usd ?? 0)}</td>
                        <td style={{ textAlign: 'right', fontSize: 13, color: (p.percent_funded ?? 0) >= 100 ? '#10b981' : '#f59e0b' }}>
                          {(p.percent_funded ?? 0).toLocaleString()}%
                        </td>
                        <td style={{ textAlign: 'right' }}>{(p.backer_count ?? 0).toLocaleString()}</td>
                        <td style={{ fontSize: 12, color: '#666' }}>{p.launch_date || '—'}</td>
                        <td style={{ fontSize: 12, color: '#666' }}>{p.end_date ? daysLeft(p.end_date) : '—'}</td>
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
      </div>
    </div>
  );
}
