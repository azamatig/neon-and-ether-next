import React, { useState } from 'react';
import type { InventoryState, Item } from '@neon-ether/game-schema';
import type { ShopView } from '@neon-ether/game-runtime';
import { ArrowLeft, Coins, PackageOpen, ShoppingBag } from 'lucide-react';
import { Button } from './Button.tsx';

interface ShopScreenProps {
  view?: ShopView;
  inventory: InventoryState;
  items: Item[];
  onBuy: (shopId: string, itemId: string) => void;
  onSell: (shopId: string, itemId: string) => void;
  onReturn: () => void;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({ view, inventory, items, onBuy, onSell, onReturn }) => {
  const [selectedId, setSelectedId] = useState<string>();
  const itemMap = new Map<string, Item>(items.map((item) => [item.id, item]));
  const selected = selectedId ? itemMap.get(selectedId) : undefined;
  if (!view) return <ScreenUnavailable title="Trade interface unavailable" onReturn={onReturn} />;
  const shopItem = selectedId ? view.items.find((entry) => entry.item.id === selectedId) : undefined;
  const playerItem = selectedId ? inventory.items.find((entry) => entry.itemId === selectedId) : undefined;
  return <section className="ne-context-screen">
    <header><div><ShoppingBag/><span>{view.shop.name}</span></div><small>Trade interface · {inventory.credits} credits</small></header>
    <div className="ne-trade-grid">
      <InventoryColumn title="Shop inventory">{view.items.map(({item,quantity,buyPrice})=><ItemEntry key={item.id} item={item} selected={selectedId===item.id} meta={`${buyPrice} cr · ${quantity ?? '∞'} available`} onClick={()=>setSelectedId(item.id)}/>)}</InventoryColumn>
      <InventoryColumn title="Player inventory">{inventory.items.map((slot)=>{const item=itemMap.get(slot.itemId);return item?<ItemEntry key={slot.entryId} item={item} selected={selectedId===item.id} meta={`${slot.quantity} owned · ${shopItem?.sellPrice ?? item.valueCredits} cr sell`} onClick={()=>setSelectedId(item.id)}/>:null})}</InventoryColumn>
    </div>
    <footer className="ne-context-footer"><div className="ne-item-detail">{selected?<><PackageOpen/><span><strong>{selected.name}</strong><small>{selected.description}</small></span></>:<span>Select an item to inspect.</span>}</div><div>{shopItem&&<Button onClick={()=>onBuy(view.shop.id,shopItem.item.id)} disabled={shopItem.quantity===0 || inventory.credits<shopItem.buyPrice}>Buy · {shopItem.buyPrice}</Button>}{playerItem&&<Button variant="secondary" onClick={()=>onSell(view.shop.id,playerItem.itemId)}>Sell</Button>}<Button variant="ghost" onClick={onReturn} leftIcon={<ArrowLeft/>}>Return</Button></div></footer>
  </section>;
};

const InventoryColumn:React.FC<{title:string;children:React.ReactNode}>=({title,children})=><section className="ne-inventory-column"><h2>{title}</h2><div>{children}</div></section>;
const ItemEntry:React.FC<{item:Item;meta:string;selected:boolean;onClick:()=>void}>=({item,meta,selected,onClick})=><button type="button" data-selected={selected} onClick={onClick}><PackageOpen/><span><strong>{item.name}</strong><small>{item.category} · {item.rarity}</small></span><em>{meta}</em></button>;
const ScreenUnavailable:React.FC<{title:string;onReturn:()=>void}>=({title,onReturn})=><section className="ne-context-screen ne-unavailable"><Coins/><h2>{title}</h2><Button variant="secondary" onClick={onReturn}>Return</Button></section>;
