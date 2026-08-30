/**
 * @neon-ether/shared-ui
 * World / District Map Screen with interactive POI markers and tactical HUD.
 * Renders the district overview and handles POI selection/travel.
 */

import React, { useState } from 'react';
import { GameMap, POICategory } from '@neon-ether/game-schema';
import { ResolvedEnvironment, ResolvedPOI } from '@neon-ether/game-runtime';
import { EnvironmentalLayer } from './EnvironmentalLayer.tsx';
import { Badge } from './Badge.tsx';
import { Button } from './Button.tsx';
import { Panel } from './Panel.tsx';
import {
  Activity,
  AlertTriangle,
  Bed,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Eye,
  Home,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Radio,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Store,
  Terminal,
  User,
  Wrench,
  Zap,
} from 'lucide-react';

export interface WorldMapViewProps {
  map: GameMap;
  pois: ResolvedPOI[];
  currentPoiId: string | null;
  onSelectPoi: (poiId: string) => void;
  onTravelToPoi?: (poiId: string) => void;
  playerVitals?: {
    actionPointsCurrent: number;
    actionPointsMax: number;
    currentEther: number;
    maxEther: number;
  };
  environment?: ResolvedEnvironment;
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({
  map,
  pois,
  currentPoiId,
  onSelectPoi,
  onTravelToPoi,
  playerVitals,
  environment,
}) => {
  const [hoveredPoiId, setHoveredPoiId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const hoveredPoi = pois.find((p) => p.id === hoveredPoiId);

  const getCategoryIcon = (category: POICategory, iconName?: string) => {
    switch (iconName || category) {
      case 'Home':
      case 'Safehouse':
        return <Home className="w-4 h-4" />;
      case 'Store':
      case 'Market':
        return <Store className="w-4 h-4" />;
      case 'Cpu':
      case 'Terminal':
        return <Terminal className="w-4 h-4" />;
      case 'Zap':
      case 'Sparkles':
      case 'EtherRift':
        return <Sparkles className="w-4 h-4" />;
      case 'ShieldAlert':
      case 'SecurityNode':
        return <ShieldAlert className="w-4 h-4" />;
      case 'Radio':
        return <Radio className="w-4 h-4" />;
      case 'Wrench':
        return <Wrench className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: POICategory) => {
    switch (category) {
      case 'Safehouse':
        return {
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500',
          text: 'text-emerald-300',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
          pin: 'bg-emerald-500 text-black',
        };
      case 'Market':
        return {
          bg: 'bg-cyan-500/20',
          border: 'border-cyan-500',
          text: 'text-cyan-300',
          glow: 'shadow-[0_0_15px_rgba(6,182,212,0.5)]',
          pin: 'bg-cyan-500 text-black',
        };
      case 'Terminal':
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-500',
          text: 'text-blue-300',
          glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]',
          pin: 'bg-blue-500 text-white',
        };
      case 'EtherRift':
        return {
          bg: 'bg-[#bc13fe]/20',
          border: 'border-[#bc13fe]',
          text: 'text-purple-300',
          glow: 'shadow-[0_0_15px_rgba(188,19,254,0.5)]',
          pin: 'bg-[#bc13fe] text-white',
        };
      case 'SecurityNode':
        return {
          bg: 'bg-rose-500/20',
          border: 'border-rose-500',
          text: 'text-rose-300',
          glow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]',
          pin: 'bg-rose-500 text-white',
        };
      default:
        return {
          bg: 'bg-amber-500/20',
          border: 'border-amber-500',
          text: 'text-amber-300',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
          pin: 'bg-amber-500 text-black',
        };
    }
  };

  const filteredPois = pois.filter((poi) => {
    if (filterCategory === 'ALL') return true;
    return poi.category === filterCategory;
  });

  const categories = ['ALL', ...Array.from(new Set(pois.map((p) => p.category)))];

  return (
    <div className="relative w-full h-full flex flex-col gap-3 font-mono select-none overflow-hidden"><EnvironmentalLayer visuals={environment?.definition.visuals} label={environment?.definition.name}/>
      {environment&&<div className="pointer-events-none absolute right-4 top-4 z-30 rounded border border-cyan-400/30 bg-black/70 px-2 py-1 text-[10px] text-cyan-200">{environment.definition.visuals.icon??'◌'} {environment.definition.name}</div>}
      {/* Map District Header Bar */}
      <div className="bg-zinc-950/90 border border-zinc-800/80 p-3 rounded-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide uppercase">
                {map.name}
              </h2>
              <Badge variant="cyan" size="xs">
                {map.district}
              </Badge>
              {map.subregion && (
                <span className="text-xs text-zinc-400 font-sans">
                  / {map.subregion}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 line-clamp-1 max-w-xl font-sans mt-0.5">
              {map.description}
            </p>
          </div>
        </div>

        {/* District Metrics */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-2.5 py-1 bg-black/50 border border-zinc-800 rounded-lg flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#bc13fe]" />
            <span className="text-zinc-400">Ether Saturation:</span>
            <span className="text-purple-300 font-bold">{map.ambientEtherLevel}%</span>
          </div>

          <div className="px-2.5 py-1 bg-black/50 border border-zinc-800 rounded-lg flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-zinc-400">Security Rating:</span>
            <span className="text-rose-300 font-bold">Lvl {map.securityLevel}</span>
          </div>

          <div className="px-2.5 py-1 bg-black/50 border border-zinc-800 rounded-lg flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-zinc-400">POIs:</span>
            <span className="text-cyan-300 font-bold">
              {pois.filter((p) => p.runtime.isVisited).length} / {pois.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Area & POI Sidebar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[520px]">
        {/* Visual Map Overview Viewport */}
        <div className="lg:col-span-8 xl:col-span-9 bg-zinc-950 relative rounded-xl border border-zinc-800 overflow-hidden flex flex-col shadow-2xl">
          {/* Futuristic Tactical Cyber Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(255,255,255,0))] pointer-events-none" />
          
          {/* Cyberpunk Map Canvas & Grid Matrix */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          
          {/* Radar Scanline Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none opacity-40" />

          {/* District Boundary Vector Graphics Decoration */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
            <line x1="20%" y1="32%" x2="48%" y2="42%" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="48%" y1="42%" x2="80%" y2="28%" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="48%" y1="42%" x2="35%" y2="75%" stroke="#bc13fe" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="48%" y1="42%" x2="76%" y2="78%" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx="20%" cy="32%" r="28" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" />
            <circle cx="80%" cy="28%" r="35" fill="none" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.4" />
            <circle cx="35%" cy="75%" r="40" fill="none" stroke="#bc13fe" strokeWidth="1" strokeOpacity="0.4" />
            <circle cx="76%" cy="78%" r="32" fill="none" stroke="#f43f5e" strokeWidth="1" strokeOpacity="0.4" />
          </svg>

          {/* Map Top Controls Overlay */}
          <div className="relative z-10 p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-black/70 p-1 border border-zinc-800/80 rounded-lg backdrop-blur-md">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="bg-black/70 px-3 py-1 border border-zinc-800/80 rounded-lg text-[11px] text-zinc-300 backdrop-blur-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>RADAR SYNCHRONIZED</span>
            </div>
          </div>

          {/* POI Interactive Markers Layer */}
          <div className="relative flex-1 w-full h-full min-h-[440px]">
            {filteredPois.map((poi) => {
              const isCurrent = currentPoiId === poi.id;
              const isHovered = hoveredPoiId === poi.id;
              const styleColor = getCategoryColor(poi.category);

              return (
                <div
                  key={poi.id}
                  id={`poi-marker-${poi.id}`}
                  style={{
                    left: `${poi.mapPosition.x}%`,
                    top: `${poi.mapPosition.y}%`,
                  }}
                  onMouseEnter={() => setHoveredPoiId(poi.id)}
                  onMouseLeave={() => setHoveredPoiId(null)}
                  onClick={() => onSelectPoi(poi.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group flex flex-col items-center"
                >
                  {/* Current Player Radar Ripple */}
                  {isCurrent && (
                    <div className="absolute -inset-3 rounded-full bg-cyan-500/20 border border-cyan-400/40 animate-ping pointer-events-none" />
                  )}

                  {/* POI Marker Badge Pin */}
                  <div
                    className={`relative p-2.5 rounded-xl border-2 transition-all duration-300 flex items-center justify-center ${
                      styleColor.bg
                    } ${styleColor.border} ${styleColor.text} ${
                      isHovered
                        ? `scale-125 ${styleColor.glow} z-30 ring-2 ring-white/40`
                        : isCurrent
                        ? 'ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)]'
                        : 'hover:scale-110 shadow-lg'
                    }`}
                  >
                    {poi.runtime.isLocked ? (
                      <Lock className="w-4 h-4 text-zinc-400" />
                    ) : (
                      getCategoryIcon(poi.category, poi.icon)
                    )}

                    {/* Visited Checkmark */}
                    {poi.runtime.isVisited && !isCurrent && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 text-black rounded-full flex items-center justify-center text-[8px] font-bold">
                        ✓
                      </span>
                    )}

                    {/* Quest Indicator */}
                    {poi.questIds.length > 0 && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400 text-black rounded-full flex items-center justify-center text-[8px] font-bold animate-bounce">
                        !
                      </span>
                    )}
                  </div>

                  {/* Marker Floating Title Label */}
                  <div
                    className={`mt-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider whitespace-nowrap transition-all backdrop-blur-md border ${
                      isHovered || isCurrent
                        ? 'bg-black/90 text-white border-cyan-400 shadow-md scale-105'
                        : 'bg-black/60 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {isCurrent && <span className="text-cyan-400">●</span>}
                      <span>{poi.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map Footer Helper Instructions */}
          <div className="relative z-10 p-2.5 bg-black/80 border-t border-zinc-800 text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                <span>Current Location</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Safehouse</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Ether Anomaly</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Security / Vault</span>
              </span>
            </div>
            <span className="text-zinc-500">
              Click any Point of Interest to enter location descriptor & actions.
            </span>
          </div>
        </div>

        {/* Right Sidebar: POI Quick Inspector & Location List */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
          {/* Hovered or Selected POI Detailed Info Card */}
          {hoveredPoi ? (
            <Panel
              title={hoveredPoi.name}
              subtitle={`${hoveredPoi.category.toUpperCase()} // ${hoveredPoi.district || 'SECTOR 09'}`}
              glow={hoveredPoi.category === 'EtherRift' ? 'purple' : 'cyan'}
              className="border-cyan-500/40"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <Badge variant={hoveredPoi.category === 'Safehouse' ? 'emerald' : 'cyan'} size="xs">
                    {hoveredPoi.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    <span>Danger: Lvl {hoveredPoi.dangerLevel}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-black/40 p-2.5 border border-zinc-900 rounded-lg">
                  {hoveredPoi.description}
                </p>

                {/* Available Actions Preview */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Available Interactions ({hoveredPoi.resolvedActions.length}):
                  </span>
                  <div className="space-y-1">
                    {hoveredPoi.resolvedActions.map((act) => (
                      <div
                        key={act.id}
                        className="p-1.5 bg-black/50 border border-zinc-800 rounded flex items-center justify-between text-xs text-zinc-300"
                      >
                        <span className="truncate">{act.label}</span>
                        {act.cost?.ap && (
                          <span className="text-[10px] text-cyan-400 shrink-0 ml-1">
                            {act.cost.ap} AP
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button to Open Location */}
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => onSelectPoi(hoveredPoi.id)}
                  className="mt-1"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>EXPLORE LOCATION</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Button>
              </div>
            </Panel>
          ) : (
            <Panel title="SECTOR DIRECTORY" subtitle="ALL POINTS OF INTEREST">
              <div className="text-xs text-zinc-400 font-sans mb-2">
                Hover over a node or select a location from the district index below:
              </div>
            </Panel>
          )}

          {/* Quick POI Directory List */}
          <div className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-1.5 overflow-y-auto max-h-[380px]">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">
              District Nodes:
            </span>
            {pois.map((poi) => {
              const isCurrent = currentPoiId === poi.id;
              const isHovered = hoveredPoiId === poi.id;
              const styleColor = getCategoryColor(poi.category);

              return (
                <button
                  key={poi.id}
                  onMouseEnter={() => setHoveredPoiId(poi.id)}
                  onMouseLeave={() => setHoveredPoiId(null)}
                  onClick={() => onSelectPoi(poi.id)}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : isHovered
                      ? 'bg-zinc-800 border-zinc-600 text-white'
                      : 'bg-black/40 border-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded border shrink-0 ${styleColor.bg} ${styleColor.border} ${styleColor.text}`}
                    >
                      {getCategoryIcon(poi.category, poi.icon)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-zinc-200">
                        {poi.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {poi.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isCurrent && (
                      <Badge variant="cyan" size="xs">
                        HERE
                      </Badge>
                    )}
                    {poi.runtime.isVisited && !isCurrent && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        VISITED
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
