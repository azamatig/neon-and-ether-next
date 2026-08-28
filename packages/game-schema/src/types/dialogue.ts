import { z } from 'zod';
import { StatCheckRequirementSchema } from './stats.ts';

export const DialogueChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  targetNodeId: z.string().nullable(), // null ends conversation
  requirement: StatCheckRequirementSchema.optional(),
  costEther: z.number().int().min(0).optional(),
  costCredits: z.number().int().min(0).optional(),
  questTriggerId: z.string().optional(),
  setFlag: z
    .object({
      key: z.string().min(1),
      value: z.union([z.string(), z.boolean(), z.number()]),
    })
    .optional(),
});

export type DialogueChoice = z.infer<typeof DialogueChoiceSchema>;

export const DialogueNodeSchema = z.object({
  id: z.string().min(1),
  speakerName: z.string().min(1),
  speakerTitle: z.string().optional(),
  speakerPortrait: z.string().optional(),
  text: z.string().min(1),
  choices: z.array(DialogueChoiceSchema).default([]),
});

export type DialogueNode = z.infer<typeof DialogueNodeSchema>;

export const DialogueTreeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rootNodeId: z.string().min(1),
  nodes: z.record(z.string(), DialogueNodeSchema),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export type DialogueTree = z.infer<typeof DialogueTreeSchema>;
