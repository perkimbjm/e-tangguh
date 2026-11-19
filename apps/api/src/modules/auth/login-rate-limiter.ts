import { Injectable } from '@nestjs/common';
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS } from './auth.constants';

/** Pembatas laju percobaan masuk dalam memori (satu instans server; cukup untuk skala ini). */
@Injectable()
export class LoginRateLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly max = LOGIN_MAX_ATTEMPTS,
    private readonly windowMs = LOGIN_WINDOW_MS,
  ) {}

  isBlocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.max;
  }

  recordFailure(key: string, now = Date.now()): void {
    const list = this.recent(key, now);
    list.push(now);
    this.attempts.set(key, list);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private recent(key: string, now: number): number[] {
    return (this.attempts.get(key) ?? []).filter((t) => now - t < this.windowMs);
  }
}
