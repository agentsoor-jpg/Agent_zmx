export class RateLimiter {
  private requests = new Map<string, number[]>();

  check(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    let userRequests = this.requests.get(ip) || [];
    
    // Clean old requests
    userRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (userRequests.length >= limit) {
      this.requests.set(ip, userRequests);
      return false; // Rate limited
    }

    userRequests.push(now);
    this.requests.set(ip, userRequests);
    return true; // Allowed
  }
}
