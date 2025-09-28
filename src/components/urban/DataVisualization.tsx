import React from 'react';
import { SimpleDataVisualization } from './SimpleDataVisualization';

interface DataVisualizationProps {
  latitude?: number;
  longitude?: number;
}

export function DataVisualization({ latitude = 23.8103, longitude = 90.4125 }: DataVisualizationProps) {
  // Use the new user-friendly interface
  return <SimpleDataVisualization latitude={latitude} longitude={longitude} />;
}