import Stripe from 'stripe';
import { isStripeSecret } from './ready';

const KEY = import.meta.env.STRIPE_SECRET_KEY ?? '';

/** Server-only Stripe client. Uses the account's default API version. */
export const stripe = new Stripe(KEY);

/** True once a real secret key is present (not the .env placeholder). */
export const stripeReady = () => isStripeSecret(KEY);

export const WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET ?? '';
