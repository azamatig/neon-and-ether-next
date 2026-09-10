export type FxQuality = 'low' | 'medium' | 'high';

export type VisualPreferences = {
  quality: FxQuality;
  scanlines: boolean;
  reducedMotion: boolean;
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  const value = localStorage.getItem(key);
  return value === null ? fallback : value === 'true';
};

export const readVisualPreferences = (): VisualPreferences => {
  const storedQuality = localStorage.getItem('neon_fx_quality');
  const quality: FxQuality = storedQuality === 'low' || storedQuality === 'high' ? storedQuality : 'medium';
  return {
    quality,
    scanlines: readBoolean('neon_scanlines', true),
    reducedMotion: readBoolean('neon_reduced_motion', false),
  };
};

export const applyVisualPreferences = (preferences: VisualPreferences): void => {
  document.documentElement.dataset.fxQuality = preferences.quality;
  document.documentElement.dataset.scanlines = String(preferences.scanlines);
  document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
};

export const saveVisualPreferences = (preferences: VisualPreferences): void => {
  localStorage.setItem('neon_fx_quality', preferences.quality);
  localStorage.setItem('neon_scanlines', String(preferences.scanlines));
  localStorage.setItem('neon_reduced_motion', String(preferences.reducedMotion));
  applyVisualPreferences(preferences);
};
