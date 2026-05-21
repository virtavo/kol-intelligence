import React, { useState, useEffect, useRef } from 'react';
import client from '../api/client';

interface ApolloStatus {
  configured: boolean;
  state: {
    status: 'idle' | 'running' | 'done' | 'error';
    processed: number;
    matched: number;
    verified: number;
    total: number;
    offset: number;
    log: string[];
    startedAt: string;
    finishedAt: string;
  };
  saved: {
    total_processed: number;
    matched: number;
    verified_emails: number;
    last_offset: number;
    results_count: number;
  };
  total_backers: number;
}

const STATUS_COLOR: Record<string, string> = {
  idle: '#6b7280', running: '#f59e0b', done: '#10b981', error: '#ef4444',
};

export default function ApolloEnrichPage() {
  const [status, setStatus] = useState<ApolloStatus | null>(null);
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState('');
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const r = await client.get('/apollo/status');
      setStatus(r.data);
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startEnrichment = async () => {
    setLoading(true); setError('');
    try {
      const offset = status?.saved.last_offset ?? 0;
      await client.post('/apollo/start', { limit, offset });
      await fetchStatus();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to start';
      setError(msg);
    } finally { setLoading(false); }
  };

  const applyEmails = async () => {
    setApplyLoading(true); setApplyResult('');
    try {
      const r = await client.post('/apollo/apply', {});
      setApplyResult(`✅ ${r.data.message}`);
      await fetchStatus();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Apply failed';
      setApplyResult(`❌ ${msg}`);
    } finally { setApplyLoading(false); }
  };

  const isRunning = status?.state.status === 'running';
  const totalProcessed = status?.saved.total_processed ?? 0;
  const totalBackers   = status?.total_backers ?? 30000;
  const matchRate      = totalProcessed > 0
    ? Math.round((status?.saved.matched ?? 0) / totalProcessed * 100) : 0;
  const progressPct    = Math.round(totalProcessed / totalBackers * 100);

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Apollo.io 邮箱富化</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          通过 Apollo.io 为 Kickstarter backer 匹配真实注册邮箱，用于 EDM 精准触达。
        </p>
      </div>

      {/* Config alert */}
      {status && !status.configured && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '14px 18px', marginBottom: 20 }}>
          <strong>⚠ 未配置 Apollo API Key</strong>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#92400e' }}>
            在项目根目录 <code>.env</code> 文件中添加：<br />
            <code style={{ background: '#fde68a', padding: '2px 6px', borderRadius: 4 }}>APOLLO_API_KEY=your-api-key</code><br />
            然后重启服务器。获取 API Key：
            <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" rel="noreferrer"
              style={{ marginLeft: 6, color: '#d97706' }}>
              Apollo Settings → API Keys →
            </a>
          </p>
        </div>
      )}

      {/* Stats cards */}
      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: '总 Backer 数', value: totalBackers.toLocaleString(), color: '#3b82f6' },
            { label: '已处理', value: `${totalProcessed.toLocaleString()} (${progressPct}%)`, color: '#8b5cf6' },
            { label: '匹配成功', value: `${(status.saved.matched ?? 0).toLocaleString()} (${matchRate}%)`, color: '#10b981' },
            { label: '已验证邮箱', value: (status.saved.verified_emails ?? 0).toLocaleString(), color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Overall progress bar */}
      {status && totalProcessed > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>总进度</span>
            <span style={{ color: '#6b7280' }}>{totalProcessed.toLocaleString()} / {totalBackers.toLocaleString()}</span>
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: 999, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 999, transition: 'width 0.4s' }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
            预计剩余：{(totalBackers - totalProcessed).toLocaleString()} 条 ≈ {Math.ceil((totalBackers - totalProcessed) / 1000)} 批次（每批 1,000 credits）
          </div>
        </div>
      )}

      {/* Control panel */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>启动富化批次</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 4 }}>
              本批处理数量
            </label>
            <select value={limit} onChange={e => setLimit(parseInt(e.target.value))}
              style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', fontSize: 14 }}>
              <option value={50}>50（Free 计划）</option>
              <option value={100}>100</option>
              <option value={500}>500（Basic $49/mo）</option>
              <option value={1000}>1,000（Pro $79/mo）</option>
              <option value={2000}>2,000（Org $99/mo）</option>
            </select>
          </div>

          <div style={{ paddingTop: 20 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
              从偏移量 <strong>{status?.saved.last_offset ?? 0}</strong> 继续
            </div>
          </div>

          <div style={{ paddingTop: 20, marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={startEnrichment}
              disabled={isRunning || loading || !status?.configured}
              style={{
                background: isRunning ? '#f3f4f6' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: isRunning ? '#9ca3af' : '#fff',
                border: 'none', borderRadius: 8, padding: '9px 20px',
                fontWeight: 600, fontSize: 14, cursor: isRunning || !status?.configured ? 'not-allowed' : 'pointer',
              }}>
              {isRunning ? '⏳ 运行中…' : loading ? '启动中…' : '▶ 开始富化'}
            </button>
          </div>
        </div>

        {error && <div style={{ marginTop: 10, color: '#ef4444', fontSize: 13 }}>❌ {error}</div>}

        {/* Status badge */}
        {status && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: STATUS_COLOR[status.state.status] + '20',
              color: STATUS_COLOR[status.state.status],
              padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            }}>
              {status.state.status.toUpperCase()}
            </span>
            {isRunning && (
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                本批: {status.state.processed}/{status.state.total} — 匹配 {status.state.matched} — 已验证 {status.state.verified}
              </span>
            )}
            {status.state.finishedAt && (
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                完成于 {new Date(status.state.finishedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Log console */}
      {status && status.state.log.length > 0 && (
        <div style={{ background: '#111827', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 8, fontFamily: 'monospace' }}>ENRICHMENT LOG</div>
          <div ref={logRef} style={{ maxHeight: 200, overflowY: 'auto' }}>
            {status.state.log.map((line, i) => (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: '#d1fae5', lineHeight: 1.6 }}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Apply to backers */}
      {status && (status.saved.matched ?? 0) > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '18px 22px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
            ✅ 将富化邮箱写入 Backer 数据库
          </h3>
          <p style={{ fontSize: 13, color: '#166534', marginBottom: 14 }}>
            已匹配 <strong>{status.saved.matched}</strong> 个真实邮箱。点击下方将其更新到 Backer 列表，同步后可直接用于 Mailchimp EDM 发送。
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={applyEmails} disabled={applyLoading}
              style={{
                background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 20px', fontWeight: 600, fontSize: 14,
                cursor: applyLoading ? 'not-allowed' : 'pointer',
              }}>
              {applyLoading ? '写入中…' : '💾 写入 Backer 数据库'}
            </button>
            {applyResult && <span style={{ fontSize: 13, color: applyResult.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{applyResult}</span>}
          </div>
        </div>
      )}

      {/* Plan pricing guide */}
      <div style={{ marginTop: 28, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 22px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Apollo.io 套餐参考（按 30,000 backers）</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['套餐', '月费', '邮箱 Credits/月', '处理 30k 需要', '匹配率'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Free',         '免费',   '50',    '600 个月',  '~30%'],
              ['Basic',        '$49',   '1,000', '30 个月',   '~35%'],
              ['Professional', '$79',   '2,000', '15 个月',   '~35%'],
              ['Organization', '$99',   '4,000', '8 个月',    '~40%'],
              ['批量导出',      '$149+',  '无限*', '1 次导出',  '~40%'],
            ].map(([plan, price, credits, duration, rate]) => (
              <tr key={plan} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '9px 12px', fontWeight: plan === 'Organization' ? 600 : 400 }}>{plan}</td>
                <td style={{ padding: '9px 12px', color: '#6b7280' }}>{price}</td>
                <td style={{ padding: '9px 12px' }}>{credits}</td>
                <td style={{ padding: '9px 12px', color: '#6b7280' }}>{duration}</td>
                <td style={{ padding: '9px 12px', color: '#10b981', fontWeight: 600 }}>{rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>
          * 批量导出需联系 Apollo 销售团队。匹配率指有企业/LinkedIn 关联邮箱的 Kickstarter 活跃用户比例，消费类项目 backer 匹配率通常 25-40%。
        </p>
      </div>
    </div>
  );
}
