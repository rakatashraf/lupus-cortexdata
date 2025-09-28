import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Rectangle } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Download, Layers } from 'lucide-react';
import { LatLngBounds, LatLng } from 'leaflet';
import { MapSelectionBounds } from '@/types/urban-indices';
import { n8nService } from '@/services/n8n-service';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onAreaSelect: (bounds: MapSelectionBounds) => void;
  initialLat?: number;
  initialLng?: number;
}

interface MapEventsProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onAreaSelect: (bounds: MapSelectionBounds) => void;
  setSelectedPosition: (pos: LatLng | null) => void;
  isAreaSelectionMode: boolean;
  setSelectionBounds: (bounds: MapSelectionBounds | null) => void;
}

function MapEvents({ 
  onLocationSelect, 
  onAreaSelect, 
  setSelectedPosition, 
  isAreaSelectionMode,
  setSelectionBounds 
}: MapEventsProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);

  const map = useMapEvents({
    click(e) {
      if (!isAreaSelectionMode) {
        setSelectedPosition(e.latlng);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
    mousedown(e) {
      if (isAreaSelectionMode && !isSelecting) {
        setIsSelecting(true);
        setStartPoint(e.latlng);
      }
    },
    mouseup(e) {
      if (isAreaSelectionMode && isSelecting && startPoint) {
        const bounds: MapSelectionBounds = {
          north: Math.max(startPoint.lat, e.latlng.lat),
          south: Math.min(startPoint.lat, e.latlng.lat),
          east: Math.max(startPoint.lng, e.latlng.lng),
          west: Math.min(startPoint.lng, e.latlng.lng)
        };
        
        setSelectionBounds(bounds);
        onAreaSelect(bounds);
        setIsSelecting(false);
        setStartPoint(null);
      }
    }
  });

  return null;
}

export function InteractiveMap({ 
  onLocationSelect, 
  onAreaSelect, 
  initialLat = 23.8103, 
  initialLng = 90.4125 
}: InteractiveMapProps) {
  const [selectedPosition, setSelectedPosition] = useState<LatLng | null>(
    new LatLng(initialLat, initialLng)
  );
  const [searchCoords, setSearchCoords] = useState({ lat: initialLat.toString(), lng: initialLng.toString() });
  const [areaName, setAreaName] = useState('');
  const [isAreaSelectionMode, setIsAreaSelectionMode] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<MapSelectionBounds | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([initialLat, initialLng]);
  const [mapZoom, setMapZoom] = useState(12);

  const searchByCoordinates = () => {
    const lat = parseFloat(searchCoords.lat);
    const lng = parseFloat(searchCoords.lng);

    if (isNaN(lat) || isNaN(lng)) {
      setMessage('Invalid coordinates entered');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setMessage('Coordinates out of valid range');
      return;
    }

    const newPosition = new LatLng(lat, lng);
    setSelectedPosition(newPosition);
    setMapCenter([lat, lng]);
    setMapZoom(14);
    onLocationSelect(lat, lng);
    setMessage(`Location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const searchByArea = async () => {
    if (!areaName.trim()) {
      setMessage('Please enter an area name');
      return;
    }

    setLoading(true);
    try {
      // Use a geocoding service (here using Nominatim as example)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(areaName)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        const newPosition = new LatLng(lat, lng);
        setSelectedPosition(newPosition);
        setMapCenter([lat, lng]);
        setMapZoom(14);
        onLocationSelect(lat, lng);
        setMessage(`Found: ${data[0].display_name}`);
      } else {
        setMessage('Area not found. Try different search terms.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setMessage('Error searching for area. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadData = async () => {
    if (!selectedPosition && !selectionBounds) {
      setMessage('Please select a location or area first');
      return;
    }

    setLoading(true);
    try {
      const data = selectionBounds 
        ? await n8nService.getChartData(
            (selectionBounds.north + selectionBounds.south) / 2,
            (selectionBounds.east + selectionBounds.west) / 2,
            ['all'],
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          )
        : await n8nService.getDashboardData(
            selectedPosition!.lat,
            selectedPosition!.lng
          );
      
      // Create and download JSON file
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `urban-health-data-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setMessage('Data downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      setMessage('Error downloading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Interactive Urban Map
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Search by Coordinates</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Latitude"
                  value={searchCoords.lat}
                  onChange={(e) => setSearchCoords(prev => ({ ...prev, lat: e.target.value }))}
                  className="flex-1"
                />
                <Input
                  placeholder="Longitude"
                  value={searchCoords.lng}
                  onChange={(e) => setSearchCoords(prev => ({ ...prev, lng: e.target.value }))}
                  className="flex-1"
                />
                <Button onClick={searchByCoordinates} size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Search by Area Name</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter city, area, or address..."
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchByArea()}
                  className="flex-1"
                />
                <Button onClick={searchByArea} disabled={loading} size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isAreaSelectionMode ? "default" : "outline"}
              onClick={() => setIsAreaSelectionMode(!isAreaSelectionMode)}
              size="sm"
            >
              <Layers className="h-4 w-4 mr-2" />
              {isAreaSelectionMode ? 'Exit Area Selection' : 'Select Area'}
            </Button>
            
            <Button
              onClick={downloadData}
              disabled={loading || (!selectedPosition && !selectionBounds)}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Data
            </Button>
          </div>

          {/* Status Message */}
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Selection Info */}
          {selectedPosition && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Selected: {selectedPosition.lat.toFixed(4)}, {selectedPosition.lng.toFixed(4)}
              </Badge>
            </div>
          )}

          {selectionBounds && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Area: {selectionBounds.north.toFixed(4)}°N, {selectionBounds.south.toFixed(4)}°S, 
                {selectionBounds.east.toFixed(4)}°E, {selectionBounds.west.toFixed(4)}°W
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card className="bg-gradient-card shadow-card overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[600px] w-full">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              className="rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapEvents
                onLocationSelect={onLocationSelect}
                onAreaSelect={onAreaSelect}
                setSelectedPosition={setSelectedPosition}
                isAreaSelectionMode={isAreaSelectionMode}
                setSelectionBounds={setSelectionBounds}
              />

              {selectedPosition && (
                <Marker position={selectedPosition}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-medium">Selected Location</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPosition.lat.toFixed(4)}, {selectedPosition.lng.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {selectionBounds && (
                <Rectangle
                  bounds={[
                    [selectionBounds.south, selectionBounds.west],
                    [selectionBounds.north, selectionBounds.east]
                  ]}
                  color="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {isAreaSelectionMode && (
        <Alert>
          <Layers className="h-4 w-4" />
          <AlertDescription>
            Area selection mode is active. Click and drag on the map to select an area for data analysis.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}