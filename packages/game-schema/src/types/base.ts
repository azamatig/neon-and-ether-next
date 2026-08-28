import { z } from 'zod';

/**
 * Base schema representing the core identity of any authored game entity.
 * Guarantees stable string ID, human-readable name, optional narrative description, and taxonomy tags.
 */
export const BaseEntitySchema = z.object({
  id: z.string().min(1, 'Entity ID must not be empty').regex(/^[a-zA-Z0-9_\-.:]+$/, 'ID contains invalid characters'),
  name: z.string().min(1, 'Entity name must not be empty'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
