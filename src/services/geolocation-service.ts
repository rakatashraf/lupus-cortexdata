// Enhanced Geolocation Service for Perfect Location Search

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  country?: string;
  displayName?: string;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

// Get current user location with high accuracy
export const getCurrentLocation = async (options: GeolocationOptions = {}): Promise<LocationResult> => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        try {
          // Get address information for the coordinates
          const addressInfo = await reverseGeocode(latitude, longitude);
          
          resolve({
            latitude,
            longitude,
            accuracy,
            ...addressInfo
          });
        } catch (error) {
          // Return coordinates even if reverse geocoding fails
          resolve({
            latitude,
            longitude,
            accuracy
          });
        }
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      defaultOptions
    );
  });
};

// Search for locations by name using geocoding
export const searchLocationByName = async (locationName: string): Promise<LocationResult[]> => {
  if (!locationName.trim()) {
    throw new Error('Location name cannot be empty');
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=5&addressdetails=1&bounded=0`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LupusCortex-UrbanIntelligence/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.map((item: any) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      displayName: item.display_name,
      city: item.address?.city || item.address?.town || item.address?.village,
      country: item.address?.country,
      address: item.display_name
    }));
  } catch (error) {
    console.error('Location search failed:', error);
    throw new Error('Failed to search for location');
  }
};

// Reverse geocode coordinates to get address information
export const reverseGeocode = async (latitude: number, longitude: number): Promise<Partial<LocationResult>> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LupusCortex-UrbanIntelligence/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      displayName: data.display_name,
      city: data.address?.city || data.address?.town || data.address?.village,
      country: data.address?.country,
      address: data.display_name
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    throw new Error('Failed to get address information');
  }
};

// Parse coordinate strings (lat, lng) or (lat lng) formats
export const parseCoordinates = (input: string): { latitude: number; longitude: number } | null => {
  const cleanInput = input.trim();
  
  // Try various coordinate formats
  const patterns = [
    /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/,           // "lat, lng" or "lat lng"
    /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,          // "lat,lng" with optional spaces
    /^(\d+\.?\d*)\s*[°]?\s*([NS]),?\s*(\d+\.?\d*)\s*[°]?\s*([EW])$/i // "25.123°N, 90.456°E"
  ];

  for (const pattern of patterns) {
    const match = cleanInput.match(pattern);
    if (match) {
      if (match.length === 3) {
        // Simple lat, lng format
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        
        if (isValidCoordinate(lat, lng)) {
          return { latitude: lat, longitude: lng };
        }
      } else if (match.length === 5) {
        // Degree format with N/S, E/W
        let lat = parseFloat(match[1]);
        let lng = parseFloat(match[3]);
        
        if (match[2].toLowerCase() === 's') lat = -lat;
        if (match[4].toLowerCase() === 'w') lng = -lng;
        
        if (isValidCoordinate(lat, lng)) {
          return { latitude: lat, longitude: lng };
        }
      }
    }
  }
  
  return null;
};

// Validate coordinate values
const isValidCoordinate = (lat: number, lng: number): boolean => {
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
};

// Get distance between two coordinates (in kilometers)
export const getDistance = (
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate bounding box for an area name search result
export const calculateBoundingBox = (
  centerLat: number,
  centerLng: number,
  radiusKm: number = 1
): { north: number; south: number; east: number; west: number } => {
  // Approximate degrees per kilometer
  const latDegreesPerKm = 1 / 111;
  const lngDegreesPerKm = 1 / (111 * Math.cos(centerLat * Math.PI / 180));
  
  const latOffset = radiusKm * latDegreesPerKm;
  const lngOffset = radiusKm * lngDegreesPerKm;
  
  return {
    north: centerLat + latOffset,
    south: centerLat - latOffset,
    east: centerLng + lngOffset,
    west: centerLng - lngOffset
  };
};

// Calculate area size in square kilometers from bounding box
export const calculateAreaSize = (bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): number => {
  const latDiff = bounds.north - bounds.south;
  const lngDiff = bounds.east - bounds.west;
  const centerLat = (bounds.north + bounds.south) / 2;
  
  // Convert to kilometers
  const heightKm = latDiff * 111;
  const widthKm = lngDiff * 111 * Math.cos(centerLat * Math.PI / 180);
  
  return heightKm * widthKm;
};