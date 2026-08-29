/**
 * @apps/editor
 * District Map & Interactive POI Placement Authoring Tool.
 * Provides visual coordinate positioning (0-100%), POI metadata editing, action inspection, and JSON export.
 */

import React, { useState } from 'react';
import { GameMap, POI, POICategory } from '@neon-ether/game-schema';
import { GAME_CONTENT_MANIFEST } from '@neon-ether/content';
import { Badge, Button, Panel } from '@neon-ether/shared-ui';
import {
  Activity,
  AlertTriangle,
  Code,
  Copy,
  Download,
  Eye,
  Home,
  Layers,
  Lock,
  MapPin,
  Plus,
  Radio,
  Save,
  Shield,
  ShieldAlert,
  Sparkles,
  Store,
  Terminal,
  Trash2,
  User,
  Wrench,
  Zap,
} from 'lucide-react';

export const MapEditor: React.FC = () => {
  const [map, setMap] = useState<GameMap>(() => {
    return JSON.parse(JSON.stringify(GAME_CONTENT_MANIFEST.maps[0])) as GameMap;
  });

  const [pois, setPois] = useState<POI[]>(() => {
    return JSON.parse(JSON.stringify(GAME_CONTENT_MANIFEST.pois)) as POI[];
  });

  const [selectedPoiId, setSelectedPoiId] = useState<string>(pois[0]?.id || '');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const selectedPoi = pois.find((p) => p.id === selectedPoiId);

  const handleUpdatePoiPosition = (poiId: string, x: number, y: number) => {
    setPois((prev) =>
      prev.map((p) => (p.id === poiId ? { ...p, mapPosition: { x: Math.round(x), y: Math.round(y) } } : p))
    );
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPoiId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    handleUpdatePoiPosition(selectedPoiId, Math.max(5, Math.min(95, clickX)), Math.max(5, Math.min(95, clickY)));
  };

  const handleCopyMapJson = () => {
    navigator.clipboard.writeText(JSON.stringify([map], null, 2));
    setCopyFeedback('Map JSON copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCopyPoisJson = () => {
    navigator.clipboard.writeText(JSON.stringify(pois, null, 2));
    setCopyFeedback('POIs JSON copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleAddNewPoi = () => {
    const newId = `poi_custom_${Date.now()}`;
    const newPoi: POI = {
      id: newId,
      name: 'New Undercity POI',
      description: 'Newly discovered tech node or safehouse.',
      tags: ['Custom', 'POI'],
      mapId: map.id,
      mapPosition: { x: 50, y: 50 },
      category: 'Terminal',
      icon: 'Terminal',
      dangerLevel: 1,
      ambientEtherLevel: 25,
      npcIds: [],
      questIds: [],
      eventIds: [],
      encounterIds: [],
      visibilityConditions: [],
      availabilityConditions: [],
      actions: [
        {
          id: `act_${Date.now()}`,
          label: 'Scan Area',
          description: 'Survey the immediate surroundings for ether conduits.',
          actionType: 'Explore',
          icon: 'Eye',
          cost: { ap: 1 },
          isRepeatable: true,
          hideIfUnavailable: false,
          conditions: [],
          effects: [],
        },
      ],
    };

    setPois([...pois, newPoi]);
    setSelectedPoiId(newId);
    if (!map.poiIds.includes(newId)) {
      setMap({ ...map, poiIds: [...map.poiIds, newId] });
    }
  };

  const handleDeletePoi = (poiId: string) => {
    setPois(pois.filter((p) => p.id !== poiId));
    setMap({ ...map, poiIds: map.poiIds.filter((id) => id !== poiId) });
    if (selectedPoiId === poiId) {
      setSelectedPoiId(pois.find((p) => p.id !== poiId)?.id || '');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full font-mono text-xs">
      {/* Left Sidebar: District & POI List */}
      <div className="w-full lg:w-80 flex flex-col gap-3">
        <Panel
          title="DISTRICT MAP CONFIG"
          subtitle={`${map.id}`}
          headerRight={
            <Button size="sm" variant="secondary" onClick={handleCopyMapJson}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          }
        >
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase">District Name:</label>
              <input
                type="text"
                value={map.name}
                onChange={(e) => setMap({ ...map, name: e.target.value })}
                className="w-full bg-black/60 border border-zinc-800 rounded p-1.5 text-cyan-300 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Ether %:</label>
                <input
                  type="number"
                  value={map.ambientEtherLevel}
                  onChange={(e) => setMap({ ...map, ambientEtherLevel: Number(e.target.value) })}
                  className="w-full bg-black/60 border border-zinc-800 rounded p-1.5 text-purple-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Security Lvl:</label>
                <input
                  type="number"
                  value={map.securityLevel}
                  onChange={(e) => setMap({ ...map, securityLevel: Number(e.target.value) })}
                  className="w-full bg-black/60 border border-zinc-800 rounded p-1.5 text-rose-300"
                />
              </div>
            </div>
          </div>
        </Panel>

        {/* POI List & Creator */}
        <Panel
          title="DISTRICT POIs"
          subtitle={`${pois.length} PLACEMENT(S)`}
          headerRight={
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="primary" onClick={handleAddNewPoi} leftIcon={<Plus className="w-3 h-3" />}>
                Add
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCopyPoisJson}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {pois.map((poi) => (
              <div
                key={poi.id}
                onClick={() => setSelectedPoiId(poi.id)}
                className={`p-2 rounded border flex items-center justify-between cursor-pointer transition-all ${
                  selectedPoiId === poi.id
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-md font-bold'
                    : 'bg-black/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs">{poi.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    Pos: ({poi.mapPosition.x}%, {poi.mapPosition.y}%) • {poi.category}
                  </div>
                </div>
                {selectedPoiId === poi.id && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                )}
              </div>
            ))}
          </div>
        </Panel>

        {copyFeedback && (
          <div className="p-2 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-center rounded">
            {copyFeedback}
          </div>
        )}
      </div>

      {/* Center: Visual Interactive Coordinate Canvas */}
      <div className="flex-1 flex flex-col gap-3">
        <Panel
          title="MAP CANVAS // NORMALIZED COORDINATE POSITIONING"
          subtitle="CLICK ANYWHERE ON CANVAS TO RELOCATE SELECTED POI (0-100%)"
          glow="cyan"
          className="flex-1"
        >
          <div
            onClick={handleCanvasClick}
            className="flex-1 min-h-[460px] bg-zinc-950 relative rounded-xl border border-zinc-800 overflow-hidden cursor-crosshair select-none"
          >
            {/* Grid background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(255,255,255,0))] pointer-events-none" />
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            {/* Radar scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none opacity-30" />

            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
              {pois.map((p, idx) => {
                const next = pois[idx + 1];
                if (!next) return null;
                return (
                  <line
                    key={`${p.id}-${next.id}`}
                    x1={`${p.mapPosition.x}%`}
                    y1={`${p.mapPosition.y}%`}
                    x2={`${next.mapPosition.x}%`}
                    y2={`${next.mapPosition.y}%`}
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </svg>

            {/* Render POI Markers on Canvas */}
            {pois.map((poi) => {
              const isSelected = selectedPoiId === poi.id;

              return (
                <div
                  key={poi.id}
                  style={{
                    left: `${poi.mapPosition.x}%`,
                    top: `${poi.mapPosition.y}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPoiId(poi.id);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer flex flex-col items-center group transition-transform ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-cyan-500 text-black border-white shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                        : 'bg-black/80 border-cyan-500 text-cyan-300'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span
                    className={`mt-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider whitespace-nowrap border ${
                      isSelected
                        ? 'bg-cyan-950 text-cyan-200 border-cyan-400'
                        : 'bg-black/70 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {poi.name} ({poi.mapPosition.x}%, {poi.mapPosition.y}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Selected POI Inspector & Actions Form */}
        {selectedPoi && (
          <Panel
            title={`SELECTED POI INSPECTOR // ${selectedPoi.name.toUpperCase()}`}
            subtitle={`ID: ${selectedPoi.id}`}
            headerRight={
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeletePoi(selectedPoi.id)}
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
              >
                Delete
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">POI Name:</label>
                <input
                  type="text"
                  value={selectedPoi.name}
                  onChange={(e) => {
                    setPois(
                      pois.map((p) => (p.id === selectedPoi.id ? { ...p, name: e.target.value } : p))
                    );
                  }}
                  className="w-full bg-black/60 border border-zinc-800 rounded p-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Category:</label>
                <select
                  value={selectedPoi.category}
                  onChange={(e) => {
                    setPois(
                      pois.map((p) =>
                        p.id === selectedPoi.id ? { ...p, category: e.target.value as POICategory } : p
                      )
                    );
                  }}
                  className="w-full bg-black/60 border border-zinc-800 rounded p-1.5 text-cyan-300"
                >
                  {['Safehouse', 'Market', 'Terminal', 'EtherRift', 'SecurityNode', 'Club', 'Clinic', 'Hideout'].map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Danger Lvl (1-5):</label>
                <input
                  type="number"
                  value={selectedPoi.dangerLevel}
                  onChange={(e) => {
                    setPois(
                      pois.map((p) =>
                        p.id === selectedPoi.id ? { ...p, dangerLevel: Number(e.target.value) } : p
                      )
                    );
                  }}
                  className="w-full bg-black/60 border border-zinc-800 rounded p-1.5 text-rose-300"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] text-zinc-400 uppercase">Description / Lore:</label>
                <textarea
                  value={selectedPoi.description}
                  onChange={(e) => {
                    setPois(
                      pois.map((p) => (p.id === selectedPoi.id ? { ...p, description: e.target.value } : p))
                    );
                  }}
                  className="w-full bg-black/60 border border-zinc-800 rounded p-1.5 text-zinc-300 font-sans text-xs h-16"
                />
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};
