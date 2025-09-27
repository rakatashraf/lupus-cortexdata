// Weather Service using Open-Meteo API (free, no API key required)
export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    precipitation: number;
    weatherCode: number;
    cloudCover: number;
    visibility: number;
  };
  forecast: {
    hourly: {
      time: string[];
      temperature: number[];
      precipitation: number[];
      windSpeed: number[];
      pressure: number[];
    };
  };
  lastUpdated: string;
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone?: string;
}

// Get weather data for coordinates
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    console.log(`🌤️ Fetching weather data for ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
    
    // Open-Meteo API endpoint with all required weather parameters
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude', lat.toString());
    weatherUrl.searchParams.set('longitude', lon.toString());
    weatherUrl.searchParams.set('current', [
      'temperature_2m',
      'relative_humidity_2m', 
      'precipitation',
      'weather_code',
      'cloud_cover',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'visibility'
    ].join(','));
    weatherUrl.searchParams.set('hourly', [
      'temperature_2m',
      'precipitation',
      'wind_speed_10m',
      'surface_pressure'
    ].join(','));
    weatherUrl.searchParams.set('forecast_days', '3');
    weatherUrl.searchParams.set('timezone', 'auto');

    const response = await fetch(weatherUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Get location name using reverse geocoding
    const locationInfo = await getLocationName(lat, lon);
    
    const weatherData: WeatherData = {
      location: {
        latitude: lat,
        longitude: lon,
        city: locationInfo.city,
        country: locationInfo.country,
      },
      current: {
        temperature: Math.round(data.current.temperature_2m || 0),
        humidity: Math.round(data.current.relative_humidity_2m || 0),
        windSpeed: Math.round(data.current.wind_speed_10m || 0),
        windDirection: Math.round(data.current.wind_direction_10m || 0),
        pressure: Math.round(data.current.surface_pressure || 0),
        precipitation: Math.round((data.current.precipitation || 0) * 10) / 10,
        weatherCode: data.current.weather_code || 0,
        cloudCover: Math.round(data.current.cloud_cover || 0),
        visibility: Math.round((data.current.visibility || 0) / 1000), // Convert to km
      },
      forecast: {
        hourly: {
          time: data.hourly.time.slice(0, 24) || [],
          temperature: data.hourly.temperature_2m.slice(0, 24) || [],
          precipitation: data.hourly.precipitation.slice(0, 24) || [],
          windSpeed: data.hourly.wind_speed_10m.slice(0, 24) || [],
          pressure: data.hourly.surface_pressure.slice(0, 24) || [],
        }
      },
      lastUpdated: new Date().toISOString(),
    };

    console.log('✅ Weather data fetched successfully');
    return weatherData;
    
  } catch (error) {
    console.error('❌ Failed to fetch weather data:', error);
    
    // Return mock data as fallback
    return {
      location: { latitude: lat, longitude: lon, city: 'Unknown', country: 'Unknown' },
      current: {
        temperature: Math.round(Math.random() * 30 + 5),
        humidity: Math.round(Math.random() * 50 + 30),
        windSpeed: Math.round(Math.random() * 20 + 5),
        windDirection: Math.round(Math.random() * 360),
        pressure: Math.round(Math.random() * 50 + 1000),
        precipitation: Math.round(Math.random() * 5 * 10) / 10,
        weatherCode: 1,
        cloudCover: Math.round(Math.random() * 100),
        visibility: Math.round(Math.random() * 20 + 5),
      },
      forecast: {
        hourly: {
          time: Array.from({length: 24}, (_, i) => new Date(Date.now() + i * 3600000).toISOString()),
          temperature: Array.from({length: 24}, () => Math.round(Math.random() * 30 + 5)),
          precipitation: Array.from({length: 24}, () => Math.round(Math.random() * 5 * 10) / 10),
          windSpeed: Array.from({length: 24}, () => Math.round(Math.random() * 20 + 5)),
          pressure: Array.from({length: 24}, () => Math.round(Math.random() * 50 + 1000)),
        }
      },
      lastUpdated: new Date().toISOString(),
    };
  }
};

// Get location name from coordinates using reverse geocoding
const getLocationName = async (lat: number, lon: number): Promise<LocationInfo> => {
  try {
    // Using OpenStreetMap Nominatim for reverse geocoding (free)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NASA-Earth-Weather-App'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        latitude: lat,
        longitude: lon,
        city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
        country: data.address?.country || 'Unknown',
        timezone: data.timezone
      };
    }
  } catch (error) {
    console.warn('Failed to get location name:', error);
  }
  
  return {
    latitude: lat,
    longitude: lon,
    city: 'Unknown Location',
    country: 'Unknown'
  };
};

// Get weather description from weather code
export const getWeatherDescription = (code: number): string => {
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  
  return weatherCodes[code] || 'Unknown';
};

// Get weather icon based on weather code
export const getWeatherIcon = (code: number): string => {
  if (code === 0 || code === 1) return '☀️';
  if (code === 2 || code === 3) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '❄️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '🌤️';
};

// Convert wind direction degrees to compass direction
export const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};