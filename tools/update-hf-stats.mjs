import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(rootDir, 'assets');
const HF_USER = 'ProCreations';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SSHdotCodes-profile-stats/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function fmtCompact(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 100_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtComma(n) {
  return n.toLocaleString('en-US');
}

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function classifyModel(id) {
  const name = id.split('/')[1]?.toLowerCase() ?? '';
  if (name.includes('grug')) return { key: 'grug', label: 'Grug Series', sub: 'concise reasoning · 27B / 35B / 9B / 3B' };
  if (name.includes('bonsai')) return { key: 'bonsai', label: 'Ternary-Bonsai-2-27B', sub: 'MTP + DFlash2 + GGUF' };
  if (name.includes('mimo')) return { key: 'mimo', label: 'MiMo-V2.6-Flash', sub: 'NVFP4 + GGUF quants' };
  if (name.includes('dory')) return { key: 'dory', label: 'Dory-Beam-4B', sub: 'looped-transformer distill' };
  if (name.startsWith('auto')) return { key: 'auto', label: 'Auto Series', sub: 'local tool-call safety · v3' };
  if (name.includes('nanbeige')) return { key: 'nanbeige', label: 'Nanbeige4.3-33B', sub: 'DFlash2 + EXL3 + NVFP4' };
  if (name.includes('betterwright')) return { key: 'betterwright', label: 'BetterWright-4b', sub: 'browser agent fine-tune' };
  if (name.includes('booper')) return { key: 'booper', label: 'Booper-Big', sub: '150M MoE pretrained from scratch' };
  if (name.includes('nib')) return { key: 'nib', label: 'Nib 4B', sub: 'compact browser agent' };
  if (name.includes('nadir')) return { key: 'nadir', label: 'Nadir', sub: '16M in-browser dark mode' };
  return null;
}

const [overview, models, datasets] = await Promise.all([
  fetchJson(`https://huggingface.co/api/users/${HF_USER}/overview`),
  fetchJson(`https://huggingface.co/api/models?author=${HF_USER}&limit=500&expand[]=downloads&expand[]=downloadsAllTime&expand[]=likes`),
  fetchJson(`https://huggingface.co/api/datasets?author=${HF_USER}&limit=500&expand[]=downloads&expand[]=downloadsAllTime&expand[]=likes`),
]);

const modelsAll = models.reduce((s, m) => s + (m.downloadsAllTime || 0), 0);
const models30d = models.reduce((s, m) => s + (m.downloads || 0), 0);
const datasetsAll = datasets.reduce((s, d) => s + (d.downloadsAllTime || 0), 0);
const datasets30d = datasets.reduce((s, d) => s + (d.downloads || 0), 0);

const totalAll = modelsAll + datasetsAll;
const total30d = models30d + datasets30d;
const numModels = overview.numModels ?? models.length;
const numDatasets = overview.numDatasets ?? datasets.length;
const numSpaces = overview.numSpaces ?? 0;
const numFollowers = overview.numFollowers ?? 0;

// Aggregate top model families
const familyMap = new Map();
for (const m of models) {
  const info = classifyModel(m.id);
  if (!info) continue;
  const prev = familyMap.get(info.key) || { ...info, all: 0, d30: 0, repos: 0 };
  prev.all += m.downloadsAllTime || 0;
  prev.d30 += m.downloads || 0;
  prev.repos += 1;
  familyMap.set(info.key, prev);
}

const topFamilies = [...familyMap.values()]
  .sort((a, b) => b.all - a.all)
  .slice(0, 5);

const maxLog = Math.log10(Math.max(topFamilies[0]?.all || 1, 10));
const minLog = 2.6; // keeps smaller top-5 families readable without exaggerating

const now = new Date();
const updatedLabel = now.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
});

const themes = {
  dark: {
    bg: '#080b10',
    border: '#1d2534',
    divider: '#1a2230',
    glow: '#4b82ff',
    glowOpacity: '0.13',
    ink: '#f1f5fd',
    inkSoft: '#c5d0e3',
    muted: '#7e8ca6',
    faint: '#5a6780',
    accent: '#8cb8ff',
    accentStrong: '#a7cbff',
    pillBg: '#101d35',
    pillBorder: '#243c66',
    pillText: '#9bc4ff',
    track: '#151c28',
    barStart: '#4f86ff',
    barEnd: '#9bc7ff',
    barMutedStart: '#3a66c9',
    barMutedEnd: '#73a6f5',
  },
  light: {
    bg: '#ffffff',
    border: '#d8e0ec',
    divider: '#e4eaf3',
    glow: '#3b82f6',
    glowOpacity: '0.07',
    ink: '#0f172a',
    inkSoft: '#334155',
    muted: '#64748b',
    faint: '#8593a8',
    accent: '#2563eb',
    accentStrong: '#1d4ed8',
    pillBg: '#eff6ff',
    pillBorder: '#bfdbfe',
    pillText: '#1d4ed8',
    track: '#edf2f9',
    barStart: '#2563eb',
    barEnd: '#60a5fa',
    barMutedStart: '#3b82f6',
    barMutedEnd: '#93c5fd',
  },
};

function buildSvg(mode) {
  const t = themes[mode];
  const W = 1280;
  const H = 324;
  const sans = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
  const mono = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace`;

  const heroValue = `${fmtCompact(totalAll)}+`;
  const barX = 524;
  const barMaxW = 708;

  const rowsSvg = topFamilies.map((f, i) => {
    const y = 80 + i * 44;
    const ratio = i === 0
      ? 1
      : Math.max(0.12, Math.min(0.92, (Math.log10(Math.max(f.all, 10)) - minLog) / (maxLog - minLog)));
    const bw = Math.round(barMaxW * ratio);
    const gradId = i === 0 ? `barTop_${mode}` : `barSub_${mode}`;
    return `
    <g transform="translate(0, ${y})">
      <text x="${barX}" y="0" font-family="${sans}" font-size="15" font-weight="600" fill="${t.ink}">${esc(f.label)}<tspan dx="10" font-size="12.5" font-weight="400" fill="${t.muted}">${esc(f.sub)}</tspan></text>
      <text x="${barX + barMaxW}" y="0" text-anchor="end" font-family="${mono}" font-size="13.5" font-weight="600" fill="${t.ink}">${esc(fmtCompact(f.all))}<tspan dx="8" font-size="11.5" font-weight="400" fill="${t.muted}">+${esc(fmtCompact(f.d30))}/30d</tspan></text>
      <rect x="${barX}" y="10" width="${barMaxW}" height="6" rx="3" fill="${t.track}"/>
      <rect x="${barX}" y="10" width="${bw}" height="6" rx="3" fill="url(#${gradId})"/>
    </g>`;
  }).join('\n');

  const stats = [
    { v: fmtComma(numModels), k: 'MODELS' },
    { v: fmtComma(numDatasets), k: 'DATASETS' },
    { v: fmtComma(numSpaces), k: 'SPACES' },
    { v: fmtComma(numFollowers), k: 'FOLLOWERS' },
  ];
  const statsSvg = stats.map((st, idx) => {
    const x = 44 + idx * 108;
    return `
    <g transform="translate(${x}, 256)">
      <text x="0" y="0" font-family="${sans}" font-size="22" font-weight="600" letter-spacing="-0.02em" fill="${t.ink}">${esc(st.v)}</text>
      <text x="0" y="19" font-family="${mono}" font-size="10.5" letter-spacing="0.09em" fill="${t.muted}">${esc(st.k)}</text>
    </g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hugging Face stats for ProCreations: ${esc(fmtComma(totalAll))} all-time downloads across ${numModels} models and ${numDatasets} datasets">
  <defs>
    <radialGradient id="glow_${mode}" cx="14%" cy="18%" r="48%">
      <stop offset="0%" stop-color="${t.glow}" stop-opacity="${t.glowOpacity}"/>
      <stop offset="100%" stop-color="${t.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="barTop_${mode}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${t.barStart}"/>
      <stop offset="100%" stop-color="${t.barEnd}"/>
    </linearGradient>
    <linearGradient id="barSub_${mode}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${t.barMutedStart}"/>
      <stop offset="100%" stop-color="${t.barMutedEnd}"/>
    </linearGradient>
    <clipPath id="cardClip_${mode}">
      <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12"/>
    </clipPath>
  </defs>

  <g clip-path="url(#cardClip_${mode})">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#glow_${mode})"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${t.border}"/>

  <!-- Left: Total Downloads -->
  <circle cx="50" cy="40" r="4" fill="${t.accent}"/>
  <text x="64" y="44" font-family="${mono}" font-size="12" font-weight="500" letter-spacing="0.1em" fill="${t.muted}">HUGGING FACE · PROCREATIONS</text>

  <text x="42" y="140" font-family="${sans}" font-size="76" font-weight="700" letter-spacing="-0.04em" fill="${t.ink}">${esc(heroValue)}</text>
  <text x="44" y="170" font-family="${mono}" font-size="13.5" fill="${t.inkSoft}">${esc(fmtComma(totalAll))} all-time downloads</text>

  <rect x="44" y="186" width="174" height="26" rx="13" fill="${t.pillBg}" stroke="${t.pillBorder}"/>
  <text x="131" y="203" text-anchor="middle" font-family="${mono}" font-size="12" font-weight="600" fill="${t.pillText}">+${esc(fmtCompact(total30d))} in last 30d</text>

  <line x1="44" y1="229" x2="452" y2="229" stroke="${t.divider}"/>
  ${statsSvg}

  <!-- Vertical divider -->
  <line x1="484" y1="30" x2="484" y2="${H - 30}" stroke="${t.divider}"/>

  <!-- Right: Top Model Families -->
  <text x="${barX}" y="44" font-family="${mono}" font-size="12" font-weight="500" letter-spacing="0.1em" fill="${t.muted}">TOP MODEL FAMILIES</text>
  <text x="${barX + barMaxW}" y="44" text-anchor="end" font-family="${mono}" font-size="11.5" letter-spacing="0.06em" fill="${t.faint}">ALL-TIME  ·  30D VELOCITY</text>

  ${rowsSvg}

  <!-- Footer -->
  <text x="${barX}" y="303" font-family="${mono}" font-size="11" fill="${t.faint}">Live via Hugging Face API · Updated ${esc(updatedLabel)}</text>
  <text x="${barX + barMaxW}" y="303" text-anchor="end" font-family="${mono}" font-size="11" fill="${t.accent}">huggingface.co/ProCreations ↗</text>
</svg>
`;
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'hf-stats-dark.svg'), buildSvg('dark'));
await writeFile(path.join(outDir, 'hf-stats-light.svg'), buildSvg('light'));
await writeFile(path.join(outDir, 'hf-stats.json'), JSON.stringify({
  user: HF_USER,
  updated_at: now.toISOString(),
  total_downloads_all_time: totalAll,
  total_downloads_30d: total30d,
  models_downloads_all_time: modelsAll,
  datasets_downloads_all_time: datasetsAll,
  models: numModels,
  datasets: numDatasets,
  spaces: numSpaces,
  followers: numFollowers,
  top_families: topFamilies,
}, null, 2) + '\n');

console.log(`Generated hf-stats-dark.svg and hf-stats-light.svg in ${outDir} (${fmtComma(totalAll)} all-time, +${fmtComma(total30d)} / 30d).`);
