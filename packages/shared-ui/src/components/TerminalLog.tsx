/**
 * @neon-ether/shared-ui
 * Hard-boiled CRT Tactical Combat and Narrative Log.
 */

import React, { useState } from 'react';
import { GameJournalEntry } from '@neon-ether/game-runtime';

export interface TerminalLogProps {
  entries: GameJournalEntry[];
  maxEntries?: number;
  className?: string;
}

export const TerminalLog: React.FC<TerminalLogProps> = ({
  entries,
  maxEntries = 50,
  className = '',
}) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredEntries = entries.filter((e) => {
    if (filter === 'ALL') return true;
    return e.category.toUpperCase() === filter;
  });

  const getCategoryBadgeClass = (category: GameJournalEntry['category']) => {
    switch (category) {
      case 'SkillCheck':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Dialogue':
        return 'text-[#00f2ff] bg-[#00f2ff]/10 border-[#00f2ff]/30 shadow-[0_0_6px_rgba(0,242,255,0.15)]';
      case 'EtherTech':
        return 'text-[#bc13fe] bg-[#bc13fe]/10 border-[#bc13fe]/30 shadow-[0_0_6px_rgba(188,19,254,0.15)]';
      case 'Combat':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'System':
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#050507]/90 border border-white/10 rounded-xl font-mono text-xs overflow-hidden ${className}`}>
      {/* Category filter bar */}
      <div className="flex items-center gap-1.5 p-2 border-b border-white/10 bg-white/5 text-[10px] overflow-x-auto">
        {['ALL', 'SKILLCHECK', 'DIALOGUE', 'ETHERTECH', 'COMBAT', 'SYSTEM'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2.5 py-1 rounded-md uppercase tracking-wider font-semibold transition-all cursor-pointer border ${
              filter === cat
                ? 'bg-white/10 text-[#00f2ff] border-[#00f2ff]/40 shadow-[0_0_8px_rgba(0,242,255,0.2)]'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="text-slate-600 italic py-4 text-center text-xs">// No neural logs recorded in buffer</div>
        ) : (
          filteredEntries.slice(0, maxEntries).map((entry) => (
            <div key={entry.id} className="flex items-start gap-2.5 leading-relaxed border-l-2 border-white/10 pl-2.5 hover:border-[#00f2ff]/50 transition-colors">
              <span className="text-slate-500 text-[10px] shrink-0 pt-0.5 font-bold">[{entry.timestamp}]</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold shrink-0 ${getCategoryBadgeClass(
                  entry.category
                )}`}
              >
                {entry.category}
              </span>
              <span className="text-slate-200 break-words flex-1 text-xs leading-normal">{entry.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
