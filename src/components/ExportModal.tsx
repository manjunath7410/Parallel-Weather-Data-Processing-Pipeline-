import React, { useState } from 'react';
import { AtmosphericProbe } from '../types/weather';
import { generateSoundingProfile } from '../services/atmosphericPhysics';
import { useTheme } from '../context/ThemeContext';
import { X, Download, Copy, Check, FileCode, Database, FileSpreadsheet, MapPin } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  probe: AtmosphericProbe;
  activeScenarioId: string;
  modelHour: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  probe,
  activeScenarioId,
  modelHour,
}) => {
  const { isLight } = useTheme();
  const [exportFormat, setExportFormat] = useState<'netcdf' | 'grib2' | 'geojson' | 'csv'>('netcdf');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Format 1: NetCDF-4 Metadata
  const netCdfMetadata = {
    Conventions: 'CF-1.8, ACDD-1.3',
    title: 'AeroStream Parallel Weather & High-Resolution Climate Model Analysis',
    institution: 'AeroStream Planetary Computing Core / Multi-Agency Satellite Mesh',
    source: 'GOES-16/18 ABI + MTG FCI + Himawari-9 AHI + 4D-Var EnKF Assimilation',
    history: `${new Date().toISOString()}: Ingestion, SIMD L1b calibration, and 4D-Var solver`,
    references: 'ECMWF IFS / NOAA GFS Non-Hydrostatic Dynamical Core Specification',
    dimensions: {
      time: 73,
      lat: 1801,
      lon: 3600,
      isobaric_level: 12,
      ensemble_member: 64,
    },
    variables: {
      brightness_temperature_ch14: {
        dimensions: ['time', 'lat', 'lon'],
        units: 'K',
        long_name: 'ABI Band 14 (11.2 µm) Clean Infrared Brightness Temperature',
        standard_name: 'toa_brightness_temperature',
        sample_point_val: probe.brightnessTempK,
      },
      surface_air_pressure: {
        dimensions: ['time', 'lat', 'lon'],
        units: 'Pa',
        long_name: 'Sea Level Surface Pressure',
        standard_name: 'surface_air_pressure',
        sample_point_val: probe.surfacePressureHpa * 100,
      },
      geopotential_height_500hPa: {
        dimensions: ['time', 'lat', 'lon'],
        units: 'm',
        long_name: '500 hPa Geopotential Height',
        standard_name: 'geopotential_height',
        sample_point_val: probe.geopotentialHeightM,
      },
      precipitable_water: {
        dimensions: ['time', 'lat', 'lon'],
        units: 'kg m-2',
        long_name: 'Atmosphere Total Column Precipitable Water Vapor',
        standard_name: 'atmosphere_water_vapor_content',
        sample_point_val: probe.precipitableWaterMm,
      },
      cape: {
        dimensions: ['time', 'lat', 'lon'],
        units: 'J kg-1',
        long_name: 'Surface Convective Available Potential Energy',
        sample_point_val: probe.capeJkg,
      },
      radar_reflectivity: {
        dimensions: ['time', 'lat', 'lon'],
        units: 'dBZ',
        long_name: 'Equivalent Radar Reflectivity Factor',
        sample_point_val: probe.radarReflectivityDbz,
      },
    },
    spatial_coverage: {
      geospatial_lat_min: -90.0,
      geospatial_lat_max: 90.0,
      geospatial_lon_min: -180.0,
      geospatial_lon_max: 180.0,
      horizontal_resolution_deg: 0.1,
    },
    temporal_coverage: {
      forecast_valid_hour: `T+${modelHour}:00h`,
      assimilation_window_hours: 6,
    },
  };

  // Format 2: WMO GRIB2 Structure
  const grib2Descriptor = {
    edition: 2,
    discipline: 0, // Meteorological products
    section1_identification: {
      originating_center: 'WMO-78 (AeroStream Planetary Computing Core)',
      sub_center: 0,
      master_table_version: 31,
      reference_time: new Date().toISOString(),
      production_status: 'Operational Products (0)',
      data_type: 'Forecast Products (1)',
    },
    section3_grid_definition: {
      grid_definition_template: 3.0, // Latitude/Longitude equidistant
      shape_of_earth: 6, // WGS84
      Ni: 3600,
      Nj: 1801,
      La1: 90000000,
      Lo1: -180000000,
      La2: -90000000,
      Lo2: 180000000,
      Di: 100000, // 0.1° step
      Dj: 100000,
    },
    section4_product_definition: {
      template: 4.0,
      parameter_category: 0, // Temperature
      parameter_number: 0, // Temperature (K)
      generating_process: 2, // 4D-Var Data Assimilation & DynCore
      forecast_time_hours: modelHour,
      first_fixed_surface_type: 100, // Isobaric surface (Pa)
      first_surface_value: 50000, // 500 hPa
    },
    section5_data_representation: {
      template: 5.40, // JPEG2000 lossy/lossless packing
      bits_per_value: 16,
      compression_ratio: '4.8:1',
    },
    section7_binary_payload_bytes: 588290,
  };

  // Format 3: GeoJSON Feature
  const geoJsonFeature = {
    type: 'FeatureCollection',
    generator: 'AeroStream Parallel Weather Pipeline',
    timestamp: new Date().toISOString(),
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [probe.longitude, probe.latitude],
        },
        properties: {
          surface_pressure_hpa: probe.surfacePressureHpa,
          surface_temp_c: probe.surfaceTempC,
          cloud_top_tb_k: probe.brightnessTempK,
          wind_speed_kts: probe.windSpeedKts,
          wind_direction_deg: probe.windDirectionDeg,
          precipitable_water_mm: probe.precipitableWaterMm,
          radar_reflectivity_dbz: probe.radarReflectivityDbz,
          cape_j_kg: probe.capeJkg,
          cin_j_kg: probe.cinJkg,
          srh_0_3km_m2_s2: probe.srh03km,
          cloud_fraction_pct: probe.cloudFractionPct,
          valid_forecast_hour: `T+${modelHour}:00h`,
          scenario_id: activeScenarioId,
        },
      },
    ],
  };

  // Format 4: CSV Sounding Profile
  const soundingProfile = generateSoundingProfile(probe);
  const csvContent =
    'Pressure_hPa,Altitude_m,Temperature_C,DewPoint_C,ParcelTemp_C,Theta_K,WindSpeed_kts,WindDir_deg\n' +
    soundingProfile
      .map(
        (l) =>
          `${l.pressureHpa},${l.altitudeM},${l.temperatureC},${l.dewPointC},${l.parcelTempC},${l.thetaK},${l.windSpeedKts},${l.windDirectionDeg}`
      )
      .join('\n');

  // Payload content to display
  let previewContent = '';
  let filename = '';
  let mimeType = 'application/json';

  if (exportFormat === 'netcdf') {
    previewContent = JSON.stringify(netCdfMetadata, null, 2);
    filename = `aerostream_netcdf4_cf18_${activeScenarioId}_T${modelHour}.json`;
    mimeType = 'application/json';
  } else if (exportFormat === 'grib2') {
    previewContent = JSON.stringify(grib2Descriptor, null, 2);
    filename = `aerostream_wmo_grib2_${activeScenarioId}_T${modelHour}.json`;
    mimeType = 'application/json';
  } else if (exportFormat === 'geojson') {
    previewContent = JSON.stringify(geoJsonFeature, null, 2);
    filename = `aerostream_sounding_${probe.latitude}_${probe.longitude}.geojson`;
    mimeType = 'application/geo+json';
  } else {
    previewContent = csvContent;
    filename = `aerostream_skewt_${probe.latitude}_${probe.longitude}.csv`;
    mimeType = 'text/csv';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([previewContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`w-full max-w-2xl border rounded-xl shadow-2xl flex flex-col overflow-hidden transition-colors ${
        isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#0a0e1a] border-slate-800 text-slate-100'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#07090e] border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <FileCode className={`w-4 h-4 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
            <h3 className={`text-sm font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              Scientific Climate & Sounding Data Export
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${isLight ? 'text-slate-400 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className={`flex items-center gap-2 px-5 py-2.5 border-b text-xs font-mono ${
          isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
        }`}>
          <span className={`mr-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>FORMAT:</span>
          <button
            onClick={() => setExportFormat('netcdf')}
            className={`px-3 py-1 rounded transition-colors ${
              exportFormat === 'netcdf'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            NetCDF-4 / CF-1.8
          </button>
          <button
            onClick={() => setExportFormat('grib2')}
            className={`px-3 py-1 rounded transition-colors ${
              exportFormat === 'grib2'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            WMO GRIB2
          </button>
          <button
            onClick={() => setExportFormat('geojson')}
            className={`px-3 py-1 rounded transition-colors ${
              exportFormat === 'geojson'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            GeoJSON
          </button>
          <button
            onClick={() => setExportFormat('csv')}
            className={`px-3 py-1 rounded transition-colors ${
              exportFormat === 'csv'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            CSV Sounding
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-5 flex flex-col gap-3">
          <div className={`flex items-center justify-between text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            <span>
              {exportFormat === 'netcdf' && 'CF-1.8 compliant dataset descriptor with 4D-Var fields.'}
              {exportFormat === 'grib2' && 'WMO Edition 2 Template 3.0 Grid Definition Section breakdown.'}
              {exportFormat === 'geojson' && 'Spatial GeoJSON Feature with point atmospheric probe properties.'}
              {exportFormat === 'csv' && 'Tabular thermodynamic vertical atmospheric sounding profile.'}
            </span>
            <span className={`font-mono text-[11px] font-semibold ${isLight ? 'text-cyan-800' : 'text-cyan-400'}`}>{filename}</span>
          </div>

          <div className={`relative rounded-lg border p-3.5 max-h-72 overflow-y-auto ${
            isLight ? 'bg-slate-900 border-slate-700 text-cyan-300' : 'bg-[#06080e] border-slate-800 text-cyan-300'
          }`}>
            <pre className="text-[11px] font-mono leading-relaxed">
              {previewContent}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`flex items-center justify-between px-5 py-3 border-t ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#07090e] border-slate-800'
        }`}>
          <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Standard: WMO / NOAA / ECMWF Scientific Interoperability
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isLight 
                  ? 'text-slate-700 hover:text-slate-950 bg-white border border-slate-300 shadow-sm' 
                  : 'text-slate-300 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors font-bold shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
