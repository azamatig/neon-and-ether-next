import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';

/** Renderer-agnostic environmental presentation. Values are deliberately weather-ID agnostic. */
export const WeatherVisualsSchema = z.object({
  icon: z.string().optional(), overlayColor: z.string().optional(), overlayOpacity: z.number().min(0).max(1).default(0),
  backgroundTint: z.string().optional(), fogOpacity: z.number().min(0).max(1).default(0), distortion: z.number().min(0).max(1).default(0),
  lightningIntensity: z.number().min(0).max(1).default(0), particleGlyph: z.string().max(4).optional(), particleColor: z.string().optional(),
  particleCount: z.number().int().min(0).max(80).default(0), particleSpeed: z.number().positive().default(1), animation: z.enum(['none','fall','drift','pulse']).default('none'),
});
export type WeatherVisuals = z.infer<typeof WeatherVisualsSchema>;

export const WeatherDefinitionSchema = BaseEntitySchema.extend({
  visuals: WeatherVisualsSchema.default({ overlayOpacity:0, fogOpacity:0, distortion:0, lightningIntensity:0, particleCount:0, particleSpeed:1, animation:'none' }),
  ambience: z.object({ audioAsset: z.string().optional(), label: z.string().optional(), volume: z.number().min(0).max(1).default(1) }).optional(),
  environmentTags: z.array(z.string()).default([]), gameplayModifiers: z.record(z.string(), z.number()).default({}),
  conditions: z.array(ConditionSchema).default([]), effects: z.array(EffectSchema).default([]),
});
export type WeatherDefinition = z.infer<typeof WeatherDefinitionSchema>;

export const WeatherProfileEntrySchema = z.object({
  weatherId: z.string().min(1), weight: z.number().positive(), minimumDurationMinutes: z.number().int().positive().default(60),
  maximumDurationMinutes: z.number().int().positive().default(180), timeConditions: z.array(ConditionSchema).default([]),
}).refine((entry) => entry.maximumDurationMinutes >= entry.minimumDurationMinutes, { message: 'maximumDurationMinutes must be >= minimumDurationMinutes' });
export const WeatherProfileSchema = BaseEntitySchema.extend({ possibleWeather: z.array(WeatherProfileEntrySchema).min(1), fallbackWeatherId: z.string().optional() });
export type WeatherProfile = z.infer<typeof WeatherProfileSchema>;
