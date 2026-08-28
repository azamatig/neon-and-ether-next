/**
 * @apps/game
 * Generic Action Result Modal.
 * Renders outcomes of POI actions, checks, and world interactions.
 */

import React from 'react';
import { ActionResolution } from '@neon-ether/game-schema';
import { Badge, Button, Panel } from '@neon-ether/shared-ui';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Coins,
  FileText,
  Package,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface ActionResultModalProps {
  resolution: ActionResolution;
  onDismiss: () => void;
}

export const ActionResultModal: React.FC<ActionResultModalProps> = ({
  resolution,
  onDismiss,
}) => {
  const isSuccess = resolution.status === 'Success';
  const isFailure = resolution.status === 'Failure';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <Panel
        title={resolution.title.toUpperCase()}
        subtitle={`ACTION OUTCOME // ${resolution.actionLabel.toUpperCase()}`}
        glow={isSuccess ? 'cyan' : isFailure ? 'none' : 'amber'}
        className="w-full max-w-lg shadow-2xl"
      >
        <div className="flex flex-col gap-4 font-mono text-xs">
          {/* Status Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-[#00f2ff]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              <span className="font-bold text-sm text-white">
                {isSuccess ? 'OPERATION SUCCESS' : isFailure ? 'OPERATION FAILED' : 'PARTIAL SUCCESS'}
              </span>
            </div>
            <Badge variant={isSuccess ? 'emerald' : isFailure ? 'rose' : 'amber'} size="xs">
              {resolution.status.toUpperCase()}
            </Badge>
          </div>

          {/* Narrative Result Text */}
          <div className="p-3.5 bg-black/50 border border-white/10 rounded-xl text-zinc-300 font-sans text-xs leading-relaxed">
            <p>{resolution.resultText}</p>
            {resolution.unmetReason && (
              <p className="mt-2 text-rose-400 text-[11px] font-mono">
                [REASON]: {resolution.unmetReason}
              </p>
            )}
          </div>

          {/* Deltas & Rewards Container */}
          {(resolution.gainedItems.length > 0 ||
            resolution.lostItems.length > 0 ||
            resolution.creditsDelta !== 0 ||
            resolution.statChanges.length > 0) && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">
                RESOURCE & INVENTORY DELTAS
              </span>

              <div className="flex flex-wrap gap-2">
                {resolution.creditsDelta !== 0 && (
                  <span
                    className={`px-2 py-1 rounded flex items-center gap-1 font-bold ${
                      resolution.creditsDelta > 0
                        ? 'bg-amber-950/50 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-950/50 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>
                      {resolution.creditsDelta > 0 ? `+${resolution.creditsDelta}` : resolution.creditsDelta} ¢
                    </span>
                  </span>
                )}

                {resolution.gainedItems.map((item, idx) => (
                  <span
                    key={`gained_${idx}`}
                    className="px-2 py-1 bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 rounded flex items-center gap-1 font-bold"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>
                      +{item.quantity} {item.name ?? item.itemId}
                    </span>
                  </span>
                ))}

                {resolution.lostItems.map((item, idx) => (
                  <span
                    key={`lost_${idx}`}
                    className="px-2 py-1 bg-zinc-900 text-zinc-400 border border-zinc-700 rounded flex items-center gap-1"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>
                      -{item.quantity} {item.name ?? item.itemId}
                    </span>
                  </span>
                ))}

                {resolution.statChanges.map((sc, idx) => (
                  <span
                    key={`stat_${idx}`}
                    className={`px-2 py-1 rounded flex items-center gap-1 font-bold ${
                      (sc.delta ?? 0) >= 0
                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-950/50 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {sc.label ?? sc.stat}: {(sc.delta ?? 0) > 0 ? `+${sc.delta}` : sc.delta}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer Proceed Button */}
          <div className="flex justify-end pt-2 border-t border-white/10">
            <Button
              variant="primary"
              size="sm"
              onClick={onDismiss}
              leftIcon={<ArrowRight className="w-4 h-4" />}
            >
              PROCEED
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
};
