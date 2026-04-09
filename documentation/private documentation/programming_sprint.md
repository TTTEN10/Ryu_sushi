# Programming sprint & implementation roadmap

> Restored from `COMPLETE_IMPLEMENTATION_SUMMARY.md` (last revision before deletion in commit `a45b56c14`). The **MVP launch** section below is the live operator view; **Part 1 onward** is a historical implementation snapshot—verify against `apps/web`, `apps/api`, and `apps/ai-chatbot` before relying on any checkbox.

---

## MVP launch roadmap (2026)

**Framework:** HubSpot’s [The $1M Solopreneur MVP](https://offers.hubspot.com/view/1m-solopreneur-mvp) stresses a **minimum viable *representation*** (ship something learnable fast), **maximize information per hour spent**, and pick tactics that match your strengths (landing + waitlist, demo video, lightweight tool, content, ads, “wizard of oz” manual fulfillment, etc.). SafePsy maps cleanly: **guest or wallet → DID → first Dr. Safe chat** is your activation story; everything else supports learning and trust, not vanity features.

### Canonical activation (what “launched” means)

Align with **`documentation/public documentation/BETA_QUICKSTART.md`**: user reaches value when **(1) DID exists** and **(2) at least one real exchange with Dr. Safe** has happened. Funnel metrics: visits → wallet connect attempts → successful session → DID mint → first chat completion → support/feedback.

### Operator checklist — ship and learn

1. **Local sanity**
   - Root `env.example` → `.env`; `apps/api/.env.example` and web env templates filled (`DATABASE_URL`, JWT, chain/RPC, contract addresses, AI upstream as configured).
   - `npm install` at repo root; `npm run db:generate` / Prisma migrate as needed; `npm run dev` (web + API) for smoke testing.

2. **Quality gate**
   - `npm run lint`, `npm run test`, `npm run build` before production.
   - Optional: `npm run verify:flow` for the mocked DID/auth path used in automation.

3. **Production deploy (this repository)**
   - Main path: **`deployment/deploy.sh`** — Terraform (`infra/terraform/envs/prod`) → chatbot stack on chatbot host → app deploy via **`deployment/deploy-app.sh`**. Requires Scaleway (or equivalent) credentials, Terraform variables, and SSH access; see script comments. Override **`APP_DOMAIN`**, **`APP_HOST`**, **`CHATBOT_HOST`**, **`SSH_KEY`** as needed; never commit secrets.
   - Legacy one-liner: `DEPLOY_LEGACY=1 ./deployment/deploy.sh` runs app deploy only.
   - Post-deploy: **`deployment/verify-production.sh`** (and any manual HTTPS/API checks you rely on).

4. **MVP learning tactics (pick 1–2 first week)**
   - **Early access / squeeze page:** One primary CTA—waitlist email, “Book a call,” or “Try guest chat”—and a way to follow up.
   - **Demo video:** Short walkthrough (wallet, Sepolia, DID, first message); shareable without requiring a full product tour.
   - **Content MVP:** Reuse approved claims from **`documentation/public documentation/CLAIMS_AND_TRUST_LANGUAGE.md`** and positioning from **`documentation/private documentation/LAUNCH.md`** / **`PERSONAS.md`**.
   - **Wizard of Oz:** Manually onboard the first cohort while you observe friction (wallet, gas, errors).

5. **Weekly review**
   - Identify the largest funnel drop-off; fix that before new features. Re-read public security/privacy guides before changing copy.

---

## Part 1: End-to-End Encryption for ChatWidget ✅

### Files Created/Modified

#### Backend
1. **Database Schema** (`apps/api/schema.prisma`)
   - Added `EncryptedChat` model for off-chain storage

2. **API Endpoints** (`apps/api/src/routes/chat.ts`)
   - `POST /api/chat/save` - Save encrypted chat (✅ Complete)
   - `GET /api/chat/load` - Load encrypted chat (✅ Complete)
   - Note: Completions endpoint needs to be added back (see below)

3. **Encryption Utilities** (`apps/web/src/utils/did-encryption.ts`)
   - Wallet-based key encryption/decryption (✅ Complete)
   - AES-GCM chat encryption (✅ Complete)

#### Frontend
1. **Encryption Hook** (`apps/web/src/hooks/useChatEncryption.ts`)
   - Key management (✅ Complete)
   - Chat load/save with encryption (✅ Complete)

2. **ChatWidget Integration** (Needs Update)
   - Replace session-based encryption with DID-based
   - Use `useChatEncryption` hook
   - Auto-save encrypted chat

### Encryption Scheme Details

**Key Material:**
- **Symmetric Key**: 32-byte AES-256-GCM key (generated client-side)
- **Encrypted Key**: Symmetric key encrypted with wallet signature
- **Storage**: Encrypted key in DID's `encryptedData` field

**Data Flow:**
1. Generate symmetric key (client-side)
2. Encrypt key with wallet signature
3. Store encrypted key in DID
4. Use symmetric key to encrypt chat messages
5. Store encrypted chat in database
6. Store chat hash in DID for verification

**Security:**
- Plaintext never reaches backend
- Symmetric key never stored unencrypted
- Only wallet owner can decrypt (requires private key)

## Part 2: Production API Refactoring ⚠️

### Current Testing Endpoints
- `POST /api/testing/wallet/connect`
- `POST /api/testing/wallet/verify`
- `GET /api/testing/wallet/info`
- `POST /api/testing/did/verify`
- `POST /api/testing/did/check`

### Proposed Production Endpoints
- `POST /api/auth/wallet/connect` ✅ (Create)
- `POST /api/auth/wallet/verify` ✅ (Create)
- `GET /api/auth/session` ✅ (Create)
- `POST /api/did/check` ✅ (Already exists)
- `POST /api/did/create` ✅ (Already exists)
- `GET /api/did/info` ✅ (Already exists)
- `POST /api/chat/save` ✅ (Already exists)
- `GET /api/chat/load` ✅ (Already exists)

### Next Steps for API Refactoring
1. Create `/api/auth/*` routes
2. Move wallet auth logic to production endpoints
3. Keep testing endpoints but mark as dev-only
4. Create shared utilities for validation/error handling

## Implementation Status

### ✅ Completed
- [x] Encryption utilities (AES-GCM, wallet-based key encryption)
- [x] Database schema for encrypted chat storage
- [x] Backend chat save/load endpoints
- [x] Frontend encryption hook
- [x] DID integration for key storage

### ⚠️ In Progress
- [ ] ChatWidget integration with encryption hook
- [ ] DID contract interaction (setDidData from frontend)
- [ ] Add completions endpoint back to chat.ts
- [ ] Production API refactoring

### 📝 Remaining Tasks
1. Update ChatWidget to use `useChatEncryption`
2. Add contract interaction for `setDidData`
3. Create production auth endpoints
4. Add shared API utilities
5. Test end-to-end flow

## Quick Start Guide

### 1. Run Database Migration
```bash
cd apps/api
npx prisma migrate dev --name add_encrypted_chats
```

### 2. Update Environment Variables
```env
# Backend
DATABASE_URL=postgresql://...
DID_IDENTITY_TOKEN_ADDRESS=0x...
RPC_URL=https://mainnet.infura.io/v3/...
JWT_SECRET=your-secret-key
```

### 3. Test Endpoints
```bash
# Save encrypted chat
curl -X POST http://localhost:3001/api/chat/save \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"encryptedChatBlob": "...", "didTokenId": "123"}'

# Load encrypted chat
curl -X GET http://localhost:3001/api/chat/load \
  -H "Authorization: Bearer <token>"
```

## Code Examples

### Frontend: Using Encryption Hook

```typescript
import { useChatEncryption } from '../hooks/useChatEncryption';

function ChatWidget() {
  const { symmetricKey, loadChat, saveChat, isLoading } = useChatEncryption();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (symmetricKey) {
      loadChat().then(setMessages);
    }
  }, [symmetricKey]);

  const handleSend = async (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
      timestamp: new Date(),
    };
    
    const updated = [...messages, newMessage];
    setMessages(updated);
    await saveChat(updated);
  };
}
```

### Backend: Protecting Chat Endpoints

```typescript
import { authenticateWallet } from '../middleware/auth';

router.post('/save', authenticateWallet, async (req, res) => {
  const wallet = req.wallet; // Authenticated wallet
  // Save encrypted chat...
});
```

## Security Checklist

- [x] Symmetric key generated client-side
- [x] Key encrypted with wallet signature
- [x] Plaintext never sent to backend
- [x] Only ciphertext stored
- [x] DID ownership verified
- [x] Network validation (Ethereum Mainnet only)
- [ ] Key rotation mechanism
- [ ] Contract failure handling

## Notes

- The completions endpoint was overwritten and needs to be restored
- DID contract `setDidData` must be called by wallet owner (frontend)
- Key rotation requires re-encrypting all chat history
- Network failures: chat saved locally, DID update retried later

