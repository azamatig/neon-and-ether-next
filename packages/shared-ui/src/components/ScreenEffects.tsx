import React, { memo } from 'react';

/** Lightweight global texture layers controlled by presentation-only HTML preferences. */
export const ScreenEffects = memo(() => (
  <div className="ne-screen-fx" aria-hidden="true">
    <span className="ne-screen-fx__scanlines" />
    <span className="ne-screen-fx__noise" />
    <span className="ne-screen-fx__vignette" />
  </div>
));
ScreenEffects.displayName = 'ScreenEffects';
