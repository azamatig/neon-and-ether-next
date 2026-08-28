/**
 * @apps/game
 * Branching Dialogue Overlay with Bracketed Stat-Check Options.
 */

import React from 'react';
import { DialogueChoice, DialogueNode } from '@neon-ether/game-schema';
import { Badge, Button, Panel } from '@neon-ether/shared-ui';
import { MessageSquare, Shield, User, X } from 'lucide-react';

export interface DialogueOverlayProps {
  node: DialogueNode;
  onChoose: (choice: DialogueChoice) => void;
  onClose: () => void;
}

export const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
  node,
  onChoose,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <Panel
        title={`COMM LINK // ${node.speakerName}`}
        subtitle={node.speakerTitle ?? 'UNKNOWN'}
        glow="purple"
        className="w-full max-w-2xl max-h-[85vh] shadow-2xl border-purple-500/50"
        headerRight={
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Speaker Prompt Box */}
          <div className="flex gap-3.5 bg-black/40 p-4 border border-[#bc13fe]/30 rounded-xl">
            <div className="w-12 h-12 shrink-0 bg-[#bc13fe]/10 border border-[#bc13fe]/40 rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(188,19,254,0.2)]">
              <Shield className="w-6 h-6 text-[#bc13fe]" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="font-mono text-xs font-bold text-[#bc13fe] tracking-wider uppercase">
                {node.speakerName}
              </div>
              <p className="font-sans text-sm text-white leading-relaxed">
                "{node.text}"
              </p>
            </div>
          </div>

          {/* Dialogue Responses */}
          <div className="flex flex-col gap-2.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Select Response Vector:
            </div>

            <div className="flex flex-col gap-2">
              {node.choices.map((choice, idx) => {
                const hasCheck = !!choice.requirement;
                const hasEtherCost = !!choice.costEther;

                return (
                  <button
                    key={choice.id}
                    onClick={() => onChoose(choice)}
                    className="group text-left p-3 bg-black/40 hover:bg-[#bc13fe]/10 border border-white/10 hover:border-[#bc13fe]/50 rounded-xl transition-all duration-150 flex items-start gap-3 cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.4)]"
                  >
                    <span className="font-mono text-xs text-[#bc13fe] group-hover:text-white font-bold shrink-0 pt-0.5">
                      [{idx + 1}]
                    </span>

                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasCheck && (
                          <Badge variant="amber" size="xs">
                            [{choice.requirement!.stat} Check - {choice.requirement!.difficulty}]
                          </Badge>
                        )}
                        {hasEtherCost && (
                          <Badge variant="purple" size="xs">
                            [{choice.costEther} Ether Cost]
                          </Badge>
                        )}
                      </div>
                      <span className="font-sans text-xs text-slate-200 group-hover:text-white leading-normal">
                        {choice.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};
