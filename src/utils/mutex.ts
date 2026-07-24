/**
 * A minimal async mutex.
 *
 * The background worker services state mutations triggered by several tabs at
 * once. Without serialisation, two concurrent read-modify-write cycles could
 * clobber each other. `runExclusive` guarantees the callbacks run one at a
 * time, in order.
 */
export class Mutex {
  private queue: Promise<unknown> = Promise.resolve();

  runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    // Keep the chain alive even if a task rejects.
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
