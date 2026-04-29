const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
const port = process.env.PORT || 3000;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Remove HTML tags and decode common entities from a string. */
function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, ' ')          // remove tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')           // collapse whitespace
    .trim();
}

/** Map of disease keywords → specific preventive measures. */
const DISEASE_PREVENTION = {
  dengue:        'Use mosquito repellent, wear long sleeves, eliminate standing water around your home, and use bed nets.',
  malaria:       'Sleep under insecticide-treated bed nets, use mosquito repellent, take antimalarial medication if prescribed, and avoid stagnant water.',
  cholera:       'Drink only safe or boiled water, wash hands with soap, eat thoroughly cooked food, and avoid raw vegetables in affected areas.',
  'typhoid':     'Drink safe water, wash hands before eating, get vaccinated, and avoid street food in outbreak areas.',
  influenza:     'Get the annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and wear a mask in crowded spaces.',
  flu:           'Get the annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and wear a mask in crowded spaces.',
  measles:       'Ensure MMR vaccination is up to date, isolate infected individuals, and avoid contact with unvaccinated people.',
  covid:         'Wear a mask in crowded spaces, keep vaccinations up to date, wash hands frequently, and isolate if symptomatic.',
  coronavirus:   'Wear a mask in crowded spaces, keep vaccinations up to date, wash hands frequently, and isolate if symptomatic.',
  ebola:         'Avoid contact with blood or body fluids of infected persons, follow health authority guidelines, and seek medical care immediately if symptomatic.',
  'yellow fever':'Get the yellow fever vaccine, use mosquito repellent, and wear protective clothing.',
  zika:          'Use mosquito repellent, wear long-sleeved clothing, and use condoms. Pregnant women should avoid travel to affected areas.',
  nipah:         'Avoid contact with sick bats or pigs, do not consume raw date palm sap, and isolate confirmed cases.',
  chikungunya:   'Use mosquito repellent, wear long sleeves, eliminate stagnant water, and use bed nets.',
  leptospirosis: 'Avoid contact with floodwater or soil contaminated with animal urine, wear protective footwear, and seek medical care after potential exposure.',
  plague:        'Avoid contact with rodents and fleas, do not handle dead animals, and seek immediate medical care if symptomatic.',
  meningitis:    'Get vaccinated, avoid close contact with confirmed cases, and seek urgent medical care for sudden severe headache with fever.',
  hepatitis:     'Get vaccinated (hepatitis A and B), drink safe water, avoid sharing needles, and practise safe sex.',
  tuberculosis:  'Complete the full course of TB treatment, ensure good ventilation, and get tested if you have been in contact with a TB patient.',
  polio:         'Ensure polio vaccination is up to date, especially for children.',
  rabies:        'Get post-exposure prophylaxis immediately after any animal bite, vaccinate pets, and avoid contact with stray animals.',
  'heat stroke': 'Stay hydrated, avoid direct sun during peak hours (11am–3pm), wear light clothing, and rest in cool shaded areas.',
  'heart attack':'Call emergency services immediately, chew aspirin if not allergic, and do not leave the person alone.',
  stroke:        'Call emergency services immediately (FAST: Face drooping, Arm weakness, Speech difficulty, Time to call).',
  arthritis:     'Stay active with low-impact exercise, maintain a healthy weight, apply heat or cold to joints, and follow prescribed medication.',
  eczema:        'Moisturise skin regularly, avoid known triggers, use prescribed topical treatments, and wear soft breathable fabrics.',
  migraine:      'Rest in a quiet dark room, stay hydrated, take prescribed medication early, and identify and avoid personal triggers.',
  sinusitis:     'Use saline nasal rinses, stay hydrated, apply warm compresses to the face, and consult a doctor if symptoms persist beyond 10 days.',
  'common cold': 'Rest, stay hydrated, use saline nasal drops, and take over-the-counter symptom relief as needed.',
};

/** Return the best-matching preventive measure string for a given alert title + notes. */
function getPreventionForAlert(title, notes) {
  const text = `${title} ${notes}`.toLowerCase();
  for (const [keyword, advice] of Object.entries(DISEASE_PREVENTION)) {
    if (text.includes(keyword)) return advice;
  }
  return 'Follow your local health authority guidelines and seek medical advice if you develop symptoms.';
}

/**
 * Returns true if the alert is relevant to the requested region.
 * Checks whether the title/description mentions the region string or its
 * common aliases. Falls back to true (show all) if region is 'global'.
 */
function isRegionRelevant(title, notes, region) {
  if (!region || region === 'global') return true;
  const text = `${title} ${notes}`.toLowerCase();
  const r = region.toLowerCase();

  // Map common country codes to readable keywords
  const regionAliases = {
    in: ['india', 'indian', 'delhi', 'mumbai', 'chennai', 'bangalore', 'kolkata',
         'hyderabad', 'kerala', 'tamil', 'maharashtra', 'gujarat', 'rajasthan',
         'uttar pradesh', 'west bengal', 'punjab', 'haryana'],
    us: ['united states', 'usa', 'america', 'american'],
    gb: ['united kingdom', 'uk', 'britain', 'british', 'england'],
    au: ['australia', 'australian'],
    cn: ['china', 'chinese'],
    br: ['brazil', 'brazilian'],
    ng: ['nigeria', 'nigerian'],
    za: ['south africa'],
    ke: ['kenya', 'kenyan'],
    pk: ['pakistan', 'pakistani'],
    bd: ['bangladesh'],
    id: ['indonesia', 'indonesian'],
  };

  const keywords = regionAliases[r] || [r];
  return keywords.some(kw => text.includes(kw));
}

// ── Data sources ──────────────────────────────────────────────────────────────

async function fetchRealTimeOutbreaks(region) {
  try {
    const rssUrl = 'https://www.afro.who.int/rss/emergencies.xml';
    const response = await axios.get(rssUrl);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    const items = result.rss.channel[0].item || [];

    const alerts = items.map((item, index) => {
      const title = stripHtml(item.title?.[0] || '');
      const notes = stripHtml(item.description?.[0] || '');
      return {
        id: `who-rss-${index}`,
        name: title,
        active: true,
        prevention: getPreventionForAlert(title, notes),
        notes: notes ? `${notes} (Source: WHO AFRO)` : 'Source: WHO AFRO',
      };
    });

    // Try region-filtered results first; fall back to all if none match
    const filtered = alerts.filter(a => isRegionRelevant(a.name, a.notes, region));
    return filtered.length > 0 ? filtered : alerts.slice(0, 10);
  } catch (error) {
    console.warn('Failed to fetch from WHO RSS:', error.message);
    return [];
  }
}

async function fetchNewsDataIo(region) {
  const apiKey = process.env.NEWSDATA_API_KEY || 'pub_4eb14755aa47465ebb67167557f26272';
  if (!apiKey) return [];

  // Map region code to NewsData.io country param (default: India)
  const countryMap = { in: 'in', us: 'us', gb: 'gb', au: 'au', cn: 'cn',
                       br: 'br', ng: 'ng', za: 'za', ke: 'ke', pk: 'pk' };
  const country = countryMap[region] || 'in';

  try {
    const query = 'disease OR outbreak OR dengue OR malaria OR cholera OR influenza OR measles OR covid';
    const response = await axios.get('https://newsdata.io/api/1/latest', {
      params: { apikey: apiKey, q: query, country, language: 'en', size: 10 },
    });

    const articles = response.data.results || [];
    console.log(`NewsData.io returned ${articles.length} articles for country=${country}`);

    return articles.map((article, index) => {
      const title = article.title || '';
      const desc  = stripHtml(article.description || '');
      const date  = article.pubDate ? new Date(article.pubDate).toDateString() : '';
      return {
        id: `newsdata-${index}`,
        name: title,
        active: true,
        prevention: getPreventionForAlert(title, desc),
        notes: `${desc}${date ? ` (${date})` : ''} — Source: ${article.source_id || 'newsdata.io'}`,
      };
    });
  } catch (error) {
    console.warn('Failed to fetch from NewsData.io:', error.message);
    return [];
  }
}

async function fetchOutbreakNews(region) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const regionKeywords = {
    in: ['India', 'Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kerala', 'Tamil Nadu', 'Maharashtra'],
  };
  const locationTerms = regionKeywords[region] || [region];
  const diseases = ['dengue', 'malaria', 'cholera', 'influenza', 'measles', 'covid',
                    'outbreak', 'disease alert', 'nipah', 'chikungunya', 'typhoid'];
  const locationQuery = locationTerms.map(s => `"${s}"`).join(' OR ');
  const diseaseQuery  = diseases.map(d => `"${d}"`).join(' OR ');

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: { q: `(${locationQuery}) AND (${diseaseQuery})`, language: 'en',
                sortBy: 'publishedAt', pageSize: 20 },
      headers: { 'X-Api-Key': apiKey },
    });

    return (response.data.articles || []).map((article, index) => {
      const title = article.title || '';
      const desc  = stripHtml(article.description || '');
      return {
        id: `newsapi-${index}`,
        name: title,
        active: true,
        prevention: getPreventionForAlert(title, desc),
        notes: `${desc} — Source: ${article.source?.name || 'NewsAPI'}, ${new Date(article.publishedAt).toDateString()}`,
      };
    });
  } catch (error) {
    console.warn('Failed to fetch from NewsAPI:', error.message);
    return [];
  }
}

async function fetchDiseaseData(region) {
  try {
    const indicator = 'WHS3_49'; // Cholera
    const url = `https://ghoapi.azureedge.net/api/${indicator}?$filter=SpatialDim eq '${region.toUpperCase()}'&$orderby=TimeDim desc&$top=5`;
    const response = await axios.get(url);
    return (response.data.value || []).map(item => ({
      id: `gho-${item.Id}`,
      name: 'Cholera',
      active: true,
      prevention: getPreventionForAlert('cholera', ''),
      notes: `Reported cases: ${item.Value} in ${item.TimeDim} (${item.SpatialDim}). Source: WHO GHO.`,
    }));
  } catch (error) {
    console.warn('Failed to fetch from WHO GHO API:', error.message);
    return [];
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

const DEMO_OUTBREAKS_BY_REGION = {
  in: [
    {
      id: 'demo-in-1',
      name: 'Dengue Fever Surge — Chennai & Tamil Nadu',
      active: true,
      prevention: 'Use mosquito repellent, wear long sleeves, eliminate standing water around your home, and use bed nets.',
      notes: 'Tamil Nadu health authorities report a 40% rise in dengue cases this monsoon. Aedes mosquito breeding sites identified in low-lying areas of Chennai and Madurai. (Source: Demo)',
    },
    {
      id: 'demo-in-2',
      name: 'Cholera Alert — Flood-Affected Coastal Districts',
      active: true,
      prevention: 'Drink only safe or boiled water, wash hands with soap, eat thoroughly cooked food, and avoid raw vegetables in affected areas.',
      notes: 'Floodwater contamination has elevated cholera risk in coastal Andhra Pradesh and Odisha. Residents advised to boil drinking water. (Source: Demo)',
    },
    {
      id: 'demo-in-3',
      name: 'Influenza (H3N2) Circulation — Northern India',
      active: true,
      prevention: 'Get the annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and wear a mask in crowded spaces.',
      notes: 'ICMR reports H3N2 influenza sub-type active in Delhi NCR, Punjab, and Haryana. High-risk groups urged to seek vaccination. (Source: Demo)',
    },
  ],
  us: [
    {
      id: 'demo-us-1',
      name: 'West Nile Virus Activity — Southern States',
      active: true,
      prevention: 'Use EPA-registered insect repellent, wear long sleeves at dusk, and eliminate standing water near your home.',
      notes: 'CDC reports elevated West Nile virus activity in Texas, Louisiana, and Florida. Mosquito control measures in effect. (Source: Demo)',
    },
    {
      id: 'demo-us-2',
      name: 'Influenza Season Early Onset — Northeast USA',
      active: true,
      prevention: 'Get the annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and wear a mask in crowded spaces.',
      notes: 'CDC FluView shows above-baseline influenza activity in New York, Massachusetts, and Pennsylvania. (Source: Demo)',
    },
  ],
  gb: [
    {
      id: 'demo-gb-1',
      name: 'Norovirus Outbreak — Hospital Wards UK',
      active: true,
      prevention: 'Wash hands thoroughly with soap and water, avoid sharing food or utensils, and stay home if symptomatic for 48 hours after recovery.',
      notes: 'NHS England reports norovirus cases above seasonal average in hospital settings across England and Wales. (Source: Demo)',
    },
  ],
  au: [
    {
      id: 'demo-au-1',
      name: 'Ross River Fever Alert — Queensland',
      active: true,
      prevention: 'Use insect repellent, wear protective clothing at dawn and dusk, and avoid mosquito-prone areas near wetlands.',
      notes: 'Queensland Health reports increased Ross River virus activity in coastal regions. No vaccine available — prevention is key. (Source: Demo)',
    },
  ],
  ng: [
    {
      id: 'demo-ng-1',
      name: 'Lassa Fever Cases — Southeast Nigeria',
      active: true,
      prevention: 'Avoid contact with rodents, store food in sealed containers, and seek immediate medical care if fever develops after potential exposure.',
      notes: 'Nigeria CDC confirms Lassa fever cases in Ondo and Edo states. Community sensitisation ongoing. (Source: Demo)',
    },
    {
      id: 'demo-ng-2',
      name: 'Cholera Outbreak — Northern Nigeria',
      active: true,
      prevention: 'Drink only safe or boiled water, wash hands with soap, eat thoroughly cooked food, and avoid raw vegetables in affected areas.',
      notes: 'Over 500 cholera cases reported in Kano and Borno states following seasonal flooding. ORS distribution underway. (Source: Demo)',
    },
  ],
  global: [
    {
      id: 'demo-global-1',
      name: 'WHO Alert: Mpox Clade I Spread',
      active: true,
      prevention: 'Avoid close skin-to-skin contact with infected individuals, practise good hand hygiene, and consult a doctor if you develop unexplained rash or fever.',
      notes: 'WHO reports Mpox Clade I cases across multiple countries. Travellers to affected regions advised to take precautions. (Source: Demo)',
    },
    {
      id: 'demo-global-2',
      name: 'Global Influenza Season Underway',
      active: true,
      prevention: 'Get the annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and wear a mask in crowded spaces.',
      notes: 'WHO FluNet indicates influenza A(H3N2) and B/Victoria co-circulating across the Northern Hemisphere. (Source: Demo)',
    },
  ],
};

app.get('/api/outbreaks', async (req, res) => {
  const region = (req.query.region || 'global').toLowerCase();

  if (req.query.demo === 'true') {
    const alerts = DEMO_OUTBREAKS_BY_REGION[region] || DEMO_OUTBREAKS_BY_REGION['global'];
    return res.json({ region, source: 'DEMO', outbreaks: alerts });
  }

  try {
    const rssData = await fetchRealTimeOutbreaks(region);
    if (rssData.length > 0) {
      return res.json({ region, source: 'WHO_RSS', outbreaks: rssData });
    }
  } catch (e) { console.warn('RSS error:', e.message); }

  try {
    const newsData = await fetchNewsDataIo(region);
    if (newsData.length > 0) {
      return res.json({ region, source: 'NEWSDATA_IO', outbreaks: newsData });
    }
  } catch (e) { console.warn('NewsData error:', e.message); }

  try {
    const newsData = await fetchOutbreakNews(region);
    if (newsData.length > 0) {
      return res.json({ region, source: 'NEWSAPI', outbreaks: newsData });
    }
  } catch (e) { console.warn('NewsAPI error:', e.message); }

  try {
    const ghoData = await fetchDiseaseData(region);
    return res.json({ region, source: 'WHO_GHO', outbreaks: ghoData });
  } catch (e) {
    console.warn('GHO error:', e.message);
    return res.json({ region, outbreaks: [] });
  }
});

// ── Test endpoint ─────────────────────────────────────────────────────────────
// POST /api/test-outbreak
// Body: { "title": "...", "description": "...", "region": "in" }
// Returns how the system would process this news article.

app.use(express.json());

app.post('/api/test-outbreak', (req, res) => {
  const { title = '', description = '', region = 'global' } = req.body;
  const prevention = getPreventionForAlert(title, description);
  const relevant   = isRegionRelevant(title, description, region);

  res.json({
    input: { title, description, region },
    result: {
      isRegionRelevant: relevant,
      prevention,
      alert: relevant
        ? { id: 'test-0', name: title, active: true, prevention,
            notes: `${description} (Source: Test)` }
        : null,
    },
    message: relevant
      ? 'This article WOULD appear in outbreak alerts for this region.'
      : 'This article would NOT appear — region keyword not matched.',
  });
});

// GET /api/test-outbreak?scenario=dengue|cholera|covid|india-dengue
app.get('/api/test-outbreak', (req, res) => {
  const scenarios = {
    dengue: {
      title: 'Dengue fever outbreak spreads across South-East Asia',
      description: 'Health authorities report a sharp rise in dengue cases.',
      region: 'global',
    },
    cholera: {
      title: 'Cholera outbreak declared in flood-affected regions',
      description: 'Contaminated water sources linked to 200 new cholera cases.',
      region: 'global',
    },
    covid: {
      title: 'New COVID-19 sub-variant detected in multiple countries',
      description: 'Hospitals see increased admissions as coronavirus cases climb.',
      region: 'us',
    },
    'india-dengue': {
      title: 'Dengue surge in Chennai and Kerala reported by health ministry',
      description: 'Tamil Nadu records 1,200 dengue cases this month alone.',
      region: 'in',
    },
    'unrelated': {
      title: 'Stock market reaches all-time high',
      description: 'Investors celebrate as Sensex crosses 80,000 points.',
      region: 'in',
    },
  };

  const scenario = scenarios[req.query.scenario] || scenarios['india-dengue'];
  const { title, description, region } = scenario;
  const prevention = getPreventionForAlert(title, description);
  const relevant   = isRegionRelevant(title, description, region);

  res.json({
    scenario: req.query.scenario || 'india-dengue',
    input: { title, description, region },
    result: {
      isRegionRelevant: relevant,
      prevention,
    },
    message: relevant
      ? 'This article WOULD appear in outbreak alerts for this region.'
      : 'This article would NOT appear — region keyword not matched.',
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Outbreak backend listening at http://0.0.0.0:${port}`);
});
