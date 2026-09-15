import React from 'react';
import { Image, PackageOpen, X } from 'lucide-react';
import { ItemSchema, type GameContent, type Item } from '@neon-ether/game-schema';
import { SchemaPropertyEditor } from './SchemaPropertyEditor.tsx';

const itemFieldsSchema = ItemSchema.omit({ artwork: true });
const previewSource = (value:string) => value.startsWith('assets/') ? `/${value}` : value;

/** Item artwork authoring uses the same repository asset references as other content. */
export const ItemEditor:React.FC<{item:Item;content:GameContent;knownAssets:string[];onChange:(item:Item)=>void}>=({item,content,knownAssets,onChange})=>{
  const artwork=item.artwork?.trim()??'';
  return <div className="space-y-4"><section className="grid gap-4 rounded-xl border border-amber-500/30 bg-black/30 p-4 lg:grid-cols-[180px_1fr]">
    <div className="grid min-h-40 place-items-center overflow-hidden rounded-lg border border-zinc-700 bg-[#050812]">{artwork?<img src={previewSource(artwork)} alt={`${item.name} artwork preview`} className="h-full max-h-48 w-full object-contain"/>:<div className="flex flex-col items-center gap-2 text-zinc-600"><PackageOpen className="h-10 w-10"/><span className="text-[10px] uppercase tracking-wider">No artwork assigned</span></div>}</div>
    <div className="space-y-2"><div className="flex items-center gap-2 text-xs font-bold text-amber-300"><Image className="h-4 w-4"/>Item artwork</div><p className="text-[10px] leading-relaxed text-zinc-500">Use the same repository-relative path convention as NPC and POI artwork. Empty is valid and uses the production fallback.</p><div className="flex gap-2"><input list="item-artwork-assets" value={item.artwork??''} onChange={(event)=>onChange({...item,artwork:event.target.value||undefined})} placeholder="/assets/items/example.webp" className="w-full rounded border border-zinc-700 bg-[#060812] px-3 py-2 text-xs text-cyan-100 outline-none focus:border-cyan-500"/><button type="button" aria-label="Clear artwork" disabled={!item.artwork} onClick={()=>onChange({...item,artwork:undefined})} className="rounded border border-zinc-700 px-3 text-zinc-400 disabled:opacity-30"><X className="h-4 w-4"/></button></div><datalist id="item-artwork-assets">{knownAssets.filter(asset=>/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(asset)).map(asset=><option key={asset} value={`/${asset}`}/>)}</datalist></div>
  </section><SchemaPropertyEditor schema={itemFieldsSchema} value={item} content={content} onChange={(next)=>onChange({...next as Item,artwork:item.artwork})}/></div>;
};
