import React, { useMemo, useState } from 'react';
import type { GameMap, MapRegionInfo, POI } from '@neon-ether/game-schema';
import { GitBranch, Image, MapPin, Plus, Trash2 } from 'lucide-react';

interface MapEditorProps {
  map: GameMap;
  pois: POI[];
  onChangeMap: (map: GameMap) => void;
  onChangePois: (pois: POI[]) => void;
}

type Metadata = Record<string, string | number | boolean>;
const inputClass = 'w-full rounded border border-zinc-700 bg-[#060812] px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500';

const MetadataEditor: React.FC<{ value: Metadata; onChange: (value: Metadata) => void }> = ({ value, onChange }) => {
  const add = () => { let index = Object.keys(value).length + 1; while (`key_${index}` in value) index += 1; onChange({ ...value, [`key_${index}`]: '' }); };
  return <div className="space-y-1">{Object.entries(value).map(([key, entry]) => <div key={key} className="flex gap-1"><input value={key} onChange={(event) => { const next = { ...value }; delete next[key]; next[event.target.value] = entry; onChange(next); }} className={inputClass}/><input value={String(entry)} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className={inputClass}/><button type="button" onClick={() => { const next = { ...value }; delete next[key]; onChange(next); }} className="p-1 text-rose-400"><Trash2 className="h-3.5 w-3.5"/></button></div>)}<button type="button" onClick={add} className="flex items-center gap-1 text-[10px] text-cyan-300"><Plus className="h-3 w-3"/> Metadata</button></div>;
};

/** Visual projection that writes directly to ordinary GameMap and POI definitions. */
export const MapEditor: React.FC<MapEditorProps> = ({ map, pois, onChangeMap, onChangePois }) => {
  const mapPois = useMemo(() => map.poiIds.map((id) => pois.find((poi) => poi.id === id)).filter((poi): poi is POI => Boolean(poi)), [map.poiIds, pois]);
  const [selectedPoiId, setSelectedPoiId] = useState(map.defaultPoiId ?? mapPois[0]?.id ?? '');
  const [selectedRegionId, setSelectedRegionId] = useState(map.regions[0]?.id ?? '');
  const [draggingPoiId, setDraggingPoiId] = useState('');
  const [routeFromId, setRouteFromId] = useState('');
  const selectedPoi = mapPois.find((poi) => poi.id === selectedPoiId);
  const selectedRegion = map.regions.find((region) => region.id === selectedRegionId);

  const updatePoi = (poiId: string, update: (poi: POI) => POI) => onChangePois(pois.map((poi) => poi.id === poiId ? update(poi) : poi));
  const updateRegion = (regionId: string, update: (region: MapRegionInfo) => MapRegionInfo) => onChangeMap({ ...map, regions: map.regions.map((region) => region.id === regionId ? update(region) : region) });
  const positionFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)), y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)) };
  };
  const movePoi = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingPoiId) return;
    const position = positionFromPointer(event);
    updatePoi(draggingPoiId, (poi) => ({ ...poi, mapPosition: { x: Math.round(position.x * 10) / 10, y: Math.round(position.y * 10) / 10 } }));
  };

  const addRegion = () => {
    let index = map.regions.length + 1; while (map.regions.some((region) => region.id === `region_${index}`)) index += 1;
    const region: MapRegionInfo = { id: `region_${index}`, name: 'New Region', description: '', securityLevel: 1, bounds: { x: 10 + index * 3, y: 10 + index * 3, width: 28, height: 24 }, metadata: {} };
    onChangeMap({ ...map, regions: [...map.regions, region] }); setSelectedRegionId(region.id);
  };
  const deleteRegion = () => {
    if (!selectedRegion) return;
    onChangeMap({ ...map, regions: map.regions.filter((region) => region.id !== selectedRegion.id) });
    onChangePois(pois.map((poi) => poi.mapId === map.id && poi.regionId === selectedRegion.id ? { ...poi, regionId: undefined } : poi));
    setSelectedRegionId('');
  };
  const addPoi = () => {
    let index = pois.length + 1; while (pois.some((poi) => poi.id === `poi_map_${index}`)) index += 1;
    const id = `poi_map_${index}`;
    const poi: POI = { id, name: 'New Location', description: '', tags: [], mapId: map.id, regionId: selectedRegionId || undefined, mapPosition: { x: 50, y: 50 }, icon: 'MapPin', category: 'Landmark', visibilityConditions: [], availabilityConditions: [], actions: [], npcIds: [], questIds: [], eventIds: [], encounterIds: [], dangerLevel: 1, ambientEtherLevel: map.ambientEtherLevel, environmentalExposure: 'outdoor' };
    onChangePois([...pois, poi]); onChangeMap({ ...map, poiIds: [...map.poiIds, id] }); setSelectedPoiId(id);
  };
  const deletePoi = () => {
    if (!selectedPoi) return;
    onChangePois(pois.filter((poi) => poi.id !== selectedPoi.id));
    onChangeMap({ ...map, poiIds: map.poiIds.filter((id) => id !== selectedPoi.id), defaultPoiId: map.defaultPoiId === selectedPoi.id ? undefined : map.defaultPoiId, routes: map.routes.filter((route) => route.fromPoiId !== selectedPoi.id && route.toPoiId !== selectedPoi.id) });
    setSelectedPoiId('');
  };
  const handlePoiClick = (poiId: string) => {
    if (routeFromId && routeFromId !== poiId) {
      let index = map.routes.length + 1; while (map.routes.some((route) => route.id === `route_${index}`)) index += 1;
      onChangeMap({ ...map, routes: [...map.routes, { id: `route_${index}`, fromPoiId: routeFromId, toPoiId: poiId, bidirectional: true, travelCost: 1, metadata: {} }] });
      setRouteFromId('');
    }
    setSelectedPoiId(poiId);
  };
  const backgroundStyle = /^(https?:|\/|data:)/.test(map.backgroundImage) ? { backgroundImage: `linear-gradient(rgba(2,6,23,.35),rgba(2,6,23,.7)),url(${map.backgroundImage})` } : undefined;

  return <div className="grid min-h-0 gap-3 xl:grid-cols-[250px_minmax(520px,1fr)_270px]">
    <aside className="space-y-3 rounded border border-zinc-800 bg-black/30 p-3"><div className="flex items-center justify-between"><span className="text-[10px] uppercase text-cyan-400">Regions</span><button type="button" onClick={addRegion} className="text-cyan-300"><Plus className="h-4 w-4"/></button></div>{map.regions.map((region) => <button type="button" key={region.id} onClick={() => setSelectedRegionId(region.id)} className={`w-full rounded border p-2 text-left ${region.id === selectedRegionId ? 'border-purple-400 bg-purple-950/30' : 'border-zinc-800'}`}><strong className="block text-xs">{region.name}</strong><span className="text-[9px] text-zinc-500">{region.id}</span></button>)}{selectedRegion && <div className="space-y-2 border-t border-zinc-800 pt-3"><input value={selectedRegion.name} onChange={(event) => updateRegion(selectedRegion.id, (region) => ({ ...region, name: event.target.value }))} className={inputClass}/><textarea value={selectedRegion.description ?? ''} onChange={(event) => updateRegion(selectedRegion.id, (region) => ({ ...region, description: event.target.value }))} className={inputClass}/><div className="grid grid-cols-2 gap-1">{(['x','y','width','height'] as const).map((field) => <label key={field} className="text-[9px] uppercase text-zinc-500">{field}<input type="number" value={selectedRegion.bounds[field]} onChange={(event) => updateRegion(selectedRegion.id, (region) => ({ ...region, bounds: { ...region.bounds, [field]: Number(event.target.value) } }))} className={inputClass}/></label>)}</div><MetadataEditor value={selectedRegion.metadata} onChange={(metadata) => updateRegion(selectedRegion.id, (region) => ({ ...region, metadata }))}/><button type="button" onClick={deleteRegion} className="flex items-center gap-1 text-[10px] text-rose-400"><Trash2 className="h-3 w-3"/> Delete region</button></div>}</aside>
    <section className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><button type="button" onClick={addPoi} className="flex items-center gap-1 rounded border border-cyan-500/40 px-2 py-1 text-[10px] text-cyan-300"><MapPin className="h-3 w-3"/> Add POI</button><button type="button" onClick={() => selectedPoi && setRouteFromId(selectedPoi.id)} disabled={!selectedPoi} className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] ${routeFromId ? 'border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-400'}`}><GitBranch className="h-3 w-3"/>{routeFromId ? 'Choose destination' : 'Connect selected'}</button><span className="ml-auto text-[9px] text-zinc-500">Drag POIs · graph data remains GameMap.routes</span></div><div onPointerMove={movePoi} onPointerUp={() => setDraggingPoiId('')} onPointerLeave={() => setDraggingPoiId('')} style={backgroundStyle} className="relative h-[500px] touch-none overflow-hidden rounded-xl border border-cyan-500/20 bg-[#050918] bg-cover bg-center"><div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,.08)_1px,transparent_1px)] bg-[size:10%_10%]"/>{map.regions.map((region) => <button type="button" key={region.id} onClick={() => setSelectedRegionId(region.id)} style={{ left: `${region.bounds.x}%`, top: `${region.bounds.y}%`, width: `${region.bounds.width}%`, height: `${region.bounds.height}%` }} className={`absolute border border-dashed text-left ${region.id === selectedRegionId ? 'border-purple-400 bg-purple-500/10' : 'border-purple-800/60 bg-purple-950/5'}`}><span className="absolute left-1 top-1 text-[8px] uppercase text-purple-300">{region.name}</span></button>)}<svg className="pointer-events-none absolute inset-0 h-full w-full">{map.routes.map((route) => { const from=mapPois.find((poi)=>poi.id===route.fromPoiId); const to=mapPois.find((poi)=>poi.id===route.toPoiId); return from&&to?<line key={route.id} x1={`${from.mapPosition.x}%`} y1={`${from.mapPosition.y}%`} x2={`${to.mapPosition.x}%`} y2={`${to.mapPosition.y}%`} stroke="#22d3ee" strokeWidth="2" strokeDasharray={route.bidirectional?'':'6 4'}/>:null; })}</svg>{mapPois.map((poi) => <button type="button" key={poi.id} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggingPoiId(poi.id); handlePoiClick(poi.id); }} style={{ left: `${poi.mapPosition.x}%`, top: `${poi.mapPosition.y}%` }} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 p-2 shadow-lg ${poi.id === selectedPoiId ? 'border-cyan-200 bg-cyan-500 text-black' : 'border-cyan-600 bg-slate-950 text-cyan-300'}`} title={poi.name}><MapPin className="h-4 w-4"/><span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1 text-[8px] text-white">{poi.name}</span></button>)}</div></section>
    <aside className="space-y-3 rounded border border-zinc-800 bg-black/30 p-3"><label className="block text-[9px] uppercase text-zinc-500"><Image className="mr-1 inline h-3 w-3"/> Background<input value={map.backgroundImage} onChange={(event) => onChangeMap({ ...map, backgroundImage: event.target.value })} className={`mt-1 ${inputClass}`}/></label><label className="block text-[9px] uppercase text-zinc-500">Map name<input value={map.name} onChange={(event) => onChangeMap({ ...map, name: event.target.value })} className={`mt-1 ${inputClass}`}/></label><div><span className="text-[9px] uppercase text-zinc-500">Map metadata</span><MetadataEditor value={map.metadata} onChange={(metadata) => onChangeMap({ ...map, metadata })}/></div>{selectedPoi && <div className="space-y-2 border-t border-zinc-800 pt-3"><span className="text-[9px] uppercase text-cyan-400">Selected POI</span><input value={selectedPoi.name} onChange={(event) => updatePoi(selectedPoi.id, (poi) => ({ ...poi, name: event.target.value }))} className={inputClass}/><select value={selectedPoi.regionId ?? ''} onChange={(event) => updatePoi(selectedPoi.id, (poi) => ({ ...poi, regionId: event.target.value || undefined }))} className={inputClass}><option value="">No region</option>{map.regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select><div className="grid grid-cols-2 gap-1"><input type="number" value={selectedPoi.mapPosition.x} onChange={(event) => updatePoi(selectedPoi.id, (poi) => ({ ...poi, mapPosition: { ...poi.mapPosition, x: Number(event.target.value) } }))} className={inputClass}/><input type="number" value={selectedPoi.mapPosition.y} onChange={(event) => updatePoi(selectedPoi.id, (poi) => ({ ...poi, mapPosition: { ...poi.mapPosition, y: Number(event.target.value) } }))} className={inputClass}/></div><button type="button" onClick={deletePoi} className="flex items-center gap-1 text-[10px] text-rose-400"><Trash2 className="h-3 w-3"/> Delete POI</button></div>}<div className="border-t border-zinc-800 pt-3"><span className="text-[9px] uppercase text-zinc-500">Routes ({map.routes.length})</span>{map.routes.map((route) => <div key={route.id} className="mt-1 flex items-center justify-between rounded border border-zinc-800 p-1 text-[9px]"><span>{route.fromPoiId} → {route.toPoiId}</span><button type="button" onClick={() => onChangeMap({ ...map, routes: map.routes.filter((candidate) => candidate.id !== route.id) })} className="text-rose-400"><Trash2 className="h-3 w-3"/></button></div>)}</div></aside>
  </div>;
};
