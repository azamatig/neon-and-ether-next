import React from 'react';
import { Banknote, Cloud, Menu, UserRound } from 'lucide-react';
import { Button } from './Button.tsx';
import { ProgressBar } from './Foundation.tsx';

export interface ExplorationHudProps {
  weather?: string;
  sector: string;
  hp: { current: number; max: number };
  ether: { current: number; max: number };
  actionPoints: { current: number; max: number };
  credits: number;
  onOpenCharacterSheet?: () => void;
  onOpenMenu: () => void;
}

export const ExplorationHud: React.FC<ExplorationHudProps> = ({ weather, sector, hp, ether, actionPoints, credits, onOpenCharacterSheet, onOpenMenu }) => (
  <footer className="ne-exploration-hud" aria-label="Exploration status">
    <div className="ne-hud-atmosphere"><Cloud aria-hidden="true" /><span><small>Atmosphere</small><strong>{weather ?? 'Unmonitored'}</strong></span></div>
    <div className="ne-hud-resource" data-tone="hp"><ProgressBar label="HP" value={hp.current} max={hp.max} tone="danger" /></div>
    <div className="ne-hud-resource" data-tone="ether"><ProgressBar label="Ether" value={ether.current} max={ether.max} tone="primary" /></div>
    <div className="ne-hud-resource" data-tone="ap"><ProgressBar label="Action points" value={actionPoints.current} max={actionPoints.max} tone="warning" /></div>
    <div className="ne-hud-location"><Banknote aria-hidden="true" /><span><small>Balance</small><strong>{credits}</strong></span><span><small>Active sector</small><strong>{sector}</strong></span></div>
    <div className="ne-hud-actions">
      {onOpenCharacterSheet && <Button variant="secondary" size="sm" onClick={onOpenCharacterSheet} leftIcon={<UserRound aria-hidden="true" />}>Character stats</Button>}
      <Button variant="secondary" size="sm" onClick={onOpenMenu} leftIcon={<Menu aria-hidden="true" />}>Menu</Button>
    </div>
  </footer>
);
