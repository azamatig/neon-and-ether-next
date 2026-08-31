import React from 'react';
import type { DialogueChoice, DialogueNode } from '@neon-ether/game-schema';
import { UserRound, X } from 'lucide-react';
import { Button } from '@neon-ether/shared-ui';

export const DialogueOverlay:React.FC<{node:DialogueNode;onChoose:(choice:DialogueChoice)=>void;onClose:()=>void}>=({node,onChoose,onClose})=><section className="ne-dialogue-screen" aria-labelledby="dialogue-speaker">
  <div className="ne-dialogue-art">{node.speakerPortrait?<img src={node.speakerPortrait} alt=""/>:<UserRound aria-hidden="true"/>}</div>
  <div className="ne-dialogue-box"><header><div><small>{node.speakerTitle??'Contact'}</small><h2 id="dialogue-speaker">{node.speakerName}</h2></div><Button variant="ghost" size="sm" onClick={onClose} title="Close dialogue"><X/></Button></header><p>{node.text}</p><div className="ne-dialogue-choices">{node.choices.map((choice,index)=><button type="button" key={choice.id} onClick={()=>onChoose(choice)}><span>{String(index+1).padStart(2,'0')}</span><div>{choice.requirement&&<small>{choice.requirement.stat} · {choice.requirement.difficulty}</small>}<strong>{choice.text}</strong></div></button>)}</div></div>
</section>;
