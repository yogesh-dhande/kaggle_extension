// Browser polyfill for Node.js async_hooks
// This provides a minimal implementation for browser environments

export class AsyncLocalStorage<T = any> {
  private store: Map<string, T> = new Map();
  private currentId: string = 'default';

  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
    const previousId = this.currentId;
    this.currentId = Math.random().toString(36);
    this.store.set(this.currentId, store);
    
    try {
      return callback(...args);
    } finally {
      this.store.delete(this.currentId);
      this.currentId = previousId;
    }
  }

  getStore(): T | undefined {
    return this.store.get(this.currentId);
  }

  enterWith(store: T): void {
    this.store.set(this.currentId, store);
  }

  disable(): void {
    this.store.delete(this.currentId);
  }

  exit<R>(callback: (...args: any[]) => R, ...args: any[]): R {
    const previousId = this.currentId;
    this.currentId = 'default';
    
    try {
      return callback(...args);
    } finally {
      this.currentId = previousId;
    }
  }
}
