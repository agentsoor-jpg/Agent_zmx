import { Suggestion } from './ImprovementPlanner';
import { ValidationGate } from './ValidationGate';
import { ControlledSelfModification } from './ControlledSelfModification';

export class ImprovementQueue {
  private queue: Suggestion[] = [];

  constructor(
    private validator: ValidationGate,
    private selfMod: ControlledSelfModification
  ) {}

  addSuggestions(suggestions: Suggestion[]) {
    this.queue.push(...suggestions);
  }

  async processNext() {
    if (this.queue.length === 0) return null;

    // One change at a time
    const suggestion = this.queue.shift()!;

    console.log('[QUEUE] Processing suggestion...');
    const isSafe = this.validator.validate(suggestion);
    
    if (isSafe) {
      console.log('[QUEUE] Suggestion validated as safe. Applying...');
      return await this.selfMod.apply(suggestion);
    } else {
      console.log('[QUEUE] Suggestion rejected by Validation Gate.');
      return { status: 'rejected' };
    }
  }
}
