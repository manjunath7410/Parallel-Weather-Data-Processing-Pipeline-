/**
 * Types and interfaces for the AeroStream Parallel Weather Data Processing Pipeline.
 */

export type ProjectionMode = 'globe' | 'equirectangular';

export type WeatherLayer = 
  | 'thermal_ir'        // Brightness Temperature (Tb) & Cloud Top Height
  | 'radar_reflectivity' // Composite Reflectivity (dBZ)
  | 'water_vapor'       // Precipitable Water & Atmospheric Rivers
  | 'geopotential_hgt'  // 500 hPa Geopotential Height & Isobars
  | 'wind_streamlines'  // 300-500 hPa Jet Stream & Tropospheric Winds
  | 'lightning_density' // GLM / LI Optical Lightning Flash Density
  | 'climate_anomaly'   // CMIP6 Temperature Anomaly & Radiative Forcing
  | 'trace_gases';      // TROPOMI Column NO2/CH4/Aerosols

export interface WeatherStation {
  id: string;
  icao: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  stationType: 'synoptic' | 'radiosonde' | 'buoy' | 'radar';
}

export interface SatelliteFeed {
  id: string;
  name: string;
  agency: string;
  orbitType: 'GEO' | 'LEO_SSO';
  longitude: number;      // Sub-satellite longitude
  latitude: number;       // Sub-satellite latitude
  altitudeKm: number;
  instruments: string[];
  channels: number;
  resolutionKm: number;
  dataRateMbps: number;
  packetCount: number;
  health: 'nominal' | 'calibrating' | 'degraded';
  currentSwath: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  category: 'ingest' | 'calibration' | 'optical_flow' | 'assimilation' | 'dynamical_core' | 'distribution';
  assignedWorkers: number;
  queueDepth: number;
  latencyMs: number;
  throughputMBs: number;
  status: 'active' | 'busy' | 'idle';
  opsPerSec: string;
}

export interface WorkerCore {
  id: number;
  nodeName: string;
  coreType: 'SIMD_AVX512' | 'GPU_TENSOR' | 'DYNAMIC_SOLVER' | 'IO_INGEST';
  utilization: number; // 0 - 100%
  temperatureC: number;
  memoryUsageMB: number;
  currentTask: string;
  status: 'running' | 'busy' | 'idle' | 'syncing';
  ipcScore?: number; // Instructions per cycle (e.g. 2.14)
  cacheHitPct?: number;
}

export interface AtmosphericProbe {
  latitude: number;
  longitude: number;
  surfacePressureHpa: number;
  surfaceTempC: number;
  brightnessTempK: number;
  radarReflectivityDbz: number;
  lightningFlashesPerMin: number;
  windSpeedKts: number;
  windDirectionDeg: number;
  precipitableWaterMm: number;
  cloudFractionPct: number;
  relativeHumidityPct: number;
  radiativeFluxWm2: number;
  capeJkg: number;
  cinJkg: number;
  lclAltitudeM: number;
  lfcAltitudeM: number;
  elAltitudeM: number;
  srh03km: number; // m^2 / s^2
  vorticityRate: number; // 10^-5 s^-1
  geopotentialHeightM: number;
}

export interface SoundingLevel {
  pressureHpa: number;
  altitudeM: number;
  temperatureC: number;
  dewPointC: number;
  parcelTempC: number;
  thetaK: number;
  windSpeedKts: number;
  windDirectionDeg: number;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  targetLat: number;
  targetLon: number;
  targetZoom: number;
  activeLayer: WeatherLayer;
  description: string;
  phenomenon: string;
  ensembleMemberCount: number;
  forecastWindowHours: number;
}

export interface AnomalyEvent {
  id: string;
  timestamp: string;
  type: 'rapid_cyclogenesis' | 'atmospheric_river' | 'polar_vortex_split' | 'heat_dome' | 'methane_plume';
  severity: 'extreme' | 'severe' | 'moderate';
  location: string;
  coordinates: [number, number];
  metricValue: string;
  assimilationConfidence: number;
}

