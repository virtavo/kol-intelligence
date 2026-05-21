import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AuditEntry {
  id: string;
  user_id: string;
  event_type: string;
  resource: string;
  created_at: string;
  ip_address: string;
}

const ROLES = ['super_admin', 'analyst', 'business_user', 'guest', 'api_client'];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState('');

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('analyst');
  const [newPassword, setNewPassword] = useState('');

  // Edit user
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');

  // Audit log filters
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await client.get('/admin/users');
      setUsers(res.data.data ?? res.data.users ?? []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchAuditLog = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params: Record<string, string> = {};
      if (auditFrom) params.from = auditFrom;
      if (auditTo) params.to = auditTo;
      const res = await client.get('/admin/audit-log', { params });
      setAuditLog(res.data.data ?? res.data.entries ?? []);
    } catch {
      setError('Failed to load audit log.');
    } finally {
      setLoadingAudit(false);
    }
  }, [auditFrom, auditTo]);

  useEffect(() => { fetchUsers(); fetchAuditLog(); }, [fetchUsers, fetchAuditLog]);

  const createUser = async () => {
    if (!newEmail || !newPassword) return;
    try {
      await client.post('/admin/users', { email: newEmail, role: newRole, password: newPassword });
      setNewEmail(''); setNewRole('analyst'); setNewPassword('');
      setShowCreateForm(false);
      fetchUsers();
    } catch {
      setError('Failed to create user.');
    }
  };

  const saveEdit = async (id: string) => {
    try {
      await client.put(`/admin/users/${id}`, { role: editRole });
      setEditingId(null);
      fetchUsers();
    } catch {
      setError('Failed to update user.');
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await client.put(`/admin/users/${u.id}`, { is_active: !u.is_active });
      fetchUsers();
    } catch {
      setError('Failed to update user.');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await client.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch {
      setError('Failed to delete user.');
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 20, fontSize: 22 }}>Admin Panel</h1>
      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {/* Users table */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16 }}>Users</h3>
          <button className="btn btn-sm" onClick={() => setShowCreateForm((v) => !v)}>+ Create User</button>
        </div>

        {showCreateForm && (
          <div style={{ padding: 14, background: '#f9f9f9', borderRadius: 4, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>Email</label>
                <input type="email" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>Password</label>
                <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button className="btn btn-sm" onClick={createUser}>Create</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loadingUsers ? <p style={{ color: '#666' }}>Loading…</p> : (
          <table>
            <thead>
              <tr><th>Email</th><th>Role</th><th>Active</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    {editingId === u.id ? (
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className="badge badge-blue">{u.role}</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {editingId === u.id ? (
                      <>
                        <button className="btn btn-sm" onClick={() => saveEdit(u.id)}>Save</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setEditingId(u.id); setEditRole(u.role); }}>Edit</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(u)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit log */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Audit Log</h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>From</label>
            <input type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>To</label>
            <input type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} />
          </div>
          <button className="btn btn-sm" onClick={fetchAuditLog}>Filter</button>
        </div>

        {loadingAudit ? <p style={{ color: '#666' }}>Loading…</p> : (
          <table>
            <thead>
              <tr><th>Date</th><th>User</th><th>Event</th><th>Resource</th><th>IP</th></tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>No audit entries</td></tr>
              ) : auditLog.map((e) => (
                <tr key={e.id}>
                  <td>{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</td>
                  <td style={{ fontSize: 12 }}>{e.user_id}</td>
                  <td>{e.event_type}</td>
                  <td>{e.resource}</td>
                  <td style={{ fontSize: 12 }}>{e.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
