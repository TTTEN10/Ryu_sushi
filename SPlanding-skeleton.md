# SafePsy Landing Page Skeleton Documentation

## 🏗️ Landing Page Overview

**SafePsy Landing Page** is a production-ready landing page built with modern web technologies and privacy-by-design principles. This application serves as the entry point for SafePsy's secure therapy platform, featuring email subscription, privacy compliance, comprehensive security features, AI-powered chat, Web3 wallet integration, and Decentralized Identity (DID) management.

**Version**: v1.1  
**Architecture**: Monorepo with Vite + React + TypeScript  
**Database**: Prisma + PostgreSQL  
**License**: MIT  

---

## 📁 Directory Structure

```
safepsy-landing/
├── 📁 apps/                    # Applications workspace
│   ├── 📁 web/                 # Vite + React + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   │   ├── Hero.tsx           # Hero section
│   │   │   │   ├── Header.tsx         # Navigation header
│   │   │   │   ├── Footer.tsx         # Footer component
│   │   │   │   ├── EmailSignup.tsx    # Email subscription form
│   │   │   │   ├── CookieBanner.tsx   # GDPR cookie consent
│   │   │   │   ├── CookieManager.tsx  # Cookie preference manager
│   │   │   │   ├── Cookies.tsx        # Cookie policy page
│   │   │   │   ├── SEOHead.tsx        # SEO meta tags
│   │   │   │   ├── ThemeToggle.tsx    # Theme toggle
│   │   │   │   ├── ChatWidget.tsx     # AI chat widget with E2E encryption
│   │   │   │   ├── ConnectWallet.tsx  # Web3 wallet connection
│   │   │   │   ├── DIDManager.tsx     # DID management
│   │   │   │   ├── DPIA.tsx           # DPIA page
│   │   │   │   ├── Testing.tsx        # Testing tools
│   │   │   │   ├── TermsOfService.tsx # Terms of service
│   │   │   │   ├── SecurityAndPrivacyPolicy.tsx # Privacy policy
│   │   │   │   ├── ContactUs.tsx      # Contact form
│   │   │   │   ├── AboutUs.tsx       # About page
│   │   │   │   ├── NotFound.tsx       # 404 page
│   │   │   │   ├── ServerError.tsx    # 500 page
│   │   │   │   └── Maintenance.tsx    # Maintenance page
│   │   │   ├── contexts/       # React contexts
│   │   │   │   ├── ThemeContext.tsx   # Theme management
│   │   │   │   ├── WalletContext.tsx  # Wallet connection context
│   │   │   │   └── AuthContext.tsx    # Authentication context
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   │   ├── useSEO.ts          # SEO configuration
│   │   │   │   ├── useCookieConsent.ts # Cookie consent logic
│   │   │   │   └── useChatEncryption.ts # Chat encryption hook
│   │   │   ├── utils/          # Utility functions
│   │   │   │   ├── cookieUtils.ts     # Cookie utilities
│   │   │   │   ├── encryption.ts      # Encryption utilities
│   │   │   │   └── did-encryption.ts  # DID encryption utilities
│   │   │   ├── config/         # Configuration
│   │   │   │   └── seo.ts             # SEO configuration
│   │   │   ├── types/          # TypeScript definitions
│   │   │   │   └── seo.ts             # SEO types
│   │   │   ├── test/           # Test setup
│   │   │   │   └── setup.ts           # Vitest configuration
│   │   │   ├── App.tsx         # Main app component
│   │   │   ├── main.tsx        # Application entry point
│   │   │   ├── styles.css      # Global styles
│   │   │   ├── polyfills.ts    # Web3 polyfills
│   │   │   └── vite-env.d.ts   # Vite type definitions
│   │   ├── public/             # Static assets
│   │   │   ├── Favicon.jpg
│   │   │   ├── HeroTheme.png
│   │   │   ├── Logotransparent.png
│   │   │   └── MainLogo.jpg
│   │   ├── vite.config.ts      # Vite configuration
│   │   ├── tailwind.config.ts  # Tailwind CSS configuration
│   │   ├── tsconfig.json       # TypeScript configuration
│   │   ├── vitest.config.ts    # Test configuration
│   │   └── package.json        # Dependencies and scripts
│   └── 📁 api/                 # Express + TypeScript backend
│       ├── src/
│       │   ├── index.ts        # Main Express server
│       │   ├── lib/            # Utility functions
│       │   │   ├── crypto.ts           # Privacy utilities
│       │   │   ├── emailService.ts     # Email service
│       │   │   ├── prisma.ts           # Prisma client
│       │   │   ├── ratelimit.ts        # Rate limiting
│       │   │   ├── logger.ts           # Winston logger
│       │   │   ├── session.ts          # Session management
│       │   │   ├── did.service.ts      # DID service
│       │   │   ├── ai-gateway.service.ts # AI gateway service
│       │   │   └── constants.ts        # Constants
│       │   ├── middleware/     # Express middleware
│       │   │   ├── auth.ts            # Authentication middleware
│       │   │   ├── wallet-auth.ts     # Wallet authentication
│       │   │   ├── did-verify.ts      # DID verification
│       │   │   ├── validation.ts      # Request validation
│       │   │   └── safety.ts          # Safety middleware
│       │   ├── routes/         # API routes
│       │   │   ├── subscribe.ts       # Email subscription
│       │   │   ├── contact.ts         # Contact form
│       │   │   ├── chat.ts            # AI chat with SSE streaming
│       │   │   ├── did.ts             # DID management
│       │   │   └── testing.ts         # Testing endpoints
│       │   └── contracts/      # Smart contracts
│       │       ├── DIDRegistry.sol     # DID registry contract
│       │       ├── DIDStorage.sol      # DID storage contract
│       │       ├── DIDIdentityToken.sol # DID identity token
│       │       └── scripts/
│       │           └── deploy.ts        # Deployment script
│       ├── prisma/             # Database schema
│       │   └── schema.prisma   # Prisma schema
│       ├── dist/               # Compiled JavaScript
│       ├── logs/               # Application logs
│       ├── nodemon.json        # Development configuration
│       ├── tsconfig.json       # TypeScript configuration
│       └── package.json        # Dependencies and scripts
├── 📁 frontend/                # Legacy frontend (for reference)
├── 📁 backend/                 # Legacy backend (for reference)
├── 📁 tests/                   # Integration tests
│   ├── emailService.test.ts
│   ├── emailSignup.test.tsx
│   └── subscribeRoute.test.ts
├── 📁 public/                  # Shared static assets
├── 📁 deployment/              # Deployment scripts
│   ├── deploy-manual.sh
│   ├── deploy-safepsy.sh
│   ├── deploy-simple.sh
│   ├── deploy-with-ssh.sh
│   ├── update-production.sh
│   └── setup-ssh-key.sh
├── 📁 prisma/                  # Root Prisma schema
├── 📄 package.json             # Workspace configuration
├── 📄 docker-compose.prod.yml  # Docker orchestration
├── 📄 Dockerfile              # Multi-stage build
├── 📄 Caddyfile               # Caddy server configuration
├── 📄 env.example             # Environment template
├── 📄 README.md               # Main documentation
├── 📄 DEVELOPMENT.md          # Development scripts
├── 📄 PRIVACY-BY-DESIGN.md    # Privacy implementation
├── 📄 DID_IMPLEMENTATION.md   # DID implementation guide
├── 📄 DID_USER_FLOW.md        # DID user flow
├── 📄 WALLET_AUTH_IMPLEMENTATION.md # Wallet auth guide
├── 📄 E2E_ENCRYPTION_IMPLEMENTATION.md # E2E encryption guide
├── 📄 TESTING_IMPLEMENTATION_SUMMARY.md # Testing guide
└── 📄 COMPLETE_IMPLEMENTATION_SUMMARY.md # Complete implementation summary
```

---

## 🔧 Core Applications Architecture

### 1. **Web Application** (`/apps/web/`)
**Technology Stack**: Vite, React 18, TypeScript, Tailwind CSS, React Router, WalletConnect, ethers.js

**Key Features**:
- **Modern React Architecture**: Vite for fast development and building
- **TypeScript**: Full type safety implementation
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **React Router**: Client-side routing with SEO optimization
- **Privacy by Design**: Cookie consent, analytics integration, E2E encryption
- **Responsive Design**: Mobile-first approach with accessibility features
- **SEO Optimization**: React Helmet with meta tags and structured data
- **Web3 Integration**: Wallet connection, DID management, blockchain authentication
- **AI Chat**: SSE streaming chat with end-to-end encryption
- **Theme Support**: Dark/light theme switching

**Key Components**:
- **Hero**: Main landing section with call-to-action
- **EmailSignup**: Subscription form with validation
- **CookieBanner**: GDPR-compliant consent management
- **SEOHead**: Dynamic meta tags and structured data
- **Header/Footer**: Navigation and footer components
- **ChatWidget**: AI-powered chat with E2E encryption
- **ConnectWallet**: Web3 wallet connection
- **DIDManager**: Decentralized Identity management

**Port**: 3000 (development), 80 (production)

### 2. **API Application** (`/apps/api/`)
**Technology Stack**: Node.js, TypeScript, Express.js, Prisma, PostgreSQL, OpenAI, ethers.js

**Key Features**:
- **RESTful API**: Email subscription, contact, chat, DID, and health check endpoints
- **Database**: Prisma ORM with PostgreSQL for data persistence
- **Security**: Rate limiting, input validation, security headers, wallet authentication
- **Privacy Features**: IP hashing with configurable privacy settings, E2E encryption
- **Type Safety**: Full TypeScript implementation
- **AI Integration**: OpenAI API integration with SSE streaming
- **DID Management**: On-chain DID registration and verification
- **Smart Contracts**: Solidity contracts for DID management
- **Logging**: Winston-based structured logging

**Key Endpoints**:
- `POST /api/subscribe` - Email subscription
- `POST /api/contact` - Contact form submission
- `POST /api/chat/completions` - AI chat with SSE streaming
- `GET /api/chat/health` - Chat health check
- `POST /api/did/check` - Check if wallet has DID
- `POST /api/did/register` - Register new DID
- `POST /api/did/verify` - Verify DID ownership
- `GET /api/testing/*` - Testing endpoints
- `GET /healthz` - Health check
- `GET /readyz` - Readiness check

**Port**: 3001 (development), 3001 (production)

---

## 🗄️ Data Layer

### **PostgreSQL Database** (via Prisma)
- **Primary Database**: Email subscriptions, contact messages, encrypted chats, DID records
- **ORM**: Prisma for type-safe database operations
- **Privacy Features**: IP hashing with configurable settings, encrypted chat storage
- **Location**: Configured via `DATABASE_URL` environment variable

**Schema**:
```prisma
model EmailSubscription {
  id              String   @id @default(cuid())
  email           String   @unique
  fullName        String?
  role            String?  // client, therapist, partner
  ipHash          String?
  consentGiven    Boolean  @default(false)
  consentTimestamp DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ContactMessage {
  id        String   @id @default(cuid())
  fullName  String
  email     String
  subject   String
  message   String
  ipHash    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EncryptedChat {
  id                String   @id @default(cuid())
  walletAddress     String   @unique
  didTokenId        String?
  encryptedBlob     String   // Encrypted chat history (JSON)
  encryptedBlobHash String   // SHA-256 hash for on-chain storage
  encryptedKey      String?  // Encrypted symmetric key (stored in DID)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## 🌐 Network Configuration

### **Development Setup**
- **Frontend**: http://localhost:3000 (Vite dev server)
- **Backend**: http://localhost:3001 (Express server)
- **Proxy**: Vite proxies `/api` requests to backend

### **Production Setup**
- **Caddy/Nginx**: Reverse proxy and static file serving
- **Docker**: Multi-stage builds for optimization
- **SSL**: HTTPS termination at reverse proxy level

### **Blockchain Networks**

#### Testnets
- **Polygon Amoy**: Primary testnet (Chain ID: 80002)
- **Ethereum Sepolia**: Ethereum testnet (Chain ID: 11155111)
- **Polygon Mumbai**: Legacy Polygon testnet (Chain ID: 80001)

#### Mainnets
- **Polygon**: Production deployment (Chain ID: 137)
- **Ethereum**: Mainnet support (Chain ID: 1)

---

## 🔒 Privacy & Security Architecture

### **Privacy by Design Implementation**

#### **IP Address Handling**
- **Default OFF**: IP hashing is disabled by default for maximum privacy
- **Configurable**: Can be enabled via `IP_HASHING_ENABLED=true`
- **Secure Hashing**: Uses SHA-256 with configurable salt when enabled
- **No Raw Logging**: Raw IP addresses are never logged

#### **Privacy Behavior**
- **When `IP_HASHING_ENABLED=false` (default)**:
  - Raw IP addresses are NOT stored or logged
  - Placeholder `'IP_HASHING_DISABLED'` is used instead
  - Maximum privacy protection

- **When `IP_HASHING_ENABLED=true`**:
  - IP addresses are hashed using SHA-256 with salt
  - `ipHash = sha256(ip + SALT)`
  - Still provides privacy while enabling rate limiting

#### **End-to-End Encryption**
- **Chat Encryption**: AES-256-GCM encryption for all chat messages
- **Key Management**: Wallet-derived keys for DID-based encryption
- **On-Chain Storage**: Encrypted keys stored in DID smart contracts
- **Client-Side Encryption**: All encryption/decryption happens client-side

### **Security Features**
- **Helmet**: Security headers (CSP, HSTS, X-Frame-Options)
- **Rate Limiting**: API protection (10 req/s, 1 req/s for login)
- **CORS**: Configured for specific origins
- **Input Validation**: Joi schema validation
- **SQL Injection Protection**: Prisma ORM
- **Wallet Authentication**: Signature-based wallet authentication
- **DID Verification**: On-chain DID ownership verification
- **Safety Middleware**: Content filtering and safety checks

---

## 📦 Package Management

### **Workspace Configuration** (`package.json`)
```json
{
  "name": "safepsy-landing",
  "version": "1.0.0",
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "concurrently -k \"npm:dev:web\" \"npm:dev:api\"",
    "build": "npm run build:web && npm run build:api",
    "test": "npm run test:web && npm run test:api"
  }
}
```

### **Web Dependencies**
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^7.9.1",
  "react-helmet-async": "^2.0.5",
  "@reown/walletkit": "^1.4.1",
  "@walletconnect/ethereum-provider": "^2.9.2",
  "@walletconnect/modal": "^2.6.2",
  "ethers": "^6.15.0",
  "lucide-react": "^0.294.0",
  "buffer": "^6.0.3",
  "process": "^0.11.10"
}
```

### **API Dependencies**
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.1.5",
  "joi": "^17.11.0",
  "prisma": "^5.7.1",
  "@prisma/client": "^5.7.1",
  "openai": "^6.9.1",
  "ethers": "^6.9.0",
  "jsonwebtoken": "^9.0.3",
  "winston": "^3.11.0",
  "cookie-parser": "^1.4.7"
}
```

---

## 🐳 Docker Orchestration

### **Multi-stage Dockerfile**
- **Stage 1**: Build web application
- **Stage 2**: Build API application
- **Stage 3**: Production image with reverse proxy

### **Docker Compose**
- **Services**: Web, API, Database, Reverse Proxy
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Volumes**: Database persistence
- **Environment**: Production configuration

---

## 🚀 Development Workflow

### **Quick Start**
```bash
# Install dependencies
npm install
cd apps/web && npm install
cd ../api && npm install

# Start development servers
npm run dev

# This starts:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:3001
```

### **Individual Services**
```bash
# Web development
cd apps/web
npm run dev          # Vite development server
npm run build        # Production build
npm run test         # Run tests

# API development
cd apps/api
npm run dev          # API development server
npm run build        # Production build
npm run test         # Run tests
```

### **Database Operations**
```bash
cd apps/api
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

---

## 🧪 Testing Strategy

### **Frontend Testing**
- **Vitest**: Fast unit testing
- **React Testing Library**: Component testing
- **Jest DOM**: DOM assertions
- **Coverage**: Code coverage reporting

### **Backend Testing**
- **Vitest**: API endpoint testing
- **Supertest**: HTTP assertion library
- **Database**: Test database for integration tests

### **Integration Testing**
- **Email Service**: Subscription flow testing
- **Privacy Features**: IP hashing testing
- **API Routes**: End-to-end testing
- **Chat**: SSE streaming testing
- **DID**: DID registration and verification testing

---

## 📊 Analytics & Monitoring

### **Plausible Analytics** (Optional)
- **Privacy-friendly**: No cookies or personal data
- **GDPR compliant**: By design
- **Lightweight**: ~1KB
- **Configurable**: Can be disabled

### **Health Monitoring**
- **Health Check**: `/healthz` endpoint
- **Readiness Check**: `/readyz` endpoint
- **Database**: Connection monitoring
- **Performance**: Response time tracking
- **Logging**: Winston-based structured logging

---

## 🔧 Environment Configuration

### **Required Environment Variables**

#### **Root Level** (`.env`)
```bash
# General configuration
NODE_ENV=development
```

#### **Web Application** (`apps/web/.env`)
```bash
# Plausible Analytics (optional)
VITE_PLAUSIBLE_DOMAIN=your-domain.com

# API Configuration
VITE_API_URL=http://localhost:3001

# Development
VITE_DEBUG=false
```

#### **API Application** (`apps/api/.env`)
```bash
# Server configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/safepsy"

# Privacy by Design - IP Address Handling
IP_HASHING_ENABLED=false  # Default: OFF for maximum privacy
IP_SALT=your-secure-random-salt-change-this-in-production

# Frontend URL
FRONTEND_URL=http://localhost:3000

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# JWT Secret
JWT_SECRET=your-jwt-secret

# Blockchain Configuration
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key
```

---

## 🎨 Customization

### **Branding**
- **Colors**: Update `tailwind.config.ts`
- **Fonts**: Modify font imports in `index.html`
- **Logo**: Replace assets in `public/` folder
- **Content**: Update component text and copy

### **Styling**
- **Tailwind**: Utility classes in components
- **Custom CSS**: `src/styles.css` for global styles
- **Components**: Reusable component classes
- **Responsive**: Mobile-first breakpoints

### **Content Management**
- **Hero Section**: `apps/web/src/components/Hero.tsx`
- **Email Signup**: `apps/web/src/components/EmailSignup.tsx`
- **Footer**: `apps/web/src/components/Footer.tsx`
- **SEO**: `apps/web/src/config/seo.ts`

---

## 🚀 Deployment

### **Docker Production**
```bash
# Build and run
docker-compose -f docker-compose.prod.yml up --build

# Access application
# http://localhost:3001
```

### **Manual Deployment**
```bash
# Build applications
npm run build

# Start API server
cd apps/api
npm start

# Serve frontend
# Serve apps/web/dist with any static file server
```

### **Environment Setup**
```bash
# Generate secure salt
openssl rand -hex 32

# Set environment variables
export IP_HASHING_ENABLED=false
export IP_SALT="your-secure-random-salt"
export OPENAI_API_KEY="your-openai-key"
export JWT_SECRET="your-jwt-secret"
```

---

## 📋 API Reference

### **POST /api/subscribe**
Subscribe to the waitlist.

**Request:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "client"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully joined our waitlist! We'll notify you when SafePsy launches."
}
```

### **POST /api/contact**
Submit a contact form.

**Request:**
```json
{
  "fullName": "John Doe",
  "email": "user@example.com",
  "subject": "Question",
  "message": "Hello, I have a question..."
}
```

### **POST /api/chat/completions**
AI chat completion with SSE streaming support.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello, I feel anxious"}
  ],
  "stream": true,
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Response (Streaming):**
SSE events: `connected`, `metadata`, `token`, `done`, `error`

### **POST /api/did/check**
Check if wallet has a DID.

**Request Headers:**
```
x-wallet-address: 0x...
x-wallet-signature: 0x...
x-wallet-message: ...
x-chain-id: 1
```

**Response:**
```json
{
  "success": true,
  "hasDID": true,
  "didTokenId": "123"
}
```

### **GET /healthz**
Health check endpoint.

**Response:**
```
ok
```

---

## 🎯 Key Features Summary

✅ **Modern React Architecture** - Vite + React 18 + TypeScript  
✅ **Privacy by Design** - Configurable IP hashing and privacy protection  
✅ **Email Subscription System** - Prisma + PostgreSQL with rate limiting  
✅ **Responsive Design** - Mobile-first with Tailwind CSS  
✅ **SEO Optimization** - React Helmet with meta tags and structured data  
✅ **Cookie Consent** - GDPR-compliant consent management  
✅ **Security Features** - Rate limiting, input validation, security headers  
✅ **Docker Support** - Multi-stage builds and orchestration  
✅ **Testing Suite** - Comprehensive test coverage  
✅ **Analytics Integration** - Optional Plausible Analytics  
✅ **Type Safety** - Full TypeScript implementation  
✅ **Development Experience** - Hot reload, fast builds, modern tooling  
✅ **AI Chat** - SSE streaming chat with OpenAI integration  
✅ **End-to-End Encryption** - AES-256-GCM encryption for chat  
✅ **Web3 Integration** - Wallet connection and DID management  
✅ **Smart Contracts** - Solidity contracts for DID management  
✅ **Blockchain Support** - Ethereum and Polygon networks  
✅ **Theme Support** - Dark/light theme switching  
✅ **Structured Logging** - Winston-based logging system  

---

## 📚 Documentation References

- **Main README**: `/README.md` - Comprehensive project overview
- **Development Guide**: `/DEVELOPMENT.md` - Development scripts and commands
- **Privacy Implementation**: `/PRIVACY-BY-DESIGN.md` - Privacy by design documentation
- **DID Implementation**: `/DID_IMPLEMENTATION.md` - DID implementation guide
- **DID User Flow**: `/DID_USER_FLOW.md` - DID user flow documentation
- **Wallet Auth**: `/WALLET_AUTH_IMPLEMENTATION.md` - Wallet authentication guide
- **E2E Encryption**: `/E2E_ENCRYPTION_IMPLEMENTATION.md` - End-to-end encryption guide
- **Testing**: `/TESTING_IMPLEMENTATION_SUMMARY.md` - Testing implementation guide
- **Chat Implementation**: `/apps/api/CHAT_IMPLEMENTATION_SUMMARY.md` - Chat API documentation
- **SSE Streaming**: `/apps/api/SSE_STREAMING_CONTRACT.md` - SSE streaming contract
- **Safety Middleware**: `/apps/api/SAFETY_MIDDLEWARE.md` - Safety middleware documentation
- **Testing Setup**: `/apps/api/TESTING_SETUP.md` - API testing setup
- **Complete Implementation**: `/COMPLETE_IMPLEMENTATION_SUMMARY.md` - Complete implementation summary

---

**SafePsy Landing Page** - Secure, Ethical, Human-centered Online Therapy Platform 🛡️❤️👥

*Built with ❤️ for mental health professionals and their clients*
