# SafePsy Global Platform (SPglobalv1)

## 🚀 Project Overview

SafePsy Global Platform is a comprehensive decentralized identity-based therapy and mental health platform that combines cutting-edge blockchain technology with AI-powered therapy assistance. The platform implements privacy-by-design principles, enterprise-grade security, and full compliance with international data protection regulations.

## 📁 Project Structure

```
SPglobalv1/
├── apps/                           # Applications workspace
│   ├── web/                        # Vite + React + TypeScript frontend (Landing Page)
│   │   ├── src/
│   │   │   ├── components/         # React components (Hero, Footer, EmailSignup, etc.)
│   │   │   ├── hooks/              # Custom React hooks (useCookieConsent, useSEO)
│   │   │   ├── contexts/           # React contexts (ThemeContext)
│   │   │   ├── types/              # TypeScript definitions
│   │   │   ├── utils/              # Utility functions (cookieUtils)
│   │   │   └── config/             # Configuration (seo.ts)
│   │   ├── public/                 # Static assets
│   │   ├── vite.config.ts          # Vite configuration
│   │   ├── tailwind.config.ts      # Tailwind CSS configuration
│   │   └── package.json
│   └── api/                        # Express + TypeScript backend
│       ├── src/
│       │   ├── index.ts            # Main Express server
│       │   ├── lib/                # Utility functions (crypto, emailService, prisma, ratelimit)
│       │   └── routes/             # API routes (subscribe)
│       ├── prisma/                 # Database schema
│       ├── dist/                   # Compiled JavaScript
│       └── package.json
├── frontend/                       # Legacy frontend (reference only - not actively used)
├── backend/                        # Legacy backend (reference only - not actively used)
├── tests/                          # Integration tests
├── public/                         # Shared static assets
├── deployment/                     # Deployment scripts and configurations
├── PRIVACY-BY-DESIGN.md            # Privacy implementation guide
└── README.md                       # This file
```

## 🔧 Key Features

### 🌐 Landing Page (apps/web)
- **Modern Web Stack**: Vite + React 18 + TypeScript + Tailwind CSS
- **Privacy by Design**: Default OFF IP hashing, configurable privacy protection
- **Accessibility**: WCAG AA compliant with semantic HTML and ARIA labels
- **Testing**: Comprehensive test coverage with Vitest and React Testing Library
- **Analytics**: Optional Plausible integration (privacy-friendly)
- **Security**: Rate limiting, input validation, and secure headers
- **SEO Optimization**: Built-in SEO features with meta tags and structured data
- **Cookie Consent**: GDPR-compliant cookie consent management
- **Theme Support**: Dark/light theme switching capability

### 🔒 Security & Privacy
- **Encryption**: AES-256-GCM encryption for all client data
- **Privacy by Design**: Built-in privacy protections throughout the system
- **Compliance**: GDPR, HIPAA, ISO 27001, APA, and EFPA standards
- **Consent Management**: Granular consent controls with withdrawal mechanisms
- **IP Address Protection**: Configurable IP hashing with secure salt

## 🌐 Network Support

### Testnets
- **Polygon Amoy**: Primary testnet (Chain ID: 80002)
- **Ethereum Sepolia**: Ethereum testnet (Chain ID: 11155111)
- **Polygon Mumbai**: Legacy Polygon testnet (Chain ID: 80001)

### Mainnets
- **Polygon**: Production deployment (Chain ID: 137)
- **Ethereum**: Mainnet support (Chain ID: 1)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git
- MetaMask or Web3 wallet
- Polygon testnet MATIC (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TTTEN10/SPglobalv1.git
   cd SPglobalv1
   ```

2. **Set up Landing Page**
   ```bash
   npm install
   cd apps/web && npm install
   cd ../api && npm install
   
   # Set up environment variables
   cp env.example .env
   cp apps/web/env.example apps/web/.env
   cp apps/api/env.example apps/api/.env
   
   # Initialize database
   cd apps/api
   npx prisma generate
   npx prisma db push
   ```

3. **Start Development Servers**
   ```bash
   # From project root
   npm run dev
   ```
   
   This starts:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

### Docker Development

1. **Build and start services:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Application: http://localhost:3001
   - Health check: http://localhost:3001/health

## 🧪 Testing

### Run all tests
```bash
npm run test
```

### Frontend tests
```bash
cd apps/web
npm run test              # Run tests
npm run test:coverage     # Run with coverage
npm run test:ui          # Run with UI
```

### Backend tests
```bash
cd apps/api
npm run test              # Run tests
npm run test:coverage     # Run with coverage
```

## 📋 Available Scripts

### Root level
```bash
npm run dev              # Start both frontend and backend
npm run build            # Build both applications
npm run test             # Run all tests
npm run lint             # Lint all code
npm run format           # Format all code
npm run typecheck        # Type check all code
```

### Web Application (apps/web)
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # ESLint
npm run format           # Prettier
npm run typecheck        # TypeScript check
npm run test             # Run tests
```

### API Application (apps/api)
```bash
npm run dev              # Start with nodemon
npm run build            # Build TypeScript
npm run start            # Start production server
npm run lint             # ESLint
npm run format           # Prettier
npm run typecheck        # TypeScript check
npm run test             # Run tests
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
```

## 🚀 Deployment

### Docker Production

1. **Build the image:**
   ```bash
   docker build -t safepsy-landing .
   ```

2. **Run with environment variables:**
   ```bash
   docker run -p 3001:3001 \
     -e NODE_ENV=production \
     -e DATABASE_URL="file:./prod.db" \
     -e IP_HASHING_ENABLED=false \
     -e IP_SALT="your-secure-salt" \
     -v $(pwd)/data:/app/backend/data \
     safepsy-landing
   ```

### Docker Compose Production

1. **Set environment variables:**
   ```bash
   export IP_HASHING_ENABLED=false
   export IP_SALT="your-secure-random-salt"
   ```

2. **Start with nginx:**
   ```bash
   docker-compose --profile production up -d
   ```

### Manual Deployment

1. **Build applications:**
   ```bash
   npm run build
   ```

2. **Start API server:**
   ```bash
   cd apps/api
   npm start
   ```

3. **Serve web application:**
   ```bash
   # Serve apps/web/dist with any static file server
   # e.g., nginx, Apache, or CDN
   ```

## 🔒 Privacy & Security

### Privacy by Design Implementation

This application implements **privacy by design** principles with the following features:

#### IP Address Handling
- **Default OFF**: IP hashing is disabled by default for maximum privacy
- **Configurable**: Can be enabled via `IP_HASHING_ENABLED=true`
- **Secure Hashing**: Uses SHA-256 with configurable salt when enabled
- **No Raw Logging**: Raw IP addresses are never logged

#### Privacy Behavior
- **When `IP_HASHING_ENABLED=false` (default)**:
  - Raw IP addresses are NOT stored or logged
  - Placeholder `'IP_HASHING_DISABLED'` is used instead
  - Maximum privacy protection

- **When `IP_HASHING_ENABLED=true`**:
  - IP addresses are hashed using SHA-256 with salt
  - `ipHash = sha256(ip + SALT)`
  - Still provides privacy while enabling rate limiting

### Privacy Features
- **IP Hashing**: Client IPs are hashed with salt before storage (when enabled)
- **Email Deduplication**: Prevents duplicate subscriptions
- **No Raw Logging**: Sensitive data is not logged
- **Minimal Data Collection**: Only email addresses are stored
- **GDPR Compliant**: Privacy by design implementation
- **Cookie Consent**: GDPR-compliant cookie consent management

### Security Features
- **Helmet**: Security headers
- **Rate Limiting**: API protection
- **CORS**: Configured for specific origins
- **Input Validation**: Joi schema validation
- **SQL Injection Protection**: Prisma ORM

### Environment Variables

#### API Application (apps/api/.env)
```bash
PORT=3001
NODE_ENV=production
DATABASE_URL="file:./prisma/prod.db"
FRONTEND_URL=https://your-domain.com

# Privacy by Design - IP Address Handling
IP_HASHING_ENABLED=false  # Default: OFF for maximum privacy
IP_SALT=your-secure-random-salt-change-this-in-production

PLAUSIBLE_DOMAIN=your-domain.com
```

#### Web Application (apps/web/.env)
```bash
VITE_PLAUSIBLE_DOMAIN=your-domain.com
VITE_API_URL=https://api.your-domain.com
```

## 📊 Analytics

Plausible Analytics integration is optional and privacy-friendly:

- **No cookies** or personal data collection
- **GDPR compliant** by design
- **Lightweight** (~1KB)
- **Self-hosted** option available

To enable:
1. Set `VITE_PLAUSIBLE_DOMAIN` in apps/web/.env
2. Set `PLAUSIBLE_DOMAIN` in apps/api/.env

## 🔐 Privacy Implementation Details

### IP Address Privacy Protection

The application implements a comprehensive privacy by design approach for IP address handling:

#### Configuration Options

1. **Maximum Privacy (Default)**:
   ```bash
   IP_HASHING_ENABLED=false
   ```
   - No IP addresses are stored or logged
   - Uses `'IP_HASHING_DISABLED'` placeholder
   - Maximum privacy protection

2. **Balanced Privacy**:
   ```bash
   IP_HASHING_ENABLED=true
   IP_SALT=your-secure-random-salt
   ```
   - IP addresses are hashed with SHA-256 + salt
   - Enables rate limiting while protecting privacy
   - Still prevents IP tracking

#### Implementation Files

- **`apps/api/src/lib/crypto.ts`**: Privacy utilities for API
- **`tests/subscribeRoute.test.ts`**: Tests for both privacy modes

#### Salt Generation

Generate a secure salt for production:
```bash
# Generate a secure random salt
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Compliance

This implementation supports:
- **GDPR**: Privacy by design principles
- **CCPA**: Minimal data collection
- **SOC 2**: Data protection requirements
- **HIPAA**: Privacy safeguards (if applicable)

## 🎨 Customization

### Branding
- Update colors in `apps/web/tailwind.config.ts`
- Modify copy in `apps/web/src/components/Hero.tsx`
- Replace logo and favicon in `apps/web/public/`

### Styling
- Tailwind classes in components
- Custom CSS in `apps/web/src/index.css`
- Responsive breakpoints: sm, md, lg, xl

### Content
- Hero section: `apps/web/src/components/Hero.tsx`
- Email signup: `apps/web/src/components/EmailSignup.tsx`
- Footer: `apps/web/src/components/Footer.tsx`

## 🐛 Troubleshooting

### Common Issues

1. **Database connection errors:**
   ```bash
   cd apps/api
   npx prisma generate
   npx prisma db push
   ```

2. **Port conflicts:**
   - Web app: Change port in `apps/web/vite.config.ts`
   - API: Change `PORT` in `apps/api/.env`

3. **Build failures:**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules apps/web/node_modules apps/api/node_modules
   npm install
   cd apps/web && npm install
   cd ../api && npm install
   ```

4. **Docker issues:**
   ```bash
   # Rebuild without cache
   docker-compose build --no-cache
   ```

5. **Privacy configuration issues:**
   ```bash
   # Check privacy settings
   echo $IP_HASHING_ENABLED
   echo $IP_SALT
   
   # Test IP hashing
   node -e "
   const crypto = require('crypto');
   const enabled = process.env.IP_HASHING_ENABLED === 'true';
   const salt = process.env.IP_SALT || 'default-salt';
   const ip = '192.168.1.1';
   const result = enabled ? crypto.createHash('sha256').update(ip + salt).digest('hex') : 'IP_HASHING_DISABLED';
   console.log('IP hashing enabled:', enabled);
   console.log('Test IP:', ip);
   console.log('Result:', result);
   "
   ```

### Debug Mode

Enable debug logging:
```bash
# API
cd apps/api
DEBUG=* npm run dev

# Web
cd apps/web
VITE_DEBUG=true npm run dev
```

## 📝 API Reference

### POST /api/subscribe

Subscribe to the waitlist.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully joined our waitlist! We'll notify you when SafePsy launches."
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "This email is already on our waitlist"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📚 Documentation

### Core Documentation
- **[Privacy by Design](./PRIVACY-BY-DESIGN.md)** - Privacy implementation guide
- **[Development Guide](./DEVELOPMENT.md)** - Development setup and guidelines
- **[Cleanup Summary](./CLEANUP_SUMMARY.md)** - Repository cleanup and optimization details

### Component Documentation
- **Frontend Components**: Located in `apps/web/src/components/`
- **API Routes**: Located in `apps/api/src/routes/`
- **Database Schema**: Located in `apps/api/prisma/schema.prisma`

### Repository Maintenance
- Build artifacts (`*.tsbuildinfo`, `*.db`) are excluded via `.gitignore`
- Legacy directories (`frontend/`, `backend/`) are for reference only
- Active codebase is in `apps/web/` and `apps/api/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Write tests for new features
- Use conventional commits
- Ensure accessibility compliance
- Maintain privacy-first principles
- **Privacy by Design**: Default to maximum privacy protection
- **Test Privacy Features**: Include tests for both enabled/disabled privacy modes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Contact Information
- **General Support**: support@safepsy.com
- **Technical Issues**: tech@safepsy.com
- **Security Issues**: security@safepsy.com
- **Legal Inquiries**: legal@safepsy.com
- **Privacy Questions**: privacy@safepsy.com
- **Data Protection Officer**: dpo@safepsy.com

### Emergency Contacts
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **DevOps Lead**: devops@safepsy.com
- **Security Team**: security@safepsy.com
- **Executive Team**: exec@safepsy.com

### Communication Channels
- **GitHub Issues**: Report bugs and feature requests
- **GitHub Discussions**: Community discussions
- **Slack**: #safepsy-incidents (internal)
- **Status Page**: status.safepsy.com

## 🔗 Links

- **Repository**: https://github.com/TTTEN10/SPglobalv1
- **Documentation**: https://github.com/TTTEN10/SPglobalv1/docs
- **Issues**: https://github.com/TTTEN10/SPglobalv1/issues
- **Status Page**: https://status.safepsy.com
- **Website**: https://www.safepsy.com

---

**SafePsy Global Platform** - Secure, Decentralized, Privacy-First Therapy Platform 🧠🔒

*Built with ❤️ for mental health professionals and their clients*