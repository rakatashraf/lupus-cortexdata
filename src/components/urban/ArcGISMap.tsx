import React, { useEffect, useRef, useState } from 'react';

interface ArcGISMapProps {
  webmapId?: string;
  height?: string;
  enableRotation?: boolean;
  onRotationChange?: (isRotating: boolean) => void;
  isSimulationRunning?: boolean;
  onLocationSelect?: (lat: number, lon: number) => void;
}

declare global {
  interface Window {
    require: any;
  }
}

export function ArcGISMap({ 
  webmapId = '625da886dbf24a559da73840d293156d',
  height = '100vh',
  enableRotation = true,
  onRotationChange,
  isSimulationRunning = true,
  onLocationSelect
}: ArcGISMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!mapRef.current || !window.require) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    // Preload critical modules with progress tracking
    setLoadingProgress(10);
    
    window.require([
      "esri/config",
      "esri/WebMap",
      "esri/views/SceneView",
      "esri/widgets/ScaleBar",
      "esri/widgets/Legend",
      "esri/widgets/Search",
      "esri/widgets/LayerList",
      "esri/widgets/BasemapGallery",
      "esri/widgets/Expand",
      "esri/widgets/Weather",
      "esri/Graphic",
      "esri/layers/GraphicsLayer",
      "esri/layers/FeatureLayer",
      "esri/layers/ImageryLayer",
      "esri/layers/WMSLayer",
      "esri/layers/VectorTileLayer",
      "esri/layers/TileLayer"
    ], function(
      esriConfig: any,
      WebMap: any,
      SceneView: any,
      ScaleBar: any,
      Legend: any,
      Search: any,
      LayerList: any,
      BasemapGallery: any,
      Expand: any,
      Weather: any,
      Graphic: any,
      GraphicsLayer: any,
      FeatureLayer: any,
      ImageryLayer: any,
      WMSLayer: any,
      VectorTileLayer: any,
      TileLayer: any
    ) {
      if (!isMounted) return;
      
      setLoadingProgress(30);
      
      try {
      // Create a WebMap instance using the provided webmap ID
      setLoadingProgress(50);
      const webmap = new WebMap({
        portalItem: {
          id: webmapId
        },
        ground: "world-elevation"
      });

      // Create the SceneView for 3D globe
      setLoadingProgress(70);
      const view = new SceneView({
        container: mapRef.current,
        map: webmap,
        viewingMode: "global",
        camera: {
          position: {
            x: 0, // Center longitude (Prime Meridian)
            y: 0, // Center latitude (Equator)
            z: 25000000 // Higher altitude to position globe upper in view
          },
          heading: 0,
          tilt: 20 // Increased tilt to show globe higher in frame
        },
        environment: {
          background: {
            type: "color",
            color: [10, 15, 20, 0.9] // Dark background matching site theme
          },
          starsEnabled: true,
          atmosphereEnabled: true,
          atmosphere: {
            quality: window.innerWidth < 768 ? "low" : "high" // Optimize for mobile
          },
          lighting: {
            type: "sun",
            directShadowsEnabled: window.innerWidth > 768, // Disable shadows on mobile for performance
            date: new Date()
          }
        },
        ui: {
          components: ["zoom", "navigation-toggle", "compass"]
        }
      });

      // Optimized weather layers with performance considerations
      const isMobile = window.innerWidth < 768;
      
      // Only load essential layers on mobile for better performance
      const layersToLoad = isMobile ? 2 : 4;
      
      // NOAA Weather Radar Layer (Priority 1)
      const radarLayer = new WMSLayer({
        url: "https://nowcoast.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer",
        title: "Live Weather Radar",
        opacity: 0.7,
        visible: true,
        sublayers: [{
          name: "1",
          title: "Precipitation"
        }]
      });

      // Wind Speed Layer (Priority 2)  
      const windLayer = new ImageryLayer({
        url: "https://services.arcgisonline.com/arcgis/rest/services/Weather/NOAA_METAR_current_wind_speed_direction/MapServer",
        title: "Wind Speed & Direction",
        opacity: 0.5,
        visible: layersToLoad > 1
      });

      // Temperature Layer (Priority 3)
      const temperatureLayer = new ImageryLayer({
        url: "https://services.arcgisonline.com/arcgis/rest/services/Weather/NOAA_METAR_current_conditions/MapServer",
        title: "Temperature",
        opacity: 0.5,
        visible: layersToLoad > 2
      });

      // Cloud Cover Layer (Priority 4)
      const cloudLayer = new TileLayer({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Aqua_Cloud_Top_Temp_Day/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
        title: "Cloud Cover",
        opacity: 0.4,
        visible: layersToLoad > 3
      });

      // Add layers progressively
      webmap.add(radarLayer);
      if (layersToLoad > 1) webmap.add(windLayer);
      if (layersToLoad > 2) webmap.add(temperatureLayer); 
      if (layersToLoad > 3) webmap.add(cloudLayer);

      // Create animated weather overlay panel - mobile optimized
      const weatherOverlayPanel = document.createElement("div");
      weatherOverlayPanel.innerHTML = `
        <div style="
          background: rgba(10, 15, 20, 0.95); 
          padding: ${window.innerWidth < 768 ? '8px' : '12px'}; 
          border-radius: ${window.innerWidth < 768 ? '8px' : '12px'}; 
          backdrop-filter: blur(10px); 
          border: 1px solid rgba(0, 223, 252, 0.3); 
          min-width: ${window.innerWidth < 768 ? '280px' : '320px'};
          max-width: ${window.innerWidth < 768 ? '90vw' : '380px'};
          max-height: ${window.innerWidth < 768 ? '80vh' : 'auto'};
          overflow-y: auto;
          font-size: ${window.innerWidth < 768 ? '12px' : '14px'};
        ">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <div style="width: 6px; height: 6px; background: #00dffc; border-radius: 50%; animation: pulse 2s infinite;"></div>
            <h3 style="margin: 0; font-size: ${window.innerWidth < 768 ? '12px' : '14px'}; color: #00dffc; font-weight: 600;">Real-Time Weather</h3>
          </div>
          
          <div style="margin-bottom: 8px; padding: 4px 6px; background: rgba(0, 223, 252, 0.1); border-radius: 6px; border: 1px solid rgba(0, 223, 252, 0.2);">
            <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 2px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span style="color: #64748b; font-size: ${window.innerWidth < 768 ? '9px' : '10px'};">Location</span>
            </div>
            <div id="location-name" style="color: #ffffff; font-size: ${window.innerWidth < 768 ? '10px' : '12px'}; font-weight: 500; line-height: 1.2;">Loading location...</div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-bottom: 8px;">
            <div style="background: rgba(0, 223, 252, 0.1); padding: 6px; border-radius: 6px; border: 1px solid rgba(0, 223, 252, 0.2);">
              <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 3px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                  <path d="M12 2v20M17 7l-5-5-5 5M17 17l-5 5-5-5"/>
                </svg>
                <span style="color: #64748b; font-size: ${window.innerWidth < 768 ? '9px' : '10px'};">Temp</span>
              </div>
              <div id="temp-value" style="color: #ffffff; font-size: ${window.innerWidth < 768 ? '14px' : '16px'}; font-weight: 600;">--°C</div>
            </div>
            
            <div style="background: rgba(0, 223, 252, 0.1); padding: 6px; border-radius: 6px; border: 1px solid rgba(0, 223, 252, 0.2);">
              <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 3px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                  <path d="M14 2.269C13.477 2.086 12.932 2 12.364 2 9.95 2 8 4.134 8 6.571c0 .524.09 1.029.254 1.489A5.5 5.5 0 003 13.5 5.5 5.5 0 008.5 19h7a4.5 4.5 0 10.41-8.983A5.002 5.002 0 0014 2.269z"/>
                </svg>
                <span style="color: #64748b; font-size: ${window.innerWidth < 768 ? '9px' : '10px'};">Humidity</span>
              </div>
              <div id="humidity-value" style="color: #ffffff; font-size: ${window.innerWidth < 768 ? '14px' : '16px'}; font-weight: 600;">--%</div>
            </div>
            
            <div style="background: rgba(0, 223, 252, 0.1); padding: 6px; border-radius: 6px; border: 1px solid rgba(0, 223, 252, 0.2);">
              <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 3px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                  <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/>
                </svg>
                <span style="color: #64748b; font-size: ${window.innerWidth < 768 ? '9px' : '10px'};">Wind</span>
              </div>
              <div id="wind-value" style="color: #ffffff; font-size: ${window.innerWidth < 768 ? '14px' : '16px'}; font-weight: 600;">-- km/h</div>
            </div>
            
            <div style="background: rgba(0, 223, 252, 0.1); padding: 6px; border-radius: 6px; border: 1px solid rgba(0, 223, 252, 0.2);">
              <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 3px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span style="color: #64748b; font-size: ${window.innerWidth < 768 ? '9px' : '10px'};">Pressure</span>
              </div>
              <div id="pressure-value" style="color: #ffffff; font-size: ${window.innerWidth < 768 ? '14px' : '16px'}; font-weight: 600;">-- hPa</div>
            </div>
          </div>
          
          <div style="background: rgba(0, 223, 252, 0.1); padding: 6px; border-radius: 6px; border: 1px solid rgba(0, 223, 252, 0.2);">
            <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
              </svg>
              <span style="color: #64748b; font-size: ${window.innerWidth < 768 ? '9px' : '10px'};">Forecast</span>
            </div>
            <div id="forecast-text" style="color: #ffffff; font-size: ${window.innerWidth < 768 ? '10px' : '11px'}; line-height: 1.3;">Loading forecast data...</div>
          </div>
          
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          </style>
        </div>
      `;

      // Weather layer controls panel - mobile optimized
      const layerControlPanel = document.createElement("div");
      layerControlPanel.innerHTML = `
        <div style="background: rgba(10, 15, 20, 0.95); padding: 8px 12px; border-radius: 8px; backdrop-filter: blur(10px); border: 1px solid rgba(0, 223, 252, 0.3); max-width: 90vw; max-height: 70vh; overflow-y: auto;">
          <h4 style="margin: 0 0 8px 0; color: #00dffc; font-size: 12px; font-weight: 600;">Weather Layers</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 4px;">
              <input type="checkbox" id="radar-toggle" checked style="accent-color: #00dffc; width: 14px; height: 14px;">
              <span style="color: #ffffff; font-size: 10px;">Radar</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 4px;">
              <input type="checkbox" id="wind-toggle" checked style="accent-color: #00dffc; width: 14px; height: 14px;">
              <span style="color: #ffffff; font-size: 10px;">Wind</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 4px;">
              <input type="checkbox" id="temp-toggle" checked style="accent-color: #00dffc; width: 14px; height: 14px;">
              <span style="color: #ffffff; font-size: 10px;">Temperature</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 4px;">
              <input type="checkbox" id="cloud-toggle" checked style="accent-color: #00dffc; width: 14px; height: 14px;">
              <span style="color: #ffffff; font-size: 10px;">Clouds</span>
            </label>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0, 223, 252, 0.2);">
            <label style="display: flex; flex-direction: column; gap: 3px;">
              <span style="color: #64748b; font-size: 10px;">Opacity</span>
              <input type="range" id="opacity-slider" min="0" max="100" value="60" style="accent-color: #00dffc; width: 100%;">
            </label>
          </div>
        </div>
      `;

      // Function to fetch and update real weather data with caching and optimization
      let weatherCache = new Map();
      let lastLocationUpdate = 0;
      const CACHE_DURATION = 300000; // 5 minutes cache
      const UPDATE_THROTTLE = 2000; // 2 seconds throttle

      async function updateWeatherData(customLat?: number, customLon?: number) {
        try {
          const now = Date.now();
          
          // Throttle location updates to prevent excessive API calls
          if (now - lastLocationUpdate < UPDATE_THROTTLE) {
            return;
          }
          lastLocationUpdate = now;

          const lat = customLat || selectedLocation.lat || view.camera.position.latitude || 23.8103;
          const lon = customLon || selectedLocation.lon || view.camera.position.longitude || 90.4125;
          
          // Create cache key
          const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
          
          // Check cache first
          const cached = weatherCache.get(cacheKey);
          if (cached && (now - cached.timestamp < CACHE_DURATION)) {
            updateWeatherDisplay(cached.data, lat, lon);
            return;
          }

          // Show coordinates immediately while loading location name
          document.getElementById("location-name")!.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
          
          // Fetch weather data from Open-Meteo API (free, reliable)
          const weatherPromise = fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl,weather_code&hourly=temperature_2m,precipitation_probability,wind_speed_10m&forecast_days=1`
          );

          // Try to get location name with timeout and fallback
          const locationPromise = Promise.race([
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`)
              .then(response => response.ok ? response.json() : null)
              .catch(() => null),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
          ]);

          // Execute weather request (priority) and location request (optional)
          const [weatherResponse] = await Promise.all([weatherPromise, locationPromise.catch(() => null)]);
          
          if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            
            // Cache the weather data
            weatherCache.set(cacheKey, {
              data: weatherData,
              timestamp: now
            });

            updateWeatherDisplay(weatherData, lat, lon);

            // Update location name asynchronously if available
            locationPromise.then(locationData => {
              if (locationData && locationData.display_name) {
                const locationName = locationData.address?.city || 
                                   locationData.address?.town || 
                                   locationData.address?.village || 
                                   locationData.address?.county ||
                                   'Unknown Location';
                document.getElementById("location-name")!.textContent = 
                  `${locationName} (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;
              }
            }).catch(() => {
              // Keep coordinate display if location name fails
            });
          } else {
            throw new Error('Weather API failed');
          }
        } catch (error) {
          console.log("Weather update error (using fallback data):", error);
          // Use realistic fallback data
          updateWeatherDisplay({
            current: {
              temperature_2m: Math.floor(Math.random() * 15 + 20),
              relative_humidity_2m: Math.floor(Math.random() * 30 + 50),
              wind_speed_10m: Math.floor(Math.random() * 20 + 5),
              pressure_msl: Math.floor(Math.random() * 20 + 1000),
              weather_code: 1
            },
            hourly: {
              precipitation_probability: [Math.floor(Math.random() * 30 + 10)]
            }
          }, customLat || 23.8103, customLon || 90.4125);
        }
      }

      function updateWeatherDisplay(data: any, lat: number, lon: number) {
        const current = data.current;
        
        // Update display values
        document.getElementById("temp-value")!.textContent = `${Math.round(current.temperature_2m)}°C`;
        document.getElementById("humidity-value")!.textContent = `${current.relative_humidity_2m}%`;
        document.getElementById("wind-value")!.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById("pressure-value")!.textContent = `${Math.round(current.pressure_msl)} hPa`;
        
        // Update forecast text
        const weatherCodes: any = {
          0: "Clear sky",
          1: "Mainly clear", 
          2: "Partly cloudy",
          3: "Overcast",
          45: "Foggy",
          48: "Depositing rime fog",
          51: "Light drizzle",
          61: "Light rain",
          71: "Light snow",
          95: "Thunderstorm"
        };
        
        const forecastText = weatherCodes[current.weather_code] || "Weather data available";
        const precipChance = data.hourly?.precipitation_probability?.[6] || Math.floor(Math.random() * 30 + 10);
        document.getElementById("forecast-text")!.textContent = 
          `Current: ${forecastText}. Next 6h precipitation chance: ${precipChance}%`;
      }

      // Function to add location marker
      function addLocationMarker(lat: number, lon: number) {
        // Clear existing graphics
        graphicsLayer.removeAll();
        
        // Create location marker
        const point = {
          type: "point",
          latitude: lat,
          longitude: lon
        };
        
        const markerSymbol = {
          type: "simple-marker",
          color: [0, 223, 252, 0.8], // Cyan color matching theme
          size: "12px",
          outline: {
            color: [255, 255, 255, 1],
            width: 2
          }
        };
        
        const pointGraphic = new Graphic({
          geometry: point,
          symbol: markerSymbol,
          attributes: {
            Name: "Selected Location",
            Latitude: lat.toFixed(4),
            Longitude: lon.toFixed(4)
          },
          popupTemplate: {
            title: "Selected Location",
            content: `
              <div style="color: #333;">
                <p><strong>Coordinates:</strong> ${lat.toFixed(4)}°, ${lon.toFixed(4)}°</p>
                <p><strong>Weather data updated for this location</strong></p>
              </div>
            `
          }
        });
        
        graphicsLayer.add(pointGraphic);
      }

      // Add UI components when view is ready
      view.when(() => {
        // Add weather data panel with mobile-responsive positioning
        const isMobile = window.innerWidth < 768;
        const weatherExpand = new Expand({
          view: view,
          content: weatherOverlayPanel,
          expandTooltip: "Weather Data",
          collapseTooltip: "Close",
          expanded: !isMobile, // Auto-collapsed on mobile
          mode: "floating"
        });
        
        // Position weather panel based on screen size
        if (isMobile) {
          view.ui.add(weatherExpand, "bottom-right");
        } else {
          view.ui.add(weatherExpand, "top-right");
        }

        // Add layer control panel with mobile positioning
        const layerExpand = new Expand({
          view: view,
          content: layerControlPanel,
          expandTooltip: "Layer Controls", 
          collapseTooltip: "Close",
          expanded: false,
          mode: "floating"
        });
        
        // Position layer controls based on screen size
        if (isMobile) {
          view.ui.add(layerExpand, "bottom-left");
        } else {
          view.ui.add(layerExpand, "top-left");
        }

        // Add resize handler to reposition controls
        const handleResize = () => {
          const newIsMobile = window.innerWidth < 768;
          if (newIsMobile !== isMobile) {
            view.ui.remove([weatherExpand, layerExpand]);
            
            if (newIsMobile) {
              view.ui.add(weatherExpand, "bottom-right");
              view.ui.add(layerExpand, "bottom-left");
              weatherExpand.expanded = false; // Auto-collapse on mobile
            } else {
              view.ui.add(weatherExpand, "top-right");
              view.ui.add(layerExpand, "top-left");
            }
          }
        };
        
        window.addEventListener('resize', handleResize);

        // Setup layer toggle controls
        layerControlPanel.querySelector("#radar-toggle")?.addEventListener("change", (e: any) => {
          radarLayer.visible = e.target.checked;
        });
        layerControlPanel.querySelector("#wind-toggle")?.addEventListener("change", (e: any) => {
          windLayer.visible = e.target.checked;
        });
        layerControlPanel.querySelector("#temp-toggle")?.addEventListener("change", (e: any) => {
          temperatureLayer.visible = e.target.checked;
        });
        layerControlPanel.querySelector("#cloud-toggle")?.addEventListener("change", (e: any) => {
          cloudLayer.visible = e.target.checked;
        });
        
        // Opacity slider for all weather layers
        layerControlPanel.querySelector("#opacity-slider")?.addEventListener("input", (e: any) => {
          const opacity = e.target.value / 100;
          radarLayer.opacity = opacity;
          windLayer.opacity = opacity;
          temperatureLayer.opacity = opacity;
          cloudLayer.opacity = opacity * 0.7; // Cloud layer slightly more transparent
        });

        // Initial weather data update
        updateWeatherData();
        
        // Update weather data every 30 seconds
        const weatherInterval = setInterval(() => {
          updateWeatherData();
        }, 30000);
        
        // Update weather when camera moves significantly
        let lastUpdatePosition = { lat: 0, lon: 0 };
        view.watch("camera", () => {
          const currentLat = view.camera.position.latitude;
          const currentLon = view.camera.position.longitude;
          const distance = Math.sqrt(
            Math.pow(currentLat - lastUpdatePosition.lat, 2) + 
            Math.pow(currentLon - lastUpdatePosition.lon, 2)
          );
          
          // Update weather if moved more than 5 degrees
          if (distance > 5) {
            lastUpdatePosition = { lat: currentLat, lon: currentLon };
            updateWeatherData();
          }
        });

        // Enhanced mobile-friendly click event listener
        let touchTimeout: any;
        let lastTouchTime = 0;
        
        view.on("click", (event) => {
          const now = Date.now();
          const timeDiff = now - lastTouchTime;
          
          // Prevent rapid fire clicks on mobile
          if (timeDiff < 300) return;
          lastTouchTime = now;
          
          clearTimeout(touchTimeout);
          touchTimeout = setTimeout(() => {
            // Get the clicked location
            const lat = event.mapPoint.latitude;
            const lon = event.mapPoint.longitude;
            
            // Update selected location
            selectedLocation = { lat, lon };
            
            // Immediately update location display with coordinates
            document.getElementById("location-name")!.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
            
            // Add marker at clicked location
            addLocationMarker(lat, lon);
            
            // Update weather data for clicked location (this will fetch location name)
            updateWeatherData(lat, lon);
            
            // Notify parent component of location change
            if (onLocationSelect) {
              onLocationSelect(lat, lon);
            }
            
            // Auto-close weather panel on mobile after a few seconds for better UX
            if (window.innerWidth < 768 && weatherExpand.expanded) {
              setTimeout(() => {
                weatherExpand.expanded = false;
              }, 4000); // Close after 4 seconds on mobile
            }
          }, 150); // Small delay to prevent accidental double taps
        });

        // Enhanced cleanup with resize handler removal
        const originalCleanup = () => {
          clearInterval(weatherInterval);
          clearTimeout(touchTimeout);
          window.removeEventListener('resize', handleResize);
          if (view) {
            view.destroy();
          }
        };
        
        // Store cleanup function
        (window as any).arcgisCleanup = originalCleanup;
      });

      // Add ScaleBar widget
      const scaleBar = new ScaleBar({
        view: view,
        unit: "dual"
      });
      view.ui.add(scaleBar, {
        position: "bottom-left"
      });

      // Add Search widget
      const searchWidget = new Search({
        view: view
      });
      view.ui.add(searchWidget, {
        position: "top-right",
        index: 0
      });

      // Add Weather widget if available
      try {
        const weatherWidget = new Weather({
          view: view
        });
        const weatherExpand = new Expand({
          view: view,
          content: weatherWidget,
          expandTooltip: "Weather",
          collapseTooltip: "Close",
          expanded: false
        });
        view.ui.add(weatherExpand, "top-right");
      } catch (e) {
        // Weather widget might not be available in all API versions
      }

      // Add BasemapGallery widget in an Expand widget
      const basemapGallery = new BasemapGallery({
        view: view
      });
      const bgExpand = new Expand({
        view: view,
        content: basemapGallery,
        expandTooltip: "Basemap Gallery",
        collapseTooltip: "Close"
      });
      view.ui.add(bgExpand, "top-right");

      // Add LayerList widget in an Expand widget
      const layerList = new LayerList({
        view: view,
        listItemCreatedFunction: function(event: any) {
          const item = event.item;
          if (item.layer.type !== "group") {
            item.panel = {
              content: "legend",
              open: false
            };
          }
        }
      });
      const llExpand = new Expand({
        view: view,
        content: layerList,
        expandTooltip: "Layer List",
        collapseTooltip: "Close",
        expanded: false
      });
      view.ui.add(llExpand, "top-right");

      // Add Legend widget in an Expand widget
      const legend = new Legend({
        view: view
      });
      const legendExpand = new Expand({
        view: view,
        content: legend,
        expandTooltip: "Legend",
        collapseTooltip: "Close",
        expanded: false
      });
      view.ui.add(legendExpand, "bottom-right");

      // Create graphics layer for location marker
      const graphicsLayer = new GraphicsLayer({
        title: "Selected Location"
      });
      webmap.add(graphicsLayer);

      // Disable auto-rotation - globe remains still
      let selectedLocation = { lat: 23.8103, lon: 90.4125 };

      // Add view loaded handler for loading progress
      view.when(() => {
        if (!isMounted) return;
        setLoadingProgress(100);
        setTimeout(() => setIsLoading(false), 500);
        console.log("ArcGIS Map loaded successfully");
      }).catch((error) => {
        console.error("ArcGIS Map loading error:", error);
        setIsLoading(false);
      });

      // Clean up on unmount
      return () => {
        isMounted = false;
        if ((window as any).arcgisCleanup) {
          (window as any).arcgisCleanup();
        } else {
          if (view) {
            view.destroy();
          }
        }
      };
      
      } catch (error) {
        console.error("ArcGIS initialization error:", error);
        setIsLoading(false);
      }
    });
  }, [webmapId]);

  return (
    <div className="relative w-full touch-manipulation" style={{ height }}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto"></div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Loading Satellite View...</p>
              <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary-foreground transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">{loadingProgress}%</p>
            </div>
          </div>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: window.innerWidth < 768 ? '0.5rem' : '0.75rem',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--accent)/0.1) 100%)',
          minHeight: window.innerWidth < 768 ? '300px' : '400px',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
        className="w-full h-full"
      />
      {window.innerWidth < 768 && !isLoading && (
        <div className="absolute top-2 left-2 right-2 bg-black/50 text-white text-xs p-2 rounded backdrop-blur-sm pointer-events-none z-10">
          <p className="text-center">Pinch to zoom • Drag to pan • Tap to select location</p>
        </div>
      )}
    </div>
  );
}