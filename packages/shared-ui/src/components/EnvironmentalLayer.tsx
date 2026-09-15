import React, { memo } from 'react';
import type { WeatherVisuals } from '@neon-ether/game-schema';

export interface EnvironmentalLayerProps { visuals?: WeatherVisuals; intensity?: number; label?: string; disabled?: boolean }
/** One scalable, pointer-transparent renderer for all authored environmental visuals. */
export const EnvironmentalLayer=memo<EnvironmentalLayerProps>(({visuals,intensity=1,label,disabled})=>{
  if(disabled||!visuals||intensity<=0)return null; const count=Math.min(32,Math.round(visuals.particleCount*intensity));
  return <div aria-label={label} className="ne-environment" data-animation={visuals.animation} style={{'--weather-overlay':visuals.overlayColor??'transparent','--weather-overlay-opacity':visuals.overlayOpacity*intensity,'--weather-fog-opacity':visuals.fogOpacity*intensity,'--weather-distortion':visuals.distortion*intensity,'--weather-flash':visuals.lightningIntensity*intensity,color:visuals.particleColor} as React.CSSProperties}>
    <span className="ne-environment__grade" />
    <span className="ne-environment__fog" />
    <span className="ne-environment__particles">{Array.from({length:count},(_,index)=><i key={index} style={{left:`${(index*37)%101}%`,top:`${(index*61)%103}%`,fontSize:`${10+(index%4)*3}px`,animationDuration:`${Math.max(.55,3/visuals.particleSpeed)+(index%5)*.2}s`,animationDelay:`-${index%7}s`}}>{visuals.particleGlyph}</i>)}</span>
    {visuals.lightningIntensity>0&&<span className="ne-environment__flash"/>}
  </div>;
});
EnvironmentalLayer.displayName='EnvironmentalLayer';
