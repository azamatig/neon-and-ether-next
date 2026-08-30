import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';
import { BaseResourceCostSchema, BaseRoomCapacitySchema, RoomTypeSchema } from './room.ts';

export const BaseRoomSlotDefinitionSchema = z.object({
  id: z.string().min(1),
  slotType: z.string().min(1).default('Standard'),
  allowedRoomTypes: z.array(RoomTypeSchema).default([]),
  unlockedByDefault: z.boolean().default(true),
});

export const StartingBaseRoomSchema = z.object({
  slotId: z.string().min(1),
  roomDefinitionId: z.string().min(1),
  roomInstanceId: z.string().min(1),
});

export const PlayerBaseDefinitionSchema = BaseEntitySchema.extend({
  poiId: z.string().optional(),
  artwork: z.string().optional(),
  backgroundImage: z.string().optional(),
  roomSlots: z.array(BaseRoomSlotDefinitionSchema).min(1),
  maximumRoomSlots: z.number().int().min(1).default(1),
  startingRooms: z.array(StartingBaseRoomSchema).default([]),
  unlockConditions: z.array(ConditionSchema).default([]),
  globalEffects: z.array(EffectSchema).default([]),
  globalModifiers: z.record(z.string(), z.number()).default({}),
  startingResources: z.record(z.string(), z.number().int().min(0)).default({}),
  storageCapacity: z.number().int().min(0).default(20),
});
export type PlayerBaseDefinition = z.infer<typeof PlayerBaseDefinitionSchema>;
export const BaseDefinitionSchema = PlayerBaseDefinitionSchema;
export type BaseDefinition = PlayerBaseDefinition;

export const BaseUpgradeDefinitionSchema = BaseEntitySchema.extend({
  target: z.enum(['room', 'base']).default('room'),
  applicableBaseIds: z.array(z.string()).default([]),
  applicableRoomTypes: z.array(RoomTypeSchema).default([]),
  applicableRoomIds: z.array(z.string()).default([]),
  requiredRoomTags: z.array(z.string()).default([]),
  artwork: z.string().optional(),
  cost: BaseResourceCostSchema.default({}),
  requirements: z.array(ConditionSchema).default([]),
  conditions: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
  modifiers: z.record(z.string(), z.number()).default({}),
  capacityDelta: BaseRoomCapacitySchema.default({ residents: 0, workers: 0, storage: 0 }),
  storageCapacityDelta: z.number().int().default(0),
  repeatable: z.boolean().default(false),
  nextUpgradeId: z.string().optional(),
});
export type BaseUpgradeDefinition = z.infer<typeof BaseUpgradeDefinitionSchema>;
export const RoomUpgradeDefinitionSchema = BaseUpgradeDefinitionSchema;
export type RoomUpgradeDefinition = BaseUpgradeDefinition;

export const BaseManagementCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('BuildRoom'), slotId: z.string(), roomDefinitionId: z.string(), roomInstanceId: z.string() }),
  z.object({ type: z.literal('InstallUpgrade'), roomInstanceId: z.string(), upgradeId: z.string() }),
  z.object({ type: z.literal('InstallBaseUpgrade'), upgradeId: z.string() }),
  z.object({ type: z.literal('StoreItem'), itemId: z.string(), quantity: z.number().int().min(1) }),
  z.object({ type: z.literal('TakeItem'), itemId: z.string(), quantity: z.number().int().min(1) }),
]);
export type BaseManagementCommand = z.infer<typeof BaseManagementCommandSchema>;
