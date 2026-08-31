/**
 * @neon-ether/engine
 * Seedable deterministic dice roller and stat modifier calculator.
 */

export interface DiceRollResult {
  rawRoll: number;
  modifier: number;
  total: number;
  isNaturalCriticalSuccess: boolean;
  isNaturalCriticalFailure: boolean;
  breakdown: string;
}

export interface RandomState { initialSeed:number; state:number; draws:number }
export interface RandomSource {
  nextFloat():number;
  integer(min:number,max:number):number;
  chance(probability:number):boolean;
  snapshot():RandomState;
  restore(state:RandomState):void;
  reset(seed:number):void;
  rollD20(modifier?:number,label?:string):DiceRollResult;
  rollRange(min:number,max:number):number;
  onStateChanged(listener?: (state:RandomState)=>void):void;
}

export class DiceRoller implements RandomSource {
  private seed: number;
  private initialSeed:number;
  private draws=0;
  private listener?: (state:RandomState)=>void;

  constructor(initialSeed: number = 1337) {
    this.seed=this.normalize(initialSeed);this.initialSeed=this.seed;
  }

  /**
   * Deterministic pseudo-random number generator (Lehmer LCG).
   */
  public nextRandom(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    this.draws+=1;this.listener?.(this.snapshot());
    return (this.seed - 1) / 2147483646;
  }
  public nextFloat():number{return this.nextRandom();}
  public integer(min:number,max:number):number{if(!Number.isInteger(min)||!Number.isInteger(max)||max<min)throw new Error(`Invalid random integer range ${min}..${max}`);return Math.floor(this.nextRandom()*(max-min+1))+min;}
  public chance(probability:number):boolean{if(probability<0||probability>1)throw new Error(`Invalid probability ${probability}`);return this.nextRandom()<probability;}
  public snapshot():RandomState{return{initialSeed:this.initialSeed,state:this.seed,draws:this.draws};}
  public restore(state:RandomState):void{this.initialSeed=this.normalize(state.initialSeed);this.seed=this.normalize(state.state);this.draws=Math.max(0,Math.trunc(state.draws));this.listener?.(this.snapshot());}
  public reset(seed:number):void{this.seed=this.normalize(seed);this.initialSeed=this.seed;this.draws=0;this.listener?.(this.snapshot());}
  public onStateChanged(listener?: (state:RandomState)=>void):void{this.listener=listener;}
  private normalize(seed:number):number{let value=Math.trunc(seed)%2147483647;if(value<=0)value+=2147483646;return value;}

  public rollD20(modifier: number = 0, label: string = 'Check'): DiceRollResult {
    const raw = Math.floor(this.nextRandom() * 20) + 1;
    const isNaturalCriticalSuccess = raw === 20;
    const isNaturalCriticalFailure = raw === 1;
    const total = raw + modifier;

    return {
      rawRoll: raw,
      modifier,
      total,
      isNaturalCriticalSuccess,
      isNaturalCriticalFailure,
      breakdown: `[d20: ${raw} ${modifier >= 0 ? '+' : ''}${modifier} = ${total}] (${label})`,
    };
  }

  public rollRange(min: number, max: number): number {
    return this.integer(min,max);
  }
}
