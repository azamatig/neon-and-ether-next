import React, { memo } from 'react';
import type { WeatherVisuals } from '@neon-ether/game-schema';

export interface EnvironmentalLayerProps { visuals?: WeatherVisuals; intensity?: number; label?: string; disabled?: boolean }
/** One scalable, pointer-transparent renderer for all authored environmental visuals. */
export const EnvironmentalLayer=memo<EnvironmentalLayerProps>(({visuals,intensity=1,label,disabled})=>{
  if(disabled||!visuals||intensity<=0)return null; const count=Math.min(40,Math.round(visuals.particleCount*intensity));
  return <div aria-label={label} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" style={{backgroundColor:visuals.overlayColor,color:visuals.particleColor,opacity:Math.min(1,visuals.overlayOpacity*intensity+visuals.fogOpacity*0.25*intensity),filter:`saturate(${1-visuals.distortion*0.3})`}}>
    {Array.from({length:count},(_,index)=><span key={index} className="absolute select-none" style={{left:`${(index*37)%101}%`,top:`${(index*61)%103}%`,fontSize:`${10+(index%4)*3}px`,animation:`weather-${visuals.animation} ${Math.max(.4,3/visuals.particleSpeed)+(index%5)*.2}s linear infinite`,animationDelay:`-${index%7}s`}}>{visuals.particleGlyph}</span>)}
    {visuals.lightningIntensity>0&&<span className="absolute inset-0 bg-white animate-pulse" style={{opacity:visuals.lightningIntensity*.08}}/>}
  </div>;
});
EnvironmentalLayer.displayName='EnvironmentalLayer';
