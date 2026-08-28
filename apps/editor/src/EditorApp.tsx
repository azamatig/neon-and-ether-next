/**
 * @apps/editor
 * Content & World Editor Development Application.
 */

import React, { useState } from 'react';
import { Badge, Panel } from '@neon-ether/shared-ui';
import { ContentValidator } from './components/ContentValidator.tsx';
import { MapEditor } from './components/MapEditor.tsx';
import { DialogueEditor } from './components/DialogueEditor.tsx';
import { ItemCatalogViewer } from './components/ItemCatalogViewer.tsx';
import { CheckCircle2, GitBranch, Map as MapIcon, Package, Terminal } from 'lucide-react';

type EditorTab = 'validation' | 'maps' | 'dialogues' | 'items';

export const EditorApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EditorTab>('validation');

  const tabs = [
    { id: 'validation' as EditorTab, label: 'Schema Validator', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: 'maps' as EditorTab, label: 'Map Topology', icon: <MapIcon className="w-3.5 h-3.5" /> },
    { id: 'dialogues' as EditorTab, label: 'Dialogue Trees', icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: 'items' as EditorTab, label: 'Item Archives', icon: <Package className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-3 font-sans">
      {/* Editor Sub-Header / Tool Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-[#bc13fe] rounded-full shadow-[0_0_8px_#bc13fe]" />
          <h2 className="font-mono text-sm font-bold tracking-wider text-white uppercase">
            Content & World Authoring Suite
          </h2>
          <Badge variant="purple" size="xs">DEV TOOLING</Badge>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 border border-white/10 rounded-xl backdrop-blur-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer rounded-lg border ${
                activeTab === tab.id
                  ? 'bg-[#bc13fe]/15 text-[#bc13fe] border-[#bc13fe]/40 shadow-[0_0_10px_rgba(188,19,254,0.25)] font-bold'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 min-h-[500px]">
        {activeTab === 'validation' && <ContentValidator />}
        {activeTab === 'maps' && <MapEditor />}
        {activeTab === 'dialogues' && <DialogueEditor />}
        {activeTab === 'items' && <ItemCatalogViewer />}
      </div>
    </div>
  );
};
