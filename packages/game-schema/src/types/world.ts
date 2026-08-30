import { z } from 'zod';

/** Shared authored/runtime POI lifecycle values; isolated to avoid schema dependency cycles. */
export const PoiStatusSchema = z.enum(['Hidden', 'Locked', 'Discovered', 'Visited', 'Completed']);
export type PoiStatus = z.infer<typeof PoiStatusSchema>;
