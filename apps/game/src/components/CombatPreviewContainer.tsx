import React from 'react';
import type { ResolvedCombatPreview } from '@neon-ether/game-runtime';
import { AlertTriangle, ArrowLeft, Bot, Shield, Swords, UserRound, Zap } from 'lucide-react';
import { Badge, Button, StatBar } from '@neon-ether/shared-ui';

export interface CombatPreviewContainerProps { preview:ResolvedCombatPreview; onEngage:()=>void; onEscape:()=>void }
const Portrait:React.FC<{source:string;enemy?:boolean}>=({source,enemy})=><div className="combat-brief-portrait">{source.startsWith('/')||source.includes('.')?<img src={source} alt=""/>:enemy?<Bot/>:<UserRound/>}</div>;

/** Presentation-only briefing built from the exact roster already resolved for combat. */
export const CombatPreviewContainer:React.FC<CombatPreviewContainerProps>=({preview,onEngage,onEscape})=>{
 const {encounter,party,enemies,environment,threatLevel,escape}=preview;
 return <section className="combat-briefing">
  <header><div><small>Encounter briefing</small><h1>{encounter.name}</h1><p>{encounter.description}</p></div><Badge variant="rose">THREAT {threatLevel}/5</Badge></header>
  <div className="combat-brief-meta"><span><Zap/>Ether {environment.ambientEtherLevel}%</span><span>Lighting · {environment.lighting}</span>{environment.hazardDescription&&<span className="is-danger"><AlertTriangle/>{environment.hazardDescription}</span>}</div>
  <div className="combat-brief-rosters">
   <section data-team="player"><header><Shield/><div><small>Your party</small><h2>{party.length} ready</h2></div></header><div>{party.map(unit=><article key={unit.id}><Portrait source={unit.portrait}/><div><strong>{unit.name}</strong><small>{unit.title}</small><StatBar current={unit.currentHp} max={unit.maxHp} variant="hp" size="sm"/><em>HP {unit.currentHp}/{unit.maxHp} · {unit.actionPoints} AP</em></div></article>)}</div></section>
   <section data-team="enemy"><header><Swords/><div><small>Hostile group</small><h2>{enemies.length} detected</h2></div></header><div>{enemies.map(enemy=><article key={enemy.id}><Portrait source={enemy.portrait} enemy/><div><strong>{enemy.name}</strong><small>{enemy.threatTier}{enemy.isBoss?' · Boss':''}</small><em>Estimated HP {enemy.estimatedHp}</em></div></article>)}</div></section>
  </div>
  <footer><div className={escape.allowed?'':'is-locked'}><strong>{escape.allowed?'Withdrawal route available':'No way out'}</strong><span>{escape.allowed?(escape.checkInfo?`${escape.checkInfo.stat} check · difficulty ${escape.checkInfo.difficulty}`:'You can leave before engaging.'):(escape.disabledReason??'Retreat unavailable for this encounter.')}</span></div><Button variant="outline" disabled={!escape.allowed} onClick={onEscape} leftIcon={<ArrowLeft/>}>{escape.allowed?'LEAVE / AVOID':'RETREAT UNAVAILABLE'}</Button><Button variant="danger" onClick={onEngage} leftIcon={<Swords/>}>ENGAGE / FIGHT</Button></footer>
 </section>;
};
