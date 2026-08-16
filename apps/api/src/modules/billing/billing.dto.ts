import { z } from 'zod';

export const checkoutSchema = z.object({
  plan: z.enum(['PRO', 'BUSINESS']),
});

/** Sent by the web after Stripe redirects back with ?checkout=success&session_id=… */
export const confirmCheckoutSchema = z.object({
  sessionId: z.string().min(1),
});
