import React, { useMemo, useState } from 'react';
import type { ContentValidationReport, ValidationIssue, ValidationSeverity } from '@neon-ether/game-schema';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface ValidationPanelProps {
  report: ContentValidationReport;
  onNavigate: (issue: ValidationIssue) => void;
  onClose: () => void;
}
const severityStyle: Record<ValidationSeverity,string> = { error:'border-rose-500/40 text-rose-300', warning:'border-amber-500/40 text-amber-300', info:'border-cyan-500/40 text-cyan-300' };
const severityIcon = { error:XCircle, warning:AlertTriangle, info:Info };

/** Presentation for schema validation reports; all validation remains in game-schema. */
export const ValidationPanel: React.FC<ValidationPanelProps> = ({ report, onNavigate, onClose }) => {
  const [filter,setFilter] = useState<ValidationSeverity|'all'>('all');
  const issues = useMemo(()=>filter==='all'?report.issues:report.issues.filter((issue)=>issue.severity===filter),[filter,report]);
  return <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-cyan-500/30 bg-[#050713]/98 p-4 shadow-2xl backdrop-blur-xl"><header className="mb-3 flex items-center justify-between"><div><p className="text-[9px] tracking-[.3em] text-cyan-400">CONTENT GRAPH</p><h2 className="font-bold text-white">Validation Panel</h2></div><button type="button" onClick={onClose} className="text-zinc-500 hover:text-white">×</button></header><div className="mb-3 grid grid-cols-4 gap-1">{(['all','error','warning','info'] as const).map((severity)=><button type="button" key={severity} onClick={()=>setFilter(severity)} className={`rounded border p-2 text-[10px] uppercase ${filter===severity?'border-cyan-400 bg-cyan-500/10':'border-zinc-800 text-zinc-500'}`}>{severity}<span className="block text-sm text-white">{severity==='all'?report.issues.length:severity==='error'?report.errorsCount:severity==='warning'?report.warningsCount:report.infoCount}</span></button>)}</div><div className="flex-1 space-y-2 overflow-auto">{issues.length===0&&<div className="rounded border border-emerald-500/30 p-4 text-center text-emerald-300"><CheckCircle2 className="mx-auto mb-2 h-5 w-5"/>No issues for this filter.</div>}{issues.map((issue,index)=>{const Icon=severityIcon[issue.severity];return <button type="button" key={`${issue.category}-${issue.targetId}-${issue.field}-${index}`} onClick={()=>onNavigate(issue)} className={`w-full rounded border bg-black/30 p-3 text-left ${severityStyle[issue.severity]}`}><div className="flex items-center gap-2 text-[9px] uppercase"><Icon className="h-3.5 w-3.5"/>{issue.severity} · {issue.category}</div><strong className="mt-1 block text-xs text-white">{issue.targetId}</strong>{issue.field&&<span className="block text-[9px] text-zinc-500">{issue.field}</span>}<p className="mt-1 text-[10px] leading-relaxed text-zinc-300">{issue.message}</p><span className="mt-2 block text-[9px] text-cyan-500">Open entity →</span></button>})}</div></aside>;
};
