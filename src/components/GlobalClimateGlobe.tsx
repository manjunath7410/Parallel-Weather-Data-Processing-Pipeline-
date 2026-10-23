import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ProjectionMode, 
  WeatherLayer, 
  AtmosphericProbe, 
  SatelliteFeed,
  WeatherStation
} from '../types/weather';
import { 
  CONTINENT_PATHS, 
  sampleAtmosphereAt, 
  getLayerColorRamp,
  GLOBAL_WEATHER_STATIONS,
  getSolarSubsolarPoint
} from '../services/atmosphericPhysics';
import { 
  Globe, 
  Map, 
  RotateCcw, 
  Wind, 
  Radio, 
  Compass, 
  Crosshair,
  Sun,
  Zap,
  ZoomIn,
  ZoomOut,
  Navigation
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';


interface GlobalClimateGlobeProps {
  projection: ProjectionMode;
  setProjection: (mode: ProjectionMode) => void;
  activeLayer: WeatherLayer;
  setActiveLayer: (layer: WeatherLayer) => void;
  activeScenarioId: string;
  modelHour: number;
  satellites: SatelliteFeed[];
  selectedProbe: AtmosphericProbe;
  setSelectedProbe: (probe: AtmosphericProbe) => void;
  showWindParticles: boolean;
  setShowWindParticles: (show: boolean) => void;
  showSatellites: boolean;
  setShowSatellites: (show: boolean) => void;
}

interface WindParticle {
  lat: number;
  lon: number;
  age: number;
  maxAge: number;
  speed: number;
}

interface LightningFlash {
  lat: number;
  lon: number;
  intensity: number;
  decay: number;
}

interface ClickPing {
  lat: number;
  lon: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const GlobalClimateGlobe: React.FC<GlobalClimateGlobeProps> = ({
  projection,
  setProjection,
  activeLayer,
  setActiveLayer,
  activeScenarioId,
  modelHour,
  satellites,
  selectedProbe,
  setSelectedProbe,
  showWindParticles,
  setShowWindParticles,
  showSatellites,
  setShowSatellites,
}) => {
  const { effectiveTheme } = useTheme();
  const isLight = effectiveTheme === 'light';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Globe orientation in refs for 60fps canvas performance
  const centerLonRef = useRef<number>(-40);
  const centerLatRef = useRef<number>(20);
  const zoomRef = useRef<number>(1.0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoRotateRef = useRef<boolean>(true);

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showTerminator, setShowTerminator] = useState<boolean>(true);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string>('');

  // Click Ping animation ref
  const clickPingsRef = useRef<ClickPing[]>([]);
  // Lightning sparks ref
  const lightningFlashesRef = useRef<LightningFlash[]>([]);

  // Sync autoRotate state to ref
  const handleToggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    autoRotateRef.current = next;
  };

  // Atmospheric wind particles for streamline simulation
  const particlesRef = useRef<WindParticle[]>([]);

  // Initialize wind particles
  useEffect(() => {
    const particles: WindParticle[] = [];
    for (let i = 0; i < 480; i++) {
      particles.push({
        lat: (Math.random() - 0.5) * 160,
        lon: (Math.random() - 0.5) * 360,
        age: Math.floor(Math.random() * 80),
        maxAge: 60 + Math.floor(Math.random() * 60),
        speed: 0.8 + Math.random() * 1.6,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Sync orientation when active scenario changes
  useEffect(() => {
    if (activeScenarioId === 'typhoon_cat5') {
      centerLonRef.current = 132.8;
      centerLatRef.current = 18.4;
      zoomRef.current = 1.45;
    } else if (activeScenarioId === 'atmospheric_river') {
      centerLonRef.current = -135;
      centerLatRef.current = 38;
      zoomRef.current = 1.35;
    } else if (activeScenarioId === 'polar_vortex') {
      centerLonRef.current = -60;
      centerLatRef.current = 65;
      zoomRef.current = 1.25;
    } else if (activeScenarioId === 'cmip6_highres') {
      centerLonRef.current = 10;
      centerLatRef.current = 15;
      zoomRef.current = 1.05;
    }
  }, [activeScenarioId]);

  // Teleport to selected weather station
  const handleSelectStation = (stationId: string) => {
    setSelectedStationId(stationId);
    const station = GLOBAL_WEATHER_STATIONS.find((s) => s.id === stationId);
    if (station) {
      centerLonRef.current = station.longitude;
      centerLatRef.current = station.latitude;
      zoomRef.current = 1.7;
      autoRotateRef.current = false;
      setAutoRotate(false);
      const probe = sampleAtmosphereAt(station.latitude, station.longitude, activeScenarioId, modelHour);
      setSelectedProbe(probe);
      clickPingsRef.current.push({
        lat: station.latitude,
        lon: station.longitude,
        radius: 4,
        maxRadius: 28,
        alpha: 1.0,
      });
    }
  };

  // Inverse project screen coordinates to Lat / Lon
  const screenToLatLon = useCallback(
    (screenX: number, screenY: number, width: number, height: number, radius: number) => {
      const centerLat = centerLatRef.current;
      const centerLon = centerLonRef.current;
      const zoom = zoomRef.current;

      if (projection === 'globe') {
        const dx = screenX - width / 2;
        const dy = screenY - height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > radius) return null;

        const rho = dist / radius;
        const c = Math.asin(Math.min(1, rho));
        const sinC = Math.sin(c);
        const cosC = Math.cos(c);

        const phi0 = (centerLat * Math.PI) / 180;
        const lambda0 = (centerLon * Math.PI) / 180;

        const phi = Math.asin(
          cosC * Math.sin(phi0) + (dist === 0 ? 0 : (dy * -1 * sinC * Math.cos(phi0)) / dist)
        );

        const lambda =
          lambda0 +
          Math.atan2(
            dx * sinC,
            dist * Math.cos(phi0) * cosC - dy * -1 * Math.sin(phi0) * sinC
          );

        const latDeg = (phi * 180) / Math.PI;
        const lonDeg = (((lambda * 180) / Math.PI + 180) % 360 + 360) % 360 - 180;

        return { lat: latDeg, lon: lonDeg };
      } else {
        // Flat map
        const normLon = ((screenX - width / 2) / (width * 0.44 * zoom)) * 180;
        const lat = -((screenY - height / 2) / (height * 0.44 * zoom)) * 90;
        const lon = (((normLon + centerLon + 180) % 360) + 360) % 360 - 180;
        if (lat < -90 || lat > 90) return null;
        return { lat, lon };
      }
    },
    [projection]
  );

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    autoRotateRef.current = false;
    setAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const radius = Math.min(canvas.width, canvas.height) * 0.38 * zoomRef.current;
    const coords = screenToLatLon(x, y, canvas.width, canvas.height, radius);
    setHoverCoords(coords);

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.35 / zoomRef.current;
      centerLonRef.current = (((centerLonRef.current - dx * sensitivity + 180) % 360) + 360) % 360 - 180;
      if (projection === 'globe') {
        centerLatRef.current = Math.max(-85, Math.min(85, centerLatRef.current + dy * sensitivity));
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const radius = Math.min(canvas.width, canvas.height) * 0.38 * zoomRef.current;
    const coords = screenToLatLon(x, y, canvas.width, canvas.height, radius);

    if (coords) {
      const probe = sampleAtmosphereAt(coords.lat, coords.lon, activeScenarioId, modelHour);
      setSelectedProbe(probe);
      // Spawn radar ping wave
      clickPingsRef.current.push({
        lat: coords.lat,
        lon: coords.lon,
        radius: 4,
        maxRadius: 32,
        alpha: 1.0,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.14 : -0.14;
    zoomRef.current = Math.max(0.65, Math.min(3.6, zoomRef.current + delta));
  };

  // Zoom controls
  const handleZoom = (direction: 'in' | 'out') => {
    const delta = direction === 'in' ? 0.25 : -0.25;
    zoomRef.current = Math.max(0.65, Math.min(3.6, zoomRef.current + delta));
  };

  const handleResetOrientation = () => {
    centerLonRef.current = -40;
    centerLatRef.current = 20;
    zoomRef.current = 1.0;
  };

  // Main Canvas Render Loop (Zero-setState 60 FPS animation loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Auto-rotation in globe mode when idle
      if (autoRotateRef.current && projection === 'globe' && !isDraggingRef.current) {
        centerLonRef.current = (((centerLonRef.current + 0.12 + 180) % 360) + 360) % 360 - 180;
      }

      const centerLon = centerLonRef.current;
      const centerLat = centerLatRef.current;
      const zoom = zoomRef.current;

      const width = canvas.width;
      const height = canvas.height;
      const radius = Math.min(width, height) * 0.38 * zoom;

      // Clear Canvas
      ctx.fillStyle = isLight ? '#f1f5f9' : '#06080e';
      ctx.fillRect(0, 0, width, height);

      if (!isLight) {
        // Starfield dots in background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        for (let s = 0; s < 40; s++) {
          const sx = ((s * 197) % width);
          const sy = ((s * 131) % height);
          ctx.fillRect(sx, sy, 1, 1);
        }
      }

      // Background subtle scientific grid
      ctx.strokeStyle = isLight ? 'rgba(203, 213, 225, 0.8)' : '#0f172a';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const projectOrthographic = (lat: number, lon: number) => {
        const phi = (lat * Math.PI) / 180;
        const lambda = (lon * Math.PI) / 180;
        const phi0 = (centerLat * Math.PI) / 180;
        const lambda0 = (centerLon * Math.PI) / 180;

        const cosC =
          Math.sin(phi0) * Math.sin(phi) +
          Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

        if (cosC < 0) return null;

        const x = radius * Math.cos(phi) * Math.sin(lambda - lambda0);
        const y = -radius * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

        return { x: width / 2 + x, y: height / 2 + y, visible: true };
      };

      const projectEquirectangular = (lat: number, lon: number) => {
        const normLon = ((((lon - centerLon) + 180) % 360) + 360) % 360 - 180;
        const x = width / 2 + (normLon / 180) * (width * 0.44 * zoom);
        const y = height / 2 - (lat / 90) * (height * 0.44 * zoom);
        return { x, y, visible: true };
      };

      const project = (lat: number, lon: number) => {
        return projection === 'globe'
          ? projectOrthographic(lat, lon)
          : projectEquirectangular(lat, lon);
      };

      // Draw Globe Base or Map Base
      if (projection === 'globe') {
        // Deep ocean sphere gradient
        const oceanGradient = ctx.createRadialGradient(
          width / 2 - radius * 0.3,
          height / 2 - radius * 0.3,
          radius * 0.1,
          width / 2,
          height / 2,
          radius
        );
        oceanGradient.addColorStop(0, isLight ? '#60a5fa' : '#0f1d33');
        oceanGradient.addColorStop(0.7, isLight ? '#2563eb' : '#07111e');
        oceanGradient.addColorStop(1, isLight ? '#1e3a8a' : '#02060b');

        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = oceanGradient;
        ctx.fill();

        // Atmospheric limb glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.clip();
        const limbGlow = ctx.createRadialGradient(
          width / 2,
          height / 2,
          radius * 0.85,
          width / 2,
          height / 2,
          radius
        );
        limbGlow.addColorStop(0, 'rgba(6, 182, 212, 0)');
        limbGlow.addColorStop(1, 'rgba(6, 182, 212, 0.4)');
        ctx.fillStyle = limbGlow;
        ctx.fill();
        ctx.restore();

        // Globe boundary stroke
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isLight ? '#94a3b8' : '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Flat map boundary
        const mapW = width * 0.88 * zoom;
        const mapH = height * 0.88 * zoom;
        ctx.fillStyle = isLight ? '#e2e8f0' : '#0a101d';
        ctx.fillRect(width / 2 - mapW / 2, height / 2 - mapH / 2, mapW, mapH);
        ctx.strokeStyle = isLight ? '#cbd5e1' : '#1e293b';
        ctx.strokeRect(width / 2 - mapW / 2, height / 2 - mapH / 2, mapW, mapH);
      }

      // Draw Graticule Lines (Parallels and Meridians)
      ctx.strokeStyle = isLight ? 'rgba(148, 163, 184, 0.45)' : 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 0.75;
      // Parallels
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 6) {
          const pt = project(lat, lon);
          if (pt && pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }
      // Meridians
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -80; lat <= 80; lat += 6) {
          const pt = project(lat, lon);
          if (pt && pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Render Continents / Landmass Outlines
      ctx.fillStyle = 'rgba(23, 37, 56, 0.78)';
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
      ctx.lineWidth = 1.2;

      for (const polygon of CONTINENT_PATHS) {
        ctx.beginPath();
        let drawnPoints = 0;
        for (let i = 0; i < polygon.length; i++) {
          const [lat, lon] = polygon[i];
          const pt = project(lat, lon);
          if (pt && pt.visible) {
            if (drawnPoints === 0) {
              ctx.moveTo(pt.x, pt.y);
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
            drawnPoints++;
          }
        }
        if (drawnPoints > 2) {
          ctx.fill();
          ctx.stroke();
        }
      }

      // Day / Night Solar Terminator Shading (Realistic Planetary Lighting)
      if (showTerminator) {
        const subsolar = getSolarSubsolarPoint(modelHour);
        ctx.save();
        if (projection === 'globe') {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
          ctx.clip();
        }

        const termStep = projection === 'globe' ? 10 : 12;
        for (let lat = -80; lat <= 80; lat += termStep) {
          for (let lon = -180; lon < 180; lon += termStep) {
            const pt = project(lat, lon);
            if (!pt || !pt.visible) continue;

            // Angular distance to subsolar point (great circle angle)
            const phi1 = (lat * Math.PI) / 180;
            const phi2 = (subsolar.lat * Math.PI) / 180;
            const deltaLon = ((lon - subsolar.lon) * Math.PI) / 180;
            const cosZ = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLon);

            if (cosZ < 0.1) {
              // Night side shadow
              const nightFactor = Math.min(1, Math.max(0, -cosZ + 0.1));
              const nightRadius = (termStep * 1.5 * (radius / 240));
              ctx.fillStyle = `rgba(3, 5, 10, ${nightFactor * 0.65})`;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, nightRadius, 0, Math.PI * 2);
              ctx.fill();

              // Subtle night city lights twinkle
              if (nightFactor > 0.4 && (Math.sin(lat * 3.7 + lon * 2.3) > 0.6)) {
                ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
                ctx.fillRect(pt.x - 0.75, pt.y - 0.75, 1.5, 1.5);
              }
            }
          }
        }
        ctx.restore();
      }

      // Render Dynamic Meteorological Weather Layer
      const gridStep = projection === 'globe' ? 7 : 8;

      ctx.save();
      if (projection === 'globe') {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.clip();
      }

      for (let lat = -80; lat <= 80; lat += gridStep) {
        for (let lon = -180; lon < 180; lon += gridStep) {
          const pt = project(lat, lon);
          if (!pt || !pt.visible) continue;

          // Compute meteorological parameter based on activeLayer
          const sample = sampleAtmosphereAt(lat, lon, activeScenarioId, modelHour);
          let rawVal = sample.brightnessTempK;
          if (activeLayer === 'radar_reflectivity') rawVal = sample.radarReflectivityDbz;
          else if (activeLayer === 'lightning_density') rawVal = sample.lightningFlashesPerMin;
          else if (activeLayer === 'water_vapor') rawVal = sample.precipitableWaterMm;
          else if (activeLayer === 'geopotential_hgt') rawVal = sample.geopotentialHeightM;
          else if (activeLayer === 'climate_anomaly') rawVal = (sample.surfaceTempC - 14) * 0.2;
          else if (activeLayer === 'trace_gases') rawVal = sample.cloudFractionPct / 100;

          const [r, g, b, a] = getLayerColorRamp(activeLayer, rawVal);

          // Draw soft atmospheric cell
          const cellRadius = (gridStep * 1.6 * (radius / 240));
          const radGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, cellRadius);
          radGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a * 0.88})`);
          radGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, cellRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Optical Lightning Spark Flares Simulation (GLM / Lightning Imager)
      if (activeLayer === 'lightning_density' || activeScenarioId === 'typhoon_cat5') {
        // Randomly trigger micro optical flashes near convective cores
        if (Math.random() < 0.18) {
          let sparkLat = 18.4 + (Math.random() - 0.5) * 4;
          let sparkLon = 132.8 + (Math.random() - 0.5) * 4;
          if (activeScenarioId !== 'typhoon_cat5') {
            sparkLat = (Math.random() - 0.5) * 40;
            sparkLon = (Math.random() - 0.5) * 180;
          }
          lightningFlashesRef.current.push({
            lat: sparkLat,
            lon: sparkLon,
            intensity: 1.0,
            decay: 0.12 + Math.random() * 0.1,
          });
        }

        ctx.save();
        if (projection === 'globe') {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
          ctx.clip();
        }

        for (let i = lightningFlashesRef.current.length - 1; i >= 0; i--) {
          const fl = lightningFlashesRef.current[i];
          const pt = project(fl.lat, fl.lon);
          if (pt && pt.visible) {
            const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 14 * fl.intensity);
            glow.addColorStop(0, `rgba(255, 255, 255, ${fl.intensity})`);
            glow.addColorStop(0.4, `rgba(147, 197, 253, ${fl.intensity * 0.7})`);
            glow.addColorStop(1, 'rgba(147, 197, 253, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 14 * fl.intensity, 0, Math.PI * 2);
            ctx.fill();
          }
          fl.intensity -= fl.decay;
          if (fl.intensity <= 0) {
            lightningFlashesRef.current.splice(i, 1);
          }
        }
        ctx.restore();
      }

      // Render Tropospheric Wind Particles & Streamlines
      if (showWindParticles) {
        ctx.save();
        if (projection === 'globe') {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
          ctx.clip();
        }

        const particles = particlesRef.current;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const sample = sampleAtmosphereAt(p.lat, p.lon, activeScenarioId, modelHour);

          const windRad = (sample.windDirectionDeg * Math.PI) / 180;
          const speed = (sample.windSpeedKts / 40) * p.speed;
          const u = -Math.sin(windRad) * speed;
          const v = -Math.cos(windRad) * speed;

          const prevLat = p.lat;
          const prevLon = p.lon;
          p.lat += v * 0.45;
          p.lon += u * 0.65;
          p.age += 1;

          if (p.age > p.maxAge || p.lat > 85 || p.lat < -85) {
            p.lat = (Math.random() - 0.5) * 160;
            p.lon = (Math.random() - 0.5) * 360;
            p.age = 0;
            continue;
          }

          const pt1 = project(prevLat, prevLon);
          const pt2 = project(p.lat, p.lon);

          if (pt1 && pt1.visible && pt2 && pt2.visible) {
            const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.78;
            ctx.strokeStyle = sample.windSpeedKts > 70 
              ? `rgba(255, 255, 255, ${alpha})` 
              : sample.windSpeedKts > 45 
              ? `rgba(56, 189, 248, ${alpha})`
              : `rgba(6, 182, 212, ${alpha * 0.8})`;
            ctx.lineWidth = sample.windSpeedKts > 70 ? 1.8 : 1.0;
            ctx.beginPath();
            ctx.moveTo(pt1.x, pt1.y);
            ctx.lineTo(pt2.x, pt2.y);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Render Satellite Constellation Footprints & Sub-Satellite Points
      if (showSatellites) {
        for (const sat of satellites) {
          const pt = project(sat.latitude, sat.longitude);
          if (pt && pt.visible) {
            if (sat.orbitType === 'GEO') {
              ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, radius * 0.72, 0, Math.PI * 2);
              ctx.stroke();
            }

            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = '10px "IBM Plex Mono", monospace';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(sat.name, pt.x + 8, pt.y + 3);
          }
        }
      }

      // Render Worldwide Weather Stations
      for (const stn of GLOBAL_WEATHER_STATIONS) {
        const pt = project(stn.latitude, stn.longitude);
        if (pt && pt.visible) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render Click Ping Wave Pulses
      for (let p = clickPingsRef.current.length - 1; p >= 0; p--) {
        const ping = clickPingsRef.current[p];
        const pt = project(ping.lat, ping.lon);
        if (pt && pt.visible) {
          ctx.strokeStyle = `rgba(245, 158, 11, ${ping.alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ping.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ping.radius += 1.2;
        ping.alpha -= 0.04;
        if (ping.alpha <= 0) {
          clickPingsRef.current.splice(p, 1);
        }
      }

      // Render Selected Coordinate Probe Crosshair
      const probePt = project(selectedProbe.latitude, selectedProbe.longitude);
      if (probePt && probePt.visible) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;

        const size = 11;
        ctx.beginPath();
        ctx.moveTo(probePt.x - size, probePt.y);
        ctx.lineTo(probePt.x + size, probePt.y);
        ctx.moveTo(probePt.x, probePt.y - size);
        ctx.lineTo(probePt.x, probePt.y + size);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(probePt.x, probePt.y, 6.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px "IBM Plex Mono", monospace';
        ctx.fillText(
          `${selectedProbe.latitude > 0 ? '+' : ''}${selectedProbe.latitude}°N, ${selectedProbe.longitude > 0 ? '+' : ''}${selectedProbe.longitude}°E`,
          probePt.x + 12,
          probePt.y - 8
        );
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(
          `${selectedProbe.surfacePressureHpa} hPa · ${selectedProbe.windSpeedKts} kts · ${selectedProbe.radarReflectivityDbz} dBZ`,
          probePt.x + 12,
          probePt.y + 6
        );
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    projection,
    activeLayer,
    activeScenarioId,
    modelHour,
    satellites,
    selectedProbe,
    showSatellites,
    showTerminator,
    isLight,
  ]);

  // Handle Resize of canvas to parent container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[540px] bg-[#06080e] overflow-hidden select-none flex flex-col"
    >
      {/* Top Floating Viewport HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left: Projection & Layer Controls */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#0a0e1a]/92 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-xl">
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded">
            <button
              onClick={() => setProjection('globe')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                projection === 'globe'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3D Orthographic Planetary Projection"
            >
              <Globe className="w-3.5 h-3.5" />
              3D Globe
            </button>
            <button
              onClick={() => setProjection('equirectangular')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                projection === 'equirectangular'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2D Cylindrical Plate Carrée Projection"
            >
              <Map className="w-3.5 h-3.5" />
              2D Flat
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Layer Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 hidden sm:inline">Layer:</span>
            <select
              value={activeLayer}
              onChange={(e) => setActiveLayer(e.target.value as WeatherLayer)}
              className="bg-slate-900 text-slate-100 text-xs px-2.5 py-1 rounded border border-slate-700/80 outline-none cursor-pointer focus:border-cyan-500"
            >
              <option value="thermal_ir">Thermal IR Brightness Temp (Tb)</option>
              <option value="radar_reflectivity">Radar Composite Reflectivity (dBZ)</option>
              <option value="lightning_density">GLM / LI Optical Lightning Flash</option>
              <option value="water_vapor">Precipitable Water Vapor (PWV)</option>
              <option value="geopotential_hgt">500 hPa Geopotential Height & Isobars</option>
              <option value="wind_streamlines">Jet Stream Kinematics (300 hPa)</option>
              <option value="climate_anomaly">CMIP6 Warming Anomaly (ΔT)</option>
              <option value="trace_gases">TROPOMI Trace Gas Column</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-0.5 hidden md:block" />

          {/* Worldwide Synoptic Station Teleport */}
          <div className="hidden lg:flex items-center gap-1 text-xs">
            <Navigation className="w-3 h-3 text-cyan-400" />
            <select
              value={selectedStationId}
              onChange={(e) => handleSelectStation(e.target.value)}
              className="bg-slate-900 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700/80 outline-none cursor-pointer focus:border-cyan-500 max-w-[150px] truncate"
            >
              <option value="">Jump to Station...</option>
              {GLOBAL_WEATHER_STATIONS.map((stn) => (
                <option key={stn.id} value={stn.id}>
                  {stn.icao} · {stn.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Display Toggles & Zoom Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#0a0e1a]/92 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-xl">
          <button
            onClick={() => setShowWindParticles(!showWindParticles)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              showWindParticles
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Tropospheric Streamlines"
          >
            <Wind className="w-3.5 h-3.5" />
            Streamlines
          </button>

          <button
            onClick={() => setShowSatellites(!showSatellites)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              showSatellites
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Constellation Sub-Points"
          >
            <Radio className="w-3.5 h-3.5" />
            Satellites
          </button>

          <button
            onClick={() => setShowTerminator(!showTerminator)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              showTerminator
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Day/Night Solar Terminator"
          >
            <Sun className="w-3.5 h-3.5" />
            Day/Night
          </button>

          {projection === 'globe' && (
            <button
              onClick={handleToggleAutoRotate}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                autoRotate
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Planetary Rotation"
            >
              <Compass className="w-3.5 h-3.5" />
              Orbit
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Zoom Buttons */}
          <button
            onClick={() => handleZoom('in')}
            className="p-1 text-slate-400 hover:text-slate-100 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-1 text-slate-400 hover:text-slate-100 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetOrientation}
            className="p-1 text-slate-400 hover:text-slate-100 rounded transition-colors"
            title="Reset Orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full flex-1 cursor-crosshair"
      />

      {/* Bottom Floating Telemetry & Color Scale */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
        {/* Layer Color Ramp Scale HUD */}
        <div className="pointer-events-auto bg-[#0a0e1a]/92 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800 text-xs max-w-md shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 font-mono text-[11px]">
            <span>
              {activeLayer === 'thermal_ir' && '185 K (-88°C)'}
              {activeLayer === 'radar_reflectivity' && '5 dBZ (Drizzle)'}
              {activeLayer === 'lightning_density' && '0 /min (Quiet)'}
              {activeLayer === 'water_vapor' && '2.0 mm (Dry)'}
              {activeLayer === 'geopotential_hgt' && '5,100 gpm (Trough)'}
              {activeLayer === 'climate_anomaly' && '-4.0°C (Negative)'}
              {activeLayer === 'trace_gases' && '0.05 Column'}
              {activeLayer === 'wind_streamlines' && '0 kts'}
            </span>
            <span className="font-semibold text-slate-200">
              {activeLayer === 'thermal_ir' && 'Cloud Top Brightness Temp'}
              {activeLayer === 'radar_reflectivity' && 'NEXRAD Composite dBZ'}
              {activeLayer === 'lightning_density' && 'GLM Optical Lightning Flash'}
              {activeLayer === 'water_vapor' && 'Total Column Moisture'}
              {activeLayer === 'geopotential_hgt' && '500 hPa Isobar Height'}
              {activeLayer === 'climate_anomaly' && 'CMIP6 Surface ΔT'}
              {activeLayer === 'trace_gases' && 'TROPOMI Trace Column'}
              {activeLayer === 'wind_streamlines' && 'Tropospheric Wind Field'}
            </span>
            <span>
              {activeLayer === 'thermal_ir' && '300 K (+27°C)'}
              {activeLayer === 'radar_reflectivity' && '70 dBZ (Severe Hail)'}
              {activeLayer === 'lightning_density' && '50+ /min (Supercell)'}
              {activeLayer === 'water_vapor' && '68.0 mm (River)'}
              {activeLayer === 'geopotential_hgt' && '5,880 gpm (Ridge)'}
              {activeLayer === 'climate_anomaly' && '+4.0°C (Warming)'}
              {activeLayer === 'trace_gases' && '0.98 Column'}
              {activeLayer === 'wind_streamlines' && '165 kts'}
            </span>
          </div>
          {/* Visual gradient bar */}
          <div
            className="w-full h-2 rounded-sm"
            style={{
              background:
                activeLayer === 'thermal_ir'
                  ? 'linear-gradient(to right, #ff0055, #c084fc, #38bdf8, #1e3a8a, #0f172a)'
                  : activeLayer === 'radar_reflectivity'
                  ? 'linear-gradient(to right, #22c55e, #eab308, #ef4444, #d946ef)'
                  : activeLayer === 'lightning_density'
                  ? 'linear-gradient(to right, #fef08a, #f59e0b, #ffffff)'
                  : activeLayer === 'water_vapor'
                  ? 'linear-gradient(to right, #78350f, #0d9488, #38bdf8, #ffffff)'
                  : activeLayer === 'geopotential_hgt'
                  ? 'linear-gradient(to right, #1d4ed8, #059669, #f59e0b, #dc2626)'
                  : activeLayer === 'climate_anomaly'
                  ? 'linear-gradient(to right, #2563eb, #e2e8f0, #f59e0b, #b91c1c)'
                  : 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)',
            }}
          />
        </div>

        {/* Hover / Probe Coordinate Box */}
        <div className="pointer-events-auto bg-[#0a0e1a]/92 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-4 shadow-xl">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Crosshair className="w-3.5 h-3.5" />
            <span>PROBE HUD:</span>
          </div>
          <div>
            <span className="text-slate-400">Target: </span>
            <span className="text-white font-semibold">
              {hoverCoords
                ? `${hoverCoords.lat.toFixed(1)}°N, ${hoverCoords.lon.toFixed(1)}°E`
                : `${selectedProbe.latitude}°N, ${selectedProbe.longitude}°E`}
            </span>
          </div>
          <div>
            <span className="text-slate-400">SLP: </span>
            <span className="text-slate-200 font-semibold">{selectedProbe.surfacePressureHpa} hPa</span>
          </div>
          <div>
            <span className="text-slate-400">Wind: </span>
            <span className="text-slate-200 font-semibold">{selectedProbe.windSpeedKts} kts</span>
          </div>
          <div className="hidden sm:inline">
            <span className="text-slate-400">dBZ: </span>
            <span className="text-cyan-300 font-semibold">{selectedProbe.radarReflectivityDbz}</span>
          </div>
          <div className="text-[11px] text-slate-500 hidden md:inline">
            Click to pin sounding
          </div>
        </div>
      </div>
    </div>
  );
};
