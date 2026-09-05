import React from 'react';

export interface GameShellProps {
  mode?: 'standard' | 'immersive' | 'combat';
  children: React.ReactNode;
  hud?: React.ReactNode;
}

/** One presentation frame for every production gameplay context. */
export const GameShell: React.FC<GameShellProps> = ({ mode = 'standard', children, hud }) => (
  <main className="ne-game-shell" data-mode={mode}>
    <div className="ne-game-shell__content">{children}</div>
    {hud && mode === 'standard' && <div className="ne-game-shell__hud">{hud}</div>}
  </main>
);
