/**
 * @apps/game
 * Unified GameEvent Container.
 * Single data-driven presentation layer for Flavor, Choice, Dialogue, Scene, and Encounter events.
 */

import React from 'react';
import { ResolvedEventState } from '@neon-ether/game-runtime';
import { Badge, Button, Panel } from '@neon-ether/shared-ui';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  Flame,
  MessageSquare,
  Radio,
  Sparkles,
  Swords,
  User,
  Users,
  Zap,
} from 'lucide-react';

export interface EventContainerProps {
  eventState: ResolvedEventState;
  onAdvanceStep: () => void;
  onChooseOption: (choiceId: string) => void;
  onCompleteEvent: () => void;
}

export const EventContainer: React.FC<EventContainerProps> = ({
  eventState,
  onAdvanceStep,
  onChooseOption,
  onCompleteEvent,
}) => {
  const { event, currentStep, stepIndex, totalSteps } = eventState;
  const isFinalStep = currentStep.isFinalStep;
  const hasChoices = currentStep.resolvedChoices.length > 0;

  const getEventGlow = () => {
    switch (event.type) {
      case 'encounter':
        return 'rose' as any;
      case 'choice':
        return 'purple' as any;
      case 'dialogue':
        return 'cyan' as any;
      default:
        return 'cyan' as any;
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 font-mono select-none">
      <Panel
        title={`EVENT PROTOCOL // ${event.name.toUpperCase()}`}
        subtitle={`${event.type.toUpperCase()} EVENT • STEP ${stepIndex + 1} OF ${totalSteps}`}
        glow={getEventGlow()}
        className="flex-1 flex flex-col"
        headerRight={
          <div className="flex items-center gap-2">
            <Badge variant={event.type === 'encounter' ? 'rose' : 'purple'} size="xs">
              {event.type.toUpperCase()}
            </Badge>
            {event.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        }
      >
        <div className="flex-1 flex flex-col justify-between gap-4">
          {/* Main Content Body */}
          <div className="flex flex-col gap-4">
            {/* Speaker Header if Dialogue or NPC present */}
            {currentStep.resolvedSpeaker && (
              <div className="flex items-center gap-3 p-3 bg-black/60 border border-zinc-800 rounded-xl">
                <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-cyan-300">
                  {currentStep.resolvedSpeaker.type === 'companion' ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{currentStep.resolvedSpeaker.name}</span>
                    <Badge variant="cyan" size="xs">
                      {currentStep.resolvedSpeaker.type.toUpperCase()}
                    </Badge>
                  </div>
                  {currentStep.resolvedSpeaker.title && (
                    <div className="text-xs text-zinc-400 font-sans">
                      {currentStep.resolvedSpeaker.title}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Narrative / Dialogue Text */}
            <div className="p-5 bg-black/50 border border-zinc-800/80 rounded-xl text-zinc-200 font-sans text-sm leading-relaxed space-y-3">
              <p>{currentStep.text}</p>
            </div>
          </div>

          {/* Interactive Choices / Advance Controls */}
          <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800">
            {hasChoices ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  TACTICAL DECISIONS:
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {currentStep.resolvedChoices.map((choice) => (
                    <button
                      key={choice.id}
                      disabled={!choice.isAvailable}
                      onClick={() => onChooseOption(choice.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        choice.isAvailable
                          ? 'bg-zinc-950/80 border-zinc-700 hover:border-cyan-400 text-zinc-200 hover:text-white shadow-lg'
                          : 'bg-black/40 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>{choice.text}</span>
                        </div>

                        {choice.statCheckInfo && (
                          <span className="px-2 py-0.5 bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[10px] rounded font-mono font-bold">
                            [{choice.statCheckInfo.stat} Check - DC {choice.statCheckInfo.difficulty}]
                          </span>
                        )}
                      </div>

                      {!choice.isAvailable && choice.unmetReason && (
                        <div className="text-[11px] text-rose-400 flex items-center gap-1 font-sans pl-6">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{choice.unmetReason}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={isFinalStep ? onCompleteEvent : onAdvanceStep}
                  leftIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isFinalStep ? 'CONCLUDE EVENT' : 'CONTINUE'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
};
