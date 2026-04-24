import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Switch,
  Keyboard,
  Image,
} from 'react-native';
// Weather code to icon mapping
const weatherCodeToIcon = (code) => {
  // You can replace these URLs with local assets if desired
  if (code === 0) return 'https://img.icons8.com/ios-filled/100/000000/sun--v1.png'; // Clear
  if (code === 1 || code === 2) return 'https://img.icons8.com/ios-filled/100/000000/partly-cloudy-day--v1.png'; // Partly cloudy
  if (code === 3) return 'https://img.icons8.com/ios-filled/100/000000/cloud.png'; // Overcast
  if (code === 45 || code === 48) return 'https://img.icons8.com/ios-filled/100/000000/fog-day--v1.png'; // Fog
  if (code >= 51 && code <= 55) return 'https://img.icons8.com/ios-filled/100/000000/rain--v1.png'; // Drizzle
  if (code >= 61 && code <= 65) return 'https://img.icons8.com/ios-filled/100/000000/rain--v1.png'; // Rain
  if (code >= 71 && code <= 75) return 'https://img.icons8.com/ios-filled/100/000000/snow--v1.png'; // Snow
  if (code >= 80 && code <= 82) return 'https://img.icons8.com/ios-filled/100/000000/rain--v1.png'; // Showers
  if (code >= 95) return 'https://img.icons8.com/ios-filled/100/000000/storm.png'; // Thunderstorm
  return 'https://img.icons8.com/ios-filled/100/000000/question-mark.png'; // Unknown
};
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import * as Location from 'expo-location';
import { predictDisease } from './model/predict';
import { getOutbreaks } from './services/outbreakService';
import { OUTBREAK_API_URL } from './config';

const PREVENTION_BY_DISEASE = {
  'Heat Stroke': 'Stay hydrated, avoid direct sun exposure, and take breaks in the shade.',
  Dengue: 'Avoid stagnant water, use mosquito repellent, and keep surroundings clean.',
  'Common Cold': 'Rest, drink plenty of fluids, and maintain good hygiene.',
  Hypothermia: 'Dress warmly, stay dry, and avoid prolonged exposure to cold.',
  Flu: 'Get vaccinated, wash hands often, and avoid close contact with sick people.',
  Malaria: 'Use mosquito nets, take antimalarial medication as advised, and avoid mosquito bites.',
};

const SYMPTOMS = [
  { key: 'nausea', label: 'Nausea' },
  { key: 'joint_pain', label: 'Joint pain' },
  { key: 'abdominal_pain', label: 'Abdominal pain' },
  { key: 'high_fever', label: 'High fever' },
  { key: 'chills', label: 'Chills' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'runny_nose', label: 'Runny nose' },
  { key: 'pain_behind_the_eyes', label: 'Pain behind the eyes' },
  { key: 'dizziness', label: 'Dizziness' },
  { key: 'headache', label: 'Headache' },
  { key: 'chest_pain', label: 'Chest pain' },
  { key: 'vomiting', label: 'Vomiting' },
  { key: 'cough', label: 'Cough' },
  { key: 'shivering', label: 'Shivering' },
  { key: 'asthma_history', label: 'Asthma history' },
  { key: 'high_cholesterol', label: 'High cholesterol' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'obesity', label: 'Obesity' },
  { key: 'hiv_aids', label: 'HIV/AIDS' },
  { key: 'nasal_polyps', label: 'Nasal polyps' },
  { key: 'asthma', label: 'Asthma' },
  { key: 'high_blood_pressure', label: 'High blood pressure' },
  { key: 'severe_headache', label: 'Severe headache' },
  { key: 'weakness', label: 'Weakness' },
  { key: 'trouble_seeing', label: 'Trouble seeing' },
  { key: 'fever', label: 'Fever' },
  { key: 'body_aches', label: 'Body aches' },
  { key: 'sore_throat', label: 'Sore throat' },
  { key: 'sneezing', label: 'Sneezing' },
  { key: 'diarrhea', label: 'Diarrhea' },
  { key: 'rapid_breathing', label: 'Rapid breathing' },
  { key: 'rapid_heart_rate', label: 'Rapid heart rate' },
  { key: 'swollen_glands', label: 'Swollen glands' },
  { key: 'rashes', label: 'Rashes' },
  { key: 'sinus_headache', label: 'Sinus headache' },
  { key: 'facial_pain', label: 'Facial pain' },
  { key: 'shortness_of_breath', label: 'Shortness of breath' },
  { key: 'reduced_smell_and_taste', label: 'Reduced smell and taste' },
  { key: 'skin_irritation', label: 'Skin irritation' },
  { key: 'itchiness', label: 'Itchiness' },
  { key: 'throbbing_headache', label: 'Throbbing headache' },
  { key: 'confusion', label: 'Confusion' },
  { key: 'back_pain', label: 'Back pain' },
  { key: 'knee_ache', label: 'Knee ache' },
];

export default function App() {
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [regionKey, setRegionKey] = useState('chennai');
  const [regionLabel, setRegionLabel] = useState('Chennai');
  const [regionInput, setRegionInput] = useState('chennai');
  const [locationStatus, setLocationStatus] = useState('unknown');

  // All Indian states (abbreviated for brevity, add more as needed)
  const INDIAN_STATES = [
    { label: 'Andhra Pradesh', value: 'andhra pradesh', latitude: 15.9129, longitude: 79.74 },
    { label: 'Arunachal Pradesh', value: 'arunachal pradesh', latitude: 28.218, longitude: 94.7278 },
    { label: 'Assam', value: 'assam', latitude: 26.2006, longitude: 92.9376 },
    { label: 'Bihar', value: 'bihar', latitude: 25.0961, longitude: 85.3131 },
    { label: 'Chhattisgarh', value: 'chhattisgarh', latitude: 21.2787, longitude: 81.8661 },
    { label: 'Goa', value: 'goa', latitude: 15.2993, longitude: 74.124 },
    { label: 'Gujarat', value: 'gujarat', latitude: 22.2587, longitude: 71.1924 },
    { label: 'Haryana', value: 'haryana', latitude: 29.0588, longitude: 76.0856 },
    { label: 'Himachal Pradesh', value: 'himachal pradesh', latitude: 31.1048, longitude: 77.1734 },
    { label: 'Jharkhand', value: 'jharkhand', latitude: 23.6102, longitude: 85.2799 },
    { label: 'Karnataka', value: 'karnataka', latitude: 15.3173, longitude: 75.7139 },
    { label: 'Kerala', value: 'kerala', latitude: 10.8505, longitude: 76.2711 },
    { label: 'Madhya Pradesh', value: 'madhya pradesh', latitude: 22.9734, longitude: 78.6569 },
    { label: 'Maharashtra', value: 'maharashtra', latitude: 19.7515, longitude: 75.7139 },
    { label: 'Manipur', value: 'manipur', latitude: 24.6637, longitude: 93.9063 },
    { label: 'Meghalaya', value: 'meghalaya', latitude: 25.467, longitude: 91.3662 },
    { label: 'Mizoram', value: 'mizoram', latitude: 23.1645, longitude: 92.9376 },
    { label: 'Nagaland', value: 'nagaland', latitude: 26.1584, longitude: 94.5624 },
    { label: 'Odisha', value: 'odisha', latitude: 20.9517, longitude: 85.0985 },
    { label: 'Punjab', value: 'punjab', latitude: 31.1471, longitude: 75.3412 },
    { label: 'Rajasthan', value: 'rajasthan', latitude: 27.0238, longitude: 74.2179 },
    { label: 'Sikkim', value: 'sikkim', latitude: 27.533, longitude: 88.5122 },
    { label: 'Tamil Nadu', value: 'tamil nadu', latitude: 11.1271, longitude: 78.6569 },
    { label: 'Telangana', value: 'telangana', latitude: 18.1124, longitude: 79.0193 },
    { label: 'Tripura', value: 'tripura', latitude: 23.9408, longitude: 91.9882 },
    { label: 'Uttar Pradesh', value: 'uttar pradesh', latitude: 26.8467, longitude: 80.9462 },
    { label: 'Uttarakhand', value: 'uttarakhand', latitude: 30.0668, longitude: 79.0193 },
    { label: 'West Bengal', value: 'west bengal', latitude: 22.9868, longitude: 87.855 },
    { label: 'Delhi', value: 'delhi', latitude: 28.6139, longitude: 77.209 },
    { label: 'Jammu and Kashmir', value: 'jammu and kashmir', latitude: 33.7782, longitude: 76.5762 },
    { label: 'Ladakh', value: 'ladakh', latitude: 34.1526, longitude: 77.577 },
  ];

  // All countries (abbreviated for brevity, add more as needed)
  const COUNTRIES = [
    { label: 'India', value: 'in', latitude: 20.5937, longitude: 78.9629 },
    { label: 'United States', value: 'us', latitude: 37.0902, longitude: -95.7129 },
    { label: 'United Kingdom', value: 'uk', latitude: 51.509865, longitude: -0.118092 },
    { label: 'Australia', value: 'au', latitude: -25.2744, longitude: 133.7751 },
    { label: 'Singapore', value: 'sg', latitude: 1.3521, longitude: 103.8198 },
    { label: 'Canada', value: 'ca', latitude: 56.1304, longitude: -106.3468 },
    { label: 'France', value: 'fr', latitude: 46.6034, longitude: 1.8883 },
    { label: 'Germany', value: 'de', latitude: 51.1657, longitude: 10.4515 },
    { label: 'Japan', value: 'jp', latitude: 36.2048, longitude: 138.2529 },
    { label: 'China', value: 'cn', latitude: 35.8617, longitude: 104.1954 },
    { label: 'Brazil', value: 'br', latitude: -14.235, longitude: -51.9253 },
    { label: 'South Africa', value: 'za', latitude: -30.5595, longitude: 22.9375 },
    { label: 'Russia', value: 'ru', latitude: 61.524, longitude: 105.3188 },
    { label: 'Bangladesh', value: 'bd', latitude: 23.685, longitude: 90.3563 },
    { label: 'Pakistan', value: 'pk', latitude: 30.3753, longitude: 69.3451 },
    { label: 'Nepal', value: 'np', latitude: 28.3949, longitude: 84.124 },
    { label: 'Sri Lanka', value: 'lk', latitude: 7.8731, longitude: 80.7718 },
    { label: 'Afghanistan', value: 'af', latitude: 33.9391, longitude: 67.71 },
    { label: 'United Arab Emirates', value: 'ae', latitude: 23.4241, longitude: 53.8478 },
    { label: 'Saudi Arabia', value: 'sa', latitude: 23.8859, longitude: 45.0792 },
    // ...add more countries as needed
  ];

  const POPULAR_REGIONS = [
    ...INDIAN_STATES,
    ...COUNTRIES,
    { label: 'Mumbai', value: 'mumbai', latitude: 19.076, longitude: 72.8777 },
    { label: 'Chennai', value: 'chennai', latitude: 13.0827, longitude: 80.2707 },
    { label: 'New York (NYC)', value: 'nyc', latitude: 40.7128, longitude: -74.006 },
    { label: 'Los Angeles (LA)', value: 'la', latitude: 34.0522, longitude: -118.2437 },
    { label: 'Sydney', value: 'sydney', latitude: -33.8688, longitude: 151.2093 },
    { label: 'Melbourne', value: 'melbourne', latitude: -37.8136, longitude: 144.9631 },
    { label: 'London', value: 'london', latitude: 51.5074, longitude: -0.1278 },
    { label: 'Toronto', value: 'toronto', latitude: 43.6532, longitude: -79.3832 },
    { label: 'Bangkok', value: 'bangkok', latitude: 13.7563, longitude: 100.5018 },
  ];

  const REGION_OPTIONS = POPULAR_REGIONS;

  // Coordinates for each region (add more as needed)
  // Build REGION_COORDS from REGION_OPTIONS
  const REGION_COORDS = REGION_OPTIONS.reduce((acc, region) => {
    if (region.latitude && region.longitude) {
      acc[region.value] = { latitude: region.latitude, longitude: region.longitude };
    }
    return acc;
  }, {});

  const REGION_CODE_MAP = {
    india: 'in',
    usa: 'us',
    "united states": 'us',
    uk: 'uk',
    "united kingdom": 'uk',
    australia: 'au',
    singapore: 'sg',
    "tamil nadu": 'tamil nadu',
    mumbai: 'mumbai',
    delhi: 'delhi',
    nyc: 'us',
    "new york": 'us',
    la: 'us',
    "los angeles": 'us',
    london: 'uk',
    sydney: 'au',
    melbourne: 'au',
    tokyo: 'jp',
    paris: 'fr',
  };
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState(null);
  const [regionDropdownVisible, setRegionDropdownVisible] = useState(false);
  const [gpsRegion, setGpsRegion] = useState(null);
  const pendingSuggestionRef = useRef(null);

  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [genderInput, setGenderInput] = useState('');

  const [symptomsModalVisible, setSymptomsModalVisible] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState({});

  // Remove static lat/lon


  const determineRegion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
      );

      // Try to match city, region, or country to REGION_OPTIONS
      const rawRegion = (address.city || address.region || address.country)?.toString().toLowerCase();
      let found = REGION_OPTIONS.find(opt => opt.label.toLowerCase() === rawRegion || opt.value === rawRegion);
      if (!found) {
        // Try mapping
        const mapped = REGION_CODE_MAP[rawRegion] || rawRegion;
        found = REGION_OPTIONS.find(opt => opt.value === mapped);
      }
      if (found) {
        setGpsRegion(found.value);
        setRegionKey(found.value);
        setRegionLabel(found.label);
        setRegionInput(found.label);
        setLocationStatus('granted');
      } else {
        setGpsRegion(rawRegion);
        setRegionKey(rawRegion);
        setRegionLabel(rawRegion.charAt(0).toUpperCase() + rawRegion.slice(1));
        setRegionInput(rawRegion.charAt(0).toUpperCase() + rawRegion.slice(1));
        setLocationStatus('granted');
      }
    } catch (error) {
      console.warn('Location detection failed:', error);
      setLocationStatus('error');
    }
  };

  // Detect user region via location, then fetch forecast and outbreak alerts.
  useEffect(() => {
    determineRegion();
  }, []);

  // Load stored user profile and symptom choices
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userProfile');
        const storedSymptoms = await AsyncStorage.getItem('userSymptoms');

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setShowLogin(true);
        }

        if (storedSymptoms) {
          setSelectedSymptoms(JSON.parse(storedSymptoms));
        }
      } catch (error) {
        console.warn('Failed to load stored profile/symptoms.', error);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = async (profile) => {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      setUser(profile);
      setShowLogin(false);
    } catch (error) {
      console.warn('Failed to save user profile.', error);
    }
  };

  const saveSymptoms = async (symptoms) => {
    try {
      await AsyncStorage.setItem('userSymptoms', JSON.stringify(symptoms));
      setSelectedSymptoms(symptoms);
    } catch (error) {
      console.warn('Failed to save symptoms.', error);
    }
  };

  useEffect(() => {
    const effectiveRegion = gpsRegion || regionKey;
    const effectiveLabel = REGION_OPTIONS.find(opt => opt.value === effectiveRegion)?.label || regionLabel;
    const coords = REGION_COORDS[effectiveRegion] || REGION_COORDS['in'];

    const fetchForecast = async () => {
      try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            daily: 'temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max',
            hourly: 'relativehumidity_2m',
            timezone: 'Asia/Kolkata',
          },
        });
        setForecastData(response.data);
      } catch (error) {
        console.error('Error fetching forecast:', error);
      }
    };

    const fetchOutbreaks = async () => {
      try {
        const backendUrl = `${OUTBREAK_API_URL}/api/outbreaks?region=${encodeURIComponent(effectiveRegion)}`;
        const response = await fetch(backendUrl);
        if (response.ok) {
          const { outbreaks: list } = await response.json();
          setOutbreaks(list);
          return;
        }
      } catch {}
      try {
        const list = await getOutbreaks(effectiveRegion);
        setOutbreaks(list);
      } catch (error) {
        console.warn('Failed to load outbreak data.', error);
      }
    };

    fetchForecast();
    fetchOutbreaks();
    setRegionLabel(effectiveLabel);
  }, [regionKey, gpsRegion]);

  const onDayPress = async (day) => {
    try {
      setSelectedDate(day.dateString);
      setModalVisible(true);
      setLoading(true);

      if (forecastData) {
        const index = forecastData.daily.time.findIndex(date => date === day.dateString);
        if (index !== -1) {
          const tempMax = forecastData.daily.temperature_2m_max[index];
          const tempMin = forecastData.daily.temperature_2m_min[index];
          const weatherCode = forecastData.daily.weathercode[index];
          const windSpeed = forecastData.daily.windspeed_10m_max?.[index] ?? 0;

          const hourlyTimes = forecastData.hourly.time || [];
          const hourlyHumidity = forecastData.hourly.relativehumidity_2m || [];
          const dayHumidityValues = hourlyTimes
            .map((t, i) => ({ t, h: hourlyHumidity[i] }))
            .filter(({ t }) => t.startsWith(day.dateString))
            .map(({ h }) => h)
            .filter((h) => h != null);

          const humidity =
            dayHumidityValues.length > 0
              ? dayHumidityValues.reduce((a, b) => a + b, 0) / dayHumidityValues.length
              : null;

          setWeatherData({
            description: weatherCodeToDescription(weatherCode),
            tempMax,
            tempMin,
            humidity,
            windSpeed,
          });

          const diseaseList = await predictDisease({
            tempMax,
            tempMin,
            weatherCode,
            humidity,
            windSpeed,
            age: user?.age,
            gender: user?.gender,
            symptoms: selectedSymptoms,
          });

          setPredictions(diseaseList);
        } else {
          setWeatherData({
            description: 'No forecast available',
            tempMax: null,
            tempMin: null,
            humidity: null,
          });
          setPredictions([]);
        }
      }
    } catch (err) {
      console.warn('onDayPress error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeRegion = gpsRegion || regionKey;

  const filteredRegionOptions = REGION_OPTIONS.filter((option) => {
    const q = (regionInput || '').trim().toLowerCase();
    if (!q) return false; // Don't show dropdown if no input
    return (
      option.label.toLowerCase().includes(q) ||
      option.value.toLowerCase().includes(q)
    );
  });

  const data = predictions;

  const weatherCodeToDescription = (code) => {
    // Open-Meteo weather codes reference simplified
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'Unknown weather';
  };

  if (showLogin) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Welcome</Text>
        <Text style={styles.subHeader}>Please enter your details to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          value={nameInput}
          onChangeText={setNameInput}
        />
        <TextInput
          style={styles.input}
          placeholder="Age"
          value={ageInput}
          onChangeText={setAgeInput}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Gender (male/female/other)"
          value={genderInput}
          onChangeText={setGenderInput}
        />

        <Pressable
          style={styles.button}
          onPress={() => {
            const profile = {
              name: nameInput.trim() || 'Anonymous',
              age: Number(ageInput) || null,
              gender: (genderInput || '').toLowerCase().trim(),
            };
            saveProfile(profile);
          }}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Disease Prediction Calendar</Text>
      {user ? (
        <Text style={styles.subHeader}>Hello, {user.name} ({user.age || 'N/A'}, {user.gender || 'N/A'})</Text>
      ) : null}
      <Text style={styles.subHeader}>
        Region: {regionLabel || 'unknown'}
        {gpsRegion ? ' (auto-detected)' : ''}
        {locationStatus === 'denied' ? ' (location denied)' : locationStatus === 'error' ? ' (location error)' : ''}
      </Text>
      <View style={styles.regionContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter region (e.g. India, Chennai, UK)"
          value={regionInput}
          onChangeText={(text) => {
            setRegionInput(text);
            setRegionDropdownVisible(text.length > 0);
          }}
          onFocus={() => setRegionDropdownVisible(regionInput.length > 0)}
          onBlur={() => {
            setTimeout(() => {
              // If user tapped a suggestion, apply it and skip text normalization
              if (pendingSuggestionRef.current) {
                const opt = pendingSuggestionRef.current;
                pendingSuggestionRef.current = null;
                setRegionInput(opt.label);
                setRegionKey(opt.value);
                setRegionLabel(opt.label);
                setGpsRegion(null);
                setRegionDropdownVisible(false);
                return;
              }
              setRegionDropdownVisible(false);
              if (regionInput.trim()) {
                let found = REGION_OPTIONS.find(opt => opt.label.toLowerCase() === regionInput.trim().toLowerCase() || opt.value === regionInput.trim().toLowerCase());
                if (!found) {
                  const normalized = REGION_CODE_MAP[regionInput.trim().toLowerCase()] || regionInput.trim().toLowerCase();
                  found = REGION_OPTIONS.find(opt => opt.value === normalized);
                  if (found) {
                    setRegionKey(found.value);
                    setRegionLabel(found.label);
                    setRegionInput(found.label);
                    setGpsRegion(null);
                  } else {
                    setRegionKey(normalized);
                    setRegionLabel(regionInput.trim());
                    setRegionInput(regionInput.trim());
                    setGpsRegion(null);
                  }
                } else {
                  setRegionKey(found.value);
                  setRegionLabel(found.label);
                  setRegionInput(found.label);
                  setGpsRegion(null);
                }
              }
            }, 300);
          }}
          onSubmitEditing={() => {
            if (regionInput.trim()) {
              let found = REGION_OPTIONS.find(opt => opt.label.toLowerCase() === regionInput.trim().toLowerCase() || opt.value === regionInput.trim().toLowerCase());
              if (!found) {
                const normalized = REGION_CODE_MAP[regionInput.trim().toLowerCase()] || regionInput.trim().toLowerCase();
                found = REGION_OPTIONS.find(opt => opt.value === normalized);
                if (found) {
                  setRegionKey(found.value);
                  setRegionLabel(found.label);
                  setRegionInput(found.label); // Always set input to full label
                  setGpsRegion(null);
                } else {
                  setRegionKey(normalized);
                  setRegionLabel(regionInput.trim());
                  setRegionInput(regionInput.trim());
                  setGpsRegion(null);
                }
              } else {
                setRegionKey(found.value);
                setRegionLabel(found.label);
                setRegionInput(found.label); // Always set input to full label
                setGpsRegion(null);
              }
              setRegionDropdownVisible(false);
            }
          }}
        />
        {regionDropdownVisible && filteredRegionOptions.length > 0 && (
          <View style={styles.dropdown}>
            <ScrollView style={{ maxHeight: 200 }}>
              {filteredRegionOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.dropdownItem}
                  onPressIn={() => {
                    pendingSuggestionRef.current = option;
                  }}
                  onPress={() => {
                    pendingSuggestionRef.current = null;
                    setRegionInput(option.label);
                    setRegionKey(option.value);
                    setRegionLabel(option.label);
                    setGpsRegion(null);
                    setRegionDropdownVisible(false);
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={styles.dropdownItemText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <Pressable
        style={[styles.button, { marginBottom: 10 }]}
        onPress={() => determineRegion()}
      >
        <Text style={styles.buttonText}>Use current location</Text>
      </Pressable>

      <Pressable
        style={[styles.button, { marginTop: 16, width: '60%' }]}
        onPress={() => setSymptomsModalVisible(true)}
      >
        <Text style={styles.buttonText}>Select Symptoms</Text>
      </Pressable>


      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#2196F3' },
        }}
        theme={{
          selectedDayBackgroundColor: '#2196F3',
          todayTextColor: '#2196F3',
          arrowColor: '#2196F3',
        }}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <Text style={styles.modalTitle}>Date: {selectedDate}</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#2196F3" />
            ) : (
              <>
                <Text style={styles.modalText}>
                  Weather: {weatherData ? `${weatherData.description}` : 'No data'}
                </Text>
                <Text style={styles.modalText}>
                  Max Temp: {weatherData ? `${weatherData.tempMax}°C` : '-'}
                </Text>
                <Text style={styles.modalText}>
                  Min Temp: {weatherData ? `${weatherData.tempMin}°C` : '-'}
                </Text>
                <Text style={styles.modalText}>
                  Humidity: {weatherData && typeof weatherData.humidity === 'number' ? `${weatherData.humidity.toFixed(0)}%` : '-'}
                </Text>
                <Text style={styles.modalText}>
                  Wind Speed: {weatherData && typeof weatherData.windSpeed === 'number' ? `${weatherData.windSpeed} km/h` : '-'}
                </Text>
                {data && data.length > 0 ? (
                  <View>
                    <Text style={[styles.modalText, { fontWeight: 'bold', marginTop: 10 }]}>Predicted Diseases:</Text>
                    {data.map((disease, index) => (
                      <View key={index} style={{ marginTop: 8, marginLeft: 10 }}>
                        <Text style={[styles.modalText, { fontWeight: 'bold' }]}>• {disease}</Text>
                        <Text style={styles.modalText}>Prevention: {PREVENTION_BY_DISEASE[disease] || 'Stay informed and follow health guidelines.'}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.modalText}>No disease predicted</Text>
                )}

                {outbreaks.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.modalText, { fontWeight: 'bold' }]}>Active Outbreak Alerts</Text>
                    {outbreaks.map((o) => (
                      <View key={o.id} style={{ marginTop: 8 }}>
                        <Text style={[styles.modalText, { fontWeight: 'bold' }]}>{o.name}</Text>
                        {o.notes ? <Text style={styles.modalText}>{o.notes}</Text> : null}
                        <Text style={styles.modalText}>Prevention: {o.prevention}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {outbreaks.source ? (
                  <Text style={[styles.modalText, { marginTop: 12, fontStyle: 'italic' }]}>Data source: {outbreaks.source}</Text>
                ) : null}
              </>
            )}

            <Pressable
              style={styles.button}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={symptomsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSymptomsModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select Symptoms</Text>
          <ScrollView style={{ maxHeight: 280 }}>
            {SYMPTOMS.map((symptom) => (
              <View
                key={symptom.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <Text style={styles.modalText}>{symptom.label}</Text>
                <Switch
                  value={!!selectedSymptoms[symptom.key]}
                  onValueChange={(value) =>
                    setSelectedSymptoms((prev) => ({
                      ...prev,
                      [symptom.key]: value,
                    }))
                  }
                />
              </View>
            ))}
          </ScrollView>
          <Pressable
            style={styles.button}
            onPress={() => {
              saveSymptoms(selectedSymptoms);
              setSymptomsModalVisible(false);
            }}
          >
            <Text style={styles.buttonText}>Save Symptoms</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    fontSize: 20,
    marginBottom: 6,
    fontWeight: 'bold',
    color: '#000000',
  },
  subHeader: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 12,
    color: '#333333',
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  modalView: {
    margin: 30,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    flex: 1,
    alignItems: 'center',
  },
  modalItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  modalItemActive: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  modalItemText: {
    fontSize: 16,
  },
  modalItemTextActive: {
    fontSize: 16,
    color: 'white',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 5,
    padding: 10,
    alignSelf: 'center',
    width: '50%',
  },
  chip: {
    backgroundColor: '#eee',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2196F3',
  },
  chipText: {
    color: '#333',
  },
  chipTextActive: {
    color: 'white',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
  regionContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
});
