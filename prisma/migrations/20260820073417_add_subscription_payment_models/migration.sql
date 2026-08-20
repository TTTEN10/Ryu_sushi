-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('NONE', 'STRIPE', 'CRYPTO');

-- CreateEnum
CREATE TYPE "RAGOperation" AS ENUM ('INDEX', 'BATCH_INDEX', 'DELETE', 'QUERY');

-- CreateTable
CREATE TABLE "email_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT,
    "ipHash" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "didTokenId" TEXT,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NONE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "cryptoPaymentTxHash" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encrypted_chats" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "encryptedBlob" TEXT NOT NULL,
    "encryptedBlobHash" TEXT NOT NULL,
    "didTokenId" TEXT,
    "encryptedSummaryRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encrypted_chats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_subscriptions_email_key" ON "email_subscriptions"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_walletAddress_key" ON "subscriptions"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_didTokenId_key" ON "subscriptions"("didTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "encrypted_chats_walletAddress_key" ON "encrypted_chats"("walletAddress");
