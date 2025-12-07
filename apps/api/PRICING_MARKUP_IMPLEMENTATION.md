# 2% Price Markup Implementation ✅

## Overview

The ETH price for premium subscriptions now includes a **2% markup** on top of the CoinGecko market price. This ensures the platform has a buffer for market fluctuations and transaction fees.

## Calculation

### Formula
```
Base ETH Amount = $20 USD / CoinGecko ETH Price
Final ETH Amount = Base ETH Amount × 1.02
```

### Example

**Without Markup:**
- CoinGecko ETH Price: $3,500
- Base ETH Amount: $20 / $3,500 = **0.005714 ETH**

**With 2% Markup:**
- CoinGecko ETH Price: $3,500
- Base ETH Amount: $20 / $3,500 = **0.005714 ETH**
- Final ETH Amount: 0.005714 × 1.02 = **0.005828 ETH**

**Result**: User pays **2% more ETH** than the base market rate
**USD Value**: 0.005828 × $3,500 = **$20.40** (2% more than $20)

## Implementation

### Price Oracle Service
- **Location**: `apps/api/src/lib/price-oracle.service.ts`
- **Markup**: `PRICE_MARKUP = 0.02` (2%)
- **Applied in**: `getPremiumETHAmount()` method

### Updated Calculation
```typescript
const ethPrice = await this.getETHPrice(); // From CoinGecko
const baseEthAmount = this.PREMIUM_USD_PRICE / ethPrice; // Base amount
const ethAmount = baseEthAmount * (1 + this.PRICE_MARKUP); // Add 2% markup
```

## Benefits

✅ **Market Buffer**: Protects against price fluctuations during payment
✅ **Fee Coverage**: Accounts for gas fees and transaction costs
✅ **Fair Pricing**: Still based on real market price, just with small buffer
✅ **Transparent**: Markup is applied consistently

## Price Comparison Examples

| CoinGecko Price | Base ETH Amount | Final ETH Amount (2% Markup) | USD Value | Difference |
|-----------------|-----------------|------------------------------|-----------|------------|
| $3,000          | 0.006667 ETH    | 0.006800 ETH                 | $20.40    | +2.0%      |
| $3,500          | 0.005714 ETH    | 0.005828 ETH                 | $20.40    | +2.0%      |
| $4,000          | 0.005000 ETH    | 0.005100 ETH                 | $20.40    | +2.0%      |
| $4,500          | 0.004444 ETH    | 0.004533 ETH                 | $20.40    | +2.0%      |

## Notes

- The 2% markup is applied to the ETH amount, making users pay 2% more ETH
- Users pay ~$20.40 USD equivalent (2% more than base $20)
- This protects the platform from market volatility during payment processing
- The markup is transparent in logs for debugging
- Payment verification uses the marked-up amount

