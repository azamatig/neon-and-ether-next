/**
 * @neon-ether/engine
 * Deterministic fixed-step game loop and tick runner.
 */

export interface GameLoopOptions {
  ticksPerSecond?: number;
  onTick: (deltaMs: number, tickIndex: number) => void;
}

export class GameLoop {
  private isRunning = false;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private tickIndex = 0;
  private readonly fixedDeltaMs: number;
  private onTick: (deltaMs: number, tickIndex: number) => void;

  constructor(options: GameLoopOptions) {
    const rate = options.ticksPerSecond ?? 30;
    this.fixedDeltaMs = 1000 / rate;
    this.onTick = options.onTick;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.step();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getTickIndex(): number {
    return this.tickIndex;
  }

  private step = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    let frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Guard against giant time jumps (e.g. tab unfocused)
    if (frameTime > 250) frameTime = 250;

    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedDeltaMs) {
      this.tickIndex++;
      this.onTick(this.fixedDeltaMs, this.tickIndex);
      this.accumulator -= this.fixedDeltaMs;
    }

    this.animationFrameId = requestAnimationFrame(this.step);
  };
}
