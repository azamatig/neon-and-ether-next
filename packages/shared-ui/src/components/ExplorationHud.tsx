import React from 'react';
import type { WeatherVisuals } from '@neon-ether/game-schema';
import { Banknote, Cloud, Menu, UserRound } from 'lucide-react';
import { Button } from './Button.tsx';
import { ProgressBar } from './Foundation.tsx';

export interface ExplorationHudProps {
  weather?: string;
  weatherVisuals?: WeatherVisuals;
  sector: string;
  hp: { current: number; max: number };
  ether: { current: number; max: number };
  actionPoints: { current: number; max: number };
  credits: number;
  onOpenCharacterSheet?: () => void;
  onOpenMenu: () => void;
}

export const ExplorationHud: React.FC<ExplorationHudProps> = ({ weather, weatherVisuals, sector, hp, ether, actionPoints, credits, onOpenCharacterSheet, onOpenMenu }) => (
  <footer className="ne-exploration-hud" aria-label="Exploration status">
    <div className="ne-hud-atmosphere" style={{'--hud-weather':weatherVisuals?.particleColor??weatherVisuals?.overlayColor??'var(--ne-cyan)'} as React.CSSProperties}><Cloud aria-hidden="true" /><span><small>Atmosphere</small><strong>{weather ?? 'Unmonitored'}</strong></span></div>
    <div className="ne-hud-resource" data-tone="hp" data-critical={hp.current / hp.max <= .3}><ProgressBar label="HP" value={hp.current} max={hp.max} tone="danger" /></div>
    <div className="ne-hud-resource" data-tone="ether"><ProgressBar label="Ether" value={ether.current} max={ether.max} tone="primary" /></div>
    <div className="ne-hud-resource" data-tone="ap"><ProgressBar label="Action points" value={actionPoints.current} max={actionPoints.max} tone="warning" /></div>
    <div className="ne-hud-location"><Banknote aria-hidden="true" /><span><small>Balance</small><strong>{credits}</strong></span><span><small>Active sector</small><strong>{sector}</strong></span></div>
    <div className="ne-hud-actions">
      {onOpenCharacterSheet && <Button className="ne-hud-character" variant="secondary" size="sm" onClick={onOpenCharacterSheet} leftIcon={<UserRound aria-hidden="true" />}>Character stats</Button>}
      <Button className="ne-hud-menu" variant="secondary" size="sm" onClick={onOpenMenu} leftIcon={<Menu aria-hidden="true" />}>Menu</Button>
    </div>
  </footer>
);
