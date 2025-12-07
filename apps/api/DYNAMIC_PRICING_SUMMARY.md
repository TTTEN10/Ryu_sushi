# Dynamic ETH Pricing - Implementation Summary ✅

## Overview

The premium subscription ETH price is now **dynamically calculated** based on the current market price, ensuring it always equals **$20 USD** regardless of ETH price fluctuations.

## How It Works

1. **Price Fetching**: Fetches current ETH/USD price from CoinGecko API
2. **Calculation**: `ETH Amount = $20 USD / Current ETH Price`
3. **Caching**: 1-minute cache to reduce API calls
4. **Fallback**: Uses environment variable if API fails

## Example Calculations

| ETH Price (USD) | ETH Amount for $20 |
|-----------------|-------------------|
| $3,000          | 0.006667 ETH      |
| $3,500          | 0.005714 ETH      |
| $4,000          | 0.005000 ETH      |
| $4,500          | 0.004444 ETH      |

## Files Modified

### Backend
- ✅ `apps/api/src/lib/price-oracle.service.ts` - **NEW** Price oracle service
- ✅ `apps/api/src/lib/crypto-payment.service.ts` - Updated to use dynamic pricing
- ✅ `apps/api/src/middleware/quota.ts` - Returns dynamic ETH price
- ✅ `apps/api/src/routes/chat.ts` - Returns dynamic ETH price
- ✅ `apps/api/src/routes/payment.ts` - Returns dynamic ETH price

### Frontend
- ✅ `apps/web/src/components/Paywall.tsx` - Handles price parsing

## API Integration

**CoinGecko API**:
- Endpoint: `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`
- Free tier: 10-50 calls/minute
- Cache: 1 minute
- Fallback: Environment variable

## Testing

The pricing is automatically updated when:
- User triggers paywall (quota exceeded)
- User requests `/api/payment/pricing`
- Payment verification occurs

## Benefits

✅ **Always $20 USD**: Subscription stays constant in USD value
✅ **Fair pricing**: Users pay current market rate
✅ **Automatic**: No manual price updates needed
✅ **Resilient**: Falls back gracefully if API unavailable

