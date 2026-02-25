/**
 * Weather Service
 *
 * Provides weather data for storage unit locations using the
 * Open-Meteo API (free, no API key required).
 *
 * Used to give farmers insight into ambient weather conditions
 * around their storage points so they can assess storage risk.
 *
 * APIs used:
 *  - Open-Meteo Geocoding: https://geocoding-api.open-meteo.com
 *  - Open-Meteo Weather:   https://api.open-meteo.com
 */

const axios = require("axios");

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// Cache geocode results to avoid repeated lookups (location → {lat, lng})
const geoCache = new Map();

// Cache weather results briefly (5 minutes) to avoid excessive API calls
const weatherCache = new Map();
const WEATHER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Known Kenyan locations with coordinates (fallback if geocoding fails)
const KENYA_LOCATIONS = {
  nairobi: { lat: -1.2921, lng: 36.8219 },
  mombasa: { lat: -4.0435, lng: 39.6682 },
  kisumu: { lat: -0.0917, lng: 34.7680 },
  nakuru: { lat: -0.3031, lng: 36.0800 },
  eldoret: { lat: 0.5143, lng: 35.2698 },
  thika: { lat: -1.0333, lng: 37.0693 },
  machakos: { lat: -1.5177, lng: 37.2634 },
  nyeri: { lat: -0.4197, lng: 36.9511 },
  meru: { lat: 0.0480, lng: 37.6559 },
  kiambu: { lat: -1.1714, lng: 36.8356 },
  nanyuki: { lat: 0.0055, lng: 37.0722 },
  narok: { lat: -1.0882, lng: 35.8714 },
  embu: { lat: -0.5389, lng: 37.4596 },
  kakamega: { lat: 0.2827, lng: 34.7519 },
  bungoma: { lat: 0.5695, lng: 34.5584 },
  garissa: { lat: -0.4532, lng: 39.6461 },
  kericho: { lat: -0.3692, lng: 35.2863 },
  kitale: { lat: 1.0167, lng: 35.0000 },
  malindi: { lat: -3.2138, lng: 40.1169 },
  lamu: { lat: -2.2717, lng: 40.9020 },
  isiolo: { lat: 0.3546, lng: 37.5822 },
  kajiado: { lat: -1.8500, lng: 36.7833 },
  kilifi: { lat: -3.6305, lng: 39.8499 },
  naivasha: { lat: -0.7172, lng: 36.4310 },
};

/**
 * Geocode a location name to lat/lng coordinates.
 * Tries Open-Meteo geocoding first, falls back to known Kenya locations.
 */
async function geocodeLocation(location) {
  if (!location) return null;

  const cacheKey = location.toLowerCase().trim();

  // Check cache
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  // Check known Kenya locations first (fast, no API call)
  for (const [name, coords] of Object.entries(KENYA_LOCATIONS)) {
    if (cacheKey.includes(name) || name.includes(cacheKey)) {
      geoCache.set(cacheKey, coords);
      return coords;
    }
  }

  // Try Open-Meteo geocoding API
  try {
    const { data } = await axios.get(GEOCODE_URL, {
      params: {
        name: location,
        count: 1,
        language: "en",
        format: "json",
      },
      timeout: 10000,
    });

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const coords = { lat: result.latitude, lng: result.longitude };
      geoCache.set(cacheKey, coords);
      return coords;
    }
  } catch (err) {
    console.warn(`[Weather] Geocoding failed for "${location}":`, err.message);
  }

  // Default to Nairobi if nothing found
  const fallback = KENYA_LOCATIONS.nairobi;
  geoCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Fetch current weather and forecast for coordinates.
 * Returns temperature, humidity, precipitation, wind, and condition.
 */
async function getWeather(lat, lng) {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

  // Check cache
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL) {
    return cached.data;
  }

  try {
    const { data } = await axios.get(WEATHER_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "precipitation",
          "weather_code",
          "wind_speed_10m",
          "wind_direction_10m",
        ].join(","),
        daily: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "weather_code",
        ].join(","),
        timezone: "Africa/Nairobi",
        forecast_days: 7,
      },
      timeout: 10000,
    });

    const current = data.current || {};
    const daily = data.daily || {};

    const weather = {
      current: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        apparentTemperature: current.apparent_temperature,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        condition: weatherCodeToCondition(current.weather_code),
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
      },
      forecast: (daily.time || []).map((date, i) => ({
        date,
        tempMax: daily.temperature_2m_max?.[i],
        tempMin: daily.temperature_2m_min?.[i],
        precipitation: daily.precipitation_sum?.[i],
        weatherCode: daily.weather_code?.[i],
        condition: weatherCodeToCondition(daily.weather_code?.[i]),
      })),
      location: {
        latitude: lat,
        longitude: lng,
      },
      fetchedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { data: weather, fetchedAt: Date.now() });
    return weather;
  } catch (err) {
    console.error(`[Weather] API error for (${lat}, ${lng}):`, err.message);
    return null;
  }
}

/**
 * Get weather for a named location (e.g., "Nakuru", "North Field, Kiambu").
 */
async function getWeatherForLocation(location) {
  const coords = await geocodeLocation(location);
  if (!coords) return null;
  return getWeather(coords.lat, coords.lng);
}

/**
 * Assess storage risk based on weather conditions and commodity requirements.
 */
function assessStorageRisk(weather, commodity) {
  if (!weather || !commodity) return null;

  const risks = [];
  const temp = weather.current.temperature;
  const humidity = weather.current.humidity;

  // Temperature checks
  if (commodity.optimalTempMax && temp > commodity.optimalTempMax) {
    const excess = (temp - commodity.optimalTempMax).toFixed(1);
    risks.push({
      type: "temperature_high",
      severity: excess > 10 ? "critical" : excess > 5 ? "warning" : "info",
      message: `Ambient temperature (${temp}°C) is ${excess}°C above optimal max (${commodity.optimalTempMax}°C)`,
    });
  }
  if (commodity.optimalTempMin && temp < commodity.optimalTempMin) {
    const deficit = (commodity.optimalTempMin - temp).toFixed(1);
    risks.push({
      type: "temperature_low",
      severity: deficit > 10 ? "critical" : deficit > 5 ? "warning" : "info",
      message: `Ambient temperature (${temp}°C) is ${deficit}°C below optimal min (${commodity.optimalTempMin}°C)`,
    });
  }

  // Humidity checks
  if (commodity.optimalHumidityMax && humidity > commodity.optimalHumidityMax) {
    const excess = (humidity - commodity.optimalHumidityMax).toFixed(1);
    risks.push({
      type: "humidity_high",
      severity: excess > 20 ? "critical" : excess > 10 ? "warning" : "info",
      message: `Ambient humidity (${humidity}%) is ${excess}% above optimal max (${commodity.optimalHumidityMax}%). Risk of mold or spoilage.`,
    });
  }
  if (commodity.optimalHumidityMin && humidity < commodity.optimalHumidityMin) {
    const deficit = (commodity.optimalHumidityMin - humidity).toFixed(1);
    risks.push({
      type: "humidity_low",
      severity: deficit > 20 ? "critical" : deficit > 10 ? "warning" : "info",
      message: `Ambient humidity (${humidity}%) is ${deficit}% below optimal min (${commodity.optimalHumidityMin}%)`,
    });
  }

  // Precipitation risk — high rainfall means higher moisture risk
  if (weather.current.precipitation > 5) {
    risks.push({
      type: "precipitation",
      severity: weather.current.precipitation > 20 ? "warning" : "info",
      message: `Active precipitation (${weather.current.precipitation}mm). Ensure storage is properly sealed.`,
    });
  }

  // Check upcoming forecast for risks
  const upcomingRain = (weather.forecast || [])
    .slice(0, 3)
    .filter((d) => d.precipitation > 10);
  if (upcomingRain.length > 0) {
    risks.push({
      type: "forecast_rain",
      severity: "info",
      message: `Heavy rain expected in the next ${upcomingRain.length} day(s). Check storage waterproofing.`,
    });
  }

  const overallRisk =
    risks.some((r) => r.severity === "critical")
      ? "critical"
      : risks.some((r) => r.severity === "warning")
      ? "warning"
      : risks.length > 0
      ? "info"
      : "good";

  return {
    overallRisk,
    risks,
    summary:
      overallRisk === "good"
        ? "Weather conditions are favorable for storage"
        : overallRisk === "critical"
        ? "Weather conditions pose a significant risk to stored commodities"
        : overallRisk === "warning"
        ? "Some weather conditions may affect stored commodities"
        : "Minor weather considerations for storage",
  };
}

/**
 * Convert WMO weather code to human-readable condition.
 */
function weatherCodeToCondition(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return conditions[code] || "Unknown";
}

module.exports = {
  geocodeLocation,
  getWeather,
  getWeatherForLocation,
  assessStorageRisk,
  weatherCodeToCondition,
  KENYA_LOCATIONS,
};
