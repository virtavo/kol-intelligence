import React, { useState } from 'react';
import client from '../api/client';

interface ComparisonRow {
  id: string;
  title: string;
  pledged_amount: number;
  backer_count: number;
  reward_tier_count: number;
  status: string;
  category_slug: string;
}

export default function CompetitorAnalysisPage() {
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    const ids = input.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length < 2) {
      setError('Enter at least 2 project IDs separated by commas.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/ai/competitor', { project_ids: ids });
      setRows(res.data.data ?? res.data.projects ?? []);
    } catch {
      setError('Failed to load comparison data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 16, fontSize: 22 }}>Competitor Analysis</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
          Project IDs (comma-separated)
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1 }}
            placeholder="e.g. abc123, def456, ghi789"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn" onClick={handleCompare} disabled={loading}>
            {loading ? 'Comparing…' : 'Compare'}
          </button>
        </div>
        {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
      </div>

      {rows.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Side-by-Side Comparison</h3>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Funded ($)</th>
                <th>Backers</th>
                <th>Reward Tiers</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.category_slug}</td>
                  <td>
                    <span className={`badge ${r.status === 'successful' ? 'badge-green' : r.status === 'live' ? 'badge-blue' : 'badge-gray'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>${(r.pledged_amount ?? 0).toLocaleString()}</td>
                  <td>{(r.backer_count ?? 0).toLocaleString()}</td>
                  <td>{r.reward_tier_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
