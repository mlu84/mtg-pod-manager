import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitService {
  private buckets = new Map<string, Bucket>();

  consume(key: string, maxRequests: number, windowMs: number): void {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return;
    }

    if (current.count >= maxRequests) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    this.buckets.set(key, current);
  }
}
