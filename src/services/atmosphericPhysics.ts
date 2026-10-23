import { AtmosphericProbe, SoundingLevel, WeatherLayer, WeatherStation } from '../types/weather';

/**
 * Atmospheric Physics & Meteorological Math Engine
 * Computes thermodynamic parameters, hydrostatic soundings, and vector flow fields.
 */

// Simplified high-performance global coastlines (lat, lon coordinates for major landmasses)
export const CONTINENT_PATHS: [number, number][][] = [
  // North America
  [
    [71, -156], [68, -137], [60, -140], [58, -135], [54, -130], [48, -125], [37, -122], [32, -117],
    [23, -110], [19, -104], [16, -96], [14, -92], [9, -83], [8, -77], [10, -75], [18, -88],
    [21, -87], [22, -97], [29, -95], [30, -84], [25, -80], [31, -81], [35, -75], [41, -71],
    [45, -66], [47, -53], [52, -56], [58, -62], [62, -75], [63, -86], [58, -94], [52, -80],
    [55, -77], [63, -64], [70, -68], [76, -75], [74, -95], [70, -125], [71, -156]
  ],
  // South America
  [
    [12, -72], [10, -62], [7, -58], [4, -51], [-1, -48], [-5, -35], [-12, -37], [-23, -42],
    [-34, -53], [-42, -64], [-53, -68], [-55, -67], [-52, -74], [-45, -74], [-33, -71],
    [-18, -70], [-5, -81], [2, -79], [7, -76], [12, -72]
  ],
  // Eurasia
  [
    [71, 28], [70, 60], [73, 80], [76, 110], [72, 140], [66, 170], [60, 162], [53, 142],
    [43, 132], [38, 128], [35, 129], [34, 120], [22, 114], [21, 107], [10, 104], [1, 104],
    [13, 100], [22, 91], [21, 70], [25, 62], [25, 57], [15, 53], [12, 44], [28, 34],
    [31, 32], [36, 36], [41, 29], [46, 14], [44, 8], [36, -5], [37, -9], [43, -9],
    [48, -4], [54, 8], [58, 11], [62, 5], [69, 16], [71, 28]
  ],
  // Africa
  [
    [37, 10], [32, 32], [22, 37], [12, 44], [11, 51], [0, 42], [-11, 40], [-25, 33],
    [-34, 18], [-33, 26], [-28, 15], [-17, 12], [-5, 12], [4, 7], [4, -1], [5, -4],
    [14, -17], [21, -17], [32, -10], [36, -5], [37, 10]
  ],
  // Australia
  [
    [-12, 132], [-12, 143], [-24, 153], [-37, 150], [-39, 144], [-35, 137], [-35, 117],
    [-22, 114], [-15, 124], [-12, 132]
  ],
  // Greenland
  [
    [77, -20], [83, -30], [82, -50], [77, -68], [60, -44], [65, -35], [77, -20]
  ],
  // Antarctica simplified
  [
    [-65, -64], [-68, 0], [-66, 60], [-66, 120], [-66, 180], [-70, -120], [-65, -64]
  ]
];

// Real-world operational WMO / ICAO sounding stations & major synoptic observatories
export const GLOBAL_WEATHER_STATIONS: WeatherStation[] = [
  { id: 'stn-typhoon', icao: 'RPLL', name: 'Manila Ninoy Aquino', region: 'Western Pacific', latitude: 14.51, longitude: 121.02, elevationM: 23, stationType: 'radiosonde' },
  { id: 'stn-tokyo', icao: 'RJTT', name: 'Tokyo Haneda International', region: 'East Asia', latitude: 35.55, longitude: 139.78, elevationM: 6, stationType: 'synoptic' },
  { id: 'stn-sfo', icao: 'KSFO', name: 'San Francisco International', region: 'Pacific Coast', latitude: 37.62, longitude: -122.38, elevationM: 4, stationType: 'radiosonde' },
  { id: 'stn-jfk', icao: 'KJFK', name: 'New York John F. Kennedy', region: 'East Coast US', latitude: 40.64, longitude: -73.78, elevationM: 4, stationType: 'synoptic' },
  { id: 'stn-mia', icao: 'KMIA', name: 'Miami International NHC Basin', region: 'Caribbean / Atlantic', latitude: 25.79, longitude: -80.29, elevationM: 3, stationType: 'radar' },
  { id: 'stn-lon', icao: 'EGLL', name: 'London Heathrow Met Office', region: 'Western Europe', latitude: 51.47, longitude: -0.45, elevationM: 25, stationType: 'radiosonde' },
  { id: 'stn-fra', icao: 'EDDF', name: 'Frankfurt DWD Center', region: 'Central Europe', latitude: 50.03, longitude: 8.57, elevationM: 111, stationType: 'radar' },
  { id: 'stn-dxb', icao: 'OMDB', name: 'Dubai International Synoptic', region: 'Middle East', latitude: 25.25, longitude: 55.36, elevationM: 19, stationType: 'synoptic' },
  { id: 'stn-bom', icao: 'VABB', name: 'Mumbai Chhatrapati Shivaji', region: 'South Asia Monsoonal', latitude: 19.09, longitude: 72.87, elevationM: 14, stationType: 'radiosonde' },
  { id: 'stn-sin', icao: 'WSSS', name: 'Singapore Changi Equatorial', region: 'Southeast Asia Intertropical', latitude: 1.36, longitude: 103.99, elevationM: 7, stationType: 'radar' },
  { id: 'stn-syd', icao: 'YSSY', name: 'Sydney Kingsford Smith BoM', region: 'Oceania', latitude: -33.95, longitude: 151.18, elevationM: 6, stationType: 'synoptic' },
  { id: 'stn-cpt', icao: 'FACT', name: 'Cape Town International', region: 'Southern Africa', latitude: -33.97, longitude: 18.60, elevationM: 42, stationType: 'radiosonde' },
  { id: 'stn-sao', icao: 'SBGR', name: 'São Paulo Guarulhos', region: 'South America', latitude: -23.44, longitude: -46.47, elevationM: 750, stationType: 'synoptic' },
  { id: 'stn-hnl', icao: 'PHNL', name: 'Honolulu Daniel K. Inouye', region: 'Central Pacific', latitude: 21.32, longitude: -157.92, elevationM: 4, stationType: 'radiosonde' },
  { id: 'stn-rey', icao: 'BIRK', name: 'Reykjavik Sub-Arctic', region: 'North Atlantic', latitude: 64.13, longitude: -21.94, elevationM: 15, stationType: 'synoptic' },
  { id: 'stn-scl', icao: 'SCEL', name: 'Santiago Arturo Merino Benitez', region: 'Andean South', latitude: -33.39, longitude: -70.79, elevationM: 474, stationType: 'radiosonde' },
];

/**
 * Calculates solar subsolar coordinates (lat, lon) for day/night terminator
 */
export function getSolarSubsolarPoint(modelHour: number = 0): { lat: number; lon: number } {
  // Approximate seasonal solar declination (assume ~12°N equinox to solstices)
  const baseUtcHour = (new Date().getUTCHours() + modelHour) % 24;
  // Subsolar longitude moves 15 degrees per hour westward (12:00 UTC = 0° lon)
  const lon = 180 - (baseUtcHour / 24) * 360;
  const lat = 11.5; // Tropical tilt
  return { lat, lon };
}

/**
 * Calculates atmospheric physics values at a given latitude/longitude
 */
export function sampleAtmosphereAt(
  lat: number,
  lon: number,
  activeScenarioId: string,
  modelHour: number = 0
): AtmosphericProbe {
  // Normalize lon to [-180, 180]
  const nLon = ((((lon + 180) % 360) + 360) % 360) - 180;
  const nLat = Math.max(-90, Math.min(90, lat));

  // Base climate values based on latitude
  const latRad = (nLat * Math.PI) / 180;
  const lonRad = (nLon * Math.PI) / 180;

  // Temperature gradient from equator to poles
  const baseTempC = 28 * Math.cos(latRad) - 18 * Math.pow(Math.sin(latRad), 2);
  const basePressureHpa = 1013.25 - 6 * Math.sin(latRad * 2);

  // Planetary Rossby waves modulation
  const waveZ = Math.sin(4 * lonRad + modelHour * 0.05) * Math.cos(latRad * 2.5);
  let geopotentialHgt = 5500 + waveZ * 280 - Math.abs(nLat) * 35;

  let sfcPressure = basePressureHpa + waveZ * 12;
  let sfcTemp = baseTempC + waveZ * 3.5;
  let brightnessTempK = 273.15 + sfcTemp - 18; // base clear sky
  let windSpeed = 15 + Math.abs(Math.sin(latRad * 2)) * 38 + Math.abs(waveZ) * 20;
  let windDir = (270 + waveZ * 45) % 360;
  let precipWater = Math.max(2, 45 * Math.cos(latRad) + waveZ * 12);
  let cloudFraction = Math.max(0.05, Math.min(1.0, 0.4 + waveZ * 0.35));
  let relHumidity = Math.max(20, Math.min(98, 65 + waveZ * 25));
  let radiativeFlux = 240 + Math.cos(latRad) * 60 - cloudFraction * 40;
  let cape = Math.max(0, (28 - Math.abs(nLat)) * 80 + waveZ * 350);
  let cin = Math.max(0, 45 - waveZ * 30);
  let vorticity = (waveZ * 6.5);
  let radarReflectivity = Math.max(0, (cloudFraction - 0.45) * 55);
  let lightningFlashes = Math.max(0, Math.round((cape / 800) * (cloudFraction > 0.7 ? 12 : 0)));

  // Thermodynamic boundary altitudes
  let lcl = Math.max(300, Math.round(125 * (sfcTemp - (sfcTemp - ((100 - relHumidity) / 5)))));
  let lfc = Math.max(lcl + 200, Math.round(lcl + 600 - (cape / 10)));
  let el = Math.min(16500, Math.round(8500 + (cape / 3200) * 6500));
  let srh = Math.max(20, Math.round(80 + Math.abs(vorticity) * 12 + windSpeed * 2.2));

  // Scenario specific adjustments:
  if (activeScenarioId === 'typhoon_cat5') {
    // Typhoon centered around 18.4°N, 132.8°E (Western Pacific)
    const dLat = nLat - 18.4;
    const dLon = nLon - 132.8;
    const distDeg = Math.sqrt(dLat * dLat + dLon * dLon);

    if (distDeg < 12) {
      const coreFactor = Math.exp(-distDeg / 2.8);
      sfcPressure = 898 + (1010 - 898) * (1 - coreFactor);
      windSpeed = 25 + 140 * Math.sin((distDeg / 6) * Math.PI) * Math.exp(-distDeg / 5);
      if (distDeg < 0.6) {
        // Eye of typhoon
        windSpeed = 18;
        cloudFraction = 0.25;
        brightnessTempK = 265;
        radarReflectivity = 8;
        lightningFlashes = 2;
      } else {
        // Eyewall & convective bands
        brightnessTempK = 188 + distDeg * 6; // -85°C cold cloud tops
        cloudFraction = 0.98;
        precipWater = 68 - distDeg * 2.5;
        relHumidity = 96;
        cape = 3200 * coreFactor;
        cin = 5;
        vorticity = 24.5 * coreFactor;
        radarReflectivity = Math.min(68, 48 + 20 * coreFactor);
        lightningFlashes = Math.round(45 * coreFactor);
        srh = Math.round(420 * coreFactor);
        el = 16200;
        lcl = 380;
        lfc = 620;
      }
    }
  } else if (activeScenarioId === 'atmospheric_river') {
    // Moisture plume tracking from 22°N, -150°W to 45°N, -125°W
    const distToPlume = Math.abs((nLon - -130) * 0.6 - (nLat - 38) * 0.8);
    if (distToPlume < 6 && nLat > 25 && nLat < 52 && nLon < -115 && nLon > -155) {
      const plumeFactor = 1 - distToPlume / 6;
      precipWater = 35 + 28 * plumeFactor; // up to 63mm
      cloudFraction = 0.88;
      relHumidity = 94;
      windSpeed = 48 + 32 * plumeFactor;
      windDir = 235; // Southwesterly moisture conveyor
      brightnessTempK = 225 - plumeFactor * 15;
      radarReflectivity = 32 + plumeFactor * 18;
      lightningFlashes = Math.round(8 * plumeFactor);
      srh = 280;
    }
  } else if (activeScenarioId === 'polar_vortex') {
    // High latitude polar vortex cold anomaly
    if (nLat > 50 && nLon < -40 && nLon > -120) {
      const coldFactor = Math.sin(((nLat - 50) / 40) * Math.PI);
      sfcTemp = -38 - coldFactor * 12;
      geopotentialHgt = 4950 - coldFactor * 320;
      sfcPressure = 988;
      windSpeed = 55 + coldFactor * 30;
      vorticity = 18.2;
      radarReflectivity = 15;
      lightningFlashes = 0;
      cape = 0;
      cin = 180;
    }
  }

  return {
    latitude: Number(nLat.toFixed(2)),
    longitude: Number(nLon.toFixed(2)),
    surfacePressureHpa: Number(sfcPressure.toFixed(1)),
    surfaceTempC: Number(sfcTemp.toFixed(1)),
    brightnessTempK: Number(brightnessTempK.toFixed(1)),
    radarReflectivityDbz: Number(radarReflectivity.toFixed(1)),
    lightningFlashesPerMin: lightningFlashes,
    windSpeedKts: Number(windSpeed.toFixed(1)),
    windDirectionDeg: Math.round(windDir),
    precipitableWaterMm: Number(precipWater.toFixed(1)),
    cloudFractionPct: Math.round(cloudFraction * 100),
    relativeHumidityPct: Math.round(relHumidity),
    radiativeFluxWm2: Number(radiativeFlux.toFixed(1)),
    capeJkg: Math.round(cape),
    cinJkg: Math.round(cin),
    lclAltitudeM: lcl,
    lfcAltitudeM: lfc,
    elAltitudeM: el,
    srh03km: srh,
    vorticityRate: Number(vorticity.toFixed(1)),
    geopotentialHeightM: Math.round(geopotentialHgt),
  };
}

/**
 * Computes thermodynamic atmospheric vertical sounding (Skew-T Log-P levels)
 */
export function generateSoundingProfile(probe: AtmosphericProbe): SoundingLevel[] {
  const pressureLevels = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100];
  const sfcT = probe.surfaceTempC;
  // Approximate surface dewpoint via Magnus-Tetens
  const sfcTd = sfcT - ((100 - probe.relativeHumidityPct) / 5);

  return pressureLevels.map((p) => {
    // Standard atmosphere geopotential altitude estimation
    const alt = Math.round(44330 * (1 - Math.pow(p / 1013.25, 0.1903)));
    
    // Tropospheric lapse rate (~6.5°C / km up to tropopause ~200 hPa)
    let tempC: number;
    if (p >= 200) {
      tempC = sfcT - (alt / 1000) * 6.5;
    } else {
      // Stratosphere isothermal / inversion
      tempC = -56.5 + ((11000 - alt) / 1000) * 1.5;
    }

    // Dew point spread increases with height
    let dewPointC = tempC - (sfcT - sfcTd) - (alt / 1000) * 3.2;
    if (dewPointC > tempC) dewPointC = tempC - 0.5;

    // Pseudo-adiabatic parcel ascent calculation:
    // Below LCL: Dry adiabatic lapse rate (-9.8°C / km)
    // Above LCL: Moist pseudo-adiabatic lapse rate (~5.5°C / km)
    let parcelT: number;
    if (alt <= probe.lclAltitudeM) {
      parcelT = sfcT - (alt / 1000) * 9.8;
    } else {
      const lclTemp = sfcT - (probe.lclAltitudeM / 1000) * 9.8;
      parcelT = lclTemp - ((alt - probe.lclAltitudeM) / 1000) * 5.4;
    }

    // Potential temperature Theta (K)
    const thetaK = (tempC + 273.15) * Math.pow(1000 / p, 0.286);

    // Vertical wind profile: shear and jet streak at 250-300 hPa
    const jetFactor = Math.exp(-Math.pow(p - 280, 2) / (2 * 120 * 120));
    const windSpeed = Math.round(probe.windSpeedKts * 0.4 + probe.windSpeedKts * 1.8 * jetFactor);
    const windDir = (probe.windDirectionDeg + (1000 - p) * 0.05) % 360;

    return {
      pressureHpa: p,
      altitudeM: alt,
      temperatureC: Number(tempC.toFixed(1)),
      dewPointC: Number(dewPointC.toFixed(1)),
      parcelTempC: Number(parcelT.toFixed(1)),
      thetaK: Number(thetaK.toFixed(1)),
      windSpeedKts: windSpeed,
      windDirectionDeg: Math.round(windDir),
    };
  });
}

/**
 * Atmospheric color scales for canvas rendering
 */
export function getLayerColorRamp(layer: WeatherLayer, value: number): [number, number, number, number] {
  // Returns RGBA [0-255, 0-255, 0-255, alpha 0-1]
  switch (layer) {
    case 'thermal_ir': {
      // value: Brightness Temp in Kelvin (180K to 300K)
      const norm = Math.max(0, Math.min(1, (value - 185) / (300 - 185)));
      if (norm < 0.2) {
        // -88°C to -65°C: Severe convective core (White to Red)
        const t = norm / 0.2;
        return [255, Math.round(255 * (1 - t)), Math.round(240 * (1 - t)), 0.95];
      } else if (norm < 0.45) {
        // -65°C to -35°C: High cirrus / anvil (Purple to Cyan)
        const t = (norm - 0.2) / 0.25;
        return [Math.round(180 * (1 - t)), Math.round(240 * t), 255, 0.85];
      } else if (norm < 0.75) {
        // -35°C to 0°C: Mid clouds (Cyan to Navy/Blue)
        const t = (norm - 0.45) / 0.3;
        return [Math.round(40 * t), Math.round(140 * (1 - t) + 40), Math.round(220 * (1 - t) + 80), 0.65];
      } else {
        // Clear sky / warm ground
        const t = (norm - 0.75) / 0.25;
        return [Math.round(20 + 20 * t), Math.round(30 + 30 * t), Math.round(50 + 30 * t), 0.25];
      }
    }

    case 'radar_reflectivity': {
      // value: 0 dBZ to 75 dBZ standard NEXRAD / WMO color table
      const dbz = Math.max(0, Math.min(75, value));
      if (dbz < 15) {
        // Light drizzle / cloud droplets (Cyan/Pale green)
        const t = dbz / 15;
        return [40, Math.round(180 * t + 50), Math.round(220 - 40 * t), 0.45];
      } else if (dbz < 35) {
        // Moderate rain (Green to Yellow-Green)
        const t = (dbz - 15) / 20;
        return [Math.round(50 + 180 * t), Math.round(210 + 30 * t), 40, 0.75];
      } else if (dbz < 52) {
        // Heavy precipitation (Yellow to Orange to Crimson)
        const t = (dbz - 35) / 17;
        return [250, Math.round(230 * (1 - t) + 40), 20, 0.9];
      } else {
        // Severe hail core / torrential convective cell (Magenta to Deep Purple)
        const t = (dbz - 52) / 23;
        return [Math.round(240 - 40 * t), Math.round(50 * (1 - t)), 240, 0.98];
      }
    }

    case 'lightning_density': {
      // value: 0 to 60 flashes/min
      const norm = Math.max(0, Math.min(1, value / 45));
      if (norm < 0.3) {
        return [255, 230, 80, 0.5];
      } else if (norm < 0.7) {
        return [255, 170, 0, 0.85];
      } else {
        return [255, 255, 255, 1.0];
      }
    }

    case 'water_vapor': {
      // Precipitable water: 0 to 70 mm
      const norm = Math.max(0, Math.min(1, value / 65));
      if (norm < 0.3) {
        const t = norm / 0.3;
        return [Math.round(160 * (1 - t * 0.4)), Math.round(110 * (1 - t * 0.3)), 40, 0.4];
      } else if (norm < 0.7) {
        const t = (norm - 0.3) / 0.4;
        return [Math.round(20 * (1 - t)), Math.round(160 + 50 * t), Math.round(190 + 50 * t), 0.75];
      } else {
        const t = (norm - 0.7) / 0.3;
        return [Math.round(180 + 75 * t), Math.round(230 + 25 * t), 255, 0.95];
      }
    }

    case 'geopotential_hgt': {
      // 500 hPa Height: 5000 gpm to 5900 gpm
      const norm = Math.max(0, Math.min(1, (value - 5100) / (5880 - 5100)));
      if (norm < 0.5) {
        const t = norm / 0.5;
        return [Math.round(20 + 20 * t), Math.round(60 + 140 * t), Math.round(230 - 30 * t), 0.7];
      } else {
        const t = (norm - 0.5) / 0.5;
        return [Math.round(40 + 215 * t), Math.round(200 - 120 * t), Math.round(200 - 160 * t), 0.75];
      }
    }

    case 'climate_anomaly': {
      // Temperature Anomaly: -4°C to +4°C
      const norm = Math.max(0, Math.min(1, (value + 4) / 8));
      if (norm < 0.5) {
        const t = norm / 0.5;
        return [Math.round(30 + 40 * t), Math.round(120 + 80 * t), 245, 0.8];
      } else {
        const t = (norm - 0.5) / 0.5;
        return [250, Math.round(160 * (1 - t)), Math.round(40 * (1 - t)), 0.85];
      }
    }

    case 'trace_gases': {
      const norm = Math.max(0, Math.min(1, value));
      return [Math.round(255 * norm), Math.round(80 + 175 * (1 - norm)), Math.round(60), 0.85];
    }

    default:
      return [6, 182, 212, 0.7];
  }
}

