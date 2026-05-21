import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

interface MonitoringList {
  id: string;
  name: string;
  item_count: number;
  created_at: string;
}

interface AlertRule {
  id: string;
  trigger_type: string;
  channels: string[];
  is_active: boolean;
  created_at: string;
}

const TRIGGER_TYPES = ['project_launch', 'funding_threshold', 'backer_growth_spike', 'comment_surge', 'new_reward_tier'];
const CHANNELS = ['email', 'slack', 'telegram', 'webhook'];

export default function MonitoringPage() {
  const [lists, setLists] = useState<MonitoringList[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [error, setError] = useState('');

  // Create list form
  const [showListForm, setShowListForm] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Create alert form
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [newTrigger, setNewTrigger] = useState(TRIGGER_TYPES[0]);
  const [newChannels, setNewChannels] = useState<string[]>(['email']);

  const fetchLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const res = await client.get('/monitoring-lists');
      setLists(res.data.data ?? res.data.lists ?? []);
    } catch {
      setError('Failed to load monitoring lists.');
    } finally {
      setLoadingLists(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const res = await client.get('/alerts');
      setAlerts(res.data.data ?? res.data.alerts ?? []);
    } catch {
      setError('Failed to load alert rules.');
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => { fetchLists(); fetchAlerts(); }, [fetchLists, fetchAlerts]);

  const createList = async () => {
    if (!newListName.trim()) return;
    try {
      await client.post('/monitoring-lists', { name: newListName });
      setNewListName('');
      setShowListForm(false);
      fetchLists();
    } catch {
      setError('Failed to create list.');
    }
  };

  const deleteList = async (id: string) => {
    if (!confirm('Delete this monitoring list?')) return;
    try {
      await client.delete(`/monitoring-lists/${id}`);
      fetchLists();
    } catch {
      setError('Failed to delete list.');
    }
  };

  const createAlert = async () => {
    if (!newChannels.length) return;
    try {
      await client.post('/alerts', { trigger_type: newTrigger, channels: newChannels });
      setShowAlertForm(false);
      fetchAlerts();
    } catch {
      setError('Failed to create alert rule.');
    }
  };

  const toggleAlert = async (id: string, current: boolean) => {
    try {
      await client.put(`/alerts/${id}`, { is_active: !current });
      fetchAlerts();
    } catch {
      setError('Failed to update alert.');
    }
  };

  const toggleChannel = (ch: string) =>
    setNewChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);

  return (
    <div>
      <h1 style={{ marginBottom: 20, fontSize: 22 }}>Monitoring & Alerts</h1>
      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {/* Monitoring Lists */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16 }}>Monitoring Lists</h3>
          <button className="btn btn-sm" onClick={() => setShowListForm((v) => !v)}>+ New List</button>
        </div>

        {showListForm && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 12, background: '#f9f9f9', borderRadius: 4 }}>
            <input
              placeholder="List name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm" onClick={createList}>Create</button>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowListForm(false)}>Cancel</button>
          </div>
        )}

        {loadingLists ? <p style={{ color: '#666' }}>Loading…</p> : (
          <table>
            <thead><tr><th>Name</th><th>Items</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {lists.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: 16 }}>No monitoring lists yet</td></tr>
              ) : lists.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.item_count ?? 0}</td>
                  <td>{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" style={{ marginRight: 6 }}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteList(l.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Alert Rules */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16 }}>Alert Rules</h3>
          <button className="btn btn-sm" onClick={() => setShowAlertForm((v) => !v)}>+ New Rule</button>
        </div>

        {showAlertForm && (
          <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 4, marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Trigger Type</label>
              <select value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)}>
                {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Channels</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {CHANNELS.map((ch) => (
                  <label key={ch} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={newChannels.includes(ch)} onChange={() => toggleChannel(ch)} />
                    {ch}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={createAlert}>Create</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAlertForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loadingAlerts ? <p style={{ color: '#666' }}>Loading…</p> : (
          <table>
            <thead><tr><th>Trigger Type</th><th>Channels</th><th>Active</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>No alert rules yet</td></tr>
              ) : alerts.map((a) => (
                <tr key={a.id}>
                  <td>{a.trigger_type}</td>
                  <td>{(a.channels ?? []).join(', ')}</td>
                  <td>
                    <span className={`badge ${a.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => toggleAlert(a.id, a.is_active)}>
                      {a.is_active ? 'Disable' : 'Enable'}
                    </button>
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
