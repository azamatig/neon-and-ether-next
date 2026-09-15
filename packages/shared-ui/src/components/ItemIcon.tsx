import React from 'react';
import type { Item } from '@neon-ether/game-schema';
import { PackageOpen } from 'lucide-react';

/** Authored item artwork with a neutral fallback; presentation only. */
export const ItemIcon:React.FC<{item?:Pick<Item,'name'|'artwork'>;className?:string}>=({item,className})=><span className={`ne-item-icon ${className??''}`} aria-hidden="true">{item?.artwork?<img src={item.artwork} alt=""/>:<PackageOpen/>}</span>;
