import axios from 'axios';
const SB='https://grogrigybgimvuuunxef.supabase.co';
const AK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2dyaWd5YmdpbXZ1dXVueGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTU2OTgsImV4cCI6MjA5NDM3MTY5OH0.3FsDjzkqDTVxs7mMogdXBxrUw8qUgrLdF3MJhG02HI0';
const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2dyaWd5YmdpbXZ1dXVueGVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc5NTY5OCwiZXhwIjoyMDk0MzcxNjk4fQ.dJsia7Vi5HatgpZsy6HscaAb1G9ChCl0IVKbgnH8DpE';
const sb=axios.create({baseURL:`${SB}/rest/v1`,headers:{apikey:AK,Authorization:`Bearer ${SK}`,'Content-Type':'application/json',Prefer:'return=representation'}});
const KW:Record<string,string[]>={US:['smart home gadgets review','home security camera review','kickstarter tech unboxing','crowdfunding products review','tech gadgets 2024','smart home automation review','best smart home devices','wireless security camera test','iot devices review','amazon finds tech gadgets','cool tech gadgets under 100','home improvement tech review','smart doorbell review','baby monitor review','indoor security camera review','outdoor security camera review','wifi camera review','tech product review channel','unboxing tech gadgets','new gadgets review 2024','best tech products amazon','productivity gadgets review','home office tech setup','consumer electronics review','wearable tech review','drone review channel','robot vacuum review','smart speaker review','mesh wifi review','crowdfunding campaign review','indiegogo product review','home surveillance system review','hidden camera review','nanny cam review','small business tech review'],GB:['tech review uk','smart home uk review','home security uk','gadget unboxing uk','kickstarter review uk','best tech gadgets uk','smart home automation uk','security camera uk review','wifi camera uk test','tech youtuber uk','consumer tech uk','amazon uk tech finds','budget tech review uk','home improvement tech uk','smart heating review uk','smart lighting uk','iot uk review','wearable tech uk','british tech reviewer','tech deals uk','crowdfunding uk products','new tech products uk 2024','home automation uk youtuber','surveillance camera uk','cctv review uk','outdoor camera uk review','indoor camera uk','baby cam uk review','small business tech uk','productivity tools review uk','startup gadget uk','streaming device review uk','ring doorbell alternative uk','indiegogo uk review','mesh wifi uk'],DE:['technik test deutsch','smart home deutsch review','sicherheitskamera test','gadget unboxing deutsch','kickstarter deutsch','heimüberwachung test','smarte geräte test','wlan kamera test deutsch','türklingel kamera test','überwachungskamera vergleich','smart home einsteiger deutsch','iot geräte test','technik youtuber deutsch','hausautomation deutsch','amazon produkte test deutsch','günstige technik test','verbrauchertest technik','outdoor kamera test deutsch','indoor kamera test','babyphone test deutsch','produkttest tech deutsch','crowdfunding deutsch produkte','neue gadgets 2024 deutsch','smarthome alexa test','homekit geräte test','netzwerkkamera test','home security system test','roboterstaubsauger test','mesh wlan test','smarte beleuchtung test','tech deals deutsch','unboxing technik deutsch','zigbee geräte test','sprachassistent deutsch','heimkino technik deutsch'],CA:['tech review canada','smart home canada review','home security canada','gadgets canada review','kickstarter canada','best tech canada 2024','smart home setup canada','security camera canada review','wifi camera canada','canadian tech reviewer','tech youtuber canada','amazon canada tech finds','budget gadgets canada','home automation canada','ring doorbell canada review','outdoor camera canada','indoor security cam canada','baby monitor canada review','iot devices canada','consumer electronics canada','wearable tech canada','drone review canada','smart speaker canada review','streaming device canada','crowdfunding products canada','new gadgets canada 2024','productivity tech canada','home office setup canada','small business tech canada','startup gadgets canada','tech deals canada','unboxing canada tech','mesh wifi canada review','robot vacuum canada test','indiegogo canada review']};
const CN:Record<string,string>={US:'United States',GB:'United Kingdom',DE:'Germany',CA:'Canada'};
const CF:Record<string,string>={US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',CA:'🇨🇦',AU:'🇦🇺',IN:'🇮🇳',FR:'🇫🇷',AT:'🇦🇹',CH:'🇨🇭',Other:'🌍'};
declare global{interface Window{_kolProgress:string[];_kolDone:boolean;}}
async function getIDs(kw:string,code:string,apiKey:string,pages=3):Promise<string[]>{
  const ids:string[]=[]; let pt='';
  for(let p=0;p<pages;p++){
    const u=new URL('https://www.googleapis.com/youtube/v3/search');
    ['part','snippet','type','channel','maxResults','50','q',kw,'regionCode',code,'relevanceLanguage',code==='DE'?'de':'en','key',apiKey].reduce((acc,v,i,arr)=>{if(i%2===0)u.searchParams.set(v,arr[i+1]);return acc;},null);
    if(pt)u.searchParams.set('pageToken',pt);
    const d=await(await fetch(u.toString())).json();
    if(d.error){console.warn(d.error.message);break;}
    ids.push(...(d.items||[]).map((i:any)=>i.id?.channelId).filter(Boolean));
    pt=d.nextPageToken||''; if(!pt)break;
    await new Promise(r=>setTimeout(r,200));
  }
  return ids;
}
async function getDetails(ids:string[],apiKey:string):Promise<any[]>{
  const res:any[]=[];
  for(let i=0;i<ids.length;i+=50){
    const d=await(await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${ids.slice(i,i+50).join(',')}&key=${encodeURIComponent(apiKey)}`)).json();
    if(!d.error)res.push(...(d.items||[]));
    await new Promise(r=>setTimeout(r,200));
  }
  return res;
}
function getEmail(ch:any):string|null{
  const s=[ch.snippet?.description,ch.brandingSettings?.channel?.description].filter(Boolean).join(' ');
  return(s.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)||[]).find(e=>!e.includes('noreply')&&!e.includes('example'))||null;
}
function toKOL(ch:any,code:string,kw:string):any{
  const sub=parseInt(ch.statistics?.subscriberCount||'0'),vid=parseInt(ch.statistics?.videoCount||'1'),view=parseInt(ch.statistics?.viewCount||'0'),avg=Math.round(view/Math.max(vid,1));
  return{channelId:ch.id,title:ch.snippet?.title||'',description:(ch.snippet?.description||'').slice(0,300),thumbnailUrl:ch.snippet?.thumbnails?.default?.url||'',channelUrl:`https://www.youtube.com/channel/${ch.id}`,country:CN[code]||code,countryCode:code,subscriberCount:sub,videoCount:vid,viewCount:view,avgViewsPerVideo:avg,engagementRate:sub>0?Math.round(avg/sub*1000)/10:0,uploadFrequencyPerMonth:Math.round(vid/36*10)/10,businessEmail:getEmail(ch),keyword:kw,status:'new',notes:'',crawledAt:new Date().toISOString(),isActive:sub>1000&&vid>5};
}
async function crawlCountry(code:string,apiKey:string,log:(m:string)=>void){
  const kws=KW[code]||[],seen=new Set<string>(),allIds:string[]=[];
  log(`🔍 ${code}：${kws.length} 个关键词...`);
  for(let i=0;i<kws.length;i++){
    try{const ids=(await getIDs(kws[i],code,apiKey,3)).filter(id=>!seen.has(id));ids.forEach(id=>seen.add(id));allIds.push(...ids);log(`  [${i+1}/${kws.length}] "${kws[i]}" +${ids.length} (${allIds.length})`);}
    catch(e:any){log(`  ⚠ ${e.message}`);}
    await new Promise(r=>setTimeout(r,300));
  }
  log(`📥 获取 ${allIds.length} 个频道详情...`);
  const raw=await getDetails(allIds,apiKey);
  const kols=raw.map(ch=>toKOL(ch,code,'')).filter(k=>k.subscriberCount>=500&&k.videoCount>=3);
  log(`✅ ${code}：${kols.length} 个，邮箱 ${kols.filter((k:any)=>k.businessEmail).length} 个`);
  return kols;
}
async function saveKOL(code:string,newChs:any[]):Promise<{added:number,total:number}>{
  const type=`kol_auto_${code}`;
  const ex=await sb.get(`/ai_outputs?output_type=eq.${type}&limit=1`);
  let old:any[]=[];try{if(ex.data.length)old=JSON.parse(ex.data[0].content||'[]');}catch{}
  const map=new Map(old.map((c:any)=>[c.channelId,c]));
  let added=0;
  for(const ch of newChs){
    if(!map.has(ch.channelId)){map.set(ch.channelId,ch);added++;}
    else{const o=map.get(ch.channelId)!;map.set(ch.channelId,{...ch,status:o.status||'new',notes:o.notes||'',starred:o.starred??false,crawledAt:o.crawledAt,updatedAt:new Date().toISOString()});}
  }
  const merged=Array.from(map.values());
  const payload={output_type:type,entity_id:code,content:JSON.stringify(merged),generated_at:new Date().toISOString(),model_version:'yt-v3-acc'};
  if(ex.data.length)await sb.patch(`/ai_outputs?output_type=eq.${type}`,payload);
  else await sb.post('/ai_outputs',payload);
  return{added,total:merged.length};
}
async function loadKOL(code:string):Promise<any[]>{
  const r=await sb.get(`/ai_outputs?output_type=eq.kol_auto_${code}&limit=1`);
  if(!r.data.length)return[];try{return JSON.parse(r.data[0].content||'[]');}catch{return[];}
}
async function getStatus(){
  const rows=await sb.get('/ai_outputs?output_type=in.(kol_auto_US,kol_auto_GB,kol_auto_DE,kol_auto_CA)');
  const s:any={crawledAt:null,countries:{},totalCount:0};
  for(const r of rows.data){const ch=JSON.parse(r.content||'[]');s.countries[r.entity_id]={count:ch.length,withEmail:ch.filter((c:any)=>c.businessEmail).length,updatedAt:r.generated_at};s.totalCount+=ch.length;if(!s.crawledAt||r.generated_at>s.crawledAt)s.crawledAt=r.generated_at;}
  return s;
}
async function countRows(t:string,p=''):Promise<number>{const r=await sb.get(`/${t}?select=id${p?'&'+p:''}`,{headers:{Prefer:'count=exact'}});return parseInt((r.headers['content-range']||'').split('/')[1]||'0')||0;}
const client={
  get:async(url:string,cfg?:any)=>{
    const p=cfg?.params||{},ps=Math.min(parseInt(p.pageSize||'20'),100),off=(parseInt(p.page||'1')-1)*ps;
    if(url==='/kol/auto/status')return{data:await getStatus()};
    if(url==='/kol/auto/all'){const[us,gb,de,ca]=await Promise.all([loadKOL('US'),loadKOL('GB'),loadKOL('DE'),loadKOL('CA')]);return{data:{countries:{US:us,GB:gb,DE:de,CA:ca},total:us.length+gb.length+de.length+ca.length}};}
    if(url==='/projects'){const[r,t]=await Promise.all([sb.get(`/projects?select=*&order=created_at.desc&limit=${ps}&offset=${off}`),countRows('projects')]);return{data:{projects:r.data,total:t}};}
    if(url.match(/^\/projects\/[^/]+$/)&&!url.includes('/similar')){const r=await sb.get(`/projects?id=eq.${url.split('/')[2]}&limit=1`);if(!r.data.length)throw{response:{status:404}};return{data:r.data[0]};}
    if(url.includes('/similar')){const s=await sb.get(`/projects?id=eq.${url.split('/')[2]}&select=category_canonical&limit=1`);if(!s.data.length)return{data:{projects:[]}};return{data:{projects:(await sb.get(`/projects?category_canonical=eq.${s.data[0].category_canonical}&id=neq.${url.split('/')[2]}&limit=5`)).data}};}
    if(url==='/backers'){const[r,t]=await Promise.all([sb.get(`/backers?select=*&is_deleted=eq.false&order=value_score.desc.nullslast&limit=${ps}&offset=${off}`),countRows('backers','is_deleted=eq.false')]);return{data:{backers:r.data,total:t}};}
    if(url.match(/^\/backers\/[^/]+$/)){const r=await sb.get(`/backers?id=eq.${url.split('/')[2]}&limit=1`);if(!r.data.length)throw{response:{status:404}};return{data:r.data[0]};}
    if(url==='/monitoring-lists')return{data:{monitoringLists:(await sb.get('/monitoring_lists?select=*&order=created_at.desc')).data}};
    if(url==='/alerts')return{data:{alerts:(await sb.get('/alert_rules?select=*&order=created_at.desc')).data}};
    if(url==='/reports')return{data:{reports:(await sb.get('/report_jobs?select=*&order=created_at.desc&limit=50')).data}};
    if(url==='/admin/users')return{data:{users:(await sb.get('/users?select=id,email,role,is_active,created_at&order=created_at.desc')).data}};
    if(url==='/admin/audit-log')return{data:{logs:(await sb.get('/audit_log?select=*&order=occurred_at.desc&limit=100')).data}};
    if(url==='/market/dashboard'){const all=(await sb.get('/projects?select=status,category_canonical,funded_amount_usd&limit=1000')).data;const m:any={};all.forEach((p:any)=>{const c=p.category_canonical||'other';if(!m[c])m[c]={category:c,count:0,totalFunding:0,successCount:0};m[c].count++;m[c].totalFunding+=(p.funded_amount_usd||0);if(p.status==='successful')m[c].successCount++;});return{data:{totalProjects:all.length,liveProjects:all.filter((p:any)=>p.status==='live').length,successfulProjects:all.filter((p:any)=>p.status==='successful').length,avgFundingUsd:all.length?Math.round(all.reduce((s:number,p:any)=>s+(p.funded_amount_usd||0),0)/all.length):0,byCategory:Object.values(m).map((c:any)=>({...c,avgFunding:c.count?Math.round(c.totalFunding/c.count):0,successRate:c.count?Math.round(c.successCount/c.count*100)/100:0}))}};}
    if(url==='/health')return{data:{status:'ok',db:'supabase',timestamp:new Date().toISOString()}};
    if(url.startsWith('/mailchimp'))return{data:{connected:false,campaigns:[],templates:[],history:[],automations:[]}};
    if(url.startsWith('/crawl')||url.startsWith('/apollo'))return{data:{status:'idle',log:[]}};
    if(url==='/leads')return{data:{leads:[],total:0}};
    return{data:{}};
  },
  post:async(url:string,data:any={})=>{
    if(url==='/auth/login')return{data:{accessToken:`mock-jwt-${Date.now()}`,user:{userId:'dev-001',email:data.email||'admin@kip.dev',role:'super_admin'}}};
    if(url==='/kol/auto/trigger'){
      const apiKey=data.apiKey||localStorage.getItem('yt_api_key')||'';
      if(!apiKey)throw new Error('需要 YouTube API Key');
      window._kolProgress=[];window._kolDone=false;
      const log=(m:string)=>{console.log(m);window._kolProgress=[...(window._kolProgress||[]),m];};
      (async()=>{
        for(const code of(data.countries||['US','GB','DE','CA'])){
          try{log(`\n🌍 ${code} 开始...`);const kols=await crawlCountry(code,apiKey,log);const{added,total}=await saveKOL(code,kols);log(`✅ ${code} 完成：新增 ${added}，累计 ${total}`);}
          catch(e:any){log(`❌ ${code} 失败: ${e.message}`);}
        }
        window._kolDone=true;log('\n🎉 全部完成！刷新页面查看。');
      })();
      return{data:{ok:true}};
    }
    if(url==='/kol/youtube/search'){
      const{keyword,apiKey}=data;
      const sd=await(await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=20&q=${encodeURIComponent(keyword)}&key=${encodeURIComponent(apiKey)}`)).json();
      if(sd.error)throw new Error(sd.error.message);
      const ids=(sd.items||[]).map((i:any)=>i.id?.channelId).filter(Boolean);
      if(!ids.length)return{data:{channels:[]}};
      return{data:{channels:(await getDetails(ids,apiKey)).map(ch=>toKOL(ch,ch.snippet?.country||'US',keyword))}};
    }
    if(url==='/projects/search'){const{keyword,category,status}=data;let q='/projects?select=*&order=funded_amount_usd.desc&limit=50';if(category)q+=`&category_canonical=eq.${category}`;if(status)q+=`&status=eq.${status}`;if(keyword)q+=`&or=(title.ilike.*${keyword}*,description.ilike.*${keyword}*)`;const r=await sb.get(q);return{data:{projects:r.data,total:r.data.length}};}
    if(url==='/backers/overlap')return{data:{count:0,backers:[]}};
    if(url==='/monitoring-lists'){const r=await sb.post('/monitoring_lists',{user_id:'00000000-0000-0000-0000-000000000001',name:data.name,items:data.items||[]});return{data:Array.isArray(r.data)?r.data[0]:r.data};}
    if(url==='/alerts'){const r=await sb.post('/alert_rules',{user_id:'00000000-0000-0000-0000-000000000001',...data});return{data:Array.isArray(r.data)?r.data[0]:r.data};}
    if(url==='/reports'){const r=await sb.post('/report_jobs',{user_id:'00000000-0000-0000-0000-000000000001',...data});return{data:Array.isArray(r.data)?r.data[0]:r.data};}
    if(url==='/admin/users'){const r=await sb.post('/users',{email:data.email,role:data.role||'guest'});return{data:Array.isArray(r.data)?r.data[0]:r.data};}
    if(url.startsWith('/mailchimp')||url.startsWith('/crawl'))return{data:{ok:true}};
    return{data:{}};
  },
  patch:async(url:string,data:any={})=>{
    if(url.match(/^\/kol\/auto\/[A-Z]{2}\/.+/)){
      const[,,, code,channelId]=url.split('/');
      const chs=await loadKOL(code);
      const updated=chs.map((c:any)=>c.channelId===channelId?{...c,...data}:c);
      const type=`kol_auto_${code}`;const ex=await sb.get(`/ai_outputs?output_type=eq.${type}&limit=1`);
      const payload={output_type:type,entity_id:code,content:JSON.stringify(updated),generated_at:new Date().toISOString(),model_version:'yt-v3-acc'};
      if(ex.data.length)await sb.patch(`/ai_outputs?output_type=eq.${type}`,payload);else await sb.post('/ai_outputs',payload);
      return{data:{ok:true}};
    }
    if(url.startsWith('/monitoring-lists/')){const r=await sb.patch(`/monitoring_lists?id=eq.${url.split('/').pop()}`,data);return{data:Array.isArray(r.data)?r.data[0]:r.data};}
    if(url.startsWith('/alerts/')){const r=await sb.patch(`/alert_rules?id=eq.${url.split('/').pop()}`,data);return{data:Array.isArray(r.data)?r.data[0]:r.data};}
    if(url.startsWith('/admin/users/')){const r=await sb.patch(`/users?id=eq.${url.split('/').pop()}`,data);return{data:Array.isArray(r.data)?r.data[0]:r.data};}
    return{data:{}};
  },
  put:async(url:string,data:any={})=>{return client.patch(url,data);},
  delete:async(url:string)=>{
    if(url.startsWith('/monitoring-lists/'))await sb.delete(`/monitoring_lists?id=eq.${url.split('/').pop()}`);
    if(url.startsWith('/alerts/'))await sb.delete(`/alert_rules?id=eq.${url.split('/').pop()}`);
    if(url.startsWith('/admin/users/'))await sb.patch(`/users?id=eq.${url.split('/').pop()}`,{is_active:false});
    return{data:{}};
  },
};
export default client as any;
