/**
 * @apps/editor
 * Branching Dialogue Tree & Stat Check Node Inspector.
 */

import React, { useState } from 'react';
import { DialogueNode, DialogueTree } from '@neon-ether/game-schema';
import { GAME_CONTENT_MANIFEST } from '@neon-ether/content';
import { Badge, Button, Panel } from '@neon-ether/shared-ui';
import { GitBranch, MessageSquare, Plus, ShieldAlert } from 'lucide-react';

export const DialogueEditor: React.FC = () => {
  const [activeTree, setActiveTree] = useState<DialogueTree>(() => {
    return GAME_CONTENT_MANIFEST.dialogues[0];
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string>(activeTree.rootNodeId);

  const currentNode = activeTree.nodes[selectedNodeId];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Node Graph List */}
      <div className="w-full lg:w-80 flex flex-col gap-3">
        <Panel
          title="DIALOGUE NODES"
          subtitle={`TREE: ${activeTree.id}`}
          headerRight={<Badge variant="purple">{Object.keys(activeTree.nodes).length} NODES</Badge>}
        >
          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto">
            {(Object.values(activeTree.nodes) as DialogueNode[]).map((node) => {
              const isRoot = node.id === activeTree.rootNodeId;
              const isSelected = node.id === selectedNodeId;

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-2.5 text-left border font-mono text-xs transition-colors cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-purple-950/60 border-purple-400 text-purple-200'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{node.id}</span>
                    {isRoot && <Badge variant="cyan" size="xs">ROOT</Badge>}
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate">
                    Speaker: {node.speakerName} ({node.choices.length} choices)
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Node Inspector & Choices */}
      <div className="flex-1 flex flex-col">
        {currentNode ? (
          <Panel
            title={`NODE INSPECTOR // ${currentNode.id}`}
            subtitle={`SPEAKER: ${currentNode.speakerName} [${currentNode.speakerTitle ?? 'No title'}]`}
            glow="purple"
            className="h-full"
          >
            <div className="flex flex-col gap-4">
              {/* Speaker Text Box */}
              <div className="flex flex-col gap-1 bg-black/40 p-3 border border-zinc-800">
                <span className="font-mono text-[10px] uppercase text-zinc-400">
                  Dialogue Speech Output:
                </span>
                <p className="font-sans text-sm text-zinc-100 bg-zinc-900/60 p-3 border border-zinc-800">
                  "{currentNode.text}"
                </p>
              </div>

              {/* Branching Choices */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                    Branching Player Vectors ({currentNode.choices.length}):
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {currentNode.choices.map((choice, i) => (
                    <div
                      key={choice.id}
                      className="p-3 bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-mono text-xs text-purple-300 font-bold">
                          [{i + 1}] ID: {choice.id}
                        </span>
                        <div className="flex items-center gap-2">
                          {choice.requirement && (
                            <Badge variant="amber" size="xs">
                              [{choice.requirement.stat} Check - {choice.requirement.difficulty}]
                            </Badge>
                          )}
                          {choice.costEther && (
                            <Badge variant="purple" size="xs">
                              [{choice.costEther} Ether]
                            </Badge>
                          )}
                          <span className="font-mono text-[10px] text-cyan-400 bg-zinc-950 px-2 py-0.5 border border-zinc-800">
                            Target: {choice.targetNodeId ? `-> ${choice.targetNodeId}` : '[Exit Comm]'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-300 font-sans italic">
                        "{choice.text}"
                      </p>

                      {choice.targetNodeId && (
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedNodeId(choice.targetNodeId!)}
                            rightIcon={<GitBranch className="w-3 h-3" />}
                          >
                            Jump to Node
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        ) : (
          <div className="p-8 text-center text-zinc-500 font-mono">
            No dialogue node selected
          </div>
        )}
      </div>
    </div>
  );
};
