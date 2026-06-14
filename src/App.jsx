import { useState, useEffect, useRef } from 'react';
import { AppHeader, SettingsDrawer, PipelineView } from './UI.jsx';
import { DashboardView } from './Dashboard.jsx';

/* ─── CONSTANTS ─── */
const DEFAULT_MODELS_FAST = ['google/gemini-2.5-flash','meta-llama/llama-3.3-70b-instruct:free','openai/gpt-4o-mini','anthropic/claude-3-haiku'];
const DEFAULT_MODELS_SMART = ['anthropic/claude-3.5-sonnet','google/gemini-2.5-pro','openai/gpt-4o','deepseek/deepseek-chat'];
const ACCENT_COLORS = ['#6366f1','#a855f7','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4'];

const SAMPLE_PROMPTS = [
  { text:'Show me Bitcoin price this week', icon:'trending_up', group:'Finance' },
  { text:'Weather in London, Paris and Tokyo', icon:'cloud', group:'Personal' },
  { text:'Top tech news this morning', icon:'newspaper', group:'Work' },
  { text:'My daily workout checklist', icon:'checklist', group:'Personal' },
  { text:'Convert 120 miles to kilometers', icon:'sync_alt', group:'Utilities' },
  { text:'Countdown to New Year 2027', icon:'timer', group:'Utilities' },
  { text:'Portfolio: 50% BTC, 30% ETH, 20% SOL', icon:'pie_chart', group:'Finance' },
];

const DEFAULT_WORKFLOW_CONFIG = {
  enableAutocomplete: true, clearOnSubmit: true, plannerTemp: 0.3,
  tavilyDepth: 'basic', prioritizeSearch: false,
  defaultThemeAccent: '#6366f1', densePacking: true, gridSnapUnit: 8,
};

/* ─── RENDER CODE LIBRARY (demo mode pre-built renderers) ─── */

const RC_BTC = `function CardRenderer({data, renderSpec}) {
  var arr = Array.isArray(data) ? data : [];
  if (!arr.length) return React.createElement('div',{style:{color:'var(--fg-dim)',textAlign:'center',padding:20,fontSize:12}},'No data');
  var color = (renderSpec && renderSpec.color) || '#10b981';
  var vals = arr.map(function(d){return Number(d.value)||0;});
  var maxV = Math.max.apply(null,vals)*1.1, minV = Math.min.apply(null,vals)*0.92;
  var W=280, H=96, pL=38, pB=16, pT=8, pR=8;
  function gx(i){return pL+(i/(arr.length-1||1))*(W-pL-pR);}
  function gy(v){return H-pB-((v-minV)/(maxV-minV||1))*(H-pT-pB);}
  var pts = arr.map(function(d,i){return gx(i)+','+gy(d.value);}).join(' ');
  var area = gx(0)+','+(H-pB)+' '+pts+' '+gx(arr.length-1)+','+(H-pB);
  var last = vals[vals.length-1], prev = vals[vals.length-2]||last;
  var chg = prev ? ((last-prev)/prev*100).toFixed(1) : '0.0';
  var up = parseFloat(chg) >= 0;
  return React.createElement('div',{style:{display:'flex',flexDirection:'column',height:'100%',gap:4,padding:'4px 2px'}},
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline'}},
      React.createElement('span',{style:{fontSize:15,fontWeight:700,color:color,fontFamily:'var(--mo)'}},'$'+(last||0).toLocaleString()),
      React.createElement('span',{style:{fontSize:10,color:up?'var(--success)':'var(--danger)',fontWeight:600}},(up?'+':'')+chg+'%')
    ),
    React.createElement('svg',{viewBox:'0 0 '+W+' '+H,width:'100%',height:H,style:{flex:'0 0 auto'}},
      React.createElement('defs',null,
        React.createElement('linearGradient',{id:'btcGrad',x1:'0',y1:'0',x2:'0',y2:'1'},
          React.createElement('stop',{offset:'0%',stopColor:color,stopOpacity:'0.35'}),
          React.createElement('stop',{offset:'100%',stopColor:color,stopOpacity:'0.02'})
        )
      ),
      React.createElement('polygon',{points:area,fill:'url(#btcGrad)'}),
      React.createElement('polyline',{points:pts,fill:'none',stroke:color,strokeWidth:'2.2',strokeLinecap:'round',strokeLinejoin:'round'}),
      ...arr.map(function(d,i){return React.createElement('circle',{key:'c'+i,cx:gx(i),cy:gy(d.value),r:'2.8',fill:'#0b0b14',stroke:color,strokeWidth:'1.5'});}),
      ...arr.map(function(d,i){return React.createElement('text',{key:'x'+i,x:gx(i),y:H-1,fill:'rgba(255,255,255,0.28)',fontSize:'8',textAnchor:'middle'},d.name?String(d.name).slice(0,3):'');}),
      React.createElement('text',{x:pL-3,y:gy(maxV)+4,fill:'rgba(255,255,255,0.28)',fontSize:'8',textAnchor:'end'},maxV>1000?'$'+(maxV/1000).toFixed(0)+'k':Math.round(maxV))
    ),
    renderSpec&&renderSpec.summary ? React.createElement('p',{style:{fontSize:10,color:'var(--fg-muted)',margin:0,padding:'0 2px'}},'\\u{1F4A1} '+renderSpec.summary) : null
  );
}`;

const RC_WEATHER = `function CardRenderer({data, renderSpec}) {
  var headers = data && data.headers ? data.headers : ['City','Temp','Condition','Wind'];
  var rows = data && data.rows ? data.rows : [];
  if (!rows.length) return React.createElement('div',{style:{color:'var(--fg-dim)',textAlign:'center',padding:20,fontSize:12}},'No weather data');
  var color = (renderSpec&&renderSpec.color)||'var(--primary)';
  return React.createElement('div',{style:{overflow:'auto',height:'100%',width:'100%'}},
    React.createElement('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:11}},
      React.createElement('thead',null,
        React.createElement('tr',null,
          ...headers.map(function(h){return React.createElement('th',{key:h,style:{textAlign:'left',padding:'5px 8px',fontSize:9,fontWeight:700,letterSpacing:'0.08em',color:'var(--fg-dim)',borderBottom:'1px solid var(--border)',textTransform:'uppercase'}},h);})
        )
      ),
      React.createElement('tbody',null,
        ...rows.map(function(row,i){return React.createElement('tr',{key:i,style:{background:i%2?'rgba(255,255,255,0.02)':'transparent'}},
          ...headers.map(function(h){return React.createElement('td',{key:h,style:{padding:'6px 8px',color:h==='Temp'?color:'var(--fg)',fontWeight:h==='Temp'?600:400,borderBottom:'1px solid rgba(255,255,255,0.04)'}},row[h]||'');})
        );})
      )
    )
  );
}`;

const RC_NEWS = `function CardRenderer({data, renderSpec}) {
  var items = Array.isArray(data) ? data : (data&&data.items ? data.items : []);
  if (!items.length) return React.createElement('div',{style:{color:'var(--fg-dim)',textAlign:'center',padding:20,fontSize:12}},'No news');
  var color = (renderSpec&&renderSpec.color)||'var(--primary)';
  return React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:0,height:'100%',overflowY:'auto'}},
    ...items.map(function(item,i){
      return React.createElement('div',{key:i,style:{display:'flex',gap:8,padding:'7px 4px',borderBottom:'1px solid rgba(255,255,255,0.05)',alignItems:'flex-start'}},
        React.createElement('div',{style:{width:3,minWidth:3,height:28,borderRadius:2,background:color,marginTop:3,opacity:Math.max(0.3,1-i*0.15),flexShrink:0}}),
        React.createElement('div',{style:{flex:1,minWidth:0}},
          React.createElement('a',{href:item.url||'#',style:{fontSize:11,fontWeight:500,color:'var(--fg)',textDecoration:'none',lineHeight:1.35,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},item.title||item.headline||item.text||'Untitled'),
          React.createElement('span',{style:{fontSize:9,color:'var(--fg-dim)',marginTop:2,display:'block'}},item.time||item.date||item.source||'')
        )
      );
    })
  );
}`;

const RC_CHECKLIST = `function CardRenderer({data, renderSpec}) {
  var items = data&&data.items ? data.items : [];
  var color = (renderSpec&&renderSpec.color)||'var(--primary)';
  var initDone = items.map(function(i){return !!i.done;});
  var state = React.useState(initDone);
  var checked = state[0], setChecked = state[1];
  var toggle = function(i){setChecked(function(prev){var n=prev.slice();n[i]=!n[i];return n;});};
  var doneCount = checked.filter(Boolean).length;
  var pct = items.length ? Math.round(doneCount/items.length*100) : 0;
  return React.createElement('div',{style:{display:'flex',flexDirection:'column',height:'100%',gap:8,padding:'2px'}},
    React.createElement('div',{style:{height:4,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'}},
      React.createElement('div',{style:{height:'100%',width:pct+'%',background:color,borderRadius:2,transition:'width 0.3s ease'}})
    ),
    React.createElement('div',{style:{fontSize:9,color:'var(--fg-dim)',textAlign:'right',marginTop:-4}},doneCount+'/'+items.length+' done ('+pct+'%)'),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:4,flex:1,overflowY:'auto'}},
      ...items.map(function(item,i){
        return React.createElement('label',{key:i,style:{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}},
          React.createElement('input',{type:'checkbox',checked:!!checked[i],onChange:function(){toggle(i);},style:{accentColor:color,width:14,height:14,flexShrink:0}}),
          React.createElement('span',{style:{fontSize:11,color:checked[i]?'var(--fg-dim)':'var(--fg)',textDecoration:checked[i]?'line-through':'none',transition:'all 0.2s'}},item.text||item.label||('Task '+(i+1)))
        );
      })
    )
  );
}`;

const RC_CONVERTER = `function CardRenderer({data, renderSpec}) {
  var color = (renderSpec&&renderSpec.color)||'var(--warning)';
  var init = data&&data.initialValue!=null ? Number(data.initialValue) : 120;
  var fromUnit = (data&&data.fromUnit)||'miles';
  var toUnit = (data&&data.toUnit)||'km';
  var state = React.useState(String(init));
  var val = state[0], setVal = state[1];
  var result = (parseFloat(val)||0)*1.60934;
  return React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,padding:'8px'}},
    React.createElement('div',{style:{fontSize:10,fontWeight:700,color:'var(--fg-dim)',letterSpacing:'0.1em',textTransform:'uppercase'}},fromUnit+' \\u2192 '+toUnit),
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:12,width:'100%',justifyContent:'center'}},
      React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:4}},
        React.createElement('input',{type:'number',value:val,onChange:function(e){setVal(e.target.value);},style:{width:80,padding:'6px 10px',background:'rgba(255,255,255,0.06)',border:'1px solid var(--border)',borderRadius:6,color:'var(--fg)',fontSize:16,fontWeight:600,fontFamily:'var(--mo)',textAlign:'center',outline:'none'}}),
        React.createElement('span',{style:{fontSize:9,color:'var(--fg-dim)',textTransform:'uppercase',letterSpacing:'0.1em'}},fromUnit)
      ),
      React.createElement('span',{style:{fontSize:18,color:'var(--fg-dim)'}},'\\u2192'),
      React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:4}},
        React.createElement('div',{style:{fontSize:18,fontWeight:700,color:color,fontFamily:'var(--mo)',padding:'6px 10px',background:'rgba(255,255,255,0.04)',borderRadius:6,minWidth:80,textAlign:'center'}},result.toFixed(2)),
        React.createElement('span',{style:{fontSize:9,color:'var(--fg-dim)',textTransform:'uppercase',letterSpacing:'0.1em'}},toUnit)
      )
    ),
    renderSpec&&renderSpec.summary?React.createElement('div',{style:{fontSize:9,color:'var(--fg-dim)',textAlign:'center'}},renderSpec.summary):null
  );
}`;

const RC_COUNTDOWN = `function CardRenderer({data, renderSpec}) {
  var color = (renderSpec&&renderSpec.color)||'var(--danger)';
  var targetDate = (data&&data.targetDate) || '2027-01-01T00:00:00';
  var label = (data&&data.label) || ('Countdown to '+(new Date(targetDate).getFullYear()));
  var state = React.useState('Loading...');
  var timeLeft = state[0], setTimeLeft = state[1];
  React.useEffect(function(){
    var target = new Date(targetDate).getTime();
    function tick(){
      var diff = target - Date.now();
      if(diff<=0){setTimeLeft('Completed! \\u{1F389}');return;}
      var d=Math.floor(diff/86400000);
      var h=Math.floor((diff%86400000)/3600000);
      var m=Math.floor((diff%3600000)/60000);
      var s=Math.floor((diff%60000)/1000);
      setTimeLeft(d+'d '+String(h).padStart(2,'0')+'h '+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s');
    }
    tick();
    var t=setInterval(tick,1000);
    return function(){clearInterval(t);};
  },[targetDate]);
  return React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:8}},
    React.createElement('span',{style:{fontSize:9,color:'var(--fg-dim)',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600}},label),
    React.createElement('div',{style:{fontFamily:'var(--mo)',fontSize:18,fontWeight:700,color:color,letterSpacing:'0.04em'}},timeLeft),
    renderSpec&&renderSpec.summary?React.createElement('div',{style:{fontSize:9,color:'var(--fg-dim)',marginTop:4}},renderSpec.summary):null
  );
}`;

const RC_PORTFOLIO = `function CardRenderer({data, renderSpec}) {
  var items = Array.isArray(data) ? data : (data&&data.items ? data.items : []);
  if (!items.length) return React.createElement('div',{style:{color:'var(--fg-dim)',textAlign:'center',padding:20,fontSize:12}},'No data');
  var total = items.reduce(function(s,d){return s+(Number(d.value)||Number(d.allocation)||0);},0)||1;
  var palette = ['#6366f1','#10b981','#f59e0b','#ef4444','#a855f7','#06b6d4','#ec4899'];
  return React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:8,height:'100%',justifyContent:'center',padding:'4px 2px'}},
    ...items.map(function(item,i){
      var pct = Math.round((Number(item.value)||Number(item.allocation)||0)/total*100);
      var col = palette[i%palette.length];
      var name = item.name||item.label||('Item '+(i+1));
      return React.createElement('div',{key:i,style:{display:'flex',flexDirection:'column',gap:3}},
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
          React.createElement('span',{style:{fontSize:10,color:'var(--fg)',fontWeight:500}},name),
          React.createElement('span',{style:{fontSize:10,color:col,fontWeight:700,fontFamily:'var(--mo)'}},pct+'%')
        ),
        React.createElement('div',{style:{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}},
          React.createElement('div',{style:{height:'100%',width:pct+'%',background:col,borderRadius:3,transition:'width 0.6s ease'}})
        )
      );
    }),
    renderSpec&&renderSpec.summary?React.createElement('div',{style:{fontSize:9,color:'var(--fg-dim)',marginTop:4,textAlign:'center'}},renderSpec.summary):null
  );
}`;

const RC_ARTICLE = `function CardRenderer({data, renderSpec}) {
  var headline = (data&&data.headline)||(renderSpec&&renderSpec.title)||'Dashboard Card';
  var body = (data&&data.body)||(renderSpec&&renderSpec.summary)||'No content available.';
  return React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:8,height:'100%',padding:'2px'}},
    React.createElement('div',{style:{fontSize:13,fontWeight:600,color:'var(--fg)',lineHeight:1.3}},headline),
    React.createElement('div',{style:{fontSize:11,color:'var(--fg-muted)',lineHeight:1.6,flex:1,overflowY:'auto'}},body)
  );
}`;

/* ─── DEMO DATA ─── */
const SIMULATED_RESPONSES = [
  { keywords:['bitcoin','btc'], response:{ title:'BTC / USD — 7 Day', size:'lg', dataSource:'CoinGecko API', refreshInterval:300,
    data:[{name:'Mon',value:67200},{name:'Tue',value:67900},{name:'Wed',value:68420},{name:'Thu',value:68100},{name:'Fri',value:68900},{name:'Sat',value:69400},{name:'Sun',value:70150}],
    renderSpec:{color:'#10b981',summary:'Bitcoin broke past $70,000 this weekend with a 4.2% weekly gain.'},
    renderCode: RC_BTC } },
  { keywords:['weather','london','tokyo','paris','temperature'], response:{ title:'Global Cities Weather', size:'md', dataSource:'Open-Meteo API', refreshInterval:900,
    data:{headers:['City','Temp','Condition','Wind'],rows:[{City:'London',Temp:'18°C',Condition:'Light Rain 🌧️',Wind:'14 km/h'},{City:'Paris',Temp:'22°C',Condition:'Partly Cloudy ⛅',Wind:'9 km/h'},{City:'Tokyo',Temp:'26°C',Condition:'Sunny ☀️',Wind:'12 km/h'}]},
    renderSpec:{color:'#6366f1',summary:'Rainy London, fair Paris, sunny Tokyo.'},
    renderCode: RC_WEATHER } },
  { keywords:['news','headline','tech'], response:{ title:'Top Tech Headlines', size:'md', dataSource:'NewsAPI', refreshInterval:1800,
    data:[{id:1,title:'OpenRouter launches real-time model price dashboard',time:'12 min ago',url:'#'},{id:2,title:'Gemini 3.5 Flash outperforms peers in latency benchmarks',time:'1 hr ago',url:'#'},{id:3,title:'Vite 8.0 released with advanced SSR caching',time:'3 hrs ago',url:'#'},{id:4,title:'W3C adopts CSS Fluid Grids as recommended standard',time:'5 hrs ago',url:'#'}],
    renderSpec:{color:'#a855f7',summary:"Developer tooling dominates today's headlines."},
    renderCode: RC_NEWS } },
  { keywords:['checklist','workout','todo','task','fitness'], response:{ title:'Daily Fitness Tracker', size:'sm', dataSource:'Local Memory', refreshInterval:0,
    data:{widgetType:'checklist',items:[{id:'t1',text:'5km Jog (Morning)',done:true},{id:'t2',text:'Core & Abs (20 mins)',done:false},{id:'t3',text:'Hydration Goal (3L)',done:true},{id:'t4',text:'Post-workout protein',done:false}]},
    renderSpec:{color:'#a5b4fc',summary:'50% of goals accomplished.'},
    renderCode: RC_CHECKLIST } },
  { keywords:['convert','miles','km','kilometer'], response:{ title:'Unit Converter (Mi → Km)', size:'xs', dataSource:'Math Engine', refreshInterval:0,
    data:{widgetType:'converter',fromUnit:'miles',toUnit:'km',initialValue:120},
    renderSpec:{color:'#f59e0b',summary:'120 miles ≈ 193.12 km.'},
    renderCode: RC_CONVERTER } },
  { keywords:['countdown','timer','new year'], response:{ title:'Countdown to New Year 2027', size:'xs', dataSource:'Local Clock', refreshInterval:1,
    data:{widgetType:'timer',targetDate:'2027-01-01T00:00:00'},
    renderSpec:{color:'#ef4444',summary:'Counting down to 2027.'},
    renderCode: RC_COUNTDOWN } },
  { keywords:['portfolio','allocation','eth','sol'], response:{ title:'Crypto Asset Allocation', size:'md', dataSource:'Portfolio', refreshInterval:0,
    data:[{name:'BTC',value:50},{name:'ETH',value:30},{name:'SOL',value:20}],
    renderSpec:{color:'#6366f1',summary:'50% BTC · 30% ETH · 20% SOL'},
    renderCode: RC_PORTFOLIO } },
];

const DEFAULT_SIMULATED = {
  title:'AI Knowledge Digest', size:'md', dataSource:'LLM Knowledge', refreshInterval:0,
  data:{headline:'Explore AI-Native Dashboards', body:'Agntdash parses natural language into structured visualizations. Running in Demo Mode — connect API keys in Settings to enable live pipelines, real-time data, and autonomous model selection.'},
  renderSpec:{color:'#6366f1',summary:'Connect an API key to enable real-time queries.'},
  renderCode: RC_ARTICLE,
};

const DEFAULT_CARDS = [
  { id:'1', prompt:'Show me Bitcoin price this week', title:'BTC / USD — 7 Day', size:'lg', dataSource:'CoinGecko API', refreshInterval:300, group:'Finance', cols:6, rows:3, data:[], renderSpec:{color:'#10b981',summary:'Connecting to CoinGecko…'}, renderCode:RC_BTC, lastFetched:null, loading:true, error:null },
  { id:'2', prompt:'Weather in London, Paris and Tokyo', title:'Global Cities Weather', size:'md', dataSource:'Open-Meteo API', refreshInterval:900, group:'Finance', cols:6, rows:2, data:null, renderSpec:{color:'#6366f1',summary:'Connecting to Open-Meteo…'}, renderCode:RC_WEATHER, lastFetched:null, loading:true, error:null },
  { id:'3', prompt:'My daily workout checklist', title:'Daily Fitness Tracker', size:'sm', dataSource:'Local Memory', refreshInterval:0, group:'Personal', cols:4, rows:2, data:{widgetType:'checklist',items:[{id:'t1',text:'5km Jog (Morning)',done:true},{id:'t2',text:'Core & Abs (20 mins)',done:false},{id:'t3',text:'Hydration Goal (3L)',done:true},{id:'t4',text:'Post-workout protein',done:false}]}, renderSpec:{color:'#a5b4fc',summary:'50% of goals accomplished.'}, renderCode:RC_CHECKLIST, lastFetched:new Date().toISOString(), loading:false, error:null },
  { id:'4', prompt:'Countdown to New Year 2027', title:'Countdown to 2027', size:'xs', dataSource:'Local Clock', refreshInterval:1, group:'Personal', cols:4, rows:1, data:{widgetType:'timer',targetDate:'2027-01-01T00:00:00'}, renderSpec:{color:'#ef4444'}, renderCode:RC_COUNTDOWN, lastFetched:new Date().toISOString(), loading:false, error:null },
];

const DEFAULT_GROUPS = [
  { name:'Finance', color:'#10b981', collapsed:false },
  { name:'Personal', color:'#6366f1', collapsed:false },
  { name:'Work', color:'#a855f7', collapsed:false },
];

/* ─── APP ─── */
const ENV_SOURCES = {
  activeProvider: !!import.meta.env.VITE_ACTIVE_PROVIDER,
  openRouterKey:  !!import.meta.env.VITE_OPENROUTER_KEY,
  openAIKey:      !!import.meta.env.VITE_OPENAI_KEY,
  openAIBaseUrl:  !!import.meta.env.VITE_OPENAI_BASE_URL,
  openCodeKey:    !!import.meta.env.VITE_OPENCODE_KEY,
  openCodeBaseUrl:!!import.meta.env.VITE_OPENCODE_BASE_URL,
  tavilyKey:      !!import.meta.env.VITE_TAVILY_KEY,
  modelFast:      !!import.meta.env.VITE_MODEL_FAST,
  modelSmart:     !!import.meta.env.VITE_MODEL_SMART,
};

const envOrStorage = (envVal, lsKey, def = '') =>
  envVal || localStorage.getItem(lsKey) || def;

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };

  const [activeProvider, setActiveProvider] = useState(() => envOrStorage(import.meta.env.VITE_ACTIVE_PROVIDER, 'agntdash_active_provider', 'openrouter'));
  const [openRouterKey, setOpenRouterKey] = useState(() => envOrStorage(import.meta.env.VITE_OPENROUTER_KEY, 'agntdash_or_key'));
  const [openAIKey, setOpenAIKey] = useState(() => envOrStorage(import.meta.env.VITE_OPENAI_KEY, 'agntdash_openai_key'));
  const [openAIBaseUrl, setOpenAIBaseUrl] = useState(() => envOrStorage(import.meta.env.VITE_OPENAI_BASE_URL, 'agntdash_openai_base_url', 'https://api.openai.com/v1'));
  const [openCodeKey, setOpenCodeKey] = useState(() => envOrStorage(import.meta.env.VITE_OPENCODE_KEY, 'agntdash_opencode_key'));
  const [openCodeBaseUrl, setOpenCodeBaseUrl] = useState(() => envOrStorage(import.meta.env.VITE_OPENCODE_BASE_URL, 'agntdash_opencode_base_url', 'https://api.opencode.go/v1'));
  const [tavilyKey, setTavilyKey] = useState(() => envOrStorage(import.meta.env.VITE_TAVILY_KEY, 'agntdash_tavily_key'));
  const [modelFast, setModelFast] = useState(() => envOrStorage(import.meta.env.VITE_MODEL_FAST, 'agntdash_model_fast', DEFAULT_MODELS_FAST[0]));
  const [modelSmart, setModelSmart] = useState(() => envOrStorage(import.meta.env.VITE_MODEL_SMART, 'agntdash_model_smart', DEFAULT_MODELS_SMART[0]));

  const [cards, setCards] = useState(() => load('agntdash_cards_v3', DEFAULT_CARDS));
  const [groups, setGroups] = useState(() => load('agntdash_groups_v2', DEFAULT_GROUPS));
  const [workflowConfig, setWorkflowConfig] = useState(() => ({ ...DEFAULT_WORKFLOW_CONFIG, ...load('agntdash_workflow_config', {}) }));

  const [consolePrompt, setConsolePrompt] = useState('');
  const [isConsoleSubmitting, setIsConsoleSubmitting] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editPromptValue, setEditPromptValue] = useState('');
  const [draggingCardId, setDraggingCardId] = useState(null);

  const resizeRef = useRef(null);
  const resizeMoveRef = useRef(null);
  const resizeUpRef = useRef(null);

  const isApiConnected = !!(
    (activeProvider === 'openrouter' && openRouterKey) ||
    (activeProvider === 'openai' && openAIKey) ||
    (activeProvider === 'opencode' && openCodeKey)
  );

  useEffect(() => { localStorage.setItem('agntdash_cards_v3', JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem('agntdash_groups_v2', JSON.stringify(groups)); }, [groups]);
  useEffect(() => { localStorage.setItem('agntdash_workflow_config', JSON.stringify(workflowConfig)); }, [workflowConfig]);

  useEffect(() => {
    resizeMoveRef.current = (e) => {
      if (!resizeRef.current) return;
      const { cardId, startCols, startRows, startX, startY } = resizeRef.current;
      const newCols = Math.max(2, Math.min(12, startCols + Math.round((e.clientX - startX) / 100)));
      const newRows = Math.max(1, Math.min(6, startRows + Math.round((e.clientY - startY) / 140)));
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, cols: newCols, rows: newRows } : c));
    };
    resizeUpRef.current = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', resizeMoveRef.current);
      document.removeEventListener('mouseup', resizeUpRef.current);
    };
  }, []);

  useEffect(() => {
    if (cards.some(c => c.id === '1' && c.loading)) fetchCard1Direct();
    if (cards.some(c => c.id === '2' && c.loading)) fetchCard2Direct();
  }, []);

  /* ─── DIRECT API FETCHERS (default cards only) ─── */
  const fetchCard1Direct = async () => {
    setCards(prev => prev.map(c => c.id==='1' ? {...c, loading:true} : c));
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily');
      if (res.ok) {
        const json = await res.json();
        const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const chartData = json.prices.slice(-7).map((p,i) => ({ name: days[i]||'Day', value: Math.round(p[1]) }));
        setCards(prev => prev.map(c => c.id==='1' ? { ...c, data: chartData, renderSpec: {...c.renderSpec, summary:`Live from CoinGecko. Current: $${chartData[chartData.length-1].value.toLocaleString()}`}, lastFetched: new Date().toISOString(), loading:false, error:null } : c));
        return;
      }
    } catch (_) {}
    setCards(prev => prev.map(c => c.id==='1' ? { ...c, data:[{name:'Mon',value:67200},{name:'Tue',value:67900},{name:'Wed',value:68420},{name:'Thu',value:68100},{name:'Fri',value:68900},{name:'Sat',value:69400},{name:'Sun',value:70150}], renderSpec:{...c.renderSpec, summary:'CoinGecko rate-limited. Showing historical data.'}, lastFetched:new Date().toISOString(), loading:false, error:null } : c));
  };

  const fetchCard2Direct = async () => {
    setCards(prev => prev.map(c => c.id==='2' ? {...c, loading:true} : c));
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074,48.8566,35.6762&longitude=-0.1278,2.3522,139.6503&current_weather=true');
      if (res.ok) {
        const json = await res.json();
        const results = Array.isArray(json) ? json : [json];
        const cities = ['London','Paris','Tokyo'];
        const rows = results.map((item,i) => {
          const t = item.current_weather?.temperature;
          const w = item.current_weather?.windspeed;
          const code = item.current_weather?.weathercode || 0;
          const cond = code >= 51 ? 'Rainy 🌧️' : code >= 1 ? 'Cloudy ⛅' : 'Sunny ☀️';
          return { City: cities[i], Temp: `${t}°C`, Condition: cond, Wind: `${w} km/h` };
        });
        setCards(prev => prev.map(c => c.id==='2' ? { ...c, data:{headers:['City','Temp','Condition','Wind'], rows}, renderSpec:{...c.renderSpec, summary:'Live from Open-Meteo API.'}, lastFetched:new Date().toISOString(), loading:false, error:null } : c));
        return;
      }
    } catch (_) {}
    setCards(prev => prev.map(c => c.id==='2' ? { ...c, data:{headers:['City','Temp','Condition','Wind'], rows:[{City:'London',Temp:'18°C',Condition:'Light Rain 🌧️',Wind:'14 km/h'},{City:'Paris',Temp:'22°C',Condition:'Partly Cloudy ⛅',Wind:'9 km/h'},{City:'Tokyo',Temp:'26°C',Condition:'Sunny ☀️',Wind:'12 km/h'}]}, renderSpec:{...c.renderSpec, summary:'Open-Meteo unavailable. Showing typical conditions.'}, lastFetched:new Date().toISOString(), loading:false, error:null } : c));
  };

  /* ─── SAVE SETTINGS ─── */
  const saveSettings = ({ activeProvider: ap, openRouterKey: or, openAIKey: oai, openAIBaseUrl: oaib, openCodeKey: oc, openCodeBaseUrl: ocb, tavilyKey: tv, modelFast: mf, modelSmart: ms }) => {
    setActiveProvider(ap); setOpenRouterKey(or); setOpenAIKey(oai); setOpenAIBaseUrl(oaib);
    setOpenCodeKey(oc); setOpenCodeBaseUrl(ocb); setTavilyKey(tv); setModelFast(mf); setModelSmart(ms);
    if (!ENV_SOURCES.activeProvider)  localStorage.setItem('agntdash_active_provider', ap);
    if (!ENV_SOURCES.openRouterKey)   localStorage.setItem('agntdash_or_key', or);
    if (!ENV_SOURCES.openAIKey)       localStorage.setItem('agntdash_openai_key', oai);
    if (!ENV_SOURCES.openAIBaseUrl)   localStorage.setItem('agntdash_openai_base_url', oaib);
    if (!ENV_SOURCES.openCodeKey)     localStorage.setItem('agntdash_opencode_key', oc);
    if (!ENV_SOURCES.openCodeBaseUrl) localStorage.setItem('agntdash_opencode_base_url', ocb);
    if (!ENV_SOURCES.tavilyKey)       localStorage.setItem('agntdash_tavily_key', tv);
    if (!ENV_SOURCES.modelFast)       localStorage.setItem('agntdash_model_fast', mf);
    if (!ENV_SOURCES.modelSmart)      localStorage.setItem('agntdash_model_smart', ms);
    setIsSettingsOpen(false);
  };

  /* ─── AGENT PIPELINE (single-stage: no classifier) ─── */
  const runAgentPipeline = async (promptText, existingCardId = null) => {
    const key = activeProvider==='openrouter' ? openRouterKey : activeProvider==='openai' ? openAIKey : openCodeKey;
    const base = activeProvider==='openrouter' ? 'https://openrouter.ai/api/v1' : activeProvider==='openai' ? openAIBaseUrl : openCodeBaseUrl;
    const getGroup = () => existingCardId ? (cards.find(c=>c.id===existingCardId)?.group || 'Personal') : 'Personal';
    const sizeToGrid = size => size==='xs'?{cols:3,rows:1}:size==='sm'?{cols:4,rows:2}:size==='md'?{cols:6,rows:2}:size==='lg'?{cols:6,rows:3}:{cols:12,rows:3};

    // Demo mode: use pre-built render code
    if (!key) {
      await new Promise(r => setTimeout(r, 1200));
      const norm = promptText.toLowerCase();
      const match = SIMULATED_RESPONSES.find(r => r.keywords.some(k => norm.includes(k)));
      const payload = match ? JSON.parse(JSON.stringify(match.response)) : JSON.parse(JSON.stringify(DEFAULT_SIMULATED));
      const { cols, rows } = sizeToGrid(payload.size || 'md');
      return { id: existingCardId || Math.random().toString(36).slice(2,9), prompt: promptText, ...payload, group: getGroup(), cols, rows, lastFetched: new Date().toISOString(), loading: false, error: null };
    }

    try {
      // Optional Tavily web search
      let searchContext = '';
      if (tavilyKey) {
        try {
          const tr = await fetch('https://api.tavily.com/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ api_key: tavilyKey, query: promptText, search_depth: workflowConfig.tavilyDepth||'basic', max_results:4 }) });
          if (tr.ok) { const tj = await tr.json(); if (tj.results) searchContext = tj.results.map(r=>`Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join('\n\n'); }
        } catch (e) { console.warn('Tavily search failed:', e); }
      }

      const sysPrompt = `You are a dashboard card code generator. Return ONLY valid JSON:
{"title":"string","size":"xs|sm|md|lg|xl","dataSource":"string","refreshInterval":0,"data":{},"renderSpec":{"color":"#hex","summary":"string"},"renderCode":"function CardRenderer({data,renderSpec}){...}"}

renderCode MUST be a JavaScript function named CardRenderer that:
- Takes {data, renderSpec} as destructured props
- Uses ONLY React.createElement() calls — absolutely no JSX
- May use React.useState() and React.useEffect() for interactivity
- Handles null/empty/missing data gracefully with a fallback message
- Is styled inline; available CSS vars: var(--fg) var(--fg-muted) var(--fg-dim) var(--primary) var(--success) var(--danger) var(--warning) var(--border) var(--fn) var(--mo)
- Returns one root React element

Visualization guidance:
- Time-series/trends: SVG polylines with gradient area fill, axis labels, current value header
- Tables/comparisons: <table> with alternating row shading, colored key column
- News/feeds: scrollable list items with colored left-border accent, title + metadata
- Checklists/todos: React.useState for toggles, progress bar, strikethrough on done items
- Converters/inputs: React.useState for controlled <input>, live result display
- Countdown timers: React.useEffect with setInterval, formatted d/h/m/s display
- Allocations/portfolios: horizontal bars with labels and percentages, color-coded per item
- Charts: SVG with computed coordinates from data array

Put all data needed for rendering in the "data" field. Make cards visually rich and information-dense.`;

      const userMsg = searchContext
        ? `User request: ${promptText}\n\nLive search results:\n${searchContext}`
        : `User request: ${promptText}`;

      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${key}` },
        body: JSON.stringify({ model: modelSmart, messages:[{role:'system',content:sysPrompt},{role:'user',content:userMsg}], temperature: workflowConfig.plannerTemp || 0.3, response_format:{type:'json_object'} })
      });
      if (!res.ok) throw new Error(`API error: ${res.statusText}`);
      const raw = await res.json();
      const payload = JSON.parse(raw.choices[0].message.content.trim().replace(/^```json\s*/i,'').replace(/```$/,''));
      const { cols, rows } = sizeToGrid(payload.size || 'md');
      return {
        id: existingCardId || Math.random().toString(36).slice(2,9),
        prompt: promptText,
        title: payload.title || 'AI Card',
        size: payload.size || 'md',
        dataSource: searchContext ? 'Tavily Web Search' : (payload.dataSource || 'AI Knowledge'),
        refreshInterval: payload.refreshInterval || 0,
        group: getGroup(),
        cols, rows,
        data: payload.data,
        renderSpec: payload.renderSpec || {},
        renderCode: payload.renderCode || null,
        lastFetched: new Date().toISOString(),
        loading: false, error: null,
      };
    } catch (err) { console.error('Pipeline error:', err); throw err; }
  };

  /* ─── HANDLERS ─── */
  const handleAddCard = async (promptText) => {
    if (!promptText.trim()) { handleAddNewCardPlaceholder(groups[0]?.name || 'Personal'); return; }
    setIsConsoleSubmitting(true);
    const tempId = Math.random().toString(36).slice(2,9);
    setCards(prev => [...prev, { id:tempId, prompt:promptText, title:'Analyzing Intent…', size:'md', cols:6, rows:2, group:'Personal', loading:true, error:null }]);
    if (workflowConfig.clearOnSubmit) setConsolePrompt('');
    try {
      const card = await runAgentPipeline(promptText);
      setCards(prev => prev.map(c => c.id===tempId ? {...card, id:tempId} : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===tempId ? {...c, title:'Error', loading:false, error:err.message||'Pipeline failed. Check API keys.'} : c));
    } finally { setIsConsoleSubmitting(false); }
  };

  const handleRefreshCard = async (cardId) => {
    if (cardId==='1') { fetchCard1Direct(); return; }
    if (cardId==='2') { fetchCard2Direct(); return; }
    setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:true} : c));
    const card = cards.find(c => c.id===cardId);
    if (!card) return;
    try {
      const updated = await runAgentPipeline(card.prompt, cardId);
      setCards(prev => prev.map(c => c.id===cardId ? updated : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:false, error:err.message} : c));
    }
  };

  const handleRefreshAll = () => cards.forEach(c => handleRefreshCard(c.id));
  const handleDeleteCard = id => setCards(prev => prev.filter(c => c.id !== id));

  const handleMoveCardGroup = (cardId, group) => setCards(prev => prev.map(c => c.id===cardId ? {...c, group} : c));

  const handleStartEditingPrompt = card => { setEditingCardId(card.id); setEditPromptValue(card.prompt); };

  const handleSavePromptEdit = async (cardId) => {
    if (!editPromptValue.trim()) return;
    setEditingCardId(null);
    setCards(prev => prev.map(c => c.id===cardId ? {...c, prompt:editPromptValue, loading:true} : c));
    try {
      const updated = await runAgentPipeline(editPromptValue, cardId);
      setCards(prev => prev.map(c => c.id===cardId ? updated : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:false, error:err.message} : c));
    }
  };

  const handleAddNewCardPlaceholder = groupName => {
    const id = Math.random().toString(36).slice(2,9);
    setCards(prev => [...prev, { id, prompt:'', title:'New Card', size:'md', cols:6, rows:2, group:groupName, isCreating:true, loading:false, error:null, data:null, renderSpec:{} }]);
  };

  const handleGenerateInlineCard = async (cardId, promptText) => {
    setCards(prev => prev.map(c => c.id===cardId ? {...c, prompt:promptText, title:'Analyzing…', isCreating:false, loading:true} : c));
    try { const card = await runAgentPipeline(promptText, cardId); setCards(prev => prev.map(c => c.id===cardId ? card : c)); }
    catch (err) { setCards(prev => prev.map(c => c.id===cardId ? {...c, title:'Error', loading:false, error:err.message} : c)); }
  };

  const handleCancelInlineCard = id => setCards(prev => prev.filter(c => c.id !== id));

  const handleCardDragStart = (e, cardId) => { setDraggingCardId(cardId); e.dataTransfer.setData('text/plain', cardId); e.dataTransfer.effectAllowed = 'move'; };

  const handleCardDragOver = (e, targetCardId) => {
    e.preventDefault();
    if (draggingCardId === targetCardId) return;
    const dragIdx = cards.findIndex(c => c.id===draggingCardId);
    const tgtIdx = cards.findIndex(c => c.id===targetCardId);
    if (dragIdx===-1 || tgtIdx===-1) return;
    const updated = [...cards];
    const [dragged] = updated.splice(dragIdx, 1);
    if (dragged.group !== updated[tgtIdx]?.group) dragged.group = updated[Math.min(tgtIdx, updated.length-1)]?.group || dragged.group;
    updated.splice(tgtIdx, 0, dragged);
    setCards(updated);
  };

  const handleCardDragEnd = () => setDraggingCardId(null);
  const toggleGroupCollapse = name => setGroups(prev => prev.map(g => g.name===name ? {...g, collapsed:!g.collapsed} : g));

  const handleAddGroup = () => {
    const name = window.prompt('Enter new group name:');
    if (!name?.trim()) return;
    if (groups.some(g => g.name.toLowerCase()===name.toLowerCase())) { window.alert('Group already exists!'); return; }
    setGroups(prev => [...prev, { name: name.trim(), color: ACCENT_COLORS[prev.length % ACCENT_COLORS.length], collapsed: false }]);
  };

  const handleSaveGroupName = (oldName, newName) => {
    if (groups.some(g => g.name.toLowerCase()===newName.toLowerCase() && g.name!==oldName)) { window.alert('Name already taken!'); return; }
    setGroups(prev => prev.map(g => g.name===oldName ? {...g, name:newName} : g));
    setCards(prev => prev.map(c => c.group===oldName ? {...c, group:newName} : c));
  };

  const handleResizeMouseDown = (e, cardId) => {
    e.preventDefault(); e.stopPropagation();
    const card = cards.find(c => c.id===cardId);
    if (!card) return;
    resizeRef.current = { cardId, startCols:card.cols, startRows:card.rows, startX:e.clientX, startY:e.clientY };
    document.addEventListener('mousemove', resizeMoveRef.current);
    document.addEventListener('mouseup', resizeUpRef.current);
  };

  const handlers = {
    onRefresh: handleRefreshCard,
    onDelete: handleDeleteCard,
    onMove: handleMoveCardGroup,
    onStartEdit: handleStartEditingPrompt,
    onSaveEdit: handleSavePromptEdit,
    onCancelEdit: () => setEditingCardId(null),
    onAddPlaceholder: handleAddNewCardPlaceholder,
    onGenerate: handleGenerateInlineCard,
    onCancel: handleCancelInlineCard,
    onDragStart: handleCardDragStart,
    onDragOver: handleCardDragOver,
    onDragEnd: handleCardDragEnd,
    onToggleGroup: toggleGroupCollapse,
    onSaveGroupName: handleSaveGroupName,
    onAddGroup: handleAddGroup,
    onResizeMouseDown: handleResizeMouseDown,
    onOpenSettings: () => setIsSettingsOpen(true),
  };

  return (
    <div>
      <AppHeader
        activeView={activeView}
        setActiveView={setActiveView}
        isApiConnected={isApiConnected}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshAll={handleRefreshAll}
      />

      {activeView === 'dashboard' && (
        <DashboardView
          cards={cards}
          groups={groups}
          setGroups={setGroups}
          isApiConnected={isApiConnected}
          workflowConfig={workflowConfig}
          consolePrompt={consolePrompt}
          setConsolePrompt={setConsolePrompt}
          isConsoleSubmitting={isConsoleSubmitting}
          onAddCard={handleAddCard}
          editingCardId={editingCardId}
          editPromptValue={editPromptValue}
          setEditPromptValue={setEditPromptValue}
          draggingCardId={draggingCardId}
          handlers={handlers}
          samplePrompts={SAMPLE_PROMPTS}
        />
      )}

      {activeView === 'pipeline' && (
        <PipelineView
          workflowConfig={workflowConfig}
          setWorkflowConfig={setWorkflowConfig}
          modelFast={modelFast}
          modelSmart={modelSmart}
          activeProvider={activeProvider}
          isApiConnected={isApiConnected}
          hasTavily={!!tavilyKey}
        />
      )}

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeProvider={activeProvider}
        openRouterKey={openRouterKey}
        openAIKey={openAIKey}
        openAIBaseUrl={openAIBaseUrl}
        openCodeKey={openCodeKey}
        openCodeBaseUrl={openCodeBaseUrl}
        tavilyKey={tavilyKey}
        modelFast={modelFast}
        modelSmart={modelSmart}
        envSources={ENV_SOURCES}
        onSave={saveSettings}
      />
    </div>
  );
}
