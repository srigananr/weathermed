import { OUTBREAK_API_URL, DEMO_MODE } from '../config';

const DEMO_OUTBREAKS_BY_REGION = {
  in: [
    {
      id: 'demo-in-1',
      name: 'Dengue Fever Surge — Chennai & Tamil Nadu',
      active: true,
      prevention: 'Use mosquito repellent, wear long sleeves, eliminate standing water around your home, and use bed nets.',
      notes: 'Tamil Nadu health authorities report a 40% rise in dengue cases this monsoon. Aedes mosquito breeding sites identified in low-lying areas of Chennai and Madurai.',
    },
    {
      id: 'demo-in-2',
      name: 'Cholera Alert — Flood-Affected Coastal Districts',
      active: true,
      prevention: 'Drink only safe or boiled water, wash hands with soap, eat thoroughly cooked food, and avoid raw vegetables in affected areas.',
      notes: 'Floodwater contamination has elevated cholera risk in coastal Andhra Pradesh and Odisha. Residents advised to boil drinking water.',
    },
    {
      id: 'demo-in-3',
      name: 'Influenza (H3N2) Circulation — Northern India',
      active: true,
      prevention: 'Get the annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and wear a mask in crowded spaces.',
      notes: 'ICMR reports H3N2 influenza sub-type active in Delhi NCR, Punjab, and Haryana. High-risk groups urged to seek vaccination.',
    },
  ],
  us: [
    {
      id: 'demo-us-1',
      name: 'West Nile Virus Activity — Southern States',
      active: true,
      prevention: 'Use EPA-registered insect repellent, wear long sleeves at dusk, and eliminate standing water near your home.',
      notes: 'CDC reports elevated West Nile virus activity in Texas, Louisiana, and Florida. Mosquito control measures in effect.',
    },
    {
      id: 'demo-us-2',
      name: 'Influenza Season Early Onset — Northeast USA',
      active: true,
      prevention: 'Get the annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and wear a mask in crowded spaces.',
      notes: 'CDC FluView shows above-baseline influenza activity in New York, Massachusetts, and Pennsylvania.',
    },
  ],
  gb: [
    {
      id: 'demo-gb-1',
      name: 'Norovirus Outbreak — Hospital Wards UK',
      active: true,
      prevention: 'Wash hands thoroughly with soap and water, avoid sharing food or utensils, and stay home if symptomatic for 48 hours after recovery.',
      notes: 'NHS England reports norovirus cases above seasonal average in hospital settings across England and Wales.',
    },
  ],
  au: [
    {
      id: 'demo-au-1',
      name: 'Ross River Fever Alert — Queensland',
      active: true,
      prevention: 'Use insect repellent, wear protective clothing at dawn and dusk, and avoid mosquito-prone areas near wetlands.',
      notes: 'Queensland Health reports increased Ross River virus activity in coastal regions. No vaccine available — prevention is key.',
    },
  ],
  ng: [
    {
      id: 'demo-ng-1',
      name: 'Lassa Fever Cases — Southeast Nigeria',
      active: true,
      prevention: 'Avoid contact with rodents, store food in sealed containers, and seek immediate medical care if fever develops after potential exposure.',
      notes: 'Nigeria CDC confirms Lassa fever cases in Ondo and Edo states. Community sensitisation ongoing.',
    },
    {
      id: 'demo-ng-2',
      name: 'Cholera Outbreak — Northern Nigeria',
      active: true,
      prevention: 'Drink only safe or boiled water, wash hands with soap, eat thoroughly cooked food, and avoid raw vegetables in affected areas.',
      notes: 'Over 500 cholera cases reported in Kano and Borno states following seasonal flooding. ORS distribution underway.',
    },
  ],
};

const DEMO_GLOBAL = [
  {
    id: 'demo-global-1',
    name: 'WHO Alert: Mpox Clade I Spread',
    active: true,
    prevention: 'Avoid close skin-to-skin contact with infected individuals, practise good hand hygiene, and consult a doctor if you develop unexplained rash or fever.',
    notes: 'WHO reports Mpox Clade I cases across multiple countries. Travellers to affected regions advised to take precautions.',
  },
  {
    id: 'demo-global-2',
    name: 'Global Influenza Season Underway',
    active: true,
    prevention: 'Get the annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and wear a mask in crowded spaces.',
    notes: 'WHO FluNet indicates influenza A(H3N2) and B/Victoria co-circulating across the Northern Hemisphere.',
  },
];

export async function getOutbreaks(region) {
  if (DEMO_MODE) {
    const key = (region || 'global').toLowerCase();
    return DEMO_OUTBREAKS_BY_REGION[key] || DEMO_GLOBAL;
  }

  try {
    const response = await fetch(`${OUTBREAK_API_URL}/api/outbreaks?region=${encodeURIComponent(region)}`);
    if (response.ok) {
      const { outbreaks } = await response.json();
      return outbreaks || [];
    }
  } catch (error) {
    console.warn('Failed to fetch outbreaks from backend.', error);
  }
  return [];
}
