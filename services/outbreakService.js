import { OUTBREAK_API_URL } from '../config';

export async function getOutbreaks(region) {
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
