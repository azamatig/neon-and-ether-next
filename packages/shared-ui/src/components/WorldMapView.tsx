import React, { useState } from 'react';
import type { GameMap, POICategory } from '@neon-ether/game-schema';
import type { ResolvedEnvironment, ResolvedPOI } from '@neon-ether/game-runtime';
import { Check, CircleDot, Lock, MapPin, ShieldAlert, Sparkles } from 'lucide-react';
import { EnvironmentalLayer } from './EnvironmentalLayer.tsx';

export interface WorldMapViewProps {
  map: GameMap;
  pois: ResolvedPOI[];
  currentPoiId: string | null;
  onSelectPoi: (poiId: string) => void;
  onTravelToPoi?: (poiId: string) => void;
  playerVitals?: { actionPointsCurrent: number; actionPointsMax: number; currentEther: number; maxEther: number };
  environment?: ResolvedEnvironment;
}

const isImageSource = (value?: string) => Boolean(value && /^(https?:|\/|data:|\.\/|\.\.\/)/.test(value));

const markerTone = (poi: ResolvedPOI): string => {
  if (poi.runtime.isLocked || !poi.isAvailable) return 'locked';
  if (poi.category === 'EtherRift' || poi.category === 'FactionHQ') return 'ether';
  if (poi.category === 'Encounter' || poi.category === 'SecurityNode' || poi.category === 'Vault') return 'danger';
  if (poi.dangerLevel >= 3 || poi.questIds.length > 0) return 'warning';
  return 'navigation';
};

const categoryIcon = (category: POICategory) => category === 'EtherRift'
  ? <Sparkles aria-hidden="true" />
  : category === 'Encounter' || category === 'SecurityNode' || category === 'Vault'
    ? <ShieldAlert aria-hidden="true" />
    : <MapPin aria-hidden="true" />;

export const WorldMapView: React.FC<WorldMapViewProps> = ({ map, pois, currentPoiId, onSelectPoi, environment }) => {
  const [focusedPoiId, setFocusedPoiId] = useState<string | null>(null);
  const focusedPoi = pois.find((poi) => poi.id === focusedPoiId);
  const backgroundStyle = isImageSource(map.backgroundImage) ? { backgroundImage: `url("${map.backgroundImage}")` } : undefined;

  return (
    <section className="ne-world-map" aria-label={`${map.name} map`}>
      <header className="ne-map-header">
        <div><CircleDot aria-hidden="true" /><span>Holographic transit region intercept</span></div>
        <p>Active sector: <strong>{map.subregion ?? map.district}</strong></p>
      </header>

      <div className="ne-map-canvas" style={backgroundStyle}>
        {!backgroundStyle && <div className="ne-map-placeholder" aria-hidden="true" />}
        <div className="ne-map-grade" aria-hidden="true" />
        <EnvironmentalLayer visuals={environment?.definition.visuals} label={environment?.definition.name} />

        {pois.map((poi) => {
          const isCurrent = currentPoiId === poi.id;
          const isFocused = focusedPoiId === poi.id;
          const tone = markerTone(poi);
          return (
            <button
              type="button"
              key={poi.id}
              className="ne-poi-marker"
              data-tone={tone}
              data-current={isCurrent}
              data-selected={isFocused}
              aria-label={`${poi.name}${isCurrent ? ', current location' : ''}${poi.runtime.isLocked ? ', locked' : ''}`}
              aria-pressed={isFocused}
              style={{ left: `${poi.mapPosition.x}%`, top: `${poi.mapPosition.y}%` }}
              onMouseEnter={() => setFocusedPoiId(poi.id)}
              onMouseLeave={() => setFocusedPoiId(null)}
              onFocus={() => setFocusedPoiId(poi.id)}
              onBlur={() => setFocusedPoiId(null)}
              onClick={() => poi.isAvailable && onSelectPoi(poi.id)}
              aria-disabled={!poi.isAvailable}
            >
              <span className="ne-poi-marker__disc">{poi.runtime.isLocked ? <Lock aria-hidden="true" /> : categoryIcon(poi.category)}</span>
              {poi.questIds.length > 0 && <span className="ne-poi-marker__quest" aria-label="Quest location">!</span>}
              {poi.runtime.isVisited && !isCurrent && <span className="ne-poi-marker__visited" aria-label="Visited"><Check /></span>}
              {(isFocused || isCurrent) && (
                <span className="ne-poi-tooltip" role="tooltip">
                  <strong>{poi.name}</strong>
                  <small>{poi.category}</small>
                  {poi.questIds.length > 0 && <em>Quest objective</em>}
                  {isCurrent && <em>Current location</em>}
                  {!isCurrent && poi.runtime.isVisited && <em>Visited</em>}
                  {!poi.isAvailable && <em>Unavailable</em>}
                </span>
              )}
            </button>
          );
        })}

        {pois.length === 0 && <div className="ne-map-empty">No mapped locations in this sector.</div>}
      </div>
      <span className="sr-only" aria-live="polite">{focusedPoi?.name ?? ''}</span>
    </section>
  );
};
