import { useState, useEffect } from 'react';
import './App.css';

// --- CONSTANTS & DEFAULT MOCKS ---

const DEFAULT_MODELS_FAST = [
  'google/gemini-2.5-flash',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku'
];

const DEFAULT_MODELS_SMART = [
  'anthropic/claude-3.5-sonnet',
  'google/gemini-2.5-pro',
  'openai/gpt-4o',
  'deepseek/deepseek-chat'
];

const ACCENT_COLORS = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

const SAMPLE_PROMPTS = [
  { text: 'Show me Bitcoin price this week', icon: 'trending_up', group: 'Finance' },
  { text: 'Weather in London, Paris and Tokyo', icon: 'cloud', group: 'Personal' },
  { text: 'Top tech news this morning', icon: 'newspaper', group: 'Work' },
  { text: 'My daily workout checklist', icon: 'checklist', group: 'Personal' },
  { text: 'Convert 120 miles to kilometers', icon: 'sync_alt', group: 'Utilities' },
  { text: 'Countdown to New Year 2027', icon: 'timer', group: 'Utilities' },
  { text: 'Portfolio breakdown: 50% BTC, 30% ETH, 20% SOL', icon: 'pie_chart', group: 'Finance' },
  { text: 'Map of world earthquake zones', icon: 'public', group: 'Info' }
];

const DEFAULT_WORKFLOW_CONFIG = {
  enableAutocomplete: true,
  clearOnSubmit: true,
  classifierTemp: 0.1,
  classifierCacheTtl: 300,
  prioritizeSearch: false,
  allowParametricFallback: true,
  tavilyDepth: 'basic',
  plannerTemp: 0.3,
  defaultThemeAccent: '#6366f1',
  autoResizeOnOverride: true,
  allowRawJsonEdit: false,
  densePacking: true,
  defaultSortOrder: 'none',
  gridSnapUnit: 8
};

// Pre-defined high fidelity simulated responses when API key is missing
const SIMULATED_RESPONSES = [
  {
    keywords: ['bitcoin', 'btc', 'crypto'],
    response: {
      title: 'BTC / USD — 7 Day',
      cardType: 'chart',
      size: 'lg',
      dataSource: 'CoinGecko API',
      refreshInterval: 300,
      data: [
        { name: 'Mon', value: 67200, volume: 24000 },
        { name: 'Tue', value: 67900, volume: 28000 },
        { name: 'Wed', value: 68420, volume: 31000 },
        { name: 'Thu', value: 68100, volume: 29000 },
        { name: 'Fri', value: 68900, volume: 34000 },
        { name: 'Sat', value: 69400, volume: 21000 },
        { name: 'Sun', value: 70150, volume: 25000 }
      ],
      renderSpec: {
        chartType: 'line',
        xField: 'name',
        yField: 'value',
        color: '#10b981',
        summary: 'Bitcoin broke past $70,000 this weekend with a 4.2% weekly increase, showing bullish continuation.'
      }
    }
  },
  {
    keywords: ['weather', 'london', 'tokyo', 'paris', 'temperature'],
    response: {
      title: 'Global Cities Weather',
      cardType: 'table',
      size: 'md',
      dataSource: 'OpenWeather API',
      refreshInterval: 900,
      data: {
        headers: ['City', 'Temp', 'Condition', 'Wind'],
        rows: [
          { 'City': 'London', 'Temp': '18°C', 'Condition': 'Light Rain 🌧️', 'Wind': '14 km/h' },
          { 'City': 'Paris', 'Temp': '22°C', 'Condition': 'Partly Cloudy ⛅', 'Wind': '9 km/h' },
          { 'City': 'Tokyo', 'Temp': '26°C', 'Condition': 'Sunny ☀️', 'Wind': '12 km/h' },
          { 'City': 'New York', 'Temp': '24°C', 'Condition': 'Thunderstorm ⛈️', 'Wind': '22 km/h' }
        ]
      },
      renderSpec: {
        color: '#6366f1',
        summary: 'Rainy conditions in London contrasted with fair weather in Paris and Tokyo. NY currently under storm warning.'
      }
    }
  },
  {
    keywords: ['news', 'headline', 'tech'],
    response: {
      title: 'Top Tech Headlines',
      cardType: 'feed',
      size: 'md',
      dataSource: 'NewsAPI Scraper',
      refreshInterval: 1800,
      data: [
        { id: 1, title: 'OpenRouter launches real-time model price comparison dashboard', time: '12 min ago', url: '#' },
        { id: 2, title: 'Gemini 3.5 Flash outperforms peers in latency benchmarks', time: '1 hour ago', url: '#' },
        { id: 3, title: 'Vite 8.0 released with advanced SSR caching modules', time: '3 hours ago', url: '#' },
        { id: 4, title: 'W3C adopts CSS Fluid Grids as recommended standard', time: '5 hours ago', url: '#' }
      ],
      renderSpec: {
        color: '#a855f7',
        summary: 'Headlines focus on developers tooling updates and performance breakthroughs in LLM execution models.'
      }
    }
  },
  {
    keywords: ['checklist', 'workout', 'to-do', 'todo', 'task'],
    response: {
      title: 'Daily Fitness Tracker',
      cardType: 'interactive',
      size: 'sm',
      dataSource: 'Local State Memory',
      refreshInterval: 0,
      data: {
        widgetType: 'checklist',
        items: [
          { id: 't1', text: '5km Jog (Morning)', done: true },
          { id: 't2', text: 'Core & Abs Routine (20 mins)', done: false },
          { id: 't3', text: 'Hydration Goal (3L Water)', done: true },
          { id: 't4', text: 'Post-workout protein shake', done: false }
        ]
      },
      renderSpec: {
        color: '#a5b4fc',
        summary: '50% of goals accomplished. Abs routine and protein shake remaining.'
      }
    }
  },
  {
    keywords: ['convert', 'miles', 'km', 'kilometer'],
    response: {
      title: 'Unit Converter (Mi to Km)',
      cardType: 'interactive',
      size: 'xs',
      dataSource: 'Math Engine',
      refreshInterval: 0,
      data: {
        widgetType: 'converter',
        formula: 'mi * 1.60934',
        fromUnit: 'miles',
        toUnit: 'km',
        initialValue: 120
      },
      renderSpec: {
        color: '#f59e0b',
        summary: '120 miles equals approximately 193.12 kilometers.'
      }
    }
  },
  {
    keywords: ['countdown', 'new year', 'timer'],
    response: {
      title: 'Countdown to New Year 2027',
      cardType: 'interactive',
      size: 'xs',
      dataSource: 'Local Clock Engine',
      refreshInterval: 1,
      data: {
        widgetType: 'timer',
        targetDate: '2027-01-01T00:00:00'
      },
      renderSpec: {
        color: '#ef4444',
        summary: 'Calculating remaining days, hours, minutes and seconds.'
      }
    }
  },
  {
    keywords: ['portfolio', 'allocation', 'btc', 'eth', 'sol'],
    response: {
      title: 'Crypto Asset Allocation',
      cardType: 'chart',
      size: 'md',
      dataSource: 'User Connected Portfolio',
      refreshInterval: 0,
      data: [
        { name: 'BTC', value: 50 },
        { name: 'ETH', value: 30 },
        { name: 'SOL', value: 20 }
      ],
      renderSpec: {
        chartType: 'pie',
        xField: 'name',
        yField: 'value',
        color: '#6366f1',
        summary: 'Asset allocation shows heavy weight in Bitcoin (50%), followed by Ethereum (30%) and Solana (20%).'
      }
    }
  },
  {
    keywords: ['map', 'earthquake', 'geo'],
    response: {
      title: 'Global Seismic Zones',
      cardType: 'map',
      size: 'lg',
      dataSource: 'USGS Seismology Feed',
      refreshInterval: 3600,
      data: {
        center: [20, 0],
        zoom: 2,
        markers: [
          { name: 'Pacific Ring of Fire', coords: [35, 139], size: 24, desc: 'High seismic activity zone' },
          { name: 'Mid-Atlantic Ridge', coords: [-15, -25], size: 12, desc: 'Tectonic spreading boundary' },
          { name: 'Alpide Belt', coords: [30, 75], size: 18, desc: 'Collision plate boundary' },
          { name: 'San Andreas Fault', coords: [36, -120], size: 20, desc: 'Transform plate fault line' }
        ]
      },
      renderSpec: {
        color: '#ef4444',
        summary: 'Markers highlight active fault lines globally. The Pacific Ring of Fire reports the highest density of magnitude 5.0+ activities.'
      }
    }
  }
];

const DEFAULT_SIMULATED_RESPONSE = {
  title: 'AI General Knowledge Digest',
  cardType: 'article',
  size: 'md',
  dataSource: 'LLM Knowledge Base',
  refreshInterval: 0,
  data: {
    headline: 'Explore the Infinite Possibilities of AI-Native Grids',
    body: 'Agntdash parses any natural language prompt into a structured visualization. Since you are running in Demo Mode, this card was generated dynamically to simulate our multi-agent pipeline. Connect your API Keys in the settings panel to retrieve live search scrapings, custom REST endpoints, and parameterize complex logic!'
  },
  renderSpec: {
    color: '#6366f1',
    summary: 'Connecting an API Key enables real-time queries and autonomous model selection across the registered endpoints.'
  }
};

export default function App() {
  // --- STATE VARIABLES ---
  const [activeView, setActiveView] = useState('app'); // 'app' or 'workflow'
  const [editingGroupName, setEditingGroupName] = useState(null);
  const [editGroupValue, setEditGroupValue] = useState('');
  
  // Settings
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem('agntdash_active_provider') || 'openrouter');
  const [openRouterKey, setOpenRouterKey] = useState(() => localStorage.getItem('agntdash_or_key') || '');
  const [openAIKey, setOpenAIKey] = useState(() => localStorage.getItem('agntdash_openai_key') || '');
  const [openAICustomBaseUrl, setOpenAICustomBaseUrl] = useState(() => localStorage.getItem('agntdash_openai_base_url') || 'https://api.openai.com/v1');
  const [openCodeKey, setOpenCodeKey] = useState(() => localStorage.getItem('agntdash_opencode_key') || '');
  const [openCodeBaseUrl, setOpenCodeBaseUrl] = useState(() => localStorage.getItem('agntdash_opencode_base_url') || 'https://api.opencode.go/v1');
  const [tavilyKey, setTavilyKey] = useState(() => localStorage.getItem('agntdash_tavily_key') || '');

  const [modelFast, setModelFast] = useState(() => localStorage.getItem('agntdash_model_fast') || DEFAULT_MODELS_FAST[0]);
  const [modelSmart, setModelSmart] = useState(() => localStorage.getItem('agntdash_model_smart') || DEFAULT_MODELS_SMART[0]);
  const [allModels, setAllModels] = useState([]); // kept for external use if needed
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Workflow Config state
  const [workflowConfig, setWorkflowConfig] = useState(() => {
    const saved = localStorage.getItem('agntdash_workflow_config');
    if (saved) {
      try {
        return { ...DEFAULT_WORKFLOW_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_WORKFLOW_CONFIG;
  });

  // Raw JSON edit inline states
  const [editJsonValue, setEditJsonValue] = useState('');
  const [isEditingJson, setIsEditingJson] = useState(false);
  
  // Dashboard Core State
  // Initial cards are clean, without mock data, starting in loading states
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('agntdash_cards');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: '1',
        prompt: 'Show me Bitcoin price this week',
        title: 'BTC / USD — 7 Day',
        cardType: 'chart',
        size: 'lg',
        dataSource: 'CoinGecko API',
        refreshInterval: 300,
        group: 'Finance',
        cols: 6,
        rows: 2,
        data: [],
        renderSpec: {
          chartType: 'line',
          xField: 'name',
          yField: 'value',
          color: '#10b981',
          summary: 'Connecting to CoinGecko live API...'
        },
        lastFetched: null,
        loading: true,
        error: null
      },
      {
        id: '2',
        prompt: 'Weather in London, Paris and Tokyo',
        title: 'Global Cities Weather',
        cardType: 'table',
        size: 'md',
        dataSource: 'Open-Meteo API',
        refreshInterval: 900,
        group: 'Personal',
        cols: 6,
        rows: 2,
        data: null,
        renderSpec: {
          color: '#6366f1',
          summary: 'Connecting to Open-Meteo live API...'
        },
        lastFetched: null,
        loading: true,
        error: null
      },
      {
        id: '3',
        prompt: 'My daily workout checklist',
        title: 'Daily Fitness Tracker',
        cardType: 'interactive',
        size: 'sm',
        dataSource: 'Local State Memory',
        refreshInterval: 0,
        group: 'Personal',
        cols: 4,
        rows: 2,
        data: {
          widgetType: 'checklist',
          items: [
            { id: 't1', text: '5km Jog (Morning)', done: true },
            { id: 't2', text: 'Core & Abs Routine (20 mins)', done: false },
            { id: 't3', text: 'Hydration Goal (3L Water)', done: true },
            { id: 't4', text: 'Post-workout protein shake', done: false }
          ]
        },
        renderSpec: {
          color: '#a5b4fc',
          summary: '50% of goals accomplished.'
        },
        lastFetched: new Date().toISOString(),
        loading: false,
        error: null
      }
    ];
  });

  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('agntdash_groups');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { name: 'Finance', color: '#10b981', collapsed: false },
      { name: 'Personal', color: '#6366f1', collapsed: false },
      { name: 'Work', color: '#a855f7', collapsed: false },
      { name: 'Utilities', color: '#f59e0b', collapsed: false }
    ];
  });

  // UI Interactive States
  const [consolePrompt, setConsolePrompt] = useState('');
  const [isConsoleSubmitting, setIsConsoleSubmitting] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editPromptValue, setEditPromptValue] = useState('');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Drag and drop / Resize states
  const [draggingCardId, setDraggingCardId] = useState(null);
  const [resizeStart, setResizeStart] = useState(null); // { cardId, startWidth, startHeight, startCols, startRows, startX, startY }

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('agntdash_cards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('agntdash_groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('agntdash_workflow_config', JSON.stringify(workflowConfig));
  }, [workflowConfig]);

  // --- DIRECT CONNECTOR WORKFLOWS ---
  const fetchCard1Direct = async () => {
    setCards(prev => prev.map(c => c.id === '1' ? { ...c, loading: true } : c));
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily');
      if (res.ok) {
        const json = await res.json();
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chartData = json.prices.slice(-7).map((p, idx) => ({
          name: days[idx] || 'Day',
          value: Math.round(p[1]),
          volume: 24000 + idx * 1000
        }));
        setCards(prev => prev.map(c => c.id === '1' ? {
          ...c,
          data: chartData,
          renderSpec: {
            ...c.renderSpec,
            summary: `Bitcoin price fetched live from CoinGecko. Current price: $${chartData[chartData.length-1].value.toLocaleString()}.`
          },
          lastFetched: new Date().toISOString(),
          loading: false,
          error: null
        } : c));
      } else {
        throw new Error('CoinGecko returned status ' + res.status);
      }
    } catch (e) {
      console.warn('Direct CoinGecko fetch failed, using fallback:', e);
      setCards(prev => prev.map(c => c.id === '1' ? {
        ...c,
        data: [
          { name: 'Mon', value: 67200, volume: 24000 },
          { name: 'Tue', value: 67900, volume: 28000 },
          { name: 'Wed', value: 68420, volume: 31000 },
          { name: 'Thu', value: 68100, volume: 29000 },
          { name: 'Fri', value: 68900, volume: 34000 },
          { name: 'Sat', value: 69400, volume: 21000 },
          { name: 'Sun', value: 70150, volume: 25000 }
        ],
        renderSpec: {
          ...c.renderSpec,
          summary: 'CoinGecko API rate limit reached. Displaying historical cryptocurrency values.'
        },
        lastFetched: new Date().toISOString(),
        loading: false,
        error: null
      } : c));
    }
  };

  const fetchCard2Direct = async () => {
    setCards(prev => prev.map(c => c.id === '2' ? { ...c, loading: true } : c));
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074,48.8566,35.6762&longitude=-0.1278,2.3522,139.6503&current_weather=true');
      if (res.ok) {
        const json = await res.json();
        const results = Array.isArray(json) ? json : [json];
        const cities = ['London', 'Paris', 'Tokyo'];
        const rows = results.map((item, idx) => {
          const temp = item.current_weather?.temperature;
          const wind = item.current_weather?.windspeed;
          const code = item.current_weather?.weathercode;
          let condition = 'Sunny ☀️';
          if (code >= 51) condition = 'Rainy 🌧️';
          else if (code >= 1) condition = 'Cloudy ⛅';
          return {
            'City': cities[idx] || 'Unknown',
            'Temp': `${temp}°C`,
            'Condition': condition,
            'Wind': `${wind} km/h`
          };
        });

        setCards(prev => prev.map(c => c.id === '2' ? {
          ...c,
          data: {
            headers: ['City', 'Temp', 'Condition', 'Wind'],
            rows
          },
          renderSpec: {
            ...c.renderSpec,
            summary: 'Real-time weather data fetched live from Open-Meteo API.'
          },
          lastFetched: new Date().toISOString(),
          loading: false,
          error: null
        } : c));
      } else {
        throw new Error('Open-Meteo returned status ' + res.status);
      }
    } catch (e) {
      console.warn('Direct Open-Meteo fetch failed:', e);
      setCards(prev => prev.map(c => c.id === '2' ? {
        ...c,
        data: {
          headers: ['City', 'Temp', 'Condition', 'Wind'],
          rows: [
            { 'City': 'London', 'Temp': '18°C', 'Condition': 'Light Rain 🌧️', 'Wind': '14 km/h' },
            { 'City': 'Paris', 'Temp': '22°C', 'Condition': 'Partly Cloudy ⛅', 'Wind': '9 km/h' },
            { 'City': 'Tokyo', 'Temp': '26°C', 'Condition': 'Sunny ☀️', 'Wind': '12 km/h' }
          ]
        },
        renderSpec: {
          ...c.renderSpec,
          summary: 'Open-Meteo API failed. Showing typical climate weather conditions.'
        },
        lastFetched: new Date().toISOString(),
        loading: false,
        error: null
      } : c));
    }
  };

  // On mount: fetch live real data for starting cards
  useEffect(() => {
    if (cards.some(c => c.id === '1' && c.loading)) {
      fetchCard1Direct();
    }
    if (cards.some(c => c.id === '2' && c.loading)) {
      fetchCard2Direct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Model list is now fetched inside SettingsModal per-provider; no App-level fetch needed.

  // --- SAVE SETTINGS ---
  const saveSettings = (config) => {
    setActiveProvider(config.activeProvider);
    setOpenRouterKey(config.openRouterKey);
    setOpenAIKey(config.openAIKey);
    setOpenAICustomBaseUrl(config.openAICustomBaseUrl);
    setOpenCodeKey(config.openCodeKey);
    setOpenCodeBaseUrl(config.openCodeBaseUrl);
    setTavilyKey(config.tavilyKey);
    setModelFast(config.modelFast);
    setModelSmart(config.modelSmart);

    localStorage.setItem('agntdash_active_provider', config.activeProvider);
    localStorage.setItem('agntdash_or_key', config.openRouterKey);
    localStorage.setItem('agntdash_openai_key', config.openAIKey);
    localStorage.setItem('agntdash_openai_base_url', config.openAICustomBaseUrl);
    localStorage.setItem('agntdash_opencode_key', config.openCodeKey);
    localStorage.setItem('agntdash_opencode_base_url', config.openCodeBaseUrl);
    localStorage.setItem('agntdash_tavily_key', config.tavilyKey);
    localStorage.setItem('agntdash_model_fast', config.modelFast);
    localStorage.setItem('agntdash_model_smart', config.modelSmart);

    setIsSettingsOpen(false);
  };

  // --- PARSE AND RETRIEVE PIPELINE ---
  const runAgentPipeline = async (prompt, existingCardId = null) => {
    let activeKey = '';
    let activeBaseUrl = '';
    
    if (activeProvider === 'openrouter') {
      activeKey = openRouterKey;
      activeBaseUrl = 'https://openrouter.ai/api/v1';
    } else if (activeProvider === 'openai') {
      activeKey = openAIKey;
      activeBaseUrl = openAICustomBaseUrl;
    } else if (activeProvider === 'opencode') {
      activeKey = openCodeKey;
      activeBaseUrl = openCodeBaseUrl;
    }

    const isSimulation = !activeKey;
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    if (isSimulation) {
      await delay(1200); // Shimmer effect
      
      const normalizedPrompt = prompt.toLowerCase();
      const match = SIMULATED_RESPONSES.find(item => 
        item.keywords.some(keyword => normalizedPrompt.includes(keyword))
      );

      const parsedPayload = match ? JSON.parse(JSON.stringify(match.response)) : JSON.parse(JSON.stringify(DEFAULT_SIMULATED_RESPONSE));
      
      let cols = 4, rows = 2;
      if (parsedPayload.size === 'xs') { cols = 3; rows = 1; }
      else if (parsedPayload.size === 'sm') { cols = 4; rows = 2; }
      else if (parsedPayload.size === 'md') { cols = 6; rows = 2; }
      else if (parsedPayload.size === 'lg') { cols = 6; rows = 3; }
      else if (parsedPayload.size === 'xl') { cols = 12; rows = 3; }

      const groupName = existingCardId 
        ? (cards.find(c => c.id === existingCardId)?.group || 'Personal')
        : 'Personal';

      return {
        id: existingCardId || Math.random().toString(36).substring(2, 9),
        prompt,
        title: parsedPayload.title,
        cardType: parsedPayload.cardType,
        size: parsedPayload.size,
        dataSource: parsedPayload.dataSource,
        refreshInterval: parsedPayload.refreshInterval,
        group: groupName,
        cols,
        rows,
        data: parsedPayload.data,
        renderSpec: parsedPayload.renderSpec,
        lastFetched: new Date().toISOString(),
        loading: false,
        error: null
      };
    }

    // --- LIVE MULTI-PROVIDER & TAVILY PIPELINE ---
    try {
      // Step 2: Intent Classification (Fast Model)
      let classification = {
        cardType: 'article',
        size: 'md',
        dataSource: 'AI Knowledge',
        searchRequired: false
      };

      try {
        const classSystemPrompt = `You are a dashboard intent classifier. Analyze the user prompt and classify the display requirements.
Your output MUST be a valid JSON object matching this schema:
{
  "cardType": "chart" | "stat" | "article" | "table" | "map" | "interactive" | "feed" | "media",
  "size": "xs" | "sm" | "md" | "lg" | "xl",
  "dataSource": "Suggested source name",
  "searchRequired": true | false
}
Return ONLY JSON, no other text.`;

        const classResponse = await fetch(`${activeBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`
          },
          body: JSON.stringify({
            model: modelFast,
            messages: [
              { role: 'system', content: classSystemPrompt },
              { role: 'user', content: `Prompt: "${prompt}"` }
            ],
            temperature: workflowConfig.classifierTemp,
            response_format: { type: 'json_object' }
          })
        });

        if (classResponse.ok) {
          const classJson = await classResponse.json();
          if (classJson && classJson.choices && classJson.choices[0]) {
            const classText = classJson.choices[0].message.content.trim();
            const cleanClassStr = classText.replace(/^```json\s*/i, '').replace(/```$/, '');
            const parsedClass = JSON.parse(cleanClassStr);
            if (parsedClass.cardType) {
              classification = parsedClass;
            }
          }
        }
      } catch (err) {
        console.warn('Classifier stage failed, using default fallback:', err);
      }

      // Step 3: Data Router Sourcing
      let searchContext = '';
      const shouldSearch = classification.searchRequired || workflowConfig.prioritizeSearch;
      if (tavilyKey && shouldSearch) {
        try {
          const tRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: prompt,
              search_depth: workflowConfig.tavilyDepth || 'basic',
              max_results: 3
            })
          });
          if (tRes.ok) {
            const tJson = await tRes.json();
            if (tJson && Array.isArray(tJson.results)) {
              searchContext = tJson.results.map(r => `Title: ${r.title}\nSource: ${r.url}\nContent: ${r.content}`).join('\n\n');
            }
          }
        } catch (err) {
          console.warn('Tavily search query failed:', err);
        }
      }

      // Check parametric fallback configuration
      if (shouldSearch && !searchContext && !workflowConfig.allowParametricFallback) {
        throw new Error('Sourcing failed: Web search did not return results and parametric fallback is disabled.');
      }

      // Step 4: Render Planner (Smart Model)
      const systemPrompt = `You are a dashboard card planner. Given a user's prompt, analyze it and return a single JSON object that defines the card structure, fetches or simulates the data, and configures the default rendering.
No extra conversational text. Return ONLY a valid JSON block inside markdown brackets or directly.

Your JSON schema MUST match:
{
  "title": "Short title describing the metric/topic",
  "cardType": "${classification.cardType}",
  "size": "${classification.size}",
  "dataSource": "Name of the API or source utilized",
  "refreshInterval": 0,
  "data": { ... },
  "renderSpec": {
    "chartType": "line" | "bar" | "area" | "scatter" | "pie" | "candlestick",
    "xField": "key for X axis",
    "yField": "key for Y axis",
    "color": "HEX color string",
    "summary": "1-2 sentence insights from the data"
  }
}

Guidelines:
- IMPORTANT: Prioritize rich structured datasets in "data" (e.g., arrays or lists for historical trends or comparisons) rather than single metrics, so the user can switch views (e.g., Chart -> Table -> Stat) instantly on the client.
- Schema guidelines for cardType / data:
  * "chart": Array of objects (e.g. [{"name": "Jan", "value": 100}]). Suitable for line, bar, area charts, stats, tables, and feeds.
  * "stat": Single metric object {"value": "number/text", "trend": "+X%/-Y%"}. Suitable for stats, tables, articles.
  * "article": Narrative summary object {"headline": "...", "body": "..."}.
  * "table": Multi-column comparative object {"headers": ["...", "..."], "rows": [{"col1": "val"}]}.
  * "map": Locations object {"center": [lat, lng], "zoom": 3, "markers": [{"name": "...", "coords": [lat, lng], "desc": "..."}]}.
  * "interactive": Mini widget object {"widgetType": "checklist"|"converter"|"timer", "items": [{"id":"1","text":"..","done":false}], "fromUnit":"..","toUnit":"..","initialValue":100}.
  * "feed": Array of listings [{"id": 1, "title": "...", "time": "..."}].
  * "media": Image context object {"caption": "...", "url": "..."}.

Generate accurate historical or realistic real-time simulated data based on search data or parametric knowledge. Be extremely detailed and precise.`;

      const userMessage = searchContext 
        ? `User Prompt: ${prompt}\n\nWeb Search Context gathered from Tavily:\n${searchContext}\n\nSynthesize this search data into the JSON schema format.`
        : `Prompt: ${prompt}`;

      const response = await fetch(`${activeBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: modelSmart,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: workflowConfig.plannerTemp,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`Model API error: ${response.statusText}`);
      }

      const rawJson = await response.json();
      const answerText = rawJson.choices[0].message.content.trim();
      const cleanJsonStr = answerText.replace(/^```json\s*/i, '').replace(/```$/, '');
      const parsedPayload = JSON.parse(cleanJsonStr);

      let cols = 4, rows = 2;
      if (parsedPayload.size === 'xs') { cols = 3; rows = 1; }
      else if (parsedPayload.size === 'sm') { cols = 4; rows = 2; }
      else if (parsedPayload.size === 'md') { cols = 6; rows = 2; }
      else if (parsedPayload.size === 'lg') { cols = 6; rows = 3; }
      else if (parsedPayload.size === 'xl') { cols = 12; rows = 3; }

      const groupName = existingCardId 
        ? (cards.find(c => c.id === existingCardId)?.group || 'Personal')
        : 'Personal';

      return {
        id: existingCardId || Math.random().toString(36).substring(2, 9),
        prompt,
        title: parsedPayload.title || 'AI Generated Card',
        cardType: parsedPayload.cardType || 'article',
        size: parsedPayload.size || 'md',
        dataSource: searchContext ? 'Tavily Web Search' : (parsedPayload.dataSource || 'AI Knowledge'),
        refreshInterval: parsedPayload.refreshInterval || 0,
        group: groupName,
        cols,
        rows,
        data: parsedPayload.data,
        renderSpec: parsedPayload.renderSpec || {},
        lastFetched: new Date().toISOString(),
        loading: false,
        error: null
      };

    } catch (err) {
      console.error('Agent pipeline run failed:', err);
      throw err;
    }
  };

  // --- ACTIONS ---

  // Handle Add Card from main bar
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!consolePrompt.trim()) {
      const targetGroup = groups[0]?.name || 'Personal';
      handleAddNewCardPlaceholder(targetGroup);
      return;
    }

    setIsConsoleSubmitting(true);

    const tempId = Math.random().toString(36).substring(2, 9);
    const newCardPlaceholder = {
      id: tempId,
      prompt: consolePrompt,
      title: 'Analyzing Intent...',
      cardType: 'article',
      size: 'md',
      cols: 4,
      rows: 2,
      group: 'Personal',
      loading: true,
      error: null
    };

    setCards(prev => [...prev, newCardPlaceholder]);
    if (workflowConfig.clearOnSubmit) {
      setConsolePrompt('');
    }

    try {
      const finalCard = await runAgentPipeline(consolePrompt);
      setCards(prev => prev.map(c => c.id === tempId ? finalCard : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id === tempId ? {
        ...c,
        title: 'Error generating card',
        loading: false,
        error: err.message || 'Check API keys and model configuration.'
      } : c));
    } finally {
      setIsConsoleSubmitting(false);
    }
  };

  // Trigger card refresh
  const handleRefreshCard = async (cardId) => {
    if (cardId === '1') {
      await fetchCard1Direct();
      return;
    }
    if (cardId === '2') {
      await fetchCard2Direct();
      return;
    }

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, loading: true } : c));
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    try {
      const updatedCard = await runAgentPipeline(card.prompt, cardId);
      setCards(prev => prev.map(c => c.id === cardId ? updatedCard : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id === cardId ? {
        ...c,
        loading: false,
        error: err.message || 'Failed to refresh data.'
      } : c));
    }
  };

  // Refresh all cards at once
  const handleRefreshAll = async () => {
    cards.forEach(card => {
      handleRefreshCard(card.id);
    });
  };

  // Delete Card
  const handleDeleteCard = (cardId) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
  };

  // Override presentation cardType manually (Rethought Workflow: User has final layout authority + autoresize)
  const handleOverrideCardType = (cardId, newType) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        let cols = c.cols;
        let rows = c.rows;
        let size = c.size;

        // Auto-resize card to fit the new visual presentation style (only if config allows)
        if (workflowConfig.autoResizeOnOverride) {
          if (newType === 'stat') {
            cols = 3; rows = 1; size = 'xs';
          } else if (newType === 'chart') {
            cols = 6; rows = 2; size = 'md';
          } else if (newType === 'table') {
            cols = 6; rows = 3; size = 'lg';
          } else if (newType === 'article') {
            cols = 6; rows = 2; size = 'md';
          } else if (newType === 'map') {
            cols = 6; rows = 3; size = 'lg';
          } else if (newType === 'media') {
            cols = 4; rows = 2; size = 'sm';
          } else if (newType === 'feed') {
            cols = 6; rows = 2; size = 'md';
          } else if (newType === 'interactive') {
            const widgetType = c.data?.widgetType;
            if (widgetType === 'timer') {
              cols = 3; rows = 1; size = 'xs';
            } else {
              cols = 4; rows = 2; size = 'sm';
            }
          }
        }

        return { ...c, cardType: newType, cols, rows, size };
      }
      return c;
    }));
  };

  // Move a card to a different group dynamically
  const handleMoveCardGroup = (cardId, newGroupName) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, group: newGroupName } : c));
  };

  // Add an empty placeholder card for inline creation (autoresize / spec matching)
  const handleAddNewCardPlaceholder = (groupName) => {
    const tempId = Math.random().toString(36).substring(2, 9);
    const blankCard = {
      id: tempId,
      prompt: '',
      title: 'New Dashboard Card',
      cardType: 'article',
      size: 'md',
      cols: 6,
      rows: 2,
      group: groupName,
      isCreating: true,
      loading: false,
      error: null,
      data: null,
      renderSpec: {}
    };
    setCards(prev => [...prev, blankCard]);
  };

  // Generate card from inline builder
  const handleGenerateInlineCard = async (cardId, promptText) => {
    setCards(prev => prev.map(c => c.id === cardId ? { 
      ...c, 
      prompt: promptText, 
      title: 'Analyzing Intent...', 
      isCreating: false, 
      loading: true 
    } : c));

    try {
      const finalCard = await runAgentPipeline(promptText, cardId);
      setCards(prev => prev.map(c => c.id === cardId ? finalCard : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id === cardId ? {
        ...c,
        title: 'Error generating card',
        loading: false,
        error: err.message || 'Check API keys and model configuration.'
      } : c));
    }
  };

  // Cancel inline card generation
  const handleCancelInlineCard = (cardId) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
  };

  // Save renamed group and update associated cards
  const handleSaveGroupName = (oldName) => {
    const val = editGroupValue.trim();
    if (!val) {
      setEditingGroupName(null);
      return;
    }
    if (val === oldName) {
      setEditingGroupName(null);
      return;
    }
    if (groups.some(g => g.name.toLowerCase() === val.toLowerCase())) {
      alert("A group with that name already exists!");
      return;
    }
    setGroups(prev => prev.map(g => g.name === oldName ? { ...g, name: val } : g));
    setCards(prev => prev.map(c => c.group === oldName ? { ...c, group: val } : c));
    setEditingGroupName(null);
  };

  // Edit Prompt Inline
  const handleStartEditingPrompt = (card) => {
    setEditingCardId(card.id);
    setEditPromptValue(card.prompt);
  };

  const handleSavePromptEdit = async (cardId) => {
    if (!editPromptValue.trim()) return;
    setEditingCardId(null);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, prompt: editPromptValue, loading: true } : c));

    try {
      const updatedCard = await runAgentPipeline(editPromptValue, cardId);
      setCards(prev => prev.map(c => c.id === cardId ? updatedCard : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id === cardId ? {
        ...c,
        loading: false,
        error: err.message || 'Failed to update prompt.'
      } : c));
    }
  };

  // Add Preset from list
  const handlePresetSelect = async (presetText) => {
    setIsGalleryOpen(false);
    setConsolePrompt(presetText);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Interactive Checklist Check/Uncheck
  const handleChecklistToggle = (cardId, itemId) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId && c.cardType === 'interactive' && c.data.widgetType === 'checklist') {
        const updatedItems = c.data.items.map(item => 
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        const doneCount = updatedItems.filter(i => i.done).length;
        const total = updatedItems.length;
        return {
          ...c,
          data: { ...c.data, items: updatedItems },
          renderSpec: {
            ...c.renderSpec,
            summary: `${Math.round((doneCount / total) * 100)}% of goals accomplished.`
          }
        };
      }
      return c;
    }));
  };

  // Interactive Unit Converter value change
  const handleConverterValueChange = (cardId, val) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId && c.cardType === 'interactive' && c.data.widgetType === 'converter') {
        const floatVal = parseFloat(val) || 0;
        const result = floatVal * 1.60934;
        return {
          ...c,
          data: { ...c.data, initialValue: floatVal },
          renderSpec: {
            ...c.renderSpec,
            summary: `${floatVal} miles equals approximately ${result.toFixed(2)} kilometers.`
          }
        };
      }
      return c;
    }));
  };

  // --- HTML5 DRAG & DROP FOR CARD REORDERING & GROUPING ---

  const handleCardDragStart = (e, cardId) => {
    setDraggingCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleCardDragOver = (e, targetCardId) => {
    e.preventDefault();
    if (draggingCardId === targetCardId) return;

    const draggedIdx = cards.findIndex(c => c.id === draggingCardId);
    const targetIdx = cards.findIndex(c => c.id === targetCardId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const targetCard = cards[targetIdx];
    const draggedCard = cards[draggedIdx];

    if (draggedCard.group !== targetCard.group) {
      draggedCard.group = targetCard.group;
    }

    const updated = [...cards];
    updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, draggedCard);
    setCards(updated);
  };

  const handleCardDragEnd = () => {
    setDraggingCardId(null);
  };

  // Drop card onto group container
  const handleGroupDrop = (e, groupName) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain') || draggingCardId;
    if (!cardId) return;
    
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, group: groupName } : c
    ));
    setDraggingCardId(null);
  };

  // Auto-arrange cards to pack them optimally and prevent empty spaces
  const handleAutoArrange = () => {
    const cardWeights = { xl: 36, lg: 18, md: 12, sm: 8, xs: 3 };
    const order = workflowConfig.defaultSortOrder;
    if (order === 'none') {
      // Trigger a no-op repaint so dense grid flow re-evaluates
      setCards(prev => [...prev]);
      return;
    }
    const sorted = [...cards].sort((a, b) => {
      const weightA = cardWeights[a.size] || (a.cols * a.rows) || 0;
      const weightB = cardWeights[b.size] || (b.cols * b.rows) || 0;
      return order === 'size-asc' ? weightA - weightB : weightB - weightA;
    });
    setCards(sorted);
  };

  // --- CUSTOM RESIZE HANDLE LOGIC ---

  const handleResizeMouseDown = (e, cardId) => {
    e.preventDefault();
    e.stopPropagation();
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setResizeStart({
      cardId,
      startCols: card.cols,
      startRows: card.rows,
      startX: e.clientX,
      startY: e.clientY
    });

    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
  };

  const handleResizeMouseMove = (e) => {
    if (!resizeStart) return;

    const deltaX = e.clientX - resizeStart.startX;
    const deltaY = e.clientY - resizeStart.startY;

    const colStep = 100; // px
    const rowStep = 140; // px

    const colsDelta = Math.round(deltaX / colStep);
    const rowsDelta = Math.round(deltaY / rowStep);

    let newCols = Math.max(2, Math.min(12, resizeStart.startCols + colsDelta));
    let newRows = Math.max(1, Math.min(6, resizeStart.startRows + rowsDelta));

    setCards(prev => prev.map(c => 
      c.id === resizeStart.cardId 
        ? { ...c, cols: newCols, rows: newRows } 
        : c
    ));
  };

  const handleResizeMouseUp = () => {
    setResizeStart(null);
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
  };

  // Group Accents and Actions
  const toggleGroupCollapse = (groupName) => {
    setGroups(prev => prev.map(g => 
      g.name === groupName ? { ...g, collapsed: !g.collapsed } : g
    ));
  };

  const addNewGroup = () => {
    const name = prompt('Enter new group name:');
    if (!name || name.trim() === '') return;
    if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      alert('Group already exists!');
      return;
    }
    const color = ACCENT_COLORS[groups.length % ACCENT_COLORS.length];
    setGroups([...groups, { name, color, collapsed: false }]);
  };

  // --- RENDER CUSTOM SVG CHART COMPONENTS ---

  const renderSVGChart = (card) => {
    const { data, renderSpec } = card;
    const chartType = renderSpec.chartType || 'line';
    const color = renderSpec.color || '#6366f1';
    
    let xField = renderSpec.xField || 'name';
    let yField = renderSpec.yField || 'value';

    // Normalise data to array if overridden from table or article
    let chartData = data;
    if (data && data.rows && Array.isArray(data.rows)) {
      // Dynamic mapping of rows to simple chart array
      chartData = data.rows.map(row => {
        const keys = Object.keys(row);
        const xFieldKey = keys.find(k => typeof row[k] === 'string') || keys[0];
        const yFieldKey = keys.find(k => !isNaN(parseFloat(row[k]))) || keys[1];
        return {
          name: row[xFieldKey],
          value: parseFloat(row[yFieldKey]) || 0
        };
      });
      xField = 'name';
      yField = 'value';
    }

    if (!Array.isArray(chartData) || chartData.length === 0) {
      return <div className="card-error-state">No numerical chart data available.</div>;
    }

    // Auto-detect xField/yField keys if missing in data objects
    if (chartData.length > 0) {
      const first = chartData[0];
      if (first[xField] === undefined) {
        const foundX = Object.keys(first).find(k => typeof first[k] === 'string');
        if (foundX) xField = foundX;
      }
      if (first[yField] === undefined) {
        const foundY = Object.keys(first).find(k => typeof first[k] === 'number' || !isNaN(parseFloat(first[k])));
        if (foundY) yField = foundY;
      }
    }

    const values = chartData.map(d => Number(d[yField]) || 0);
    const maxVal = Math.max(...values, 1) * 1.1; // Add 10% padding
    const minVal = Math.min(...values, 0);

    const padding = { top: 15, right: 10, bottom: 20, left: 35 };
    const chartHeight = 120;
    const chartWidth = 320;

    const getX = (index) => padding.left + (index / (chartData.length - 1)) * (chartWidth - padding.left - padding.right);
    const getY = (val) => {
      const range = maxVal - minVal;
      const pct = (val - minVal) / range;
      return chartHeight - padding.bottom - pct * (chartHeight - padding.top - padding.bottom);
    };

    if (chartType === 'line' || chartType === 'area') {
      const points = chartData.map((d, i) => `${getX(i)},${getY(d[yField])}`).join(' ');
      const areaPoints = `${getX(0)},${chartHeight - padding.bottom} ` + points + ` ${getX(chartData.length - 1)},${chartHeight - padding.bottom}`;

      return (
        <div className="chart-container">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%">
            <defs>
              <linearGradient id={`gradient-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
                <stop offset="100%" stopColor={color} stopOpacity="0.0"/>
              </linearGradient>
            </defs>
            
            <line x1={padding.left} y1={getY(minVal)} x2={chartWidth - padding.right} y2={getY(minVal)} stroke="rgba(255,255,255,0.05)" />
            <line x1={padding.left} y1={getY(maxVal / 2)} x2={chartWidth - padding.right} y2={getY(maxVal / 2)} stroke="rgba(255,255,255,0.05)" />
            <line x1={padding.left} y1={getY(maxVal)} x2={chartWidth - padding.right} y2={getY(maxVal)} stroke="rgba(255,255,255,0.05)" />

            {chartType === 'area' && (
              <polygon points={areaPoints} fill={`url(#gradient-${card.id})`} />
            )}

            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {chartData.map((d, i) => (
              <circle
                key={i}
                cx={getX(i)}
                cy={getY(d[yField])}
                r="3"
                fill="#0b0b14"
                stroke={color}
                strokeWidth="1.5"
                className="chart-dot"
              />
            ))}

            <text x={padding.left - 5} y={getY(maxVal) + 3} fill="var(--color-text-dim)" fontSize="8" textAnchor="end">
              {Math.round(maxVal) > 1000 ? `${(maxVal/1000).toFixed(1)}k` : Math.round(maxVal)}
            </text>
            <text x={padding.left - 5} y={getY(minVal) - 2} fill="var(--color-text-dim)" fontSize="8" textAnchor="end">
              {Math.round(minVal)}
            </text>

            {chartData.map((d, i) => (
              i % 2 === 0 && (
                <text key={i} x={getX(i)} y={chartHeight - 4} fill="var(--color-text-dim)" fontSize="8" textAnchor="middle">
                  {d[xField]}
                </text>
              )
            ))}
          </svg>
        </div>
      );
    }

    if (chartType === 'bar' || chartType === 'candlestick') {
      const barWidth = Math.max(5, (chartWidth - padding.left - padding.right) / (chartData.length * 1.5));
      const spacing = barWidth * 0.5;

      return (
        <div className="chart-container">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%">
            <line x1={padding.left} y1={getY(minVal)} x2={chartWidth - padding.right} y2={getY(minVal)} stroke="rgba(255,255,255,0.05)" />
            <line x1={padding.left} y1={getY(maxVal)} x2={chartWidth - padding.right} y2={getY(maxVal)} stroke="rgba(255,255,255,0.05)" />

            {chartData.map((d, i) => {
              const x = padding.left + i * (barWidth + spacing) + spacing / 2;
              const y = getY(d[yField]);
              const barHeight = chartHeight - padding.bottom - y;

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(1, barHeight)}
                    fill={color}
                    rx="2"
                    opacity="0.85"
                    className="chart-bar"
                  />
                  <text x={x + barWidth / 2} y={chartHeight - 4} fill="var(--color-text-dim)" fontSize="8" textAnchor="middle">
                    {d[xField]}
                  </text>
                </g>
              );
            })}

            <text x={padding.left - 5} y={getY(maxVal) + 3} fill="var(--color-text-dim)" fontSize="8" textAnchor="end">
              {Math.round(maxVal)}
            </text>
          </svg>
        </div>
      );
    }

    if (chartType === 'pie' || chartType === 'scatter') {
      const radius = 35;
      const cx = chartWidth / 2;
      const cy = chartHeight / 2 - 5;
      
      const total = values.reduce((sum, v) => sum + v, 0);
      let cumulativeAngle = 0;

      return (
        <div className="chart-container">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%">
            <g transform="translate(0, 0)">
              {chartData.map((d, i) => {
                const val = Number(d[yField]) || 0;
                const angle = (val / total) * 360;
                
                const x1 = cx + radius * Math.cos((cumulativeAngle - 90) * Math.PI / 180);
                const y1 = cy + radius * Math.sin((cumulativeAngle - 90) * Math.PI / 180);
                
                cumulativeAngle += angle;
                
                const x2 = cx + radius * Math.cos((cumulativeAngle - 90) * Math.PI / 180);
                const y2 = cy + radius * Math.sin((cumulativeAngle - 90) * Math.PI / 180);
                
                const largeArcFlag = angle > 180 ? 1 : 0;
                const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                
                const opacity = 1 - (i * 0.2);
                
                return (
                  <path
                    key={i}
                    d={pathData}
                    fill={color}
                    opacity={opacity}
                    stroke="#0b0b14"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
            
            <g transform={`translate(${cx + radius + 15}, ${cy - radius + 10})`}>
              {chartData.slice(0, 5).map((d, i) => {
                const opacity = 1 - (i * 0.2);
                return (
                  <g key={i} transform={`translate(0, ${i * 12})`}>
                    <rect width="6" height="6" fill={color} opacity={opacity} rx="1" />
                    <text x="12" y="6" fill="var(--color-text)" fontSize="8">
                      {d[xField]}: {d[yField]}%
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      );
    }

    return <div className="card-error-state">Unsupported chartType</div>;
  };

  // Determine compatible card formats based on the raw data payload shape (decoupled layout)
  const getCompatibleFormats = (card) => {
    const { data } = card;
    if (!data) return ['article'];

    const formats = ['article', 'table'];

    // If it's an array, list or contains a list structure
    if (Array.isArray(data) || (data && (Array.isArray(data.items) || Array.isArray(data.rows) || Array.isArray(data.results)))) {
      formats.push('feed');
      const testList = Array.isArray(data) ? data : (data.items || data.rows || data.results);
      if (testList && testList.length > 0) {
        const first = testList[0];
        // If there's any numeric field in the elements, it's suitable for charting / stats
        const hasNumeric = Object.values(first).some(
          v => typeof v === 'number' || (!isNaN(v) && typeof v === 'string' && v.trim() !== '')
        );
        if (hasNumeric) {
          formats.push('chart');
          formats.push('stat');
        }
      }
    }

    // If it has coordinates or location markers
    if (data && (data.markers || (data.latitude && data.longitude) || (Array.isArray(data) && data.some(item => item.coords || item.lat || item.latitude)))) {
      formats.push('map');
    }

    // If it is an interactive widget payload
    if (data && (data.widgetType || data.items || data.initialValue !== undefined)) {
      formats.push('interactive');
    }

    // If it has image metadata
    if (data && (data.url || data.imageUrl || data.mediaUrl)) {
      formats.push('media');
    }

    // If it has a single stat value
    if (data && (data.value !== undefined || data.metric !== undefined)) {
      formats.push('stat');
    }

    // Make sure the current cardType is always included in the compatible formats, so it is never hidden
    if (card.cardType) {
      formats.push(card.cardType);
    }

    return Array.from(new Set(formats));
  };

  // --- RENDER CARD BODY DISPATCHER ---

  const renderCardBody = (card) => {
    const { cardType, data, renderSpec } = card;

    if (card.loading) {
      return (
        <div className="card-loading-overlay">
          <span className="material-symbols-outlined shimmer" style={{ fontSize: '32px', color: 'var(--color-primary)' }}>psychology</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '80%' }}>
            <div className="skeleton-bar shimmer" style={{ width: '100%' }}></div>
            <div className="skeleton-bar shimmer" style={{ width: '70%' }}></div>
            <div className="skeleton-bar shimmer" style={{ width: '50%' }}></div>
          </div>
        </div>
      );
    }

    if (card.error) {
      return (
        <div className="card-error-state">
          <span className="material-symbols-outlined card-error-icon">warning</span>
          <div className="card-error-title">Pipeline Failed</div>
          <div className="card-error-desc">{card.error}</div>
          <button className="btn btn-secondary btn-sm" onClick={() => handleRefreshCard(card.id)} style={{ padding: '4px 8px', fontSize: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>refresh</span> Retry
          </button>
        </div>
      );
    }

    switch (cardType) {
      case 'chart':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            {renderSVGChart(card)}
            {renderSpec?.summary && (
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                💡 {renderSpec.summary}
              </p>
            )}
          </div>
        );

      case 'stat':
        // Rethought Workflow: Format stat value on the fly if user overrides chart dataset
        let statVal = data?.value;
        let statTrend = data?.trend;
        
        let targetList = Array.isArray(data) ? data : (data?.rows || data?.items || []);
        if (Array.isArray(targetList) && targetList.length > 0) {
          const last = targetList[targetList.length - 1];
          const prev = targetList[targetList.length - 2];
          const keys = Object.keys(last);
          const yKey = renderSpec.yField || keys.find(k => typeof last[k] === 'number') || keys.find(k => !isNaN(parseFloat(last[k]))) || keys[0];
          
          if (last[yKey] !== undefined) {
            const rawLastVal = parseFloat(last[yKey]) || 0;
            statVal = typeof last[yKey] === 'number' ? `$${rawLastVal.toLocaleString()}` : last[yKey];
            if (prev && prev[yKey] !== undefined) {
              const rawPrevVal = parseFloat(prev[yKey]) || 0;
              if (rawPrevVal > 0) {
                const diff = rawLastVal - rawPrevVal;
                const pct = ((diff / rawPrevVal) * 100).toFixed(1);
                statTrend = diff >= 0 ? `+${pct}%` : `${pct}%`;
              }
            }
          }
        }
        
        return (
          <div className="stat-card-body">
            <div className="stat-value">{statVal || '$0.00'}</div>
            <div className={`stat-trend ${statTrend?.startsWith('+') ? 'trend-up' : statTrend?.startsWith('-') ? 'trend-down' : 'trend-neutral'}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {statTrend?.startsWith('+') ? 'trending_up' : statTrend?.startsWith('-') ? 'trending_down' : 'trending_flat'}
              </span>
              {statTrend || '0%'}
            </div>
            <div className="stat-sparkline">
              <svg viewBox="0 0 100 20" width="100%" height="100%">
                <polyline
                  fill="none"
                  stroke={renderSpec?.color || 'var(--color-success)'}
                  strokeWidth="1.5"
                  points="0,15 15,12 30,14 45,8 60,11 75,5 90,6 100,2"
                />
              </svg>
            </div>
          </div>
        );

      case 'article':
        const headline = data?.headline || card.title;
        let bodyText = data?.body || renderSpec?.summary || '';
        if (!bodyText) {
          if (Array.isArray(data)) {
            bodyText = `Dataset contains ${data.length} entries. Latest value: ${JSON.stringify(data[data.length - 1])}.`;
          } else if (data && data.rows) {
            bodyText = `Table contains ${data.rows.length} rows. Data metrics: ${data.rows.map(r => Object.values(r).join(', ')).join(' | ')}`;
          } else if (data && data.markers) {
            bodyText = `Map contains ${data.markers.length} pinned locations: ${data.markers.map(m => m.name).join(', ')}.`;
          } else {
            bodyText = 'No text summary available.';
          }
        }
        return (
          <div className="article-card-body">
            <div className="article-headline">{headline}</div>
            <div className="article-content">{bodyText}</div>
          </div>
        );

      case 'table':
        // Rethought Workflow: Format table on the fly if user overrides chart dataset
        let tblHeaders = data?.headers;
        let tblRows = data?.rows;
        if (Array.isArray(data)) {
          tblHeaders = Object.keys(data[0] || {});
          tblRows = data;
        } else if (data && Array.isArray(data.markers)) {
          tblHeaders = ['name', 'coords', 'desc'];
          tblRows = data.markers.map(m => ({
            name: m.name,
            coords: m.coords.join(', '),
            desc: m.desc || ''
          }));
        } else if (data && Array.isArray(data.items)) {
          tblHeaders = ['text', 'status'];
          tblRows = data.items.map(i => ({
            text: i.text,
            status: i.done ? 'Done ✅' : 'Pending ⏳'
          }));
        }
        if (!tblHeaders || !tblRows) return <div className="card-error-state">No table dataset available.</div>;
        return (
          <div style={{ overflow: 'auto', width: '100%' }}>
            <table className="table-card-body">
              <thead>
                <tr>
                  {tblHeaders.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tblRows.map((row, idx) => (
                  <tr key={idx}>
                    {tblHeaders.map((h, i) => <td key={i}>{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'map':
        if (!data || !data.markers) return <div className="card-error-state">No map data.</div>;
        return (
          <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '130px', background: '#0a0a14', borderRadius: '8px', overflow: 'hidden' }}>
            <svg viewBox="0 0 300 150" width="100%" height="100%" style={{ opacity: 0.15 }}>
              <path d="M50,40 Q60,30 80,45 T120,40 T150,55 T200,35 T250,50 T280,30 L280,110 Q260,120 240,110 T200,90 T150,110 T100,100 T50,110 Z" fill="none" stroke="#fff" strokeWidth="1.5" />
            </svg>
            {data.markers.map((marker, i) => {
              const lat = marker.coords[0];
              const lng = marker.coords[1];
              const x = 150 + (lng / 180) * 130;
              const y = 75 - (lat / 90) * 65;

              return (
                <div key={i} style={{ position: 'absolute', left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className="material-symbols-outlined pulse-border" style={{ fontSize: '14px', color: renderSpec.color || '#ef4444', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '2px' }}>
                    location_on
                  </span>
                  <div style={{ background: 'rgba(11, 11, 20, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 4px', fontSize: '7px', color: '#fff', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {marker.name}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'media':
        return (
          <div className="media-card-body">
            <img 
              className="media-image" 
              src={data?.url || `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop`} 
              alt={data?.caption || 'illustration'} 
            />
            <div className="media-caption">{data?.caption || 'AI Generated Image Context'}</div>
          </div>
        );

      case 'feed':
        const feedList = Array.isArray(data) ? data : (data?.rows || data?.items || data?.markers || []);
        if (!Array.isArray(feedList) || feedList.length === 0) return <div className="card-error-state">No feed list available.</div>;
        return (
          <div className="feed-card-body">
            {feedList.map((item, idx) => {
              const title = item.title || item.headline || item.text || item.name || item.City || `Feed Item #${idx + 1}`;
              const timeOrSub = item.time || item.date || item.Temp || (item.coords ? `Coords: ${item.coords.join(', ')}` : '') || (item.done !== undefined ? (item.done ? 'Done' : 'Pending') : '');
              return (
                <div key={item.id || idx} className="feed-item">
                  <span className="material-symbols-outlined feed-item-icon">
                    {item.done !== undefined ? 'check_circle' : 'rss_feed'}
                  </span>
                  <div className="feed-item-content">
                    <a href={item.url || '#'} className="feed-item-title">{title}</a>
                    <span className="feed-item-time">{timeOrSub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'interactive':
        if (!data) return <div className="card-error-state">Interactive widget not initialized.</div>;
        
        if (data.widgetType === 'checklist') {
          return (
            <div className="interactive-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1 }}>
                {data.items && data.items.map((item) => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleChecklistToggle(card.id, item.id)}
                      style={{ accentColor: renderSpec.color || 'var(--color-primary)' }}
                    />
                    <span style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--color-text-dim)' : 'var(--color-text)' }}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
              {renderSpec?.summary && (
                <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                  📊 {renderSpec.summary}
                </div>
              )}
            </div>
          );
        }

        if (data.widgetType === 'converter') {
          const val = data.initialValue || 0;
          return (
            <div className="interactive-card-body" style={{ justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '80px', padding: '6px', fontSize: '12px' }}
                  value={val}
                  onChange={(e) => handleConverterValueChange(card.id, e.target.value)}
                />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{data.fromUnit || 'units'}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sync_alt</span>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{(val * 1.60934).toFixed(2)}</div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{data.toUnit || 'converted'}</span>
              </div>
            </div>
          );
        }

        if (data.widgetType === 'timer') {
          return (
            <CountdownTimer
              targetDate={data.targetDate}
              color={renderSpec?.color}
            />
          );
        }

        return <div className="card-error-state">Unknown widget template.</div>;

      default:
        return <div className="card-error-state">Unsupported representation type.</div>;
    }
  };

  // --- RENDER APP VIEW (LIVE APP) ---

  const renderAppView = () => {
    const isApiConnected = openRouterKey || openAIKey || openCodeKey;

    return (
      <div className="animate-fade-in">
        {/* API Warning if missing key */}
        {!isApiConnected && (
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--color-warning)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-warning)', fontSize: '24px' }}>warning</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>Demo Mode Active (No Provider API Key Configured)</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Using simulation engine. Click settings to configure OpenRouter, OpenAI or OpenCode Go for live database APIs and auto-classification.</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsSettingsOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>settings</span> Setup API
            </button>
          </div>
        )}

        {/* Prompt Input Console */}
        <form onSubmit={handleAddCard} className="prompt-console glass-panel">
          <div className="prompt-input-wrapper">
            <span className="material-symbols-outlined prompt-input-icon">search</span>
            <input
              type="text"
              className="prompt-console-input"
              placeholder="What would you like to add to your dashboard? (e.g., 'Show me Bitcoin price this week')"
              value={consolePrompt}
              onChange={(e) => setConsolePrompt(e.target.value)}
              disabled={isConsoleSubmitting}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isConsoleSubmitting}>
            {isConsoleSubmitting ? (
              <>
                <span className="material-symbols-outlined shimmer" style={{ animation: 'spin 1.5s linear infinite' }}>psychology</span> Parsing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">add_circle</span> Add Card
              </>
            )}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setIsGalleryOpen(true)}>
            <span className="material-symbols-outlined">lightbulb</span> Presets
          </button>
        </form>

        {/* Dashboard Grid & Groups */}
        <div className="dashboard-grid-container">
          <div className="grid-columns-indicator">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="grid-col-guide"></div>)}
          </div>

          <div className="dashboard-board">
            {groups.map((group) => {
              const groupCards = cards.filter(c => c.group === group.name);
              
              return (
                <div
                  key={group.name}
                  className="card-group"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleGroupDrop(e, group.name)}
                  style={{ borderLeft: `3px solid ${group.color}` }}
                >
                  <div className="group-header">
                    <div className="group-title-container">
                      <button className="card-action-btn" onClick={() => toggleGroupCollapse(group.name)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {group.collapsed ? 'keyboard_arrow_right' : 'keyboard_arrow_down'}
                        </span>
                      </button>
                      <div className="group-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="group-accent-dot" style={{ backgroundColor: group.color }}></span>
                        {editingGroupName === group.name ? (
                          <input
                            type="text"
                            value={editGroupValue}
                            onChange={(e) => setEditGroupValue(e.target.value)}
                            onBlur={() => handleSaveGroupName(group.name)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveGroupName(group.name);
                              if (e.key === 'Escape') setEditingGroupName(null);
                            }}
                            className="form-input"
                            style={{
                              padding: '2px 6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              height: '22px',
                              width: '120px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid var(--color-primary)',
                              borderRadius: '4px',
                              color: 'var(--color-text)',
                              outline: 'none'
                            }}
                            autoFocus
                          />
                        ) : (
                          <span 
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
                            onDoubleClick={() => {
                              setEditingGroupName(group.name);
                              setEditGroupValue(group.name);
                            }}
                            title="Double-click to rename group"
                          >
                            {group.name}
                            <span className="material-symbols-outlined" style={{ fontSize: '11px', opacity: 0.3 }}>edit</span>
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--color-text-dim)', fontWeight: 'normal' }}>
                          ({groupCards.length} cards)
                        </span>
                      </div>
                    </div>
                    
                    <div className="group-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleAddNewCardPlaceholder(group.name)} 
                        style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>add</span> Add Card
                      </button>
                      
                      {groupCards.length === 0 && (
                        <button className="card-action-btn" onClick={() => setGroups(prev => prev.filter(g => g.name !== group.name))} title="Delete group">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-danger)' }}>delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!group.collapsed && (
                    <div className="group-cards-grid" style={{ gridAutoFlow: workflowConfig.densePacking ? 'dense' : 'row' }}>
                      {groupCards.map((card) => {
                        const isEditingPrompt = editingCardId === card.id;

                        return (
                          <div
                            key={card.id}
                            className={`card-wrapper glass-panel ${draggingCardId === card.id ? 'dragging' : ''}`}
                            style={{
                              '--cols': card.cols,
                              '--rows': card.rows,
                              borderTop: `2px solid ${group.color}`
                            }}
                            draggable
                            onDragStart={(e) => handleCardDragStart(e, card.id)}
                            onDragOver={(e) => handleCardDragOver(e, card.id)}
                            onDragEnd={handleCardDragEnd}
                          >
                            <div className="card-drag-handle">
                              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
                            </div>

                            <div className="dashboard-card">
                              {/* Zone 1: Card Header */}
                              <div className="card-header-zone">
                                <div className="card-header-left">
                                  <div className="card-type-icon">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                      {card.isCreating ? 'edit_note' :
                                       card.cardType === 'chart' ? 'bar_chart' :
                                       card.cardType === 'stat' ? 'speed' :
                                       card.cardType === 'article' ? 'article' :
                                       card.cardType === 'table' ? 'table_chart' :
                                       card.cardType === 'map' ? 'map' :
                                       card.cardType === 'media' ? 'image' :
                                       card.cardType === 'interactive' ? 'touch_app' : 'rss_feed'}
                                    </span>
                                  </div>
                                  <div className="card-title-section">
                                    <span className="card-title-text">{card.isCreating ? 'New Card Intent' : card.title}</span>
                                    <span className="card-subtitle-text">
                                      {card.isCreating ? 'Specify data layout & prompt' : `${card.dataSource} ${card.lastFetched ? `· Refreshed ${new Date(card.lastFetched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                                    </span>
                                  </div>
                                </div>

                                <div className="card-header-right">
                                  {!card.isCreating && !card.loading && !card.error && (
                                    <>
                                      {/* Move to Group Selector */}
                                      <select
                                        value={card.group}
                                        onChange={(e) => handleMoveCardGroup(card.id, e.target.value)}
                                        className="card-group-select"
                                        title="Move to group"
                                        style={{
                                          background: 'rgba(255,255,255,0.03)',
                                          border: '1px solid var(--border-color)',
                                          borderRadius: '4px',
                                          color: 'var(--color-text-dim)',
                                          fontSize: '9px',
                                          padding: '2px 4px',
                                          cursor: 'pointer',
                                          marginRight: '4px',
                                          maxWidth: '75px',
                                          textOverflow: 'ellipsis',
                                          fontFamily: 'var(--font-sans)'
                                        }}
                                      >
                                        {groups.map(g => (
                                          <option key={g.name} value={g.name}>
                                            📁 {g.name}
                                          </option>
                                        ))}
                                      </select>

                                      <div className="card-format-switcher" title="Switch layout format">
                                        {getCompatibleFormats(card).map((fmt) => {
                                          const iconName = 
                                            fmt === 'chart' ? 'bar_chart' :
                                            fmt === 'stat' ? 'speed' :
                                            fmt === 'article' ? 'article' :
                                            fmt === 'table' ? 'table_chart' :
                                            fmt === 'map' ? 'map' :
                                            fmt === 'media' ? 'image' :
                                            fmt === 'interactive' ? 'touch_app' : 'rss_feed';
                                          
                                          const isActive = card.cardType === fmt;
                                          return (
                                            <button
                                              key={fmt}
                                              onClick={() => handleOverrideCardType(card.id, fmt)}
                                              className={`format-switch-btn ${isActive ? 'active' : ''}`}
                                              title={`Switch to ${fmt}`}
                                            >
                                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                                {iconName}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}

                                  {!card.isCreating && (
                                    <>
                                      <button className="card-action-btn" onClick={() => handleRefreshCard(card.id)} title="Refresh data">
                                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
                                      </button>
                                      <button className="card-action-btn" onClick={() => handleStartEditingPrompt(card)} title="Edit Prompt">
                                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                                      </button>
                                    </>
                                  )}
                                  <button className="card-action-btn" onClick={() => handleDeleteCard(card.id)} title="Delete card">
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--color-danger)' }}>delete</span>
                                  </button>
                                </div>
                              </div>

                              {/* Zone 2: Body Zone */}
                              <div className="card-body-zone">
                                {card.isCreating ? (
                                  <InlineCardCreator
                                    card={card}
                                    onGenerate={handleGenerateInlineCard}
                                    onCancel={handleCancelInlineCard}
                                  />
                                ) : (
                                  renderCardBody(card)
                                )}
                              </div>

                              {/* Zone 3: Prompt Echo */}
                              {!card.isCreating && !isEditingPrompt && (
                                <div className="card-prompt-echo-zone" onClick={() => handleStartEditingPrompt(card)}>
                                  <span className="prompt-echo-text">Prompt: "{card.prompt}"</span>
                                  <span className="material-symbols-outlined prompt-echo-edit-icon">edit</span>
                                </div>
                              )}

                              {/* Inline Prompt Edit Field */}
                              {!card.isCreating && isEditingPrompt && (
                                <div className="prompt-edit-container">
                                  <input
                                    type="text"
                                    className="prompt-edit-input"
                                    value={editPromptValue}
                                    onChange={(e) => setEditPromptValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSavePromptEdit(card.id);
                                      if (e.key === 'Escape') setEditingCardId(null);
                                    }}
                                    autoFocus
                                  />
                                  <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleSavePromptEdit(card.id)}>
                                    Update
                                  </button>
                                  <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setEditingCardId(null)}>
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {/* Zone 4: Card Footer */}
                              {!card.isCreating && (
                                <div className="card-footer-zone">
                                  <div className="card-footer-badges">
                                    <span className="badge">{card.cardType}</span>
                                    <span className="badge">{card.size}</span>
                                    <span className={`badge ${card.refreshInterval > 0 ? 'badge-live' : 'badge-static'}`}>
                                      {card.refreshInterval > 0 ? 'live' : 'static'}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '9px' }}>{card.dataSource}</span>
                                </div>
                              )}
                            </div>

                            {/* Zone 5: Resize Handle */}
                            <div className="card-resize-handle" onMouseDown={(e) => handleResizeMouseDown(e, card.id)}></div>
                          </div>
                        );
                      })}

                      {groupCards.length === 0 && (
                        <div style={{ gridColumn: 'span 12', height: '100px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)', fontSize: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                          <span>Drag cards here or create a new card to populate this group.</span>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleAddNewCardPlaceholder(group.name)} style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span> Add a Card
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Floating Add Group Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <button className="btn btn-secondary" onClick={addNewGroup}>
            <span className="material-symbols-outlined">folder_open</span> Create New Group
          </button>
        </div>
      </div>
    );
  };

  // --- RENDER PIPELINE WORKFLOW VIEW ---

  const renderWorkflowView = () => {
    const cfg = workflowConfig;
    const setCfg = (key, val) => setWorkflowConfig(prev => ({ ...prev, [key]: val }));

    const isLlmConnected = !!(
      (activeProvider === 'openrouter' && openRouterKey) ||
      (activeProvider === 'openai' && openAIKey) ||
      (activeProvider === 'opencode' && openCodeKey)
    );

    const stageHeaderStyle = (color) => ({
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px',
      background: `rgba(${color}, 0.08)`,
      borderBottom: `1px solid rgba(${color}, 0.2)`,
      borderRadius: '8px 8px 0 0'
    });
    const stageBodyStyle = {
      padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'
    };
    const stageCard = (color) => ({
      border: `1px solid rgba(${color}, 0.25)`,
      borderRadius: '10px',
      background: 'rgba(0,0,0,0.25)',
      overflow: 'hidden',
      flex: '1 1 420px'
    });
    const row = {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
    };
    const label = {
      fontSize: '12px', color: 'var(--color-text-muted)', flexShrink: 0
    };
    const badge = (active, color='99,102,241') => ({
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px', fontSize: '10px',
      background: active ? `rgba(${color}, 0.18)` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? `rgba(${color},0.5)` : 'var(--border-color)'}`,
      color: active ? `rgba(${color}, 1)` : 'var(--color-text-dim)'
    });

    return (
      <div className="animate-fade-in" style={{ padding: '0 0 24px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--color-accent)', margin: '0 0 6px 0', fontSize: '20px' }}>
            <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px', fontSize: '22px' }}>account_tree</span>
            Agent Pipeline Workflow
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
            Each card runs its own isolated multi-agent pipeline. Configure each stage below — changes take effect immediately.
          </p>
        </div>

        {/* Pipeline arrow flow */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>

          {/* ── Stage 1: Prompt Input ── */}
          <div style={stageCard('99,102,241')}>
            <div style={stageHeaderStyle('99,102,241')}>
              <span className="material-symbols-outlined" style={{ color: 'rgb(130,133,255)', fontSize: '20px' }}>edit_note</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>Stage 1 · Prompt Input</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>User types an intent in natural language</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={badge(true)}>Active</span>
              </div>
            </div>
            <div style={stageBodyStyle}>
              <div style={row}>
                <span style={label}>Auto-clear input after submit</span>
                <button
                  type="button"
                  onClick={() => setCfg('clearOnSubmit', !cfg.clearOnSubmit)}
                  style={{
                    padding: '3px 14px', borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid rgba(99,102,241,0.4)', fontFamily: 'var(--font-sans)',
                    background: cfg.clearOnSubmit ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                    color: cfg.clearOnSubmit ? 'rgb(160,162,255)' : 'var(--color-text-dim)',
                    transition: 'all 0.2s'
                  }}
                >{cfg.clearOnSubmit ? '✓ Enabled' : 'Disabled'}</button>
              </div>
              <div style={row}>
                <span style={label}>Preset suggestion chips</span>
                <button
                  type="button"
                  onClick={() => setCfg('enableAutocomplete', !cfg.enableAutocomplete)}
                  style={{
                    padding: '3px 14px', borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid rgba(99,102,241,0.4)', fontFamily: 'var(--font-sans)',
                    background: cfg.enableAutocomplete ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                    color: cfg.enableAutocomplete ? 'rgb(160,162,255)' : 'var(--color-text-dim)',
                    transition: 'all 0.2s'
                  }}
                >{cfg.enableAutocomplete ? '✓ Enabled' : 'Disabled'}</button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--color-text-muted)' }}>Output:</strong> Raw text string → Stage 2 Intent Classifier
              </div>
            </div>
          </div>

          {/* ── Stage 2: Intent Classifier ── */}
          <div style={stageCard('168,85,247')}>
            <div style={stageHeaderStyle('168,85,247')}>
              <span className="material-symbols-outlined" style={{ color: 'rgb(200,130,255)', fontSize: '20px' }}>psychology</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>Stage 2 · Intent Classifier</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Fast model identifies card type, size, source need</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={badge(isLlmConnected, '168,85,247')}>{isLlmConnected ? 'Connected' : 'Simulation'}</span>
              </div>
            </div>
            <div style={stageBodyStyle}>
              <div style={row}>
                <span style={label}>Classifier Model</span>
                <span style={{ fontSize: '11px', color: 'var(--color-accent)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{modelFast}</span>
              </div>
              <div style={row}>
                <span style={label}>Temperature <strong>{cfg.classifierTemp.toFixed(2)}</strong></span>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={cfg.classifierTemp}
                  onChange={e => setCfg('classifierTemp', parseFloat(e.target.value))}
                  style={{ width: '140px', accentColor: 'rgb(168,85,247)' }}
                />
              </div>
              <div style={row}>
                <span style={label}>Cache TTL (seconds) <strong>{cfg.classifierCacheTtl}s</strong></span>
                <input
                  type="range" min="0" max="3600" step="60"
                  value={cfg.classifierCacheTtl}
                  onChange={e => setCfg('classifierCacheTtl', parseInt(e.target.value))}
                  style={{ width: '140px', accentColor: 'rgb(168,85,247)' }}
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--color-text-muted)' }}>Output:</strong> cardType, size, dataSource, searchRequired → Stage 3
              </div>
            </div>
          </div>

          {/* ── Stage 3: Data Router ── */}
          <div style={stageCard('16,185,129')}>
            <div style={stageHeaderStyle('16,185,129')}>
              <span className="material-symbols-outlined" style={{ color: 'rgb(52,211,153)', fontSize: '20px' }}>travel_explore</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>Stage 3 · Data Router</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Selects source: Public APIs → Web Search → Parametric</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={badge(!!tavilyKey, '16,185,129')}>{tavilyKey ? 'Tavily ✓' : 'No Search Key'}</span>
              </div>
            </div>
            <div style={stageBodyStyle}>
              <div style={row}>
                <span style={label}>Force web search on all prompts</span>
                <button
                  type="button"
                  onClick={() => setCfg('prioritizeSearch', !cfg.prioritizeSearch)}
                  style={{
                    padding: '3px 14px', borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid rgba(16,185,129,0.4)', fontFamily: 'var(--font-sans)',
                    background: cfg.prioritizeSearch ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                    color: cfg.prioritizeSearch ? 'rgb(52,211,153)' : 'var(--color-text-dim)',
                    transition: 'all 0.2s'
                  }}
                >{cfg.prioritizeSearch ? '✓ Enabled' : 'Disabled'}</button>
              </div>
              <div style={row}>
                <span style={label}>Tavily search depth</span>
                <select
                  value={cfg.tavilyDepth}
                  onChange={e => setCfg('tavilyDepth', e.target.value)}
                  className="form-select"
                  style={{ width: '120px', padding: '4px 8px', fontSize: '11px', height: '28px' }}
                >
                  <option value="basic">Basic</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div style={row}>
                <span style={label}>Allow parametric (LLM knowledge) fallback</span>
                <button
                  type="button"
                  onClick={() => setCfg('allowParametricFallback', !cfg.allowParametricFallback)}
                  style={{
                    padding: '3px 14px', borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid rgba(16,185,129,0.4)', fontFamily: 'var(--font-sans)',
                    background: cfg.allowParametricFallback ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                    color: cfg.allowParametricFallback ? 'rgb(52,211,153)' : 'var(--color-text-dim)',
                    transition: 'all 0.2s'
                  }}
                >{cfg.allowParametricFallback ? '✓ Enabled' : 'Disabled'}</button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--color-text-muted)' }}>Fallback chain:</strong> Tavily Search → Public APIs → LLM Knowledge
              </div>
            </div>
          </div>

          {/* ── Stage 4: Render Planner ── */}
          <div style={stageCard('245,158,11')}>
            <div style={stageHeaderStyle('245,158,11')}>
              <span className="material-symbols-outlined" style={{ color: 'rgb(252,196,78)', fontSize: '20px' }}>palette</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>Stage 4 · Render Planner</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Smart model structures the data payload &amp; layout plan</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={badge(isLlmConnected, '245,158,11')}>{isLlmConnected ? 'Connected' : 'Simulation'}</span>
              </div>
            </div>
            <div style={stageBodyStyle}>
              <div style={row}>
                <span style={label}>Planner Model</span>
                <span style={{ fontSize: '11px', color: 'rgb(252,196,78)', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{modelSmart}</span>
              </div>
              <div style={row}>
                <span style={label}>Temperature <strong>{cfg.plannerTemp.toFixed(2)}</strong></span>
                <input
                  type="range" min="0" max="1.5" step="0.05"
                  value={cfg.plannerTemp}
                  onChange={e => setCfg('plannerTemp', parseFloat(e.target.value))}
                  style={{ width: '140px', accentColor: 'rgb(245,158,11)' }}
                />
              </div>
              <div style={row}>
                <span style={label}>Allow raw JSON editor in cards</span>
                <button
                  type="button"
                  onClick={() => setCfg('allowRawJsonEdit', !cfg.allowRawJsonEdit)}
                  style={{
                    padding: '3px 14px', borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid rgba(245,158,11,0.4)', fontFamily: 'var(--font-sans)',
                    background: cfg.allowRawJsonEdit ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                    color: cfg.allowRawJsonEdit ? 'rgb(252,196,78)' : 'var(--color-text-dim)',
                    transition: 'all 0.2s'
                  }}
                >{cfg.allowRawJsonEdit ? '✓ Enabled' : 'Disabled'}</button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--color-text-muted)' }}>Output:</strong> Structured card JSON with renderSpec → Stage 5
              </div>
            </div>
          </div>

          {/* ── Stage 5: User Override ── */}
          <div style={stageCard('239,68,68')}>
            <div style={stageHeaderStyle('239,68,68')}>
              <span className="material-symbols-outlined" style={{ color: 'rgb(252,120,120)', fontSize: '20px' }}>tune</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>Stage 5 · User Override Switcher</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Client-side format toggle — user always has final authority</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={badge(true, '239,68,68')}>Always On</span>
              </div>
            </div>
            <div style={stageBodyStyle}>
              <div style={row}>
                <span style={label}>Auto-resize card when switching format</span>
                <button
                  type="button"
                  onClick={() => setCfg('autoResizeOnOverride', !cfg.autoResizeOnOverride)}
                  style={{
                    padding: '3px 14px', borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid rgba(239,68,68,0.4)', fontFamily: 'var(--font-sans)',
                    background: cfg.autoResizeOnOverride ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
                    color: cfg.autoResizeOnOverride ? 'rgb(252,120,120)' : 'var(--color-text-dim)',
                    transition: 'all 0.2s'
                  }}
                >{cfg.autoResizeOnOverride ? '✓ Enabled' : 'Disabled'}</button>
              </div>
              <div style={row}>
                <span style={label}>Allow raw data JSON edit in cards</span>
                <button
                  type="button"
                  onClick={() => setCfg('allowRawJsonEdit', !cfg.allowRawJsonEdit)}
                  style={{
                    padding: '3px 14px', borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid rgba(239,68,68,0.4)', fontFamily: 'var(--font-sans)',
                    background: cfg.allowRawJsonEdit ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
                    color: cfg.allowRawJsonEdit ? 'rgb(252,120,120)' : 'var(--color-text-dim)',
                    transition: 'all 0.2s'
                  }}
                >{cfg.allowRawJsonEdit ? '✓ Enabled' : 'Disabled'}</button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', lineHeight: '1.5' }}>
                Format switcher buttons appear in card headers. The pipeline suggested format is the default; user can override any time.
              </div>
            </div>
          </div>

          {/* ── Stage 6: Grid Reflow ── */}
          <div style={stageCard('6,182,212')}>
            <div style={stageHeaderStyle('6,182,212')}>
              <span className="material-symbols-outlined" style={{ color: 'rgb(34,211,238)', fontSize: '20px' }}>grid_view</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>Stage 6 · CSS Dense Grid Reflow</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Cards auto-fill empty grid cells to avoid gaps</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={badge(cfg.densePacking, '6,182,212')}>{cfg.densePacking ? 'Dense ✓' : 'Normal'}</span>
              </div>
            </div>
            <div style={stageBodyStyle}>
              <div style={row}>
                <span style={label}>CSS grid-auto-flow: dense</span>
                <button
                  type="button"
                  onClick={() => setCfg('densePacking', !cfg.densePacking)}
                  style={{
                    padding: '3px 14px', borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid rgba(6,182,212,0.4)', fontFamily: 'var(--font-sans)',
                    background: cfg.densePacking ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.04)',
                    color: cfg.densePacking ? 'rgb(34,211,238)' : 'var(--color-text-dim)',
                    transition: 'all 0.2s'
                  }}
                >{cfg.densePacking ? '✓ Dense Packing' : 'Normal Flow'}</button>
              </div>
              <div style={row}>
                <span style={label}>Auto-Arrange sort order</span>
                <select
                  value={cfg.defaultSortOrder}
                  onChange={e => setCfg('defaultSortOrder', e.target.value)}
                  className="form-select"
                  style={{ width: '140px', padding: '4px 8px', fontSize: '11px', height: '28px' }}
                >
                  <option value="none">No re-sort</option>
                  <option value="size-desc">Largest First</option>
                  <option value="size-asc">Smallest First</option>
                </select>
              </div>
              <div style={row}>
                <span style={label}>Grid snap unit (px) <strong>{cfg.gridSnapUnit}px</strong></span>
                <input
                  type="range" min="4" max="32" step="4"
                  value={cfg.gridSnapUnit}
                  onChange={e => setCfg('gridSnapUnit', parseInt(e.target.value))}
                  style={{ width: '140px', accentColor: 'rgb(6,182,212)' }}
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', lineHeight: '1.5' }}>
                Dense packing fills holes left by smaller cards. Use Auto-Arrange button in the header to trigger a sort pass.
              </div>
            </div>
          </div>

        </div>

        {/* Reset defaults */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setWorkflowConfig(DEFAULT_WORKFLOW_CONFIG)}
            title="Reset all pipeline settings to defaults"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
            Reset All to Defaults
          </button>
        </div>
      </div>
    );
  };
  // --- MAIN RENDER ---
  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <span className="material-symbols-outlined">dashboard_customize</span>
          </div>
          <div className="logo-text">
            <span className="logo-title">Agntdash</span>
            <span className="logo-subtitle">AI-Native Fluid Grid</span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${activeView === 'app' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('app')}>
            <span className="material-symbols-outlined">dashboard</span> Live Dashboard
          </button>
          <button className={`btn ${activeView === 'workflow' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('workflow')}>
            <span className="material-symbols-outlined">account_tree</span> Pipeline Workflow
          </button>
        </div>

        {/* Global Controls */}
        <div className="header-controls">
          {activeView === 'app' && (
            <>
              <button className="btn btn-secondary" onClick={handleRefreshAll} title="Force refresh all cards">
                <span className="material-symbols-outlined">restart_alt</span> Refresh All
              </button>
              <button className="btn btn-secondary" onClick={handleAutoArrange} title="Auto-arrange card grids to avoid holes">
                <span className="material-symbols-outlined">grid_view</span> Auto-Arrange
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={() => setIsSettingsOpen(true)}>
            <span className="material-symbols-outlined">settings</span> Configure API
          </button>
        </div>
      </header>

      {/* Main Body view */}
      {activeView === 'app' ? renderAppView() : renderWorkflowView()}

      {/* --- PRESETS GALLERY DIALOG --- */}
      {isGalleryOpen && (
        <div className="modal-overlay" onClick={() => setIsGalleryOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Select Preset Idea</div>
              <button className="card-action-btn" onClick={() => setIsGalleryOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Tap any starter prompt below to pre-populate the input bar. The AI will classify, gather, and outline its details automatically.</p>
              <div className="preset-gallery">
                {SAMPLE_PROMPTS.map((p, idx) => (
                  <button key={idx} className="preset-item" onClick={() => handlePresetSelect(p.text)}>
                    <span className="material-symbols-outlined preset-icon">{p.icon}</span>
                    <span className="preset-text">{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsGalleryOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS DIALOG --- */}
      {isSettingsOpen && (
        <SettingsModal
          initialActiveProvider={activeProvider}
          initialOrKey={openRouterKey}
          initialOpenaiKey={openAIKey}
          initialOpenaiBaseUrl={openAICustomBaseUrl}
          initialOpencodeKey={openCodeKey}
          initialOpencodeBaseUrl={openCodeBaseUrl}
          initialTavilyKey={tavilyKey}
          initialFast={modelFast}
          initialSmart={modelSmart}
          onSave={saveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---

function SettingsModal({ 
  initialActiveProvider, initialOrKey, initialOpenaiKey, initialOpenaiBaseUrl, 
  initialOpencodeKey, initialOpencodeBaseUrl, initialTavilyKey, 
  initialFast, initialSmart, onSave, onClose
}) {
  const [activeProvider, setActiveProvider] = useState(initialActiveProvider);
  const [openRouterKey, setOpenRouterKey] = useState(initialOrKey);
  const [openAIKey, setOpenAIKey] = useState(initialOpenaiKey);
  const [openAICustomBaseUrl, setOpenAICustomBaseUrl] = useState(initialOpenaiBaseUrl);
  const [openCodeKey, setOpenCodeKey] = useState(initialOpencodeKey);
  const [openCodeBaseUrl, setOpenCodeBaseUrl] = useState(initialOpencodeBaseUrl);
  const [tavilyKey, setTavilyKey] = useState(initialTavilyKey);

  const [modelFast, setModelFast] = useState(initialFast);
  const [modelSmart, setModelSmart] = useState(initialSmart);

  // --- Local model-fetch state (scoped to the modal's own provider/key) ---
  const [localModels, setLocalModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchStatus, setFetchStatus] = useState(''); // message for the user

  // Auto-fetch when provider or relevant key changes (debounced by 600ms)
  useEffect(() => {
    setLocalModels([]);
    setFetchStatus('');
    const timer = setTimeout(() => { fetchModelsForProvider(); }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProvider, openRouterKey, openAIKey, openAICustomBaseUrl, openCodeKey, openCodeBaseUrl]);

  const fetchModelsForProvider = async () => {
    let url = '';
    let headers = {};
    let providerLabel = '';

    if (activeProvider === 'openrouter' && openRouterKey) {
      url = 'https://openrouter.ai/api/v1/models';
      headers = { 'Authorization': `Bearer ${openRouterKey}` };
      providerLabel = 'OpenRouter';
    } else if (activeProvider === 'openai' && openAIKey) {
      url = `${openAICustomBaseUrl}/models`;
      headers = { 'Authorization': `Bearer ${openAIKey}` };
      providerLabel = 'OpenAI';
    } else if (activeProvider === 'opencode' && openCodeKey) {
      url = `${openCodeBaseUrl}/models`;
      headers = { 'Authorization': `Bearer ${openCodeKey}` };
      providerLabel = 'OpenCode Go';
    } else {
      setFetchStatus('Enter an API key to auto-fetch models.');
      return;
    }

    setIsFetchingModels(true);
    setFetchStatus(`Fetching ${providerLabel} models…`);
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        setFetchStatus(`❌ ${providerLabel}: HTTP ${res.status} — check your key/URL.`);
        return;
      }
      const payload = await res.json();
      const list = (payload.data || []).map(m => m.id || m.name).filter(Boolean).sort();
      if (list.length === 0) {
        setFetchStatus(`⚠️ ${providerLabel} returned 0 models.`);
      } else {
        setLocalModels(list);
        setFetchStatus(`✓ ${list.length} ${providerLabel} models loaded.`);
        // Auto-select first model if current selection not in list
        if (!list.includes(modelFast)) setModelFast(list[0]);
        if (!list.includes(modelSmart)) setModelSmart(list[0]);
      }
    } catch (err) {
      setFetchStatus(`❌ Network error: ${err.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const activeModels = localModels.length > 0 ? localModels : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '16px 24px' }}>
          <div className="modal-title" style={{ fontSize: '15px' }}>API Connections &amp; Models</div>
          <button className="card-action-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="modal-body settings-modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* AI Provider Selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '9px', letterSpacing: '0.3px' }}>Active AI Model Provider</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className={`btn ${activeProvider === 'openrouter' ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
                  style={{ flexGrow: 1, padding: '5px 4px', fontSize: '11px' }}
                  onClick={() => setActiveProvider('openrouter')}
                >
                  OpenRouter
                </button>
                <button 
                  type="button" 
                  className={`btn ${activeProvider === 'openai' ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
                  style={{ flexGrow: 1, padding: '5px 4px', fontSize: '11px' }}
                  onClick={() => setActiveProvider('openai')}
                >
                  OpenAI (Custom)
                </button>
                <button 
                  type="button" 
                  className={`btn ${activeProvider === 'opencode' ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
                  style={{ flexGrow: 1, padding: '5px 4px', fontSize: '11px' }}
                  onClick={() => setActiveProvider('opencode')}
                >
                  OpenCode Go
                </button>
              </div>
            </div>

            {/* Dynamic Provider Fields */}
            {activeProvider === 'openrouter' && (
              <div className="form-group animate-fade-in" style={{ gap: '4px' }}>
                <label className="form-label" style={{ fontSize: '9px' }}>OpenRouter API Key</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="sk-or-..."
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '12px' }}
                />
                <span className="form-helper" style={{ fontSize: '9px', marginTop: '2px' }}>
                  Get at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>openrouter.ai/keys</a>. Models fetched automatically.
                </span>
              </div>
            )}

            {activeProvider === 'openai' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="form-group" style={{ gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '9px' }}>OpenAI API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="sk-..."
                    value={openAIKey}
                    onChange={(e) => setOpenAIKey(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>
                <div className="form-group" style={{ gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '9px' }}>Custom API Gateway / Base URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={openAICustomBaseUrl}
                    onChange={(e) => setOpenAICustomBaseUrl(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>
              </div>
            )}

            {activeProvider === 'opencode' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="form-group" style={{ gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '9px' }}>OpenCode Go API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Key for OpenCode Go..."
                    value={openCodeKey}
                    onChange={(e) => setOpenCodeKey(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>
                <div className="form-group" style={{ gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '9px' }}>OpenCode Go Base URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={openCodeBaseUrl}
                    onChange={(e) => setOpenCodeBaseUrl(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  />
                  <span className="form-helper" style={{ fontSize: '9px', marginTop: '2px' }}>
                    Models are fetched from <code style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>{openCodeBaseUrl}/models</code>
                  </span>
                </div>
              </div>
            )}

            {/* Tavily */}
            <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', gap: '4px' }}>
              <label className="form-label" style={{ fontSize: '9px' }}>Tavily Web Search API Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="tvly-..."
                value={tavilyKey}
                onChange={(e) => setTavilyKey(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '12px' }}
              />
              <span className="form-helper" style={{ fontSize: '9px', marginTop: '2px' }}>
                Enables web search in pipeline. Get at <a href="https://tavily.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>tavily.com</a>.
              </span>
            </div>

            {/* Model dropdowns */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              {/* Status + Fetch button row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '9px', color: fetchStatus.startsWith('✓') ? 'var(--color-success)' : fetchStatus.startsWith('❌') ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                  {isFetchingModels ? (
                    <><span className="material-symbols-outlined shimmer" style={{ fontSize: '11px', verticalAlign: 'middle' }}>sync</span> {fetchStatus}</>
                  ) : fetchStatus || 'No models loaded yet'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchModelsForProvider}
                  disabled={isFetchingModels}
                  style={{ padding: '3px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>refresh</span>
                  Re-fetch
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '9px' }}>Classifier Model (Fast)</label>
                  <select
                    className="form-select"
                    value={modelFast}
                    onChange={(e) => setModelFast(e.target.value)}
                    style={{ padding: '6px', fontSize: '11px', height: '30px' }}
                  >
                    {(activeModels || DEFAULT_MODELS_FAST).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {/* Keep current value visible even if not in list */}
                    {activeModels && !activeModels.includes(modelFast) && (
                      <option value={modelFast}>{modelFast} (current)</option>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ gap: '4px' }}>
                  <label className="form-label" style={{ fontSize: '9px' }}>Planner Model (Smart)</label>
                  <select
                    className="form-select"
                    value={modelSmart}
                    onChange={(e) => setModelSmart(e.target.value)}
                    style={{ padding: '6px', fontSize: '11px', height: '30px' }}
                  >
                    {(activeModels || DEFAULT_MODELS_SMART).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {activeModels && !activeModels.includes(modelSmart) && (
                      <option value={modelSmart}>{modelSmart} (current)</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '12px 24px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave({
            activeProvider,
            openRouterKey,
            openAIKey,
            openAICustomBaseUrl,
            openCodeKey,
            openCodeBaseUrl,
            tavilyKey,
            modelFast,
            modelSmart
          })}>
            Save Connection
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline card builder component (spec matching empty prompt card)
function InlineCardCreator({ card, onGenerate, onCancel }) {
  const [val, setVal] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (val.trim()) {
      onGenerate(card.id, val.trim());
    }
  };

  const suggestions = [
    'Bitcoin price weekly chart',
    'London current temperature',
    'Top daily business news feed',
    'Interactive todo checklist',
    'Convert miles to km widget'
  ];

  return (
    <div className="inline-creator-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between', padding: '2px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-focus)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>bolt</span> Describe card intent:
        </div>
        <textarea
          className="form-input"
          placeholder="e.g. BTC weekly trend line, London weather stats, countdown timer..."
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
            if (e.key === 'Escape') {
              onCancel(card.id);
            }
          }}
          style={{
            width: '100%',
            height: '48px',
            resize: 'none',
            fontSize: '11px',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 8px',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-sans)',
            outline: 'none'
          }}
          autoFocus
        />
        
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!val.trim()} style={{ flexGrow: 1, padding: '3px', fontSize: '10px' }}>
            Generate Card
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCancel(card.id)} style={{ padding: '3px 8px', fontSize: '10px' }}>
            Cancel
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
        <div style={{ fontSize: '8px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>Suggestions:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setVal(s)}
              style={{
                fontSize: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '2px 4px',
                color: 'var(--color-text-dim)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Countdown Timer Component to follow Rules of Hooks
function CountdownTimer({ targetDate, color }) {
  const [timeLeft, setTimeLeft] = useState('00d : 00h : 00m : 00s');

  useEffect(() => {
    const target = new Date(targetDate || '2027-01-01T00:00:00');
    const timer = setInterval(() => {
      const diff = target.getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('Completed! 🎉');
        clearInterval(timer);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${d}d : ${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="interactive-card-body" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 'bold', color: color || 'var(--color-primary)' }}>
        {timeLeft}
      </div>
    </div>
  );
}

// Dynamic Agent Workflow Diagram Component (Rethought Workflow with User Format Override)
function AgentWorkflowDiagram({ activeProvider, hasOpenRouter, hasOpenAI, hasOpenCode, hasTavily }) {
  const isORActive = activeProvider === 'openrouter' && hasOpenRouter;
  const isOIActive = activeProvider === 'openai' && hasOpenAI;
  const isOCActive = activeProvider === 'opencode' && hasOpenCode;
  const isLlmConnected = isORActive || isOIActive || isOCActive;
  
  return (
    <div style={{ marginTop: '0', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.2)' }}>
      <div className="form-label" style={{ marginBottom: '8px', textAlign: 'center', fontSize: '9px', letterSpacing: '0.3px' }}>Active Agent Workflow Pipeline</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        {/* Step 1: Prompt */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '9px', width: '220px', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--color-accent)' }}>edit_note</span>
          <span>1. User Prompt Input</span>
        </div>
        
        <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'var(--color-text-dim)', lineHeight: 1, margin: '1px 0' }}>arrow_downward</span>

        {/* Step 2: Intent Parse */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '1px', padding: '4px 10px', 
          background: 'rgba(13, 13, 27, 0.8)', 
          border: `1px solid ${isLlmConnected ? 'var(--color-primary)' : 'var(--border-color)'}`,
          boxShadow: isLlmConnected ? 'var(--shadow-glow)' : 'none',
          borderRadius: '6px', fontSize: '9px', width: '220px', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--color-primary)' }}>psychology</span>
            <span>2. Intent Classifier</span>
          </div>
          <div style={{ fontSize: '7px', color: 'var(--color-text-muted)' }}>
            Model Provider: {activeProvider.toUpperCase()} 
            {isLlmConnected ? ' (Connected)' : ' (Simulation)'}
          </div>
        </div>

        <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'var(--color-text-dim)', lineHeight: 1, margin: '1px 0' }}>arrow_downward</span>

        {/* Step 3: Data Router */}
        <div style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'center' }}>
          {/* Public APIs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '4px 6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '6px', fontSize: '8px', alignItems: 'center', width: '80px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'var(--color-success)' }}>api</span>
            <span>Public APIs</span>
          </div>

          {/* Tavily Web Search */}
          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '1px', padding: '4px 6px', 
            background: hasTavily ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.01)', 
            border: `1px solid ${hasTavily ? 'var(--color-success)' : 'var(--border-color)'}`, 
            borderRadius: '6px', fontSize: '8px', alignItems: 'center', width: '90px',
            boxShadow: hasTavily ? '0 0 8px rgba(16, 185, 129, 0.15)' : 'none'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '10px', color: hasTavily ? 'var(--color-success)' : 'var(--color-text-dim)' }}>travel_explore</span>
            <span>Tavily Search</span>
          </div>

          {/* LLM Knowledge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '4px 6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '8px', alignItems: 'center', width: '80px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'var(--color-accent)' }}>auto_awesome</span>
            <span>LLM Fallback</span>
          </div>
        </div>

        <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'var(--color-text-dim)', lineHeight: 1, margin: '1px 0' }}>arrow_downward</span>

        {/* Step 4: Render Planner */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '1px', padding: '4px 10px', 
          background: 'rgba(13, 13, 27, 0.8)', 
          border: `1px solid ${isLlmConnected ? 'var(--color-primary)' : 'var(--border-color)'}`,
          boxShadow: isLlmConnected ? 'var(--shadow-glow)' : 'none',
          borderRadius: '6px', fontSize: '9px', width: '220px', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>palette</span>
            <span>4. Render Planner</span>
          </div>
          <div style={{ fontSize: '7px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Evaluates shape and plans default layout.
          </div>
        </div>

        <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'var(--color-text-dim)', lineHeight: 1, margin: '1px 0' }}>arrow_downward</span>

        {/* Step 5: User Override */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '1px', padding: '4px 10px', 
          background: 'rgba(168, 85, 247, 0.08)', 
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '6px', fontSize: '9px', width: '220px', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>tune</span>
            <span>5. User Override Switcher</span>
          </div>
          <div style={{ fontSize: '7px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Allows instant client-side format toggling.
          </div>
        </div>

        <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'var(--color-text-dim)', lineHeight: 1, margin: '1px 0' }}>arrow_downward</span>

        {/* Step 6: Placement */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(99,102,241,0.02)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '6px', fontSize: '9px', width: '220px', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--color-accent)' }}>grid_view</span>
          <span>6. CSS Dense Reflow Grid</span>
        </div>
      </div>
    </div>
  );
}
