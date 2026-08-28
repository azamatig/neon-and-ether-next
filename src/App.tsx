/**
 * @neon-ether/app-shell
 * Workspace Launcher & Environment Dispatcher.
 * 
 * NOTE: As per architectural constraints:
 * - App.tsx contains ZERO gameplay logic.
 * - Game and Editor are fully decoupled into apps/game and apps/editor.
 * - Production game builds target apps/game/src/index.ts directly.
 */

import React, { useEffect, useState } from 'react';
import { GameApp } from '@apps/game/index.ts';
import { EditorApp } from '@apps/editor/index.ts';
import { Badge, Button, Panel } from '@neon-ether/shared-ui';
import {
  Boxes,
  Code2,
  Gamepad2,
  GitFork,
  HelpCircle,
  Layers,
  MonitorPlay,
  Network,
  ShieldCheck,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';

export default function App() {
  const [activeApp, setActiveApp] = useState<'game' | 'editor'>(() => {
    // Optional URL param support (?app=editor or ?app=game)
    const params = new URLSearchParams(window.location.search);
    return params.get('app') === 'editor' ? 'editor' : 'game';
  });

  const [showArchModal, setShowArchModal] = useState<boolean>(false);

  useEffect(() => {
    // Keep URL parameter in sync without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('app', activeApp);
    window.history.replaceState({}, '', url.toString());
  }, [activeApp]);

  return (
    <div className="w-full min-h-screen bg-[#050507] text-[#94a3b8] flex flex-col font-sans selection:bg-[#00f2ff]/30 selection:text-[#00f2ff] relative overflow-hidden">
      {/* Immersive Ambient Radial Gradient & Subtle Grid Texture */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_#111115_0%,_#050507_100%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-grid-ambient pointer-events-none z-0 opacity-40" />

      {/* Workspace Environment Top Bar */}
      <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-black/40 backdrop-blur-md shrink-0 z-40 relative">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-[#00f2ff] shadow-[0_0_8px_#00f2ff]" />
          <h1 className="text-lg md:text-xl font-bold tracking-tighter text-white">
            NEON & ETHER <span className="text-[#bc13fe] opacity-80">// ARCHITECTURE</span>
          </h1>

          <div className="hidden sm:flex items-center gap-3 border-l border-white/10 pl-4 text-xs uppercase tracking-widest font-semibold">
            <span className="text-[#00f2ff]">Scale: Monorepo</span>
            <span className="opacity-40">Ref: DETERMINISTIC_RPG</span>
          </div>
        </div>

        {/* Primary Target Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/40 p-1 border border-white/10 rounded-xl backdrop-blur-md">
            <button
              onClick={() => setActiveApp('game')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer rounded-lg ${
                activeApp === 'game'
                  ? 'bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/40 shadow-[0_0_12px_rgba(0,242,255,0.25)] font-bold'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Game Client</span>
            </button>

            <button
              onClick={() => setActiveApp('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer rounded-lg ${
                activeApp === 'editor'
                  ? 'bg-[#bc13fe]/15 text-[#bc13fe] border border-[#bc13fe]/40 shadow-[0_0_12px_rgba(188,19,254,0.25)] font-bold'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Content Editor</span>
            </button>
          </div>

          {/* Architecture Graph Modal Trigger */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowArchModal(true)}
            leftIcon={<Network className="w-3.5 h-3.5 text-[#00f2ff]" />}
            title="Inspect Monorepo Architecture Graph"
          >
            Matrix
          </Button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 overflow-auto flex flex-col relative z-10 p-3 md:p-4">
        {activeApp === 'game' ? <GameApp /> : <EditorApp />}
      </main>

      {/* Immersive Telemetry Bottom Bar */}
      <footer className="h-8 bg-black/60 border-t border-white/10 flex items-center px-6 justify-between text-[9px] uppercase tracking-widest text-slate-500 shrink-0 z-30 font-mono relative">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>System: Ready // Grid Loop Active</span>
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shadow-[0_0_6px_#00f2ff]"></div> Primary Core
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#bc13fe] shadow-[0_0_6px_#bc13fe]"></div> Ether Channel
          </span>
        </div>
      </footer>

      {/* Monorepo Architecture Inspector Modal */}
      {showArchModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <Panel
            title="NEON & ETHER // MONOREPO ARCHITECTURE MATRIX"
            subtitle="CLEAN LAYER BOUNDARIES & DEPENDENCY GRAPH"
            glow="cyan"
            className="w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-y-auto"
            headerRight={
              <button
                onClick={() => setShowArchModal(false)}
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            }
          >
            <div className="flex flex-col gap-4 font-mono text-xs">
              {/* Layer Structure Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Apps Layer */}
                <div className="p-4 bg-black/40 border border-[#00f2ff]/40 rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.05)] relative overflow-hidden flex flex-col gap-2">
                  <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-[#00f2ff]/40">APP_TARGET</div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-[#00f2ff] flex items-center gap-1.5 text-sm">
                      <Gamepad2 className="w-4 h-4" /> apps/game
                    </span>
                    <Badge variant="cyan" size="xs">PRODUCTION ENTRY</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Tactical RPG game client, Top-Down Viewport, AP turn execution, Vitals HUD, and Branching Dialogue.
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] uppercase text-slate-300">Renderer</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] uppercase text-slate-300">Turn Loop</span>
                  </div>
                </div>

                <div className="p-4 bg-black/40 border border-white/10 rounded-xl relative overflow-hidden flex flex-col gap-2">
                  <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-slate-500">DEV_TOOL</div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                      <Wrench className="w-4 h-4 text-[#bc13fe]" /> apps/editor
                    </span>
                    <Badge variant="purple" size="xs">DEV TOOLING</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Internal world authoring tools: Tile map authoring, dialogue graph debugger, item inspector, schema validator.
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] uppercase text-slate-300">Inspector</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] uppercase text-slate-300">Validator</span>
                  </div>
                </div>

                {/* Core Packages Layer */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-emerald-400" /> packages/engine
                    </span>
                    <div className="w-2 h-2 rounded-full bg-[#00f2ff]" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Deterministic spatial math (Bresenham LoS, distances), Seedable DiceRoller, Typed EventEmitter, FSM, and GameLoop.
                  </p>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-[#00f2ff]" /> packages/game-runtime
                    </span>
                    <div className="w-2 h-2 rounded-full bg-[#bc13fe]" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    GameSession orchestrator, Stat check formula resolution with critical outcomes, Turn & AP manager, Content registry.
                  </p>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" /> packages/game-schema
                    </span>
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Rigid TypeScript models, Primary stats (Body, Reflexes, Mind, EtherTech, Presence), Tiles, Quests, and Items.
                  </p>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#bc13fe]" /> packages/shared-ui & content/
                    </span>
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Tactical HUD primitives, Canvas grid renderer, Terminal Log, and pure JSON content manifests.
                  </p>
                </div>
              </div>

              {/* Status Section */}
              <div className="bg-[#bc13fe]/10 p-3.5 rounded-lg border border-[#bc13fe]/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#bc13fe] font-bold uppercase tracking-wider mb-0.5">Architecture Status</div>
                  <div className="text-xs text-white/90">Monorepo Skeleton Validated & Fully Decoupled</div>
                </div>
                <Badge variant="purple" size="sm">COMPLIANT</Badge>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" size="sm" onClick={() => setShowArchModal(false)}>
                  Close Matrix View
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
