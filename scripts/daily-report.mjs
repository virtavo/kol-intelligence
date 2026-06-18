#!/usr/bin/env node
// scripts/daily-report.mjs
// Daily KOL stats report — runs at UTC 02:30, writes to ai_outputs table

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SK  = process.env.SUPABASE_SK;
const H = { apikey: SUPABASE_SK, Authorization: `Bearer ${SUPABASE_SK}` };

async function getKols(outputType, entityId) {
  const url = `${SUPABASE_URL}/rest/v1/ai_outputs?output_type=eq.${outputType}&entity_id=eq.${entityId}&select=content`;
  const res = await fetch(url, { headers: H });
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) return [];
  let c = data[0].content;
  if (typeof c === 'string') { try { c = JSON.parse(c); } catch { return []; } }
  return Array.isArray(c) ? c : [];
}

async function saveReport(date, report) {
  // Try upsert first (if row exists); otherwise insert
  const url = `${SUPABASE_URL}/rest/v1/ai_outputs`;
  const payload = {
    output_type:   'kol_daily_report',
    entity_id:     date,
    content:       report,
    generated_at:  new Date().toISOString(),
    model_version: 'report-v1',
  };

  // Check if row exists
  const chk = await fetch(`${url}?output_type=eq.kol_daily_report&entity_id=eq.${date}&select=id`, { headers: H });
  const existing = await chk.json();

  if (Array.isArray(existing) && existing.length > 0) {
    // Update
    const res = await fetch(`${url}?output_type=eq.kol_daily_report&entity_id=eq.${date}`, {
      method: 'PATCH',
      headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ content: report, generated_at: payload.generated_at }),
    });
    return res.ok;
  } else {
    // Insert
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  }
}

async function main() {
  const today = new Date().toISOString().split('T')[0]; // e.g. "2026-06-18"

  const REGIONS = [
    { outputType: 'kol_auto_US',    entityId: 'US',        label: 'Auto US' },
    { outputType: 'kol_auto_GB',    entityId: 'GB',        label: 'Auto GB' },
    { outputType: 'kol_auto_DE',    entityId: 'DE',        label: 'Auto DE' },
    { outputType: 'kol_auto_CA',    entityId: 'CA',        label: 'Auto CA' },
    { outputType: 'kol_snapvital',  entityId: 'snapvital', label: 'SnapVital' },
  ];

  let totalNew = 0, withAudience = 0, withEmail = 0;
  const breakdown = {};

  for (const { outputType, entityId, label } of REGIONS) {
    const kols = await getKols(outputType, entityId);
    const newToday = kols.filter(k => (k.crawledAt || '').startsWith(today));

    const rAudience = newToday.filter(k =>
      (k.topics && k.topics.length > 0) || (k.channelKeywords && k.channelKeywords.length > 0)
    ).length;
    const rEmail = newToday.filter(k => k.businessEmail).length;

    totalNew      += newToday.length;
    withAudience  += rAudience;
    withEmail     += rEmail;

    breakdown[label] = {
      newKols:          newToday.length,
      withAudienceData: rAudience,
      withEmail:        rEmail,
      totalAccumulated: kols.length,
    };

    console.log(`  ${label}: +${newToday.length} 新增, ${rAudience} 有受众数据, ${rEmail} 有邮箱 (总积累: ${kols.length})`);
  }

  const audiencePct = totalNew > 0 ? Math.round(withAudience / totalNew * 100) : 0;
  const emailPct    = totalNew > 0 ? Math.round(withEmail    / totalNew * 100) : 0;

  const report = {
    reportDate:   today,
    generatedAt:  new Date().toISOString(),
    summary: {
      totalNewKols:     totalNew,
      withAudienceData: withAudience,
      audienceDataPct:  audiencePct,
      withEmail:        withEmail,
      emailCoveragePct: emailPct,
    },
    breakdown,
  };

  console.log('\n📊 ── KOL 每日汇报 ─────────────────────────────');
  console.log(`📅 日期：${today}`);
  console.log(`👥 今日新增 KOL：${totalNew}`);
  console.log(`🎯 有真实受众数据：${withAudience} (${audiencePct}%)`);
  console.log(`✉  有效邮箱：${withEmail} (${emailPct}%)`);
  console.log('────────────────────────────────────────────────\n');

  const ok = await saveReport(today, report);
  console.log(ok ? `✅ 报告已写入 Supabase (kol_daily_report / ${today})` : '❌ 写入失败');
  if (!ok) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
