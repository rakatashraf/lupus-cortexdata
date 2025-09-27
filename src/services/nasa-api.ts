// NASA API Service
const NASA_API_KEY = 'GXcqYeyqgnHgWfdabi6RYhLPhdY1uIyiPsB922ZV';
const NASA_BASE_URL = 'https://api.nasa.gov';

export interface NASAImageData {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
}

export interface EarthImageryData {
  date: string;
  id: string;
  url: string;
}

export interface SatelliteData {
  name: string;
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
  daynum: number;
  solar_lat: number;
  solar_lon: number;
  units: string;
}

// Fetch NASA Astronomy Picture of the Day
export const fetchAPOD = async (date?: string): Promise<NASAImageData> => {
  const url = new URL(`${NASA_BASE_URL}/planetary/apod`);
  url.searchParams.append('api_key', NASA_API_KEY);
  if (date) {
    url.searchParams.append('date', date);
  }
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NASA APOD API error: ${response.statusText}`);
  }
  
  return response.json();
};

// Fetch Earth imagery from NASA
export const fetchEarthImagery = async (
  lat: number, 
  lon: number, 
  date?: string,
  dim: number = 0.5
): Promise<string> => {
  const url = new URL(`${NASA_BASE_URL}/planetary/earth/imagery`);
  url.searchParams.append('lat', lat.toString());
  url.searchParams.append('lon', lon.toString());
  url.searchParams.append('dim', dim.toString());
  url.searchParams.append('api_key', NASA_API_KEY);
  
  if (date) {
    url.searchParams.append('date', date);
  }
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NASA Earth Imagery API error: ${response.statusText}`);
  }
  
  // Return the image URL directly
  return url.toString();
};

// Fetch available Earth imagery dates
export const fetchEarthAssets = async (
  lat: number,
  lon: number,
  begin?: string,
  end?: string
): Promise<any> => {
  const url = new URL(`${NASA_BASE_URL}/planetary/earth/assets`);
  url.searchParams.append('lat', lat.toString());
  url.searchParams.append('lon', lon.toString());
  url.searchParams.append('api_key', NASA_API_KEY);
  
  if (begin) url.searchParams.append('begin', begin);
  if (end) url.searchParams.append('end', end);
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NASA Earth Assets API error: ${response.statusText}`);
  }
  
  return response.json();
};

// Fetch satellite position data (mock implementation)
export const fetchSatellitePosition = async (satelliteId: string): Promise<SatelliteData | null> => {
  try {
    // Note: NASA doesn't provide real-time satellite tracking via their main API
    // This would typically use NORAD TLE data or other tracking services
    // For now, we'll return null and handle with fallback data
    return null;
  } catch (error) {
    console.error('Error fetching satellite data:', error);
    return null;
  }
};

// Get NASA GIBS layer URL
export const getNASAGIBSLayerURL = (
  layer: string,
  date: string,
  bbox: string = '-180,-90,180,90',
  width: number = 2048,
  height: number = 1024
): string => {
  const baseUrl = 'https://worldview.earthdata.nasa.gov/api/v1/snapshot';
  const params = new URLSearchParams({
    REQUEST: 'GetSnapshot',
    TIME: date,
    BBOX: bbox,
    CRS: 'EPSG:4326',
    LAYERS: layer,
    WRAP: 'day',
    FORMAT: 'image/jpeg',
    WIDTH: width.toString(),
    HEIGHT: height.toString(),
    api_key: NASA_API_KEY
  });
  
  return `${baseUrl}?${params.toString()}`;
};

// Helper function to format date for NASA APIs
export const formatDateForNASA = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get current Earth imagery with fallbacks
export const getCurrentEarthImagery = async (layer: string): Promise<string> => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const dates = [
    formatDateForNASA(yesterday),
    formatDateForNASA(new Date(yesterday.getTime() - 24 * 60 * 60 * 1000)),
    formatDateForNASA(new Date(yesterday.getTime() - 48 * 60 * 60 * 1000))
  ];
  
  // Try multiple dates to find available imagery
  for (const date of dates) {
    try {
      const url = getNASAGIBSLayerURL(layer, date);
      
      // Test if the image is available
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }
    } catch (error) {
      console.warn(`Failed to fetch imagery for date ${date}:`, error);
    }
  }
  
  // Fallback to static NASA imagery
  return 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg';
};