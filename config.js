/**
 * Central network config for WeatherMed.
 *
 * Running on a physical device or Android emulator?
 *   → Set DEV_MACHINE_IP to your machine's LAN IP (run `ipconfig` to find it)
 *
 * Running on iOS Simulator?
 *   → 'localhost' works fine, no change needed
 *
 * Android Emulator (no physical device)?
 *   → Use '10.0.2.2' which maps to the host machine
 */
const DEV_MACHINE_IP = '192.168.1.6';

export const PREDICT_API_URL = `http://${DEV_MACHINE_IP}:8000`;
export const OUTBREAK_API_URL = `http://${DEV_MACHINE_IP}:3000`;
