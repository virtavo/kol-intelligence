import React,{useState,useEffect,useMemo,useRef}from'react';
import client from'../api/client';
interface Ch{channelId:string;title:string;description:string;subscriberCount:number;videoCount:number;avgViewsPerVideo:number;engagementRate:number;thumbnailUrl:string;channelUrl:string;businessEmail:string|null;country:string;countryCode:string;channelCountryCode?:string;status:string;notes:string;crawledAt:string;keyword:string;updatedAt?:string;topics?:string[];channelKeywords?:string[];defaultLanguage?:string;}
const SC:Record<string,{bg:string;color:string;label:string;icon:string}>={new:{bg:'#eff6ff',color:'#1d4ed8',label:'New',icon:'🆕'},starred:{bg:'#fffbeb',color:'#b45309',label:'Starred',icon:'⭐'},contacted:{bg:'#fef9c3',color:'#854d0e',label:'Contacted',icon:'📧'},replied:{bg:'#f0fdf4',color:'#15803d',label:'Replied',icon:'💬'},partnered:{bg:'#faf5ff',color:'#7e22ce',label:'Partnered',icon:'🤝'},rejected:{bg:'#fef2f2',color:'#b91c1c',label:'Rejected',icon:'❌'}};
const CTRY=[{code:'US',flag:'🇺🇸',label:'USA'},{code:'GB',flag:'🇬🇧',label:'UK'},{code:'DE',flag:'🇩🇪',label:'Germany'},{code:'CA',flag:'🇨🇦',label:'Canada'}];
const FR=[{l:'All',min:0,max:Infinity},{l:'1K–10K',min:1000,max:10000},{l:'10K–50K',min:10000,max:50000},{l:'50K–100K',min:50000,max:100000},{l:'100K–500K',min:100000,max:500000},{l:'500K+',min:500000,max:Infinity}];
const ER=[{l:'All',min:0,max:Infinity},{l:'<1%',min:0,max:1},{l:'1–3%',min:1,max:3},{l:'3–5%',min:3,max:5},{l:'5%+',min:5,max:Infinity}];
const CF:Record<string,string>={US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',CA:'🇨🇦',AU:'🇦🇺',IN:'🇮🇳',AT:'🇦🇹',CH:'🇨🇭',Other:'🌍'};
function Audience({ch}:{ch:Ch}){
  const topics=ch.topics||[];
  const kws=ch.channelKeywords||[];
  const lang=ch.defaultLanguage;
  const erQ=ch.engagementRate>5?'极高':ch.engagementRate>3?'高':ch.engagementRate>1?'中等':'低';
  const erColor=ch.engagementRate>5?'#059669':ch.engagementRate>3?'#2563eb':ch.engagementRate>1?'#d97706':'#dc2626';
  const freqQ=ch.videoCount>0?Math.round(ch.videoCount/36):0;
  const b:React.CSSProperties={flex:1,minWidth:160,background:'#f9fafb',borderRadius:10,padding:'11px 13px',border:'1px solid #e5e7eb'};
  const t:React.CSSProperties={fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8};
  return(<div style={{marginTop:10,padding:'13px 15px',background:'rgba(245,243,255,0.6)',borderRadius:10,border:'1px solid #e9d5ff'}}>
    <div style={{fontSize:11,color:'#7c3aed',marginBottom:10,fontWeight:600}}>📊 频道真实数据（来源：YouTube API）</div>
    <div style={{display:'flex',gap:9,flexWrap:'wrap'}}>
      {topics.length>0&&<div style={{...b,flex:2,minWidth:200}}>
        <div style={t}>🎯 YouTube 官方内容分类</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
          {topics.map((tp:string)=><span key={tp} style={{padding:'3px 9px',borderRadius:20,background:'#ede9fe',color:'#5b21b6',fontSize:11,fontWeight:600}}>{tp}</span>)}
        </div>
      </div>}
      {kws.length>0&&<div style={{...b,flex:2,minWidth:200}}>
        <div style={t}>🏷 频道自填关键词</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
          {kws.slice(0,10).map((k:string)=><span key={k} style={{padding:'2px 8px',borderRadius:20,background:'#f0fdf4',color:'#15803d',fontSize:11}}>{k}</span>)}
        </div>
      </div>}
      <div style={{...b,minWidth:155}}>
        <div style={t}>📈 互动质量</div>
        <div style={{marginBottom:6}}><span style={{fontSize:20,fontWeight:800,color:erColor}}>{ch.engagementRate}%</span><span style={{fontSize:11,color:'#6b7280',marginLeft:5}}>{erQ}互动率</span></div>
        <div style={{fontSize:11,color:'#6b7280'}}>均播放 <strong>{ch.avgViewsPerVideo>=1000?(ch.avgViewsPerVideo/1000).toFixed(1)+'K':ch.avgViewsPerVideo}</strong></div>
        <div style={{fontSize:11,color:'#6b7280',marginTop:3}}>更新频率约 <strong>{freqQ}</strong> 次/月</div>
        {lang&&<div style={{fontSize:11,color:'#6b7280',marginTop:3}}>主要语言 <strong>{lang.toUpperCase()}</strong></div>}
      </div>
      {topics.length===0&&kws.length===0&&<div style={{...b,flex:2}}>
        <div style={{fontSize:12,color:'#9ca3af',lineHeight:1.6}}>
          ⓘ 该频道未设置 YouTube 主题分类或关键词。<br/>
          <span style={{fontSize:11}}>性别/年龄/收入数据 YouTube 不对第三方开放，仅频道主自己可见。</span>
        </div>
      </div>}
    </div>
  </div>);}
function fmt(n:number){return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n);}
function Pill({opts,val,set}:{opts:string[];val:string;set:(v:string)=>void}){return<div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{opts.map(o=><button key={o} onClick={()=>set(o)} style={{padding:'5px 13px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:val===o?'1.5px solid #7c3aed':'1px solid #e2e8f0',background:val===o?'#7c3aed':'white',color:val===o?'white':'#374151'}}>{o}</button>)}</div>;}
function Sel({opts,val,set}:{opts:string[];val:string;set:(v:string)=>void}){return<select value={val} onChange={e=>set(e.target.value)} style={{padding:'6px 24px 6px 11px',borderRadius:20,border:'1px solid #e2e8f0',fontSize:12,cursor:'pointer',background:'white',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center'}}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>;}
const CATS=['All','Shopping','Home & Appliances','Beauty','Food','Clothing','Tech & Gadgets','Fitness','Parenting'];
export default function AutoKOLPage(){
  const[ac,setAc]=useState('US');
  const[chs,setChs]=useState<Record<string,Ch[]>>({US:[],GB:[],DE:[],CA:[]});
  const[stat,setStat]=useState<any>({crawledAt:null,countries:{},totalCount:0});
  const[load,setLoad]=useState(false);
  const[trig,setTrig]=useState(false);
  const[apiK,setApiK]=useState('');
  const[showK,setShowK]=useState(false);
  const[log,setLog]=useState<string[]>([]);
  const[showL,setShowL]=useState(false);
  const[cat,setCat]=useState('All');
  const[fr,setFr]=useState('All');
  const[er,setEr]=useState('All');
  const[hm,setHm]=useState('All');
  const[fs,setFs]=useState('All');
  const[kw,setKw]=useState('');
  const[sb,setSb]=useState<'subscriberCount'|'avgViewsPerVideo'|'engagementRate'>('subscriberCount');
  const[expAud,setExpAud]=useState<Set<string>>(new Set());
  const[editN,setEditN]=useState<string|null>(null);
  const[noteV,setNoteV]=useState('');
  const poll=useRef<any>(null);const logRef=useRef<HTMLDivElement>(null);
  const reload=async()=>{setLoad(true);try{const[a,s]=await Promise.all([client.get('/kol/auto/all'),client.get('/kol/auto/status')]);setChs(a.data.countries||{});setStat(s.data);}catch{}setLoad(false);};
  useEffect(()=>{reload();},[]);
  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[log]);
  const trigger=async()=>{const key=apiK.trim()||localStorage.getItem('yt_api_key')||'';if(!key){setShowK(true);return;}if(apiK.trim())localStorage.setItem('yt_api_key',key);setShowK(false);setTrig(true);setLog([]);setShowL(true);try{await client.post('/kol/auto/trigger',{apiKey:key});poll.current=setInterval(async()=>{const m=(window as any)._kolProgress||[];const d=(window as any)._kolDone??false;setLog([...m]);if(d){clearInterval(poll.current);setTrig(false);await reload();}},2000);setTimeout(()=>{if(poll.current)clearInterval(poll.current);setTrig(false);},1200000);}catch(e:any){alert(e.message);setTrig(false);}};
  useEffect(()=>()=>{if(poll.current)clearInterval(poll.current);},[]);
  const upd=async(ch:Ch,p:any)=>{await client.patch(`/kol/auto/${ch.countryCode}/${ch.channelId}`,p);setChs(prev=>({...prev,[ch.countryCode]:prev[ch.countryCode].map(c=>c.channelId===ch.channelId?{...c,...p}:c)}));};
  const list=useMemo(()=>{let l=chs[ac]||[];if(kw)l=l.filter(c=>(c.title+c.description+(c.businessEmail||'')).toLowerCase().includes(kw.toLowerCase()));if(fs!=='All')l=l.filter(c=>c.status===fs);if(hm==='Has Email')l=l.filter(c=>!!c.businessEmail);if(hm==='No Email')l=l.filter(c=>!c.businessEmail);const f=FR.find(r=>r.l===fr);if(f&&f.l!=='All')l=l.filter(c=>c.subscriberCount>=f.min&&c.subscriberCount<f.max);const e=ER.find(r=>r.l===er);if(e&&e.l!=='All')l=l.filter(c=>c.engagementRate>=e.min&&c.engagementRate<e.max);return[...l].sort((a,b)=>{if(a.status==='starred'&&b.status!=='starred')return -1;if(a.status!=='starred'&&b.status==='starred')return 1;return(b[sb]||0)-(a[sb]||0);});},[chs,ac,kw,fs,hm,fr,er,sb]);
  const ec=(chs[ac]||[]).filter(c=>c.businessEmail).length;
  const stc=(chs[ac]||[]).filter(c=>c.status==='starred').length;
  const card:React.CSSProperties={background:'rgba(255,255,255,0.9)',borderRadius:12,border:'1px solid rgba(0,0,0,0.07)',padding:'15px 19px',marginBottom:10};
  const st:React.CSSProperties={fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:7};
  return(<div style={{padding:'22px 26px',maxWidth:1200,margin:'0 auto'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
      <div><h2 style={{margin:0,fontSize:22,fontWeight:700}}>🤖 KOL 自动抓取</h2><div style={{fontSize:12,color:'#888',marginTop:3}}>{stat.crawledAt?`上次更新: ${new Date(stat.crawledAt).toLocaleString('zh-CN')} · 累计 ${stat.totalCount} 个`:'尚未运行'}</div></div>
      <div style={{display:'flex',gap:7}}>
        <button onClick={()=>setShowK(!showK)} style={{padding:'6px 11px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontSize:13}}>⚙ API Key</button>
        <button onClick={trigger} disabled={trig} style={{padding:'7px 17px',borderRadius:8,background:trig?'#94a3b8':'#7c3aed',color:'white',border:'none',cursor:'pointer',fontWeight:600,fontSize:14}}>{trig?'⏳ 抓取中...':'⚡ 立即抓取'}</button>
        {log.length>0&&<button onClick={()=>setShowL(!showL)} style={{padding:'6px 11px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontSize:13}}>{showL?'隐藏日志':'📋 日志'}</button>}
        <button onClick={()=>{const l=chs[ac]||[];const h='Title,Subscribers,AvgViews,ER%,Email,Status,Notes,URL';const r=l.map(c=>[`"${c.title.replace(/"/g,'""')}"`,c.subscriberCount,c.avgViewsPerVideo,c.engagementRate,c.businessEmail||'',c.status,`"${(c.notes||'').replace(/"/g,'""')}"`,c.channelUrl].join(','));const b=new Blob(['\uFEFF'+h+'\n'+r.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`kol_${ac}.csv`;a.click();}} style={{padding:'7px 13px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontSize:13}}>↓ CSV</button>
      </div>
    </div>
    {showK&&<div style={{...card,marginBottom:11,background:'#faf5ff',border:'1px solid #e9d5ff'}}><div style={{fontSize:13,marginBottom:7}}>YouTube Data API v3 Key（<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{color:'#7c3aed'}}>免费获取 →</a>）</div><div style={{display:'flex',gap:7}}><input value={apiK} onChange={e=>setApiK(e.target.value)} placeholder="AIzaSy..." style={{flex:1,padding:'7px 11px',borderRadius:8,border:'1px solid #ddd',fontSize:13}}/><button onClick={trigger} style={{padding:'7px 15px',borderRadius:8,background:'#7c3aed',color:'white',border:'none',cursor:'pointer'}}>确认并抓取</button></div><div style={{fontSize:11,color:'#7c3aed',marginTop:5}}>⚡ 每次只新增，不删已有数据及标注</div></div>}
    {showL&&log.length>0&&<div style={{...card,marginBottom:11,background:'#0f172a',padding:13}}><div style={{fontSize:11,color:'#94a3b8',marginBottom:5,fontWeight:600}}>📋 {trig?<span style={{color:'#fbbf24'}}>● 运行中</span>:<span style={{color:'#4ade80'}}>● 完成</span>}</div><div ref={logRef} style={{maxHeight:170,overflowY:'auto',fontFamily:'monospace',fontSize:11,lineHeight:1.7}}>{log.map((m,i)=><div key={i} style={{color:m.startsWith('✅')?'#4ade80':m.startsWith('❌')?'#f87171':m.startsWith('🌍')?'#fbbf24':'#cbd5e1'}}>{m}</div>)}</div></div>}
    <div style={{display:'flex',gap:9,marginBottom:14}}>
      {CTRY.map(({code,flag,label})=>{const cnt=(chs[code]||[]).length,em=(chs[code]||[]).filter(c=>c.businessEmail).length,active=ac===code;return(<div key={code} onClick={()=>setAc(code)} style={{flex:1,textAlign:'center',padding:'11px 7px',borderRadius:12,cursor:'pointer',background:active?'#7c3aed':'rgba(255,255,255,0.85)',color:active?'white':'#374151',border:active?'2px solid #7c3aed':'1px solid rgba(0,0,0,0.08)',transition:'all .15s'}}><div style={{fontSize:23}}>{flag}</div><div style={{fontWeight:700,fontSize:13,marginTop:2}}>{label}</div><div style={{fontSize:11,opacity:.85,marginTop:1}}>{cnt>0?`${cnt} 个（累积）`:'未抓取'}</div>{em>0&&<div style={{fontSize:10,opacity:.75}}>✉ {em}</div>}</div>);})}
    </div>
    <div style={{...card,marginBottom:14}}>
      <div style={{marginBottom:12}}><div style={st}>Influencer Category</div><Pill opts={CATS} val={cat} set={setCat}/></div>
      <div style={{marginBottom:12}}><div style={st}>Filter</div><div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}><div style={{position:'relative'}}><span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'#aaa',fontSize:13}}>🔍</span><input value={kw} onChange={e=>setKw(e.target.value)} placeholder="搜索频道名/邮箱" style={{paddingLeft:28,padding:'6px 11px 6px 28px',borderRadius:20,border:'1px solid #e2e8f0',fontSize:12,width:170}}/></div><Sel opts={FR.map(r=>r.l)} val={fr} set={setFr}/><Sel opts={ER.map(r=>r.l)} val={er} set={setEr}/></div></div>
      <div><div style={st}>Advanced</div><div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}><Sel opts={['All','Has Email','No Email']} val={hm} set={setHm}/><Sel opts={['All',...Object.keys(SC)]} val={fs} set={setFs}/><Sel opts={['按订阅量','按均播放','按互动率']} val={sb==='subscriberCount'?'按订阅量':sb==='avgViewsPerVideo'?'按均播放':'按互动率'} set={v=>setSb(v==='按订阅量'?'subscriberCount':v==='按均播放'?'avgViewsPerVideo':'engagementRate')}/><span style={{fontSize:12,color:'#888'}}>{list.length} 个{stc>0&&<span style={{marginLeft:7,color:'#b45309'}}> ⭐{stc}</span>}{ec>0&&<span style={{marginLeft:7,color:'#059669'}}> ✉{ec}</span>}</span></div></div>
    </div>
    {load?<div style={{textAlign:'center',padding:55,color:'#888'}}>加载中...</div>:list.length===0?<div style={{textAlign:'center',padding:55,color:'#aaa'}}>{(chs[ac]||[]).length===0?'点击「⚡ 立即抓取」累积红人数据':'无符合条件的频道'}</div>:list.map(ch=>{const isStar=ch.status==='starred',cfg=SC[ch.status]||SC.new,audOpen=expAud.has(ch.channelId);return(<div key={ch.channelId} style={{...card,border:isStar?'1.5px solid #f59e0b':'1px solid rgba(0,0,0,0.07)',background:isStar?'rgba(255,251,235,0.95)':'rgba(255,255,255,0.9)'}}><div style={{display:'flex',gap:11,alignItems:'flex-start'}}>
      <button onClick={()=>upd(ch,{status:isStar?'new':'starred'})} style={{background:'none',border:'none',cursor:'pointer',fontSize:17,padding:'2px 0',flexShrink:0,opacity:isStar?1:0.2,transition:'opacity .15s',marginTop:2}}>⭐</button>
      <img src={ch.thumbnailUrl||`https://ui-avatars.com/api/?name=${encodeURIComponent(ch.title)}&size=50&background=random`} alt="" style={{width:46,height:46,borderRadius:'50%',flexShrink:0,objectFit:'cover'}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}><a href={ch.channelUrl} target="_blank" rel="noreferrer" style={{fontWeight:700,fontSize:14,color:'#1a1a1a',textDecoration:'none'}}>{ch.title}</a><span style={{fontSize:11,padding:'2px 7px',borderRadius:20,background:'#f1f5f9',color:'#475569'}}>{ch.country}</span>{ch.businessEmail&&<a href={`mailto:${ch.businessEmail}`} style={{fontSize:12,color:'#059669',textDecoration:'none',background:'#f0fdf4',padding:'2px 7px',borderRadius:10}}>✉ {ch.businessEmail}</a>}</div>
        <div style={{fontSize:12,color:'#666',marginTop:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',maxWidth:510}}>{ch.description||'暂无简介'}</div>
        <div style={{display:'flex',gap:16,marginTop:7,flexWrap:'wrap'}}>{[{l:'订阅',v:fmt(ch.subscriberCount)},{l:'均播放',v:fmt(ch.avgViewsPerVideo)},{l:'互动率',v:ch.engagementRate+'%'},{l:'视频数',v:fmt(ch.videoCount)}].map(m=><div key={m.l} style={{textAlign:'center'}}><div style={{fontSize:14,fontWeight:700}}>{m.v}</div><div style={{fontSize:11,color:'#888'}}>{m.l}</div></div>)}{ch.updatedAt&&<div style={{fontSize:10,color:'#aaa',alignSelf:'flex-end'}}>↻{new Date(ch.updatedAt).toLocaleDateString('zh-CN')}</div>}</div>
        <div style={{display:'flex',gap:7,marginTop:9}}><button onClick={()=>setExpAud(prev=>{const n=new Set(prev);n.has(ch.channelId)?n.delete(ch.channelId):n.add(ch.channelId);return n;})} style={{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'1px solid #e9d5ff',background:audOpen?'#7c3aed':'white',color:audOpen?'white':'#7c3aed'}}>{audOpen?'▲ 收起':'👥 受众分析'}</button></div>
        {audOpen&&<Audience ch={ch}/>}
        {editN===ch.channelId?<div style={{display:'flex',gap:6,marginTop:7}}><input value={noteV} onChange={e=>setNoteV(e.target.value)} placeholder="备注..." autoFocus onKeyDown={e=>{if(e.key==='Enter'){upd(ch,{notes:noteV});setEditN(null);}if(e.key==='Escape')setEditN(null);}} style={{flex:1,padding:'5px 9px',borderRadius:8,border:'1px solid #7c3aed',fontSize:12}}/><button onClick={()=>{upd(ch,{notes:noteV});setEditN(null);}} style={{padding:'5px 11px',borderRadius:8,background:'#7c3aed',color:'white',border:'none',cursor:'pointer',fontSize:12}}>保存</button><button onClick={()=>setEditN(null)} style={{padding:'5px 9px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontSize:12}}>取消</button></div>:<div style={{marginTop:5,display:'flex',alignItems:'center',gap:5}}>{ch.notes&&<span style={{fontSize:12,color:'#6b7280',background:'#f9fafb',padding:'2px 7px',borderRadius:8,border:'1px solid #e5e7eb'}}>📝 {ch.notes}</span>}<button onClick={()=>{setEditN(ch.channelId);setNoteV(ch.notes||'');}} style={{fontSize:11,color:'#9ca3af',background:'none',border:'none',cursor:'pointer'}}>{ch.notes?'编辑':'+ 备注'}</button></div>}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:5,flexShrink:0,alignItems:'flex-end'}}><select value={ch.status||'new'} onChange={e=>upd(ch,{status:e.target.value})} style={{padding:'4px 9px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:cfg.bg,color:cfg.color,minWidth:105}}>{Object.entries(SC).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select><div style={{fontSize:10,color:'#aaa'}}>{new Date(ch.crawledAt).toLocaleDateString('zh-CN')}</div>{ch.businessEmail&&<a href={`mailto:${ch.businessEmail}`} style={{fontSize:11,color:'#7c3aed',textDecoration:'none'}}>📧 发邮件</a>}</div>
    </div></div>);})}
  </div>);
}
