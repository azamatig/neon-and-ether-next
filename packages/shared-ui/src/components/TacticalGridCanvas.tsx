/**
 * @neon-ether/shared-ui
 * Shared Tactical Grid Viewport (Used by both Game Client and Content Editor).
 */

import React, { useState } from 'react';
import { CharacterDefinition, GridTile, MapDefinition, TileType, Vector2D } from '@neon-ether/game-schema';
import { hasLineOfSight, manhattanDistance } from '@neon-ether/engine';

export interface TacticalGridCanvasProps {
  map: MapDefinition;
  playerPos?: Vector2D;
  characters?: CharacterDefinition[];
  selectedTile?: Vector2D | null;
  highlightRadius?: number;
  highlightCenter?: Vector2D;
  onTileClick?: (tile: GridTile) => void;
  onTileHover?: (tile: GridTile | null) => void;
  showCoordinates?: boolean;
  editorMode?: boolean;
}

export const TacticalGridCanvas: React.FC<TacticalGridCanvasProps> = ({
  map,
  playerPos,
  characters = [],
  selectedTile,
  highlightRadius = 4,
  highlightCenter,
  onTileClick,
  onTileHover,
  showCoordinates = true,
  editorMode = false,
}) => {
  const [hoveredTile, setHoveredTile] = useState<Vector2D | null>(null);

  const getTileFill = (type: TileType) => {
    switch (type) {
      case TileType.Wall:
        return 'fill-zinc-900 stroke-zinc-700';
      case TileType.HalfCover:
        return 'fill-zinc-800/90 stroke-amber-500/40';
      case TileType.FullCover:
        return 'fill-zinc-850 stroke-cyan-500/50';
      case TileType.EtherHazard:
        return 'fill-purple-950/70 stroke-purple-500/80';
      case TileType.Console:
        return 'fill-cyan-950/70 stroke-cyan-400';
      case TileType.Door:
        return 'fill-amber-950/60 stroke-amber-500';
      case TileType.Floor:
      default:
        return 'fill-zinc-950 stroke-zinc-800/80';
    }
  };

  const tileSize = 48;
  const svgWidth = map.width * tileSize;
  const svgHeight = map.height * tileSize;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/95 p-2 overflow-auto select-none">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-[700px] h-auto border border-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.8)]"
      >
        <defs>
          <pattern id="grid-pattern" width={tileSize} height={tileSize} patternUnits="userSpaceOnUse">
            <path d={`M ${tileSize} 0 L 0 0 0 ${tileSize}`} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00f2ff" floodOpacity="0.8" />
          </filter>
          <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#bc13fe" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Base Grid Tiles */}
        {map.tiles.map((row, y) =>
          row.map((tile, x) => {
            const isSelected = selectedTile && selectedTile.x === x && selectedTile.y === y;
            const isHovered = hoveredTile && hoveredTile.x === x && hoveredTile.y === y;
            
            const isReachable =
              highlightCenter &&
              manhattanDistance(highlightCenter, { x, y }) <= highlightRadius &&
              tile.type !== TileType.Wall;

            const isLoS =
              playerPos &&
              hasLineOfSight(playerPos, { x, y }, (pos) => {
                const t = map.tiles[pos.y]?.[pos.x];
                return t ? t.blocksLineOfSight : false;
              });

            return (
              <g
                key={`tile_${x}_${y}`}
                transform={`translate(${x * tileSize}, ${y * tileSize})`}
                onClick={() => onTileClick?.(tile)}
                onMouseEnter={() => {
                  setHoveredTile({ x, y });
                  onTileHover?.(tile);
                }}
                onMouseLeave={() => {
                  setHoveredTile(null);
                  onTileHover?.(null);
                }}
                className="cursor-pointer transition-all duration-75"
              >
                {/* Tile Base */}
                <rect
                  x={1}
                  y={1}
                  width={tileSize - 2}
                  height={tileSize - 2}
                  className={`${getTileFill(tile.type)} ${
                    !editorMode && !isLoS ? 'opacity-40' : 'opacity-100'
                  }`}
                  strokeWidth="1"
                />

                {/* Reachable Movement Highlight */}
                {isReachable && (
                  <rect
                    x={2}
                    y={2}
                    width={tileSize - 4}
                    height={tileSize - 4}
                    fill="rgba(6, 182, 212, 0.08)"
                    stroke="rgba(6, 182, 212, 0.3)"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Hover / Selected Overlay */}
                {isSelected && (
                  <rect
                    x={2}
                    y={2}
                    width={tileSize - 4}
                    height={tileSize - 4}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                  />
                )}
                {isHovered && !isSelected && (
                  <rect
                    x={2}
                    y={2}
                    width={tileSize - 4}
                    height={tileSize - 4}
                    fill="rgba(255, 255, 255, 0.1)"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                  />
                )}

                {/* Tile Icons / Visual Details */}
                {tile.type === TileType.Wall && (
                  <path
                    d={`M 4 4 L ${tileSize - 4} ${tileSize - 4} M ${tileSize - 4} 4 L 4 ${tileSize - 4}`}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.5"
                  />
                )}
                {tile.type === TileType.HalfCover && (
                  <rect
                    x={tileSize * 0.25}
                    y={tileSize * 0.25}
                    width={tileSize * 0.5}
                    height={tileSize * 0.5}
                    fill="rgba(245, 158, 11, 0.25)"
                    stroke="#f59e0b"
                    strokeWidth="1"
                  />
                )}
                {tile.type === TileType.EtherHazard && (
                  <circle
                    cx={tileSize / 2}
                    cy={tileSize / 2}
                    r={tileSize * 0.3}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                )}
                {tile.type === TileType.Console && (
                  <text
                    x={tileSize / 2}
                    y={tileSize / 2 + 4}
                    textAnchor="middle"
                    fill="#22d3ee"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    [■]
                  </text>
                )}

                {/* Coordinates */}
                {showCoordinates && (
                  <text
                    x={4}
                    y={10}
                    fill="rgba(255,255,255,0.2)"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {x},{y}
                  </text>
                )}
              </g>
            );
          })
        )}

        {/* Interactive Objects */}
        {map.interactives?.map((obj) => (
          <g
            key={obj.id}
            transform={`translate(${obj.position.x * tileSize + tileSize / 2}, ${
              obj.position.y * tileSize + tileSize / 2
            })`}
            className="pointer-events-none"
          >
            <circle
              r={12}
              fill="none"
              stroke={obj.interactionType === 'EtherRift' ? '#a855f7' : '#06b6d4'}
              strokeWidth="1.5"
              filter={obj.interactionType === 'EtherRift' ? 'url(#glow-purple)' : 'url(#glow-cyan)'}
            />
          </g>
        ))}

        {/* NPCs & Characters */}
        {characters.map((char) => {
          const isCurrentPlayer = char.isPlayer;
          const cx = char.position.x * tileSize + tileSize / 2;
          const cy = char.position.y * tileSize + tileSize / 2;

          return (
            <g key={char.id} transform={`translate(${cx}, ${cy})`} className="pointer-events-none transition-all duration-200">
              {/* Unit Base Circle */}
              <circle
                r={14}
                className={
                  isCurrentPlayer
                    ? 'fill-cyan-950 stroke-cyan-400 stroke-2'
                    : 'fill-purple-950 stroke-purple-400 stroke-2'
                }
                filter={isCurrentPlayer ? 'url(#glow-cyan)' : 'url(#glow-purple)'}
              />
              {/* Center Initial */}
              <text
                textAnchor="middle"
                dy="4"
                className={`font-mono font-bold text-xs ${
                  isCurrentPlayer ? 'fill-cyan-200' : 'fill-purple-200'
                }`}
              >
                {char.name.charAt(0)}
              </text>
              {/* Unit Tag */}
              <text
                textAnchor="middle"
                dy="-18"
                className="font-mono text-[9px] fill-zinc-300 font-semibold"
              >
                {char.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
