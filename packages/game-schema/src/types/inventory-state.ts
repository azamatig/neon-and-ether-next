import { z } from 'zod';

/** Serializable inventory primitives shared by runtime state and resolutions. */
export const InventoryEntrySchema = z.object({
  entryId: z.string().min(1).optional(),
  itemId: z.string().min(1, 'Item ID cannot be empty'),
  quantity: z.number().int().min(1).default(1),
  isEquipped: z.boolean().default(false),
  slotId: z.string().optional(),
  durability: z.number().min(0).max(100).optional(),
  customName: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type InventoryEntry = z.infer<typeof InventoryEntrySchema>;
export const InventoryItemSlotSchema = InventoryEntrySchema;
export type InventoryItemSlot = InventoryEntry;

