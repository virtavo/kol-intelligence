import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

interface ReportJob {
  id: string;
  report_type: string;
  format: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  created_at: string;
  download_url?: string;
}

type Format = 'xlsx' | 'csv' | 'pdf' | 'pptx';

const STANDARD_REPORTS = [
  { type: 'weekly_market_overview', label: 'Weekly Market Overview', description: 'Top 10 live projects, category performance, notable launches' },
  { type: 'monthly_category_analysis', label: 'Monthly Category Analysis', description: 'Per-category metrics for the past month' },
  { type: 'hot_project_rankings', label: 'Hot Project Rankings', description: 'Top 20 by backer count growth in past 7 days' },
  { type: 'upcoming_project_brief', label: 'Upcoming Project Brief', description: 'Coming-soon leads from the past 7 days' },
];

export default function ReportCenterPage() {
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formats, setFormats] = useState<Record<string, Format>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/reports');
      setJobs(res.data.data ?? res.data.jobs ?? []);
    } catch {
      setError('Failed to load report jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const generateReport = async (type: string) => {
    const format = formats[type] ?? 'xlsx';
    setGenerating((g) => ({ ...g, [type]: true }));
    try {
      await client.post('/reports', { report_type: type, format });
      fetchJobs();
    } catch {
      setError(`Failed to generate ${type}.`);
    } finally {
      setGenerating((g) => ({ ...g, [type]: false }));
    }
  };

  const getDownloadUrl = async (jobId: string) => {
    try {
      const res = await client.get(`/reports/${jobId}/download`);
      const url = res.data.url ?? res.data.download_url;
      if (url) window.open(url, '_blank');
    } catch {
      setError('Failed to get download link.');
    }
  };

  const statusBadge = (status: string) => {
    const cls = status === 'done' ? 'badge-green' : status === 'failed' ? 'badge-gray' : 'badge-blue';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <div>
      <h1 style={{ marginBottom: 20, fontSize: 22 }}>Report Center</h1>
      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {/* Standard report cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
        {STANDARD_REPORTS.map((r) => (
          <div key={r.type} className="card">
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>{r.label}</h3>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>{r.description}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={formats[r.type] ?? 'xlsx'}
                onChange={(e) => setFormats((f) => ({ ...f, [r.type]: e.target.value as Format }))}
                style={{ flex: 1 }}
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
                <option value="pptx">PowerPoint (.pptx)</option>
              </select>
              <button
                className="btn btn-sm"
                onClick={() => generateReport(r.type)}
                disabled={generating[r.type]}
              >
                {generating[r.type] ? '…' : 'Generate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report jobs table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16 }}>Report Jobs</h3>
          <button className="btn btn-sm btn-secondary" onClick={fetchJobs}>Refresh</button>
        </div>
        {loading ? <p style={{ color: '#666' }}>Loading…</p> : (
          <table>
            <thead>
              <tr><th>Type</th><th>Format</th><th>Status</th><th>Created</th><th>Download</th></tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>No report jobs yet</td></tr>
              ) : jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.report_type}</td>
                  <td>{j.format}</td>
                  <td>{statusBadge(j.status)}</td>
                  <td>{j.created_at ? new Date(j.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    {j.status === 'done' ? (
                      <button className="btn btn-sm" onClick={() => getDownloadUrl(j.id)}>Download</button>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
