import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

interface CategoryStats {
  category_slug: string;
  total_projects: number;
  successful_count: number;
  success_rate: number;
  avg_funding: number;
  avg_backers: number;
}

interface TrendItem {
  category_slug: string;
  growth_rate: number;
  confidence: number;
}

interface DashboardData {
  total_projects: number;
  success_rate: number;
  avg_funding: number;
  avg_backers: number;
  categories: CategoryStats[];
  emerging_categories: TrendItem[];
}

const CATEGORIES = [
  'all', 'art', 'comics', 'crafts', 'dance', 'design', 'fashion', 'film',
  'food', 'games', 'journalism', 'music', 'photography', 'publishing',
  'technology', 'theater',
];

export default function MarketDashboardPage() {
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState<'monthly' | 'quarterly'>('monthly');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { period };
      if (category !== 'all') params.category = category;
      const res = await client.get('/market/dashboard', { params });
      setData(res.data.data ?? res.data);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [category, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statCard = (label: string, value: string | number) => (
    <div className="card" style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#0066cc' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div>
      <h1 style={{ marginBottom: 16, fontSize: 22 }}>Market Dashboard</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: 13, marginRight: 6 }}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, marginRight: 6 }}>Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as 'monthly' | 'quarterly')}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <button className="btn" onClick={fetchData}>Refresh</button>
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p style={{ color: '#666' }}>Loading…</p>}

      {data && (
        <>
          {/* Stats cards */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            {statCard('Total Projects', (data.total_projects ?? 0).toLocaleString())}
            {statCard('Success Rate', `${((data.success_rate ?? 0) * 100).toFixed(1)}%`)}
            {statCard('Avg Funding', `$${Math.round(data.avg_funding ?? 0).toLocaleString()}`)}
            {statCard('Avg Backers', Math.round(data.avg_backers ?? 0).toLocaleString())}
          </div>

          {/* Category performance table */}
          {data.categories?.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Category Performance</h3>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Projects</th>
                    <th>Successful</th>
                    <th>Success Rate</th>
                    <th>Avg Funding</th>
                    <th>Avg Backers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((c) => (
                    <tr key={c.category_slug}>
                      <td>{c.category_slug}</td>
                      <td>{(c.total_projects ?? 0).toLocaleString()}</td>
                      <td>{(c.successful_count ?? 0).toLocaleString()}</td>
                      <td>{((c.success_rate ?? 0) * 100).toFixed(1)}%</td>
                      <td>${Math.round(c.avg_funding ?? 0).toLocaleString()}</td>
                      <td>{Math.round(c.avg_backers ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Emerging categories */}
          {data.emerging_categories?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Emerging Categories</h3>
              <table>
                <thead>
                  <tr><th>Category</th><th>Growth Rate</th><th>Confidence</th></tr>
                </thead>
                <tbody>
                  {data.emerging_categories.map((t) => (
                    <tr key={t.category_slug}>
                      <td>{t.category_slug}</td>
                      <td>+{((t.growth_rate ?? 0) * 100).toFixed(1)}%</td>
                      <td>{((t.confidence ?? 0) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
