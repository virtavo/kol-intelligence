#!/usr/bin/env node
// KOL Auto-Crawl Script — runs in GitHub Actions daily
// Crawls: Auto KOL (US/GB/DE/CA) + SnapVital KOL (US health)

const YT_KEY = process.env.YT_API_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_SK  = process.env.SUPABASE_SK;

if (!YT_KEY || !SB_URL || !SB_SK) {
  console.error('❌ 缺少环境变量 YT_API_KEY / SUPABASE_URL / SUPABASE_SK');
  process.exit(1);
}

const SB_HDR = {
  'apikey': SB_SK, 'Authorization': `Bearer ${SB_SK}`,
  'Content-Type': 'application/json', 'Prefer': 'return=representation',
};

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1${path}`, { headers: SB_HDR });
  return r.json();
}
async function sbPost(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1${path}`, { method: 'POST', headers: SB_HDR, body: JSON.stringify(body) });
  return r.json();
}
async function sbPatch(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1${path}`, { method: 'PATCH', headers: SB_HDR, body: JSON.stringify(body) });
  return r.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractEmail(ch) {
  const text = [ch.snippet?.description, ch.brandingSettings?.channel?.description].filter(Boolean).join(' ');
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
  return match.find(e => !e.includes('noreply') && !e.includes('example')) || null;
}

const ALL_CN = {
  US:'United States',GB:'United Kingdom',DE:'Germany',CA:'Canada',
  AU:'Australia',IN:'India',FR:'France',AT:'Austria',CH:'Switzerland',
  JP:'Japan',KR:'South Korea',BR:'Brazil',MX:'Mexico',ES:'Spain',IT:'Italy',
  NL:'Netherlands',PL:'Poland',SE:'Sweden',NO:'Norway',DK:'Denmark',FI:'Finland',
  TR:'Turkey',RU:'Russia',ZA:'South Africa',NG:'Nigeria',ID:'Indonesia',
  PH:'Philippines',TH:'Thailand',VN:'Vietnam',MY:'Malaysia',SG:'Singapore',
  HK:'Hong Kong',TW:'Taiwan',AR:'Argentina',NZ:'New Zealand',IE:'Ireland',
  IL:'Israel',SA:'Saudi Arabia',AE:'United Arab Emirates',
};

async function getChannelIDs(keyword, regionCode, pages = 2) {
  const ids = []; let pageToken = '';
  const since = new Date(); since.setDate(since.getDate() - 30);
  const publishedAfter = since.toISOString();
  for (let p = 0; p < pages; p++) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('q', keyword);
    url.searchParams.set('regionCode', regionCode);
    url.searchParams.set('relevanceLanguage', regionCode === 'DE' ? 'de' : 'en');
    url.searchParams.set('publishedAfter', publishedAfter);
    url.searchParams.set('key', YT_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const data = await (await fetch(url)).json();
    if (data.error) { console.warn(`  ⚠ Search error: ${data.error.message}`); break; }
    ids.push(...(data.items || []).map(i => i.snippet?.channelId).filter(Boolean));
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
    await sleep(300);
  }
  return ids;
}

async function getChannelDetails(ids) {
  const result = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${batch.join(',')}&key=${YT_KEY}`;
    const data = await (await fetch(url)).json();
    if (!data.error) result.push(...(data.items || []));
    await sleep(300);
  }
  return result;
}

function toKOL(ch, code, keyword = '') {
  const sub  = parseInt(ch.statistics?.subscriberCount || '0');
  const vid  = parseInt(ch.statistics?.videoCount || '1');
  const view = parseInt(ch.statistics?.viewCount || '0');
  const avg  = Math.round(view / Math.max(vid, 1));
  const realCode = ch.snippet?.country || code;
  return {
    channelId: ch.id,
    title: ch.snippet?.title || '',
    description: (ch.snippet?.description || '').slice(0, 300),
    thumbnailUrl: ch.snippet?.thumbnails?.default?.url || '',
    channelUrl: `https://www.youtube.com/channel/${ch.id}`,
    country: ALL_CN[realCode] || realCode,
    countryCode: code,
    channelCountryCode: realCode,
    subscriberCount: sub,
    videoCount: vid,
    viewCount: view,
    avgViewsPerVideo: avg,
    engagementRate: sub > 0 ? Math.round(avg / sub * 1000) / 10 : 0,
    uploadFrequencyPerMonth: Math.round(vid / 36 * 10) / 10,
    businessEmail: extractEmail(ch),
    keyword,
    status: 'new', notes: '', starred: false,
    crawledAt: new Date().toISOString(),
  };
}

async function saveToSupabase(outputType, entityId, newChannels) {
  const existing = await sbGet(`/ai_outputs?output_type=eq.${outputType}&limit=1`);
  let old = [];
  try { if (existing.length) old = JSON.parse(existing[0].content || '[]'); } catch {}
  const map = new Map(old.map(c => [c.channelId, c]));
  let added = 0;
  for (const ch of newChannels) {
    if (!map.has(ch.channelId)) { map.set(ch.channelId, ch); added++; }
    else {
      const o = map.get(ch.channelId);
      map.set(ch.channelId, { ...ch, status: o.status || 'new', notes: o.notes || '', starred: o.starred ?? false, crawledAt: o.crawledAt });
    }
  }
  const merged = Array.from(map.values());
  const payload = { output_type: outputType, entity_id: entityId, content: JSON.stringify(merged), generated_at: new Date().toISOString(), model_version: 'cron-v1' };
  if (existing.length) await sbPatch(`/ai_outputs?output_type=eq.${outputType}`, payload);
  else await sbPost('/ai_outputs', payload);
  return { added, total: merged.length };
}

// ── KW lists ──────────────────────────────────────────────────────
const AUTO_KW = {
  US: ['smart home gadgets review','home security camera review','kickstarter tech unboxing','crowdfunding products review','tech gadgets 2025','smart home automation review','best smart home devices','wireless security camera test','indoor security camera review','outdoor security camera review','wifi camera review','tech product review channel','unboxing tech gadgets','new gadgets review 2025','best tech products amazon','home office tech setup','consumer electronics review','smart doorbell review','baby monitor review','home surveillance system review'],
  GB: ['tech review uk','smart home uk review','home security uk','gadget unboxing uk','best tech gadgets uk','security camera uk review','wifi camera uk test','tech youtuber uk','consumer tech uk','amazon uk tech finds','smart heating review uk','smart lighting uk','wearable tech uk','british tech reviewer','surveillance camera uk','cctv review uk','outdoor camera uk review','indoor camera uk','baby cam uk review','mesh wifi uk'],
  DE: ['technik test deutsch','smart home deutsch review','sicherheitskamera test','gadget unboxing deutsch','heimüberwachung test','smarte geräte test','wlan kamera test deutsch','türklingel kamera test','überwachungskamera vergleich','smart home einsteiger deutsch','iot geräte test','hausautomation deutsch','amazon produkte test deutsch','outdoor kamera test deutsch','indoor kamera test','babyphone test deutsch','crowdfunding deutsch produkte','neue gadgets 2025 deutsch','netzwerkkamera test','mesh wlan test'],
  CA: ['tech review canada','smart home canada review','home security canada','gadgets canada review','best tech canada 2025','security camera canada review','wifi camera canada','canadian tech reviewer','tech youtuber canada','amazon canada tech finds','home automation canada','outdoor camera canada','indoor security cam canada','baby monitor canada review','wearable tech canada','drone review canada','smart speaker canada review','crowdfunding products canada','new gadgets canada 2025','mesh wifi canada review'],
};

const SV_KW = ['blood pressure monitor review','blood pressure cuff test','home blood pressure monitor','health gadget review','senior health tech','medical device review','heart health monitor','blood pressure management','hypertension tips','health monitoring wearable','health tech review','elderly care health tech','home health care device','wellness gadgets review','heart health tips','nurse health advice','chronic illness health','blood pressure accuracy test','omron blood pressure review','withings health monitor'];

const SV_CATS = {'blood pressure monitor':'Blood Pressure','blood pressure cuff':'Blood Pressure','blood pressure':'Blood Pressure','health gadget':'Health Tech','health tech':'Health Tech','medical device':'Medical','wearable':'Health Tech','senior health':'Senior Health','elderly':'Senior Health','nurse':'Medical','heart health':'Blood Pressure','hypertension':'Blood Pressure','omron':'Blood Pressure','withings':'Health Tech'};

// ── Main ──────────────────────────────────────────────────────────
async function crawlAutoKOL() {
  console.log('\n=== Auto KOL Crawl ===');
  for (const [code, keywords] of Object.entries(AUTO_KW)) {
    console.log(`\n🌍 ${code} (${keywords.length} keywords)...`);
    const seen = new Set(); const allIds = []; const kwMap = {};
    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      const ids = (await getChannelIDs(kw, code, 2)).filter(id => !seen.has(id));
      ids.forEach(id => { seen.add(id); if (!kwMap[id]) kwMap[id] = kw; });
      allIds.push(...ids);
      process.stdout.write(`  [${i+1}/${keywords.length}] +${ids.length} → ${allIds.length} total\r`);
      await sleep(200);
    }
    console.log(`\n  📥 Fetching details for ${allIds.length} channels...`);
    const raw = await getChannelDetails(allIds);
    const kols = raw
      .filter(ch => { const c = ch.snippet?.country; return !c || c === code; })
      .map(ch => toKOL(ch, code, kwMap[ch.id] || ''))
      .filter(k => k.subscriberCount >= 500 && k.subscriberCount < 100000 && k.videoCount >= 3 && k.businessEmail !== null);
    const { added, total } = await saveToSupabase(`kol_auto_${code}`, code, kols);
    console.log(`  ✅ ${code}: +${added} new, ${total} total, ${kols.filter(k=>k.businessEmail).length} with email`);
  }
}

async function crawlSnapVital() {
  console.log('\n=== SnapVital KOL Crawl ===');
  const seen = new Set(); const allIds = []; const kwMap = {};
  for (let i = 0; i < SV_KW.length; i++) {
    const kw = SV_KW[i];
    const ids = (await getChannelIDs(kw, 'US', 2)).filter(id => !seen.has(id));
    ids.forEach(id => { seen.add(id); if (!kwMap[id]) kwMap[id] = kw; });
    allIds.push(...ids);
    process.stdout.write(`  [${i+1}/${SV_KW.length}] +${ids.length} → ${allIds.length} total\r`);
    await sleep(200);
  }
  console.log(`\n  📥 Fetching details for ${allIds.length} channels...`);
  const raw = await getChannelDetails(allIds);
  const channels = raw
    .filter(ch => { const c = ch.snippet?.country; return !c || c === 'US'; })
    .map(ch => {
      const kol = toKOL(ch, 'US', kwMap[ch.id] || '');
      const kw = (kwMap[ch.id] || '').toLowerCase();
      let cat = 'Health & Wellness';
      for (const [k, v] of Object.entries(SV_CATS)) { if (kw.includes(k)) { cat = v; break; } }
      return { ...kol, category: cat, matchedKeyword: kwMap[ch.id] || '' };
    })
    .filter(k => k.subscriberCount >= 1000 && k.subscriberCount < 500000 && k.businessEmail !== null);
  const { added, total } = await saveToSupabase('kol_snapvital', 'snapvital', channels);
  console.log(`  ✅ SnapVital: +${added} new, ${total} total`);
}

(async () => {
  const start = Date.now();
  console.log(`🚀 KOL Crawl started at ${new Date().toISOString()}`);
  try {
    await crawlAutoKOL();
    await crawlSnapVital();
    console.log(`\n🎉 All done in ${((Date.now()-start)/1000/60).toFixed(1)} min`);
  } catch (e) {
    console.error('❌ Fatal error:', e.message);
    process.exit(1);
  }
})();
