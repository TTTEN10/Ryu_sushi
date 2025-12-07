import Stripe from 'stripe';
import logger from './logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Stripe Service
 * Handles Stripe payment processing
 */
export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2024-11-20.acacia',
      });
      logger.info('Stripe service initialized');
    } else {
      logger.warn('Stripe secret key not configured. Stripe payments will not work.');
    }
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Create or get Stripe customer
   */
  async getOrCreateCustomer(walletAddress: string, email?: string): Promise<Stripe.Customer> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    // Check if customer already exists in database
    const subscription = await prisma.subscription.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (subscription?.stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(subscription.stripeCustomerId);
        if (customer && !customer.deleted) {
          return customer as Stripe.Customer;
        }
      } catch (error) {
        logger.warn(`Stripe customer ${subscription.stripeCustomerId} not found, creating new one`);
      }
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    // Update subscription with customer ID
    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    return customer;
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(
    walletAddress: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const customer = await this.getOrCreateCustomer(walletAddress);

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        walletAddress: walletAddress.toLowerCase(),
      },
      subscription_data: {
        metadata: {
          walletAddress: walletAddress.toLowerCase(),
        },
      },
    });

    return session;
  }

  /**
   * Create one-time payment checkout session
   */
  async createPaymentSession(
    walletAddress: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const customer = await this.getOrCreateCustomer(walletAddress);

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    return session;
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutCompleted(session);
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdated(subscription);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionDeleted(subscription);
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handleInvoicePaymentSucceeded(invoice);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handleInvoicePaymentFailed(invoice);
          break;
        }
        default:
          logger.debug(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const walletAddress = session.metadata?.walletAddress;
    if (!walletAddress) {
      logger.warn('Checkout session missing wallet address');
      return;
    }

    if (session.mode === 'subscription' && session.subscription) {
      const subscription = await this.stripe!.subscriptions.retrieve(
        session.subscription as string
      );
      await this.updateSubscriptionFromStripe(walletAddress, subscription);
    } else if (session.mode === 'payment') {
      // Handle one-time payment
      await this.handleOneTimePayment(walletAddress, session);
    }
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const walletAddress = subscription.metadata?.walletAddress;
    if (!walletAddress) {
      logger.warn('Subscription missing wallet address');
      return;
    }

    await this.updateSubscriptionFromStripe(walletAddress, subscription);
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const walletAddress = subscription.metadata?.walletAddress;
    if (!walletAddress) {
      logger.warn('Subscription missing wallet address');
      return;
    }

    const dbSubscription = await prisma.subscription.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (dbSubscription) {
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'CANCELLED' as any,
          stripeSubscriptionId: null,
        },
      });
    }
  }

  /**
   * Handle invoice payment succeeded
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const subscription = await this.stripe!.subscriptions.retrieve(
        invoice.subscription as string
      );
      const walletAddress = subscription.metadata?.walletAddress;
      if (walletAddress) {
        await this.updateSubscriptionFromStripe(walletAddress, subscription);
      }
    }
  }

  /**
   * Handle invoice payment failed
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const subscription = await this.stripe!.subscriptions.retrieve(
        invoice.subscription as string
      );
      const walletAddress = subscription.metadata?.walletAddress;
      if (walletAddress) {
        const dbSubscription = await prisma.subscription.findUnique({
          where: { walletAddress: walletAddress.toLowerCase() },
        });

        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: 'PAST_DUE' as any,
            },
          });
        }
      }
    }
  }

  /**
   * Update subscription from Stripe subscription object
   */
  private async updateSubscriptionFromStripe(
    walletAddress: string,
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!dbSubscription) {
      logger.warn(`Subscription not found for wallet ${walletAddress}`);
      return;
    }

    // Determine tier from price ID
    const priceId = stripeSubscription.items.data[0]?.price.id;
    const tier = this.getTierFromPriceId(priceId || '');

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        tier: tier as any,
        status: this.mapStripeStatus(stripeSubscription.status),
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId || null,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });
  }

  /**
   * Handle one-time payment
   */
  private async handleOneTimePayment(
    walletAddress: string,
    session: Stripe.Checkout.Session
  ): Promise<void> {
    // Determine tier from price ID (for one-time payments, upgrade to tier for a period)
    const priceId = session.line_items?.data[0]?.price.id;
    if (priceId) {
      const tier = this.getTierFromPriceId(priceId);
      const dbSubscription = await prisma.subscription.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (dbSubscription) {
        // For one-time payments, set period end (e.g., 30 days)
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        await prisma.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            tier: tier as any,
            status: 'ACTIVE' as any,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
          },
        });
      }
    }
  }

  /**
   * Get tier from Stripe price ID
   */
  private getTierFromPriceId(priceId: string): string {
    // Map price IDs to tiers (configure in env)
    const priceIdToTier: Record<string, string> = {
      [process.env.STRIPE_PRICE_ID_PREMIUM || '']: 'PREMIUM',
    };

    return priceIdToTier[priceId] || 'FREE';
  }

  /**
   * Map Stripe subscription status to our status
   */
  private mapStripeStatus(status: Stripe.Subscription.Status): string {
    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      unpaid: 'EXPIRED',
    };

    return statusMap[status] || 'ACTIVE';
  }
}

export const stripeService = new StripeService();

