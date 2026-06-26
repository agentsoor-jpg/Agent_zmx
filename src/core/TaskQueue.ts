export class TaskQueue {
  private queue: any[] = [];
  private processing = false;

  add(task: any) {
    this.queue.push(task);
  }

  async processNext(processor: (task: any) => Promise<void>) {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await processor(task);
      } catch (err) {
        console.error('[TASK QUEUE] Error processing task:', err);
      }
    }

    this.processing = false;
  }
}
