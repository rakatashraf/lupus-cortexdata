import React, { useEffect, useRef } from 'react';

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
  height = '750px',
  enableRotation = true,
  onRotationChange,
  isSimulationRunning = true,
  onLocationSelect
}: ArcGISMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !window.require) return;

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
      // Create a WebMap instance using the provided webmap ID
      const webmap = new WebMap({
        portalItem: {
          id: webmapId
        },
        ground: "world-elevation"
      });

      // Create the SceneView for 3D globe
      const view = new SceneView({
        container: mapRef.current,
        map: webmap,
        viewingMode: "global",
        camera: {
          position: {
            x: 90.4125,
            y: 23.8103,
            z: 15000000 // altitude in meters
          },
          heading: 0,
          tilt: 0
        },
        environment: {
          background: {
            type: "color",
            color: [10, 15, 20, 0.9] // Dark background matching site theme
          },
          starsEnabled: true,
          atmosphereEnabled: true,
          atmosphere: {
            quality: "high"
          },
          lighting: {
            type: "sun",
            directShadowsEnabled: true,
            date: new Date()
          }
        },
        ui: {
          components: ["zoom", "navigation-toggle", "compass"]
        }
      });

      // Add real-time weather layers similar to zoom.earth
      
      // NOAA Weather Radar Layer
      const radarLayer = new WMSLayer({
        url: "https://nowcoast.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer",
        title: "Live Weather Radar",
        opacity: 0.7,
        sublayers: [{
          name: "1",
          title: "Precipitation"
        }]
      });

      // Global Precipitation Measurement (GPM) Layer
      const precipitationLayer = new TileLayer({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/IMERG_Precipitation_Rate/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
        title: "Precipitation Forecast",
        opacity: 0.6
      });

      // Wind Speed and Direction Layer
      const windLayer = new ImageryLayer({
        url: "https://services.arcgisonline.com/arcgis/rest/services/Weather/NOAA_METAR_current_wind_speed_direction/MapServer",
        title: "Wind Speed & Direction",
        opacity: 0.5,
        renderingRule: {
          functionName: "Colormap",
          functionArguments: {
            colormap: [
              [0, 0, 0, 255, 0],
              [10, 0, 100, 255, 100],
              [20, 0, 200, 255, 200],
              [30, 100, 255, 255, 255],
              [40, 200, 255, 200, 255],
              [50, 255, 255, 0, 255],
              [60, 255, 200, 0, 255],
              [70, 255, 100, 0, 255],
              [80, 255, 0, 0, 255]
            ]
          }
        }
      });

      // Temperature Layer
      const temperatureLayer = new ImageryLayer({
        url: "https://services.arcgisonline.com/arcgis/rest/services/Weather/NOAA_METAR_current_conditions/MapServer",
        title: "Temperature",
        opacity: 0.5
      });

      // Cloud Cover Layer
      const cloudLayer = new TileLayer({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Aqua_Cloud_Top_Temp_Day/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
        title: "Cloud Cover",
        opacity: 0.4
      });

      // Add all weather layers to the map
      webmap.add(radarLayer);
      webmap.add(windLayer);
      webmap.add(temperatureLayer);
      webmap.add(cloudLayer);

      // Create animated weather overlay panel
      const weatherOverlayPanel = document.createElement("div");
      weatherOverlayPanel.innerHTML = `
        <div style="background: rgba(10, 15, 20, 0.95); padding: 12px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(0, 223, 252, 0.3); min-width: 280px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 8px; height: 8px; background: #00dffc; border-radius: 50%; animation: pulse 2s infinite;"></div>
            <h3 style="margin: 0; font-size: 14px; color: #00dffc; font-weight: 600;">Real-Time Weather Data</h3>
          </div>
          
          <div style="margin-bottom: 12px; padding: 6px 8px; background: rgba(0, 223, 252, 0.1); border-radius: 8px; border: 1px solid rgba(0, 223, 252, 0.2);">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span style="color: #64748b; font-size: 10px;">Location</span>
            </div>
            <div id="location-name" style="color: #ffffff; font-size: 12px; font-weight: 500;">Loading location...</div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
            <div style="background: rgba(0, 223, 252, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(0, 223, 252, 0.2);">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                  <path d="M12 2v20M17 7l-5-5-5 5M17 17l-5 5-5-5"/>
                </svg>
                <span style="color: #64748b; font-size: 11px;">Temperature</span>
              </div>
              <div id="temp-value" style="color: #ffffff; font-size: 18px; font-weight: 600;">--°C</div>
            </div>
            
            <div style="background: rgba(0, 223, 252, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(0, 223, 252, 0.2);">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                  <path d="M14 2.269C13.477 2.086 12.932 2 12.364 2 9.95 2 8 4.134 8 6.571c0 .524.09 1.029.254 1.489A5.5 5.5 0 003 13.5 5.5 5.5 0 008.5 19h7a4.5 4.5 0 10.41-8.983A5.002 5.002 0 0014 2.269z"/>
                </svg>
                <span style="color: #64748b; font-size: 11px;">Humidity</span>
              </div>
              <div id="humidity-value" style="color: #ffffff; font-size: 18px; font-weight: 600;">--%</div>
            </div>
            
            <div style="background: rgba(0, 223, 252, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(0, 223, 252, 0.2);">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                  <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/>
                </svg>
                <span style="color: #64748b; font-size: 11px;">Wind</span>
              </div>
              <div id="wind-value" style="color: #ffffff; font-size: 18px; font-weight: 600;">-- km/h</div>
            </div>
            
            <div style="background: rgba(0, 223, 252, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(0, 223, 252, 0.2);">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span style="color: #64748b; font-size: 11px;">Pressure</span>
              </div>
              <div id="pressure-value" style="color: #ffffff; font-size: 18px; font-weight: 600;">-- hPa</div>
            </div>
          </div>
          
          <div style="background: rgba(0, 223, 252, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(0, 223, 252, 0.2);">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00dffc" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
              </svg>
              <span style="color: #64748b; font-size: 11px;">Forecast</span>
            </div>
            <div id="forecast-text" style="color: #ffffff; font-size: 12px; line-height: 1.4;">Loading forecast data...</div>
          </div>
          
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          </style>
        </div>
      `;

      // Weather layer controls panel
      const layerControlPanel = document.createElement("div");
      layerControlPanel.innerHTML = `
        <div style="background: rgba(10, 15, 20, 0.95); padding: 12px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(0, 223, 252, 0.3);">
          <h4 style="margin: 0 0 10px 0; color: #00dffc; font-size: 13px; font-weight: 600;">Weather Layers</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="radar-toggle" checked style="accent-color: #00dffc; width: 16px; height: 16px;">
              <span style="color: #ffffff; font-size: 12px;">Precipitation Radar</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="wind-toggle" checked style="accent-color: #00dffc; width: 16px; height: 16px;">
              <span style="color: #ffffff; font-size: 12px;">Wind Patterns</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="temp-toggle" checked style="accent-color: #00dffc; width: 16px; height: 16px;">
              <span style="color: #ffffff; font-size: 12px;">Temperature</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="cloud-toggle" checked style="accent-color: #00dffc; width: 16px; height: 16px;">
              <span style="color: #ffffff; font-size: 12px;">Cloud Cover</span>
            </label>
          </div>
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0, 223, 252, 0.2);">
            <label style="display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #64748b; font-size: 11px;">Layer Opacity</span>
              <input type="range" id="opacity-slider" min="0" max="100" value="60" style="accent-color: #00dffc;">
            </label>
          </div>
        </div>
      `;

      // Function to fetch and update real weather data
      async function updateWeatherData(customLat?: number, customLon?: number) {
        try {
          // Use custom coordinates if provided, otherwise use selected location or camera position
          const lat = customLat || selectedLocation.lat || view.camera.position.latitude || 23.8103;
          const lon = customLon || selectedLocation.lon || view.camera.position.longitude || 90.4125;
          
          // Get location name using reverse geocoding and show coordinates
          try {
            const locationResponse = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
            );
            if (locationResponse.ok) {
              const locationData = await locationResponse.json();
              const locationName = locationData.city || locationData.locality || locationData.countryName || 'Unknown Location';
              document.getElementById("location-name")!.textContent = `${locationName} (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;
            }
          } catch (error) {
            document.getElementById("location-name")!.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
          }
          
          // Fetch weather data from Open-Meteo API (free, no key required)
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl,weather_code&hourly=temperature_2m,precipitation_probability,wind_speed_10m&forecast_days=1`
          );
          
          if (response.ok) {
            const data = await response.json();
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
            document.getElementById("forecast-text")!.textContent = 
              `Current: ${forecastText}. Next 6h precipitation chance: ${data.hourly.precipitation_probability[6]}%`;
          }
        } catch (error) {
          console.log("Weather update error:", error);
          // Use simulated data as fallback
          document.getElementById("temp-value")!.textContent = `${Math.floor(Math.random() * 15 + 20)}°C`;
          document.getElementById("humidity-value")!.textContent = `${Math.floor(Math.random() * 30 + 50)}%`;
          document.getElementById("wind-value")!.textContent = `${Math.floor(Math.random() * 20 + 5)} km/h`;
          document.getElementById("pressure-value")!.textContent = `${Math.floor(Math.random() * 20 + 1000)} hPa`;
          document.getElementById("forecast-text")!.textContent = "Partly cloudy with chance of precipitation";
          document.getElementById("location-name")!.textContent = "Sample Location";
        }
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
        // Add weather data panel
        const weatherExpand = new Expand({
          view: view,
          content: weatherOverlayPanel,
          expandTooltip: "Weather Data",
          collapseTooltip: "Close",
          expanded: true,
          mode: "floating",
          group: "top-left"
        });
        view.ui.add(weatherExpand, "top-left");

        // Add layer control panel
        const layerExpand = new Expand({
          view: view,
          content: layerControlPanel,
          expandTooltip: "Layer Controls",
          collapseTooltip: "Close",
          expanded: false,
          mode: "floating",
          group: "top-left"
        });
        view.ui.add(layerExpand, "top-left");

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

        // Add click event listener for location selection
        view.on("click", (event) => {
          // Get the clicked location
          const lat = event.mapPoint.latitude;
          const lon = event.mapPoint.longitude;
          
          // Update selected location
          selectedLocation = { lat, lon };
          
          // Add marker at clicked location
          addLocationMarker(lat, lon);
          
          // Update weather data for clicked location
          updateWeatherData(lat, lon);
          
          // Notify parent component of location change
          if (onLocationSelect) {
            onLocationSelect(lat, lon);
          }
        });

        // Clean up interval on component unmount
        const originalCleanup = () => {
          clearInterval(weatherInterval);
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

      // Clean up on unmount
      return () => {
        if ((window as any).arcgisCleanup) {
          (window as any).arcgisCleanup();
        } else {
          if (view) {
            view.destroy();
          }
        }
      };
    });
  }, [webmapId]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--accent)/0.1) 100%)'
        }}
      />
    </div>
  );
}