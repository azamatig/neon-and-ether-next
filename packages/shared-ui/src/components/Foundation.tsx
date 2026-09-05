import React, { useId } from 'react';
import { AlertTriangle, Check, MapPin, PackageOpen, UserRound, X } from 'lucide-react';
import { Badge, type BadgeProps } from './Badge.tsx';
import { Button, type ButtonProps } from './Button.tsx';
import { Panel, type PanelProps } from './Panel.tsx';

export const GamePanel = Panel;
export const SectionPanel: React.FC<PanelProps> = (props) => <Panel {...props} className={`ne-section-panel ${props.className ?? ''}`} />;
export const CyberButton = Button;

export const IconButton: React.FC<ButtonProps & { label: string }> = ({ label, children, ...props }) => (
  <Button {...props} aria-label={label} title={props.title ?? label} className={`!min-h-10 !min-w-10 !px-2 ${props.className ?? ''}`}>{children}</Button>
);

export interface TabsProps<T extends string> { value: T; items: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>; onChange: (value: T) => void; label: string; }
export function Tabs<T extends string>({ value, items, onChange, label }: TabsProps<T>) {
  return <div role="tablist" aria-label={label} className="ne-tabs">{items.map(item => <button type="button" role="tab" aria-selected={value === item.value} disabled={item.disabled} key={item.value} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>;
}

export const StatusBadge: React.FC<BadgeProps & { status?: 'success'|'warning'|'danger'|'neutral' }> = ({ status='neutral', ...props }) => <Badge {...props} variant={status === 'success' ? 'emerald' : status === 'warning' ? 'amber' : status === 'danger' ? 'rose' : 'zinc'} />;

export const ProgressBar: React.FC<{ value: number; max: number; label?: string; tone?: 'primary'|'ether'|'success'|'warning'|'danger'; showValue?: boolean }> = ({ value, max, label, tone='primary', showValue=true }) => {
  const percent = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  return <div className="ne-progress"><div className="ne-progress__label"><span>{label}</span>{showValue && <strong>{value} / {max}</strong>}</div><div className="ne-progress__track"><span data-tone={tone} style={{width:`${percent}%`}} /></div></div>;
};

export const StatRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode; detail?: React.ReactNode }> = ({label,value,icon,detail}) => <div className="ne-stat-row"><span>{icon}{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
export const ResourceDisplay = StatRow;

export const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactElement }> = ({content,children}) => <span className="ne-tooltip" tabIndex={0}>{children}<span role="tooltip">{content}</span></span>;

export interface ModalProps { open?: boolean; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode; onClose?: () => void; size?: 'sm'|'md'|'lg'; }
export const Modal: React.FC<ModalProps> = ({open=true,title,description,children,footer,onClose,size='md'}) => { const id=useId(); if(!open)return null; return <div className="ne-modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose?.()}><section role="dialog" aria-modal="true" aria-labelledby={id} className="ne-modal" data-size={size}><header><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>{onClose && <IconButton label="Close" variant="ghost" onClick={onClose}><X size={18}/></IconButton>}</header><div className="ne-modal__body">{children}</div>{footer && <footer>{footer}</footer>}</section></div>; };
export const ResultModal = Modal;
export const ConfirmationModal: React.FC<ModalProps & { confirmLabel?: string; cancelLabel?: string; danger?: boolean; onConfirm: () => void }> = ({confirmLabel='Confirm',cancelLabel='Cancel',danger,onConfirm,onClose,...props}) => <Modal {...props} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>{cancelLabel}</Button><Button variant={danger?'danger':'primary'} onClick={onConfirm}>{confirmLabel}</Button></>}/>;

export const ChoiceButton: React.FC<ButtonProps & { description?: string; unavailableReason?: string }> = ({description,unavailableReason,children,...props}) => <Button {...props} disabled={props.disabled || Boolean(unavailableReason)} title={unavailableReason} className={`ne-choice ${props.className ?? ''}`}><span><strong>{children}</strong>{description && <small>{description}</small>}{unavailableReason && <small className="ne-requirement">{unavailableReason}</small>}</span></Button>;

export const CharacterPortrait: React.FC<{ src?: string; alt: string; initials?: string }> = ({src,alt,initials}) => <div className="ne-portrait">{src?<img src={src} alt={alt}/>:<span aria-label={alt}>{initials ?? <UserRound/>}</span>}</div>;
export const CharacterCard: React.FC<{ name: string; subtitle?: string; portrait?: string; children?: React.ReactNode; selected?: boolean }> = ({name,subtitle,portrait,children,selected}) => <article className="ne-card" data-selected={selected}><CharacterPortrait src={portrait} alt={name}/><div><h3>{name}</h3>{subtitle&&<p>{subtitle}</p>}{children}</div></article>;
export const ItemCard: React.FC<{ name: string; description?: string; meta?: React.ReactNode; selected?: boolean }> = ({name,description,meta,selected}) => <article className="ne-item-card" data-selected={selected}><PackageOpen/><div><h3 title={name}>{name}</h3>{description&&<p>{description}</p>}{meta}</div></article>;
export const ItemSlot: React.FC<{ label: string; children?: React.ReactNode; emptyLabel?: string }> = ({label,children,emptyLabel='Empty slot'}) => <div className="ne-item-slot"><span>{label}</span>{children ?? <em>{emptyLabel}</em>}</div>;
export const POIMarker: React.FC<ButtonProps & { label: string; active?: boolean }> = ({label,active,...props}) => <Button {...props} aria-pressed={active} variant={active?'primary':'secondary'} leftIcon={<MapPin size={16}/>} className={`ne-marker ${props.className??''}`}>{label}</Button>;
export const QuestMarker: React.FC<{ children: React.ReactNode; active?: boolean }> = ({children,active}) => <Badge variant={active?'cyan':'zinc'} icon={<Check size={12}/>}>{children}</Badge>;
export const ConditionRequirement: React.FC<{ met: boolean; children: React.ReactNode }> = ({met,children}) => <span className="ne-condition" data-met={met}>{met?<Check/>:<AlertTriangle/>}{children}</span>;
export const RewardDisplay: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({label,value,icon}) => <span className="ne-reward">{icon}<span>{label}</span><strong>{value}</strong></span>;
export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({title,description,action}) => <div className="ne-state"><PackageOpen/><h3>{title}</h3>{description&&<p>{description}</p>}{action}</div>;
export const LoadingState: React.FC<{ label?: string }> = ({label='Loading data'}) => <div className="ne-state" role="status"><span className="ne-spinner"/><p>{label}</p></div>;
