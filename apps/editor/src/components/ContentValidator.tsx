/**
 * @apps/editor
 * Content Schema Integrity & Diagnostics Validator.
 */

import React, { useMemo } from 'react';
import { GAME_CONTENT_MANIFEST } from '@neon-ether/content';
import { validateGameContent } from '@neon-ether/game-schema';
import { Badge, Panel } from '@neon-ether/shared-ui';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ContentValidator: React.FC = () => {
  const report = useMemo(() => {
    return validateGameContent(GAME_CONTENT_MANIFEST);
  }, []);

  const stats = [
    { label: 'ITEMS', count: GAME_CONTENT_MANIFEST.items?.length ?? 0, color: 'text-cyan-400' },
    { label: 'NPCS', count: (GAME_CONTENT_MANIFEST.npcs ?? GAME_CONTENT_MANIFEST.characters)?.length ?? 0, color: 'text-cyan-400' },
    { label: 'ENEMIES', count: GAME_CONTENT_MANIFEST.enemies?.length ?? 0, color: 'text-rose-400' },
    { label: 'POIS', count: GAME_CONTENT_MANIFEST.pois?.length ?? 0, color: 'text-amber-400' },
    { label: 'QUESTS', count: GAME_CONTENT_MANIFEST.quests?.length ?? 0, color: 'text-purple-400' },
    { label: 'EVENTS', count: GAME_CONTENT_MANIFEST.events?.length ?? 0, color: 'text-yellow-400' },
    { label: 'MAPS', count: GAME_CONTENT_MANIFEST.maps?.length ?? 0, color: 'text-emerald-400' },
    { label: 'RECIPES', count: GAME_CONTENT_MANIFEST.recipes?.length ?? 0, color: 'text-blue-400' },
    { label: 'ROOMS', count: GAME_CONTENT_MANIFEST.rooms?.length ?? 0, color: 'text-indigo-400' },
    { label: 'FACTIONS', count: GAME_CONTENT_MANIFEST.factions?.length ?? 0, color: 'text-purple-300' },
    { label: 'DIALOGUES', count: GAME_CONTENT_MANIFEST.dialogues?.length ?? 0, color: 'text-pink-400' },
  ];

  return (
    <Panel
      title="CONTENT INTEGRITY & SCHEMA VALIDATOR"
      subtitle="STATIC ARCHITECTURE DIAGNOSTICS & REFERENTIAL INTEGRITY"
      headerRight={
        <div className="flex items-center gap-2">
          <Badge variant={report.errorsCount === 0 ? 'emerald' : 'rose'}>
            ERRORS: {report.errorsCount}
          </Badge>
          <Badge variant="amber">WARNINGS: {report.warningsCount}</Badge>
        </div>
      }
    >
      <div className="flex flex-col gap-3 font-mono">
        {/* Category breakdown grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 text-center text-xs">
          {stats.map((stat) => (
            <div key={stat.label} className="p-2 bg-black/40 border border-white/10 rounded-lg">
              <span className="text-slate-400 block text-[9px] font-bold tracking-wider">{stat.label}</span>
              <span className={`text-sm font-bold ${stat.color}`}>{stat.count}</span>
            </div>
          ))}
        </div>

        {/* Issue diagnostic list */}
        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
          {report.issues.length === 0 ? (
            <div className="flex items-center gap-2.5 p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold">All 11 content schemas and referential IDs verified successfully.</div>
                <div className="text-[11px] text-emerald-400/80">0 duplicate IDs, 0 missing referential targets, 100% Zod validation pass.</div>
              </div>
            </div>
          ) : (
            report.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-2.5 border text-xs flex items-start gap-2.5 rounded-lg ${
                  issue.severity === 'error'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}
              >
                {issue.severity === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px] bg-black/60 px-1.5 py-0.5 border border-current rounded">
                      {issue.category}
                    </span>
                    <span className="text-slate-400 text-[10px]">[{issue.targetId}]</span>
                  </div>
                  <span className="text-slate-200">{issue.message}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
};
