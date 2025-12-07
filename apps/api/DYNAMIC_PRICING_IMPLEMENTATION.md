# Dynamic ETH Pricing Implementation ✅

## Summary

ETH pricing for premium subscriptions is now **dynamically calculated** based on the current market price, ensuring the subscription always costs **$20 USD** regardless of ETH price fluctuations.

## Implementation

### Price Oracle Service
- **Location**: `apps/api/src/lib/price-oracle.service.ts`
- **Features**:
  - Fetches current ETH price from CoinGecko API
  - 1-minute cache to reduce API calls
  - Fallback to environment variable if API fails
  - Calculates ETH amount: `$20 USD / current ETH price`

### Updated Services

1. **Crypto Payment Service** (`apps/api/src/lib/crypto-payment.service.ts`)
   - `getTierPricing()` now async and uses dynamic ETH price
   - Payment verification uses current market price

2. **Quota Middleware** (`apps/api/src/middleware/quota.ts`)
   - Returns dynamic ETH price in paywall response

3. **Chat Route** (`apps/api/src/routes/chat.ts`)
   - Returns dynamic ETH price when quota exceeded

4. **Payment Route** (`apps/api/src/routes/payment.ts`)
   - `/api/payment/pricing` endpoint returns dynamic ETH price

5. **Paywall Component** (`apps/web/src/components/Paywall.tsx`)
   - Handles price strings with or without currency suffix
   - Parses ETH amount correctly

## How It Works

### Price Calculation Flow

1. **User triggers paywall** (quota exceeded or manual upgrade)
2. **Backend fetches current ETH price** from CoinGecko
3. **Calculate ETH amount**: `$20 / ETH_price_in_USD`
4. **Return pricing** to frontend
5. **User pays** the calculated ETH amount
6. **Backend verifies** payment matches expected amount

### Example

If ETH is trading at $3,500:
- ETH amount = $20 / $3,500 = **0.005714 ETH**

If ETH is trading at $4,000:
- ETH amount = $20 / $4,000 = **0.005 ETH**

## API Integration

### CoinGecko API
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`
- **Rate Limit**: Free tier allows 10-50 calls/minute
- **Cache**: 1 minute to stay within limits
- **Fallback**: Environment variable if API fails

### Alternative Sources
- Can be extended to use CoinMarketCap, Uniswap, or Chainlink oracles
- Currently uses CoinGecko (free, reliable)

## Configuration

### Environment Variables (Optional Fallback)
```env
# These are only used if price oracle fails
CRYPTO_PRICE_PREMIUM_ETH=0.005714
CRYPTO_PRICE_PREMIUM_USDT=20.00
CRYPTO_PRICE_PREMIUM_USDC=20.00
```

### Premium Subscription
- **Fixed USD Price**: $20
- **Period**: 30 days
- **ETH Amount**: Dynamically calculated
- **USDT/USDC**: Fixed at $20 (1:1 with USD)

## Testing

### Test Price Oracle
```typescript
import { priceOracleService } from './lib/price-oracle.service';

// Get current pricing
const pricing = await priceOracleService.getPremiumPricing();
console.log(pricing);
// Output: { ETH: '0.005714', USDT: '20.00', USDC: '20.00', USD: 20, period: '30 days' }
```

### Test Payment Flow
1. Trigger quota exceeded
2. Check paywall shows current ETH price
3. Complete payment
4. Verify backend accepts payment at current market rate

## Benefits

✅ **Always $20 USD**: Subscription price stays constant in USD
✅ **Fair for users**: Users pay fair market rate in ETH
✅ **Automatic updates**: No manual price adjustments needed
✅ **Cached**: Reduces API calls with 1-minute cache
✅ **Resilient**: Falls back to env variable if API fails

## Monitoring

- Price cache is logged for debugging
- API failures are logged with warnings
- Fallback to cached/static price if API unavailable

## Future Enhancements

- Add multiple price sources (CoinGecko, CoinMarketCap, Chainlink)
- Use median price from multiple sources
- Add price volatility alerts
- Implement price smoothing to avoid rapid fluctuations

