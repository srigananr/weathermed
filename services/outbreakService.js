import { OUTBREAK_API_URL, DEMO_MODE } from '../config';

export async function getOutbreaks(region) {
  try {
    const url = `${OUTBREAK_API_URL}/api/outbreaks?region=${encodeURIComponent(region)}${DEMO_MODE ? '&demo=true' : ''}`;
    const response = await fetch(url);
    if (response.ok) {
      const { outbreaks } = await response.json();
      return outbreaks || [];
    }
  } catch (error) {
    console.warn('Failed to fetch outbreaks from backend.', error);
  }
  return [];
}
