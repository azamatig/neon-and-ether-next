import React, { useEffect, useMemo, useState } from 'react';
import type { DialogueChoice, DialogueNode, DialogueTree } from '@neon-ether/game-schema';
import type { ResolvedEventState } from '@neon-ether/game-runtime';
import { ArrowRight, ImageOff, UserRound, X } from 'lucide-react';
import { Button } from '@neon-ether/shared-ui';

type EventSceneProps = {
  mode: 'event';
  eventState: ResolvedEventState;
  onAdvance: () => void;
  onChoose: (id: string) => void;
  onSkip?: () => void;
  resolveNpcName: (id: string) => string;
};

type DialogueSceneProps = {
  mode: 'dialogue';
  tree: DialogueTree;
  node: DialogueNode;
  onChoose: (choice: DialogueChoice) => void;
  onClose: () => void;
};

type SceneParticipant = { key: string; name: string; title?: string; portrait?: string };

/** Persistent presentation shell shared by narrative GameEvents and legacy POI dialogue trees. */
export const SceneEventScreen: React.FC<EventSceneProps | DialogueSceneProps> = (props) => {
  const sceneId = props.mode === 'event' ? props.eventState.event.id : props.tree.id;
  const beatId = props.mode === 'event' ? props.eventState.currentStep.id : props.node.id;
  const explicitArtwork = props.mode === 'event' ? props.eventState.currentStep.image : undefined;
  const initialArtwork = props.mode === 'event' ? props.eventState.event.presentation.backgroundImage : undefined;
  const [artwork, setArtwork] = useState(explicitArtwork ?? initialArtwork);
  const [previousArtwork, setPreviousArtwork] = useState<string>();

  useEffect(() => { setArtwork(explicitArtwork ?? initialArtwork); setPreviousArtwork(undefined); }, [sceneId]);
  useEffect(() => {
    if (!explicitArtwork) return;
    setArtwork((currentArtwork) => {
      if (explicitArtwork === currentArtwork) return currentArtwork;
      setPreviousArtwork(currentArtwork);
      return explicitArtwork;
    });
    const timeout = window.setTimeout(() => setPreviousArtwork(undefined), 320);
    return () => window.clearTimeout(timeout);
  }, [explicitArtwork]);

  const participants = useMemo<SceneParticipant[]>(() => {
    if (props.mode === 'dialogue') {
      const unique = new Map<string, SceneParticipant>();
      Object.values(props.tree.nodes).forEach((node) => unique.set(node.speakerName, {
        key: node.speakerName,
        name: node.speakerName,
        title: node.speakerTitle,
        portrait: node.speakerPortrait,
      }));
      return [...unique.values()];
    }
    const unique = new Map<string, SceneParticipant>();
    props.eventState.event.steps.forEach((step) => {
      const speaker = step.speaker;
      if (!speaker || speaker.type === 'narrator' || speaker.type === 'system') return;
      const key = speaker.type === 'player' ? 'player' : speaker.npcId ?? speaker.name ?? step.id;
      unique.set(key, {
        key,
        name: speaker.type === 'player' ? 'YOU' : speaker.name ?? (speaker.npcId ? props.resolveNpcName(speaker.npcId) : 'Unknown Speaker'),
        title: speaker.title,
        portrait: speaker.portrait,
      });
    });
    const active = props.eventState.currentStep.resolvedSpeaker;
    if (active && active.type !== 'narrator' && active.type !== 'system') {
      const authored = props.eventState.currentStep.speaker;
      const key = active.type === 'player' ? 'player' : authored?.npcId ?? active.name;
      unique.set(key, { key, name: active.type === 'player' ? 'YOU' : active.name, title: active.title, portrait: active.portrait });
    }
    return [...unique.values()];
  }, [props, sceneId, beatId]);

  const speaker = props.mode === 'event'
    ? props.eventState.currentStep.resolvedSpeaker
    : { type: 'npc' as const, name: props.node.speakerName, title: props.node.speakerTitle, portrait: props.node.speakerPortrait };
  const activeKey = props.mode === 'event'
    ? speaker?.type === 'player' ? 'player' : props.eventState.currentStep.speaker?.npcId ?? speaker?.name
    : props.node.speakerName;
  const isNarration = !speaker || speaker.type === 'narrator' || speaker.type === 'system';
  const text = props.mode === 'event' ? props.eventState.currentStep.text : props.node.text;
  const title = props.mode === 'event' ? props.eventState.currentStep.title : undefined;
  const eventChoices = props.mode === 'event' ? props.eventState.currentStep.resolvedChoices.filter((choice) => choice.isVisible) : [];
  const canContinue = props.mode === 'event' && eventChoices.length === 0;

  useEffect(() => {
    if (!canContinue) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); props.onAdvance(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canContinue, beatId, props]);

  return <section className="ne-scene-screen" data-mode={props.mode} data-layout={props.mode === 'event' ? props.eventState.event.presentation.layoutStyle : 'dialogue'} aria-live="polite">
    <div className="ne-scene-art">
      {previousArtwork && <img className="ne-scene-art__image ne-scene-art__image--outgoing" src={previousArtwork} alt="" />}
      {artwork ? <img key={artwork} className="ne-scene-art__image" src={artwork} alt="" /> : <ImageOff aria-hidden="true" />}
      <div className="ne-scene-art__shade" />
      <span>{props.mode === 'event' ? `${props.eventState.event.type} event` : props.tree.title}</span>
    </div>
    {participants.length > 0 && <aside className="ne-scene-cast" aria-label="Scene participants">
      {participants.map((participant) => <div key={participant.key} data-active={participant.key === activeKey}>
        <span>{participant.portrait ? <img src={participant.portrait} alt="" /> : <UserRound aria-hidden="true" />}</span>
        <small>{participant.name}</small>
      </div>)}
    </aside>}
    <div className="ne-scene-panel">
      <header>
        <small>{props.mode === 'event' ? `${props.eventState.event.name} · ${props.eventState.stepIndex + 1}/${props.eventState.totalSteps}` : props.tree.title}</small>
        {props.mode === 'event' && props.eventState.event.skipOutcome && props.onSkip && <Button variant="ghost" size="sm" onClick={props.onSkip}>Skip</Button>}
        {props.mode === 'dialogue' && <Button variant="ghost" size="sm" onClick={props.onClose} title="Close dialogue"><X /></Button>}
      </header>
      <div key={beatId} className="ne-scene-beat" data-narration={isNarration}>
        <div className="ne-scene-speaker">
          <span>{speaker?.portrait ? <img src={speaker.portrait} alt="" /> : <UserRound aria-hidden="true" />}</span>
          <div><small>{isNarration ? 'Narration' : speaker?.title ?? 'Speaker'}</small><strong>{isNarration ? 'NARRATION' : speaker?.type === 'player' ? 'YOU' : speaker?.name}</strong></div>
        </div>
        {title && <h1>{title}</h1>}
        <p>{text}</p>
      </div>
      <footer>
        {props.mode === 'event' && eventChoices.length > 0 && <div className="ne-scene-choices">{eventChoices.map((choice, index) => <button type="button" key={choice.id} disabled={!choice.isAvailable} title={choice.unmetReason} onClick={() => props.onChoose(choice.id)}><span>{String(index + 1).padStart(2, '0')}</span><div>{choice.statCheckInfo && <small>{choice.statCheckInfo.stat} · {choice.statCheckInfo.difficulty}</small>}<strong>{choice.text}</strong>{!choice.isAvailable && choice.unmetReason && <em>{choice.unmetReason}</em>}</div></button>)}</div>}
        {props.mode === 'dialogue' && <div className="ne-scene-choices">{props.node.choices.map((choice, index) => <button type="button" key={choice.id} onClick={() => props.onChoose(choice)}><span>{String(index + 1).padStart(2, '0')}</span><div>{choice.requirement && <small>{choice.requirement.stat} · {choice.requirement.difficulty}</small>}<strong>{choice.text}</strong></div></button>)}</div>}
        {canContinue && <Button onClick={props.onAdvance} rightIcon={<ArrowRight />}>{props.eventState.currentStep.isFinalStep ? 'Continue' : 'Next'}</Button>}
      </footer>
    </div>
  </section>;
};
