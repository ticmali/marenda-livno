// Pronalazi najnoviju objavu sa svake Facebook stranice i upisuje je u posts.json.
// Pokretanje: APIFY_TOKEN=xxxx node scripts/update-posts.mjs   (Node 18+)

import { writeFile, readFile } from 'node:fs/promises';

const STRANICE = {
  metropolis2: 'https://www.facebook.com/Metropolis2Livno/',
  ptcforum:    'https://www.facebook.com/ptcforum/',
  bonappetit:  'https://www.facebook.com/bonappetitlivno/',
  panorama:    'https://www.facebook.com/restoranpizzeriapanorama/',
  ivanovic:    'https://www.facebook.com/restoranpizzeriaivanovic/',
  pivnica:     'https://www.facebook.com/pivnica.livno/',
  novitas:     'https://www.facebook.com/HotelNovitas/',
};

const token = process.env.APIFY_TOKEN;
if (!token) { console.error('Nedostaje APIFY_TOKEN'); process.exit(1); }

const norm = u => u.toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, '').replace(/\/+$/, '');

const res = await fetch(
  `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?token=${token}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startUrls: Object.values(STRANICE).map(url => ({ url })),
      resultsLimit: 2, // 2 zbog moguće prikvačene (pinned) objave
    }),
  }
);
if (!res.ok) { console.error('Apify greška', res.status, await res.text()); process.exit(1); }
const items = await res.json();

// Postojeći podaci ostaju ako za neku stranicu ništa ne stigne
let out = { posts: {} };
try { out = JSON.parse(await readFile('posts.json', 'utf8')); } catch {}

for (const [id, pageUrl] of Object.entries(STRANICE)) {
  const mine = items
    .filter(p => p.url && norm(p.inputUrl || p.facebookUrl || '') === norm(pageUrl))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  if (mine[0]) {
    out.posts[id] = { url: mine[0].url, time: mine[0].time || null };
    console.log(`${id}: ${mine[0].time}  ${mine[0].url}`);
  } else {
    console.warn(`${id}: nema novih objava, ostaje stari link`);
  }
}

out.updated = new Date().toISOString();
await writeFile('posts.json', JSON.stringify(out, null, 2) + '\n');
