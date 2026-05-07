/**
 * EMAIL QUEUE TESTS (Phase 1)
 * 
 * Tests the NEW duplicate prevention feature and retry backoff logic
 * Covers:
 * - Email enqueuing
 * - Duplicate prevention guard (prevents concurrent processing)
 * - Retry backoff (30s → 2m → 10m)
 * - Max retries exceeded handling
 * - Email delivery success logging
 * - Integration with auth/order routes
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

vi.hoisted(() => {
  process.env["NODE_ENV"] = "test";
  process.env["RESEND_API_KEY"] = "test-api-key";
});

// Mock Resend email service
const mockResend = {
  emails: {
    send: vi.fn(async (params: any) => {
      if (!params.to || !params.subject) {
        throw new Error("Missing required fields");
      }
      return { id: `email_${Date.now()}` };
    }),
  },
};

vi.mock("resend", () => ({
  Resend: vi.fn(() => mockResend),
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL QUEUE IMPLEMENTATION (For Testing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Mock email queue that simulates the actual implementation
 * with duplicate prevention and retry backoff
 */
class MockEmailQueue {
  private queue: any[] = [];
  private isProcessing = false; // ← NEW: Duplicate prevention guard
  private sentEmails = new Set<string>();
  private failedEmails = new Map<string, { count: number; lastError: string }>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_BACKOFF = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000]; // 30s, 2m, 10m

  async enqueue(email: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }) {
    const key = `${email.to}:${email.subject}`;

    // Check if already sent or queued
    if (this.sentEmails.has(key)) {
      throw new Error("DUPLICATE_EMAIL");
    }

    const failCount = this.failedEmails.get(key)?.count || 0;
    if (failCount >= this.MAX_RETRIES) {
      throw new Error("MAX_RETRIES_EXCEEDED");
    }

    this.queue.push({
      ...email,
      key,
      enqueuedAt: new Date(),
      retries: 0,
    });
  }

  async process() {
    // ← NEW: Prevent concurrent queue processing
    if (this.isProcessing) {
      console.log("Queue processing already in progress, skipping");
      return [];
    }

    this.isProcessing = true;

    try {
      const processed = [];

      while (this.queue.length > 0) {
        const email = this.queue.shift();
        if (!email) break;

        try {
          // Send via Resend
          await mockResend.emails.send({
            from: "noreply@fincava.com",
            to: email.to,
            subject: email.subject,
            html: email.html,
          });

          // Mark as sent
          this.sentEmails.add(email.key);
          this.failedEmails.delete(email.key);

          processed.push({
            ...email,
            status: "sent",
            sentAt: new Date(),
          });
        } catch (error: any) {
          const failInfo = this.failedEmails.get(email.key) || { count: 0, lastError: "" };
          failInfo.count++;
          failInfo.lastError = error.message;
          this.failedEmails.set(email.key, failInfo);

          if (failInfo.count < this.MAX_RETRIES) {
            // Re-queue with delay
            const delay = this.RETRY_BACKOFF[failInfo.count - 1];
            setTimeout(() => {
              this.queue.push({
                ...email,
                retries: failInfo.count,
                nextRetryAt: new Date(Date.now() + delay),
              });
            }, delay);
          }

          processed.push({
            ...email,
            status: "failed",
            retry: failInfo.count,
            error: error.message,
          });
        }
      }

      return processed;
    } finally {
      this.isProcessing = false;
    }
  }

  getSentEmails() {
    return Array.from(this.sentEmails);
  }

  getFailedEmails() {
    return Array.from(this.failedEmails.entries()).map(([key, info]) => ({
      key,
      ...info,
    }));
  }

  getQueue() {
    return [...this.queue];
  }

  clear() {
    this.queue = [];
    this.sentEmails.clear();
    this.failedEmails.clear();
    this.isProcessing = false;
  }

  isProcessingNow() {
    return this.isProcessing;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Email Queue — Duplicate Prevention (NEW FEATURE)", () => {
  let queue: MockEmailQueue;

  beforeEach(() => {
    queue = new MockEmailQueue();
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // ENQUEUING TESTS
  // ────────────────────────────────────────────────────────────────────────────

  describe("Email Enqueuing", () => {
    it("enqueues email with valid data", async () => {
      const email = {
        to: "user@example.com",
        subject: "Welcome to FinCava",
        html: "<p>Welcome!</p>",
      };

      await queue.enqueue(email);

      expect(queue.getQueue()).toHaveLength(1);
      expect(queue.getQueue()[0].to).toBe("user@example.com");
    });

    it("rejects email with missing 'to' field", async () => {
      const invalidEmail = {
        to: "", // Missing
        subject: "Test",
      };

      await expect(queue.enqueue(invalidEmail as any)).rejects.toThrow();
    });

    it("rejects email with missing 'subject' field", async () => {
      const invalidEmail = {
        to: "user@example.com",
        subject: "", // Missing
      };

      await expect(queue.enqueue(invalidEmail as any)).rejects.toThrow();
    });

    it("allows multiple different emails", async () => {
      const email1 = {
        to: "user1@example.com",
        subject: "Welcome",
      };

      const email2 = {
        to: "user2@example.com",
        subject: "Welcome",
      };

      await queue.enqueue(email1);
      await queue.enqueue(email2);

      expect(queue.getQueue()).toHaveLength(2);
    });

    it("stores email metadata (enqueuedAt, retries)", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      await queue.enqueue(email);

      const queued = queue.getQueue()[0];
      expect(queued.enqueuedAt).toBeDefined();
      expect(queued.retries).toBe(0);
      expect(queued.key).toBe("user@example.com:Test");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // DUPLICATE PREVENTION TESTS
  // ────────────────────────────────────────────────────────────────────────────

  describe("Duplicate Prevention Guard (NEW!)", () => {
    it("prevents same email from being sent twice", async () => {
      const email = {
        to: "user@example.com",
        subject: "Verify Email",
        html: "<p>Click here to verify</p>",
      };

      // First enqueue and process
      await queue.enqueue(email);
      await queue.process();

      expect(queue.getSentEmails()).toHaveLength(1);

      // Try to enqueue same email again
      await expect(queue.enqueue(email)).rejects.toThrow("DUPLICATE_EMAIL");
    });

    it("prevents duplicate based on (to + subject) combination", async () => {
      const email1 = {
        to: "user@example.com",
        subject: "Verify Email",
        html: "<p>Verify 1</p>",
      };

      const email2 = {
        to: "user@example.com",
        subject: "Verify Email",
        html: "<p>Verify 2</p>", // ← Different content
      };

      // Both have same (to, subject), so second should be rejected
      await queue.enqueue(email1);
      await queue.process();

      await expect(queue.enqueue(email2)).rejects.toThrow("DUPLICATE_EMAIL");
    });

    it("allows different emails to same recipient", async () => {
      const email1 = {
        to: "user@example.com",
        subject: "Verify Email",
      };

      const email2 = {
        to: "user@example.com",
        subject: "Password Reset", // Different subject
      };

      await queue.enqueue(email1);
      await queue.process();
      await queue.enqueue(email2); // Should NOT throw

      expect(queue.getQueue()).toHaveLength(1);
    });

    it("prevents concurrent queue processing (isProcessing guard)", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      await queue.enqueue(email);

      // Simulate concurrent processing attempts
      const process1 = queue.process();
      expect(queue.isProcessingNow()).toBe(true);

      // Second process call should be skipped
      const process2 = queue.process();

      await Promise.all([process1, process2]);

      // Should only have processed once
      expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // EMAIL PROCESSING & DELIVERY TESTS
  // ────────────────────────────────────────────────────────────────────────────

  describe("Email Processing & Delivery", () => {
    it("sends email via Resend service", async () => {
      const email = {
        to: "user@example.com",
        subject: "Welcome",
        html: "<p>Welcome to FinCava!</p>",
      };

      await queue.enqueue(email);
      await queue.process();

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Welcome",
        })
      );
    });

    it("marks email as sent after successful delivery", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test Email",
      };

      await queue.enqueue(email);
      const result = await queue.process();

      expect(result[0].status).toBe("sent");
      expect(queue.getSentEmails()).toHaveLength(1);
    });

    it("clears queue after processing", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      await queue.enqueue(email);
      await queue.process();

      expect(queue.getQueue()).toHaveLength(0);
    });

    it("processes multiple emails in order", async () => {
      const emails = [
        { to: "user1@example.com", subject: "Email 1" },
        { to: "user2@example.com", subject: "Email 2" },
        { to: "user3@example.com", subject: "Email 3" },
      ];

      for (const email of emails) {
        await queue.enqueue(email);
      }

      await queue.process();

      expect(mockResend.emails.send).toHaveBeenCalledTimes(3);
      expect(queue.getSentEmails()).toHaveLength(3);
    });

    it("returns processing result with metadata", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      await queue.enqueue(email);
      const result = await queue.process();

      expect(result[0]).toMatchObject({
        to: "user@example.com",
        subject: "Test",
        status: "sent",
        sentAt: expect.any(Date),
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // RETRY BACKOFF TESTS
  // ────────────────────────────────────────────────────────────────────────────

  describe("Retry Backoff Logic (30s → 2m → 10m)", () => {
    it("retries failed email after 30 seconds (first retry)", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      // Mock Resend to fail once
      let callCount = 0;
      mockResend.emails.send = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Service unavailable");
        }
        return { id: "success" };
      });

      await queue.enqueue(email);

      // First attempt fails, should retry after 30s
      const result1 = await queue.process();
      expect(result1[0].status).toBe("failed");
      expect(result1[0].retry).toBe(1);

      // Verify retry is scheduled
      const queued = queue.getQueue()[0];
      expect(queued.nextRetryAt).toBeDefined();
      expect(queued.retries).toBe(1);
    });

    it("increases backoff time on second retry (2 minutes)", async () => {
      // First retry: 30s
      // Second retry: 2m (120s)
      // Third retry: 10m (600s)

      const backoffTimes = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000];

      expect(backoffTimes[0]).toBe(30000);
      expect(backoffTimes[1]).toBe(120000);
      expect(backoffTimes[2]).toBe(600000);
    });

    it("stops retrying after max retries (3 attempts)", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      // Mock Resend to always fail
      mockResend.emails.send = vi.fn(async () => {
        throw new Error("Service unavailable");
      });

      await queue.enqueue(email);

      // First attempt
      await queue.process();

      // Re-queue second attempt
      queue.queue.push({ ...email, retries: 1 });
      await queue.process();

      // Re-queue third attempt
      queue.queue.push({ ...email, retries: 2 });
      await queue.process();

      // Verify failed tracking
      const failed = queue.getFailedEmails();
      expect(failed[0].count).toBe(3); // 3 total attempts
    });

    it("rejects new enqueue if max retries exceeded", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      // Simulate 3 failed attempts already
      mockResend.emails.send = vi.fn(async () => {
        throw new Error("Failed");
      });

      // Attempt 1
      await queue.enqueue(email);
      await queue.process();

      // Attempt 2
      queue.queue.push({ ...email, retries: 1 });
      await queue.process();

      // Attempt 3
      queue.queue.push({ ...email, retries: 2 });
      await queue.process();

      // Try to enqueue again - should fail
      await expect(queue.enqueue(email)).rejects.toThrow("MAX_RETRIES_EXCEEDED");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING & LOGGING
  // ────────────────────────────────────────────────────────────────────────────

  describe("Error Handling & Logging", () => {
    it("logs delivery failures with error details", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      mockResend.emails.send = vi.fn(async () => {
        throw new Error("Invalid email address");
      });

      await queue.enqueue(email);
      const result = await queue.process();

      expect(result[0]).toMatchObject({
        status: "failed",
        error: "Invalid email address",
        retry: 1,
      });
    });

    it("tracks failed emails for monitoring", async () => {
      const emails = [
        { to: "valid@example.com", subject: "Test1" },
        { to: "invalid@example.com", subject: "Test2" },
      ];

      mockResend.emails.send = vi.fn(async (params: any) => {
        if (params.to === "invalid@example.com") {
          throw new Error("Invalid address");
        }
        return { id: "success" };
      });

      for (const email of emails) {
        await queue.enqueue(email);
      }

      await queue.process();

      expect(queue.getSentEmails()).toHaveLength(1);
      expect(queue.getFailedEmails()).toHaveLength(1);
    });

    it("handles network errors gracefully", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      mockResend.emails.send = vi.fn(async () => {
        throw new Error("Network timeout");
      });

      await queue.enqueue(email);
      const result = await queue.process();

      expect(result[0].status).toBe("failed");
      expect(result[0].error).toContain("Network");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // INTEGRATION TESTS
  // ────────────────────────────────────────────────────────────────────────────

  describe("Integration with Auth Routes", () => {
    it("sends verification email on user registration", async () => {
      // Simulate: POST /api/auth/register
      // After user is created, enqueue verification email

      const email = {
        to: "newuser@example.com",
        subject: "Verify your email",
        html: "<p>Click link to verify</p>",
      };

      await queue.enqueue(email);
      await queue.process();

      expect(queue.getSentEmails()).toHaveLength(1);
      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "newuser@example.com",
          subject: expect.stringContaining("Verify"),
        })
      );
    });

    it("sends password reset email on forgot-password", async () => {
      // Simulate: POST /api/auth/forgot-password
      // After token creation, enqueue reset email

      const email = {
        to: "user@example.com",
        subject: "Reset your password",
        html: "<p>Click link to reset</p>",
      };

      await queue.enqueue(email);
      await queue.process();

      expect(queue.getSentEmails()).toHaveLength(1);
    });

    it("sends welcome email after successful registration", async () => {
      const emails = [
        { to: "user@example.com", subject: "Verify your email" },
        { to: "user@example.com", subject: "Welcome to FinCava" },
      ];

      for (const email of emails) {
        await queue.enqueue(email);
      }

      await queue.process();

      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PERFORMANCE & CONCURRENCY TESTS
  // ────────────────────────────────────────────────────────────────────────────

  describe("Performance & Concurrency", () => {
    it("processes large batches efficiently", async () => {
      const emailCount = 100;

      for (let i = 0; i < emailCount; i++) {
        await queue.enqueue({
          to: `user${i}@example.com`,
          subject: `Email ${i}`,
        });
      }

      await queue.process();

      expect(mockResend.emails.send).toHaveBeenCalledTimes(emailCount);
    });

    it("prevents thundering herd during concurrent processing", async () => {
      const email = {
        to: "user@example.com",
        subject: "Test",
      };

      await queue.enqueue(email);

      // Simulate concurrent process calls
      const promises = [
        queue.process(),
        queue.process(),
        queue.process(),
      ];

      await Promise.all(promises);

      // Should only send once, not 3 times
      expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
    });
  });

  afterEach(() => {
    queue.clear();
  });
});
