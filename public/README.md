# Urban Intelligence Dashboard

## Overview
A comprehensive urban intelligence platform for real-time city health monitoring, environmental analysis, and sustainability insights. This dashboard integrates multiple data sources and AI-powered analysis to provide actionable insights for urban planners and city officials.

## Features

### 🏙️ City Health Dashboard
- Real-time monitoring of 9 urban health indices
- Climate Resilience Index (CRI)
- Urban Heat Vulnerability Index (UHVI)
- Air Quality Health Impact (AQHI)
- Water Security Indicator (WSI)
- Green Equity Assessment (GEA)
- Social Cohesion Metrics (SCM)
- Environmental Justice Tracker (EJT)
- Transportation Accessibility Score (TAS)
- Disaster Preparedness Index (DPI)

### 🗺️ Interactive Map
- Location-based data analysis
- Area selection for detailed study
- Real-time coordinate search
- Geographic area search by name
- Data export functionality

### 📊 Data Visualization
- Interactive charts and graphs
- Multi-layer satellite data visualization
- Customizable date ranges
- Various chart types (line, area, bar, pie)
- Layer selection and filtering

### 🤖 AI Assistant
- Gemini AI-powered chatbot
- Urban planning insights
- Sustainability recommendations
- Image generation capabilities
- Data analysis and interpretation

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS with custom design system
- Recharts for data visualization
- React Leaflet for interactive maps
- Shadcn/ui component library

### Backend Integration
- n8n workflow automation
- NASA POWER API for climate data
- Air Quality API for pollution data
- Gemini AI API for intelligent responses

### APIs Used
- **Gemini AI**: `AIzaSyBN5E9O0YGh8sqWps0HDFQD45GhJHCzUh8`
- **NASA API**: `GeSwTbVGBQWEsQ3TXk0ihGvtgDJtEaHfiTqKuejO`
- **n8n Endpoint**: `https://lupuscortex.app.n8n.cloud/webhook/urban-health-api`

## Workflow Integration

The application uses n8n workflows for:
1. **Dashboard Data**: Fetches and processes urban health indices
2. **Chart Data**: Retrieves time-series data for visualizations
3. **AI Chatbot**: Processes user queries through Gemini AI
4. **Image Generation**: Creates AI-generated visualizations

## Data Processing

### Index Calculation
Each urban health index is calculated using specific components:

#### Climate Resilience Index (CRI) - Target: ≥75
- Temperature Adaptation Capacity (0-25 points)
- Heat Wave Preparedness (0-20 points)
- Flood Risk Management (0-20 points)
- Air Quality Resilience (0-20 points)
- Green Infrastructure Coverage (0-15 points)

#### Urban Heat Vulnerability Index (UHVI) - Target: ≤30
- Land Surface Temperature (0-30 points)
- Air Temperature (0-20 points)
- Heat Island Intensity (0-25 points)
- Cooling Infrastructure (0-15 points)
- Population Vulnerability (0-10 points)

[Additional indices follow similar component-based scoring]

### City Health Status Classification
- **≥80**: Healthy City
- **65-79**: Moderately Healthy City
- **50-64**: City Needs Improvement
- **<50**: Unhealthy City

## Usage

### 1. Location Selection
- Use the interactive map to select your area of interest
- Enter coordinates manually (latitude, longitude)
- Search by city or area name

### 2. Data Analysis
- View real-time urban health indices on the dashboard
- Generate custom charts with date range selection
- Toggle different data layers for focused analysis

### 3. AI Assistance
- Ask questions about urban planning and sustainability
- Request data interpretations and recommendations
- Generate images and visualizations

## Responsive Design
Fully responsive design optimized for:
- Desktop computers
- Tablets
- Mobile devices
- Various screen orientations

## Environment Setup

### Required Environment Variables
```env
VITE_GEMINI_API_KEY=AIzaSyBN5E9O0YGh8sqWps0HDFQD45GhJHCzUh8
VITE_NASA_API_KEY=GeSwTbVGBQWEsQ3TXk0ihGvtgDJtEaHfiTqKuejO
VITE_N8N_ENDPOINT=https://lupuscortex.app.n8n.cloud/webhook/urban-health-api
```

## Development

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## n8n Workflow File
The complete n8n workflow is available at `public/workflows/Lupus-Cortex.json` for direct import into your n8n instance.

## Architecture

### Component Structure
```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   └── urban/              # Urban intelligence specific components
├── config/                 # API configuration
├── services/              # API services and data processing
├── types/                 # TypeScript type definitions
└── pages/                 # Main application pages
```

### Data Flow
1. User interaction triggers API calls
2. n8n workflows process requests
3. External APIs provide raw data
4. Data processing calculates indices
5. Results displayed in real-time UI

## Contributing
This is a comprehensive urban intelligence platform designed for scalability and extensibility. New indices, data sources, and analysis methods can be easily integrated through the modular architecture.

## License
Urban Intelligence Dashboard - Advanced city health monitoring platform.