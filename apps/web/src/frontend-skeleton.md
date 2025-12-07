# Frontend Files Skeleton

This document outlines the structure and purpose of all frontend files in the SafePsy landing page application.

## Root Files

### `main.tsx`
- **Purpose**: Application entry point
- **Dependencies**: React, ReactDOM, App component, styles, polyfills
- **Key Features**:
  - React 18 root rendering
  - Strict mode enabled
  - CSS imports
  - Polyfills for Web3 compatibility (buffer, process, stream)

### `App.tsx`
- **Purpose**: Main application component with routing and context providers
- **Dependencies**: React Router, all page components, contexts
- **Key Features**:
  - BrowserRouter setup
  - Route definitions for all pages
  - Context providers (ThemeProvider, WalletProvider, AuthProvider)
  - SEO integration with React Helmet
  - Cookie consent management
  - Header with logo and tagline
  - Main content area
  - Footer component

### `styles.css`
- **Purpose**: Global styles and Tailwind CSS configuration
- **Key Features**:
  - Google Fonts imports (Titillium Web, Noto Sans)
  - Tailwind CSS layers
  - Custom component classes
  - Typography and color system
  - Button and input field styles

### `polyfills.ts`
- **Purpose**: Web3 and Node.js polyfills for browser compatibility
- **Key Features**:
  - Buffer polyfill
  - Process polyfill
  - Stream polyfill
  - Events polyfill
  - Required for WalletConnect and ethers.js

### `vite-env.d.ts`
- **Purpose**: TypeScript type definitions for Vite environment variables
- **Key Features**:
  - Vite import types
  - Environment variable type definitions

## Components Directory (`/components`)

### `Hero.tsx`
- **Purpose**: Landing page hero section
- **Features**: Main call-to-action, value proposition display

### `AboutUs.tsx`
- **Purpose**: About page component
- **Features**: Company information, team details, mission statement

### `ContactUs.tsx`
- **Purpose**: Contact page component
- **Features**: Contact form, company information, location details

### `SecurityAndPrivacyPolicy.tsx`
- **Purpose**: Security and privacy policy page
- **Features**: Legal compliance information, privacy practices

### `TermsOfService.tsx`
- **Purpose**: Terms of service page
- **Features**: Legal terms and conditions

### `EmailSignup.tsx`
- **Purpose**: Email subscription component
- **Features**: Newsletter signup, email validation

### `Footer.tsx`
- **Purpose**: Site footer component
- **Features**: Links, copyright, social media, contact info

### `Header.tsx`
- **Purpose**: Site header/navigation component
- **Features**: Logo, navigation menu, theme toggle, wallet connection

### `CookieBanner.tsx`
- **Purpose**: GDPR-compliant cookie consent banner
- **Features**: Cookie consent management, preference settings

### `CookieManager.tsx`
- **Purpose**: Cookie preference management component
- **Features**: Granular cookie consent controls

### `Cookies.tsx`
- **Purpose**: Cookie policy page
- **Features**: Detailed cookie information and policy

### `SEOHead.tsx`
- **Purpose**: SEO meta tags and structured data component
- **Features**: Dynamic meta tags, Open Graph, Twitter Cards, structured data

### `ThemeToggle.tsx`
- **Purpose**: Dark/light theme toggle component
- **Features**: Theme switching functionality

### `ChatWidget.tsx`
- **Purpose**: AI-powered chat widget with end-to-end encryption
- **Features**:
  - Real-time chat with SSE streaming
  - End-to-end encryption (AES-256-GCM)
  - Token-by-token streaming display
  - Message history management
  - Wallet-based authentication integration

### `ConnectWallet.tsx`
- **Purpose**: Web3 wallet connection component
- **Features**:
  - WalletConnect integration
  - Multiple wallet support (MetaMask, WalletConnect, etc.)
  - Network switching
  - Wallet authentication

### `DIDManager.tsx`
- **Purpose**: Decentralized Identity (DID) management component
- **Features**:
  - DID registration and management
  - DID token display
  - On-chain DID verification
  - DID-based authentication

### `DPIA.tsx`
- **Purpose**: Data Protection Impact Assessment page
- **Features**: DPIA documentation and assessment tools

### `Testing.tsx`
- **Purpose**: Testing and development tools page
- **Features**: Development utilities, API testing, feature flags

### `NotFound.tsx`
- **Purpose**: 404 error page
- **Features**: User-friendly 404 error display

### `ServerError.tsx`
- **Purpose**: 500 error page
- **Features**: Server error display

### `Maintenance.tsx`
- **Purpose**: Maintenance mode page
- **Features**: Maintenance mode display

## Contexts Directory (`/contexts`)

### `ThemeContext.tsx`
- **Purpose**: Theme management context
- **Features**: Dark/light theme state management, theme persistence

### `WalletContext.tsx`
- **Purpose**: Web3 wallet connection context
- **Features**:
  - Wallet connection state
  - Account management
  - Network management
  - Wallet authentication state

### `AuthContext.tsx`
- **Purpose**: Authentication context
- **Features**:
  - User authentication state
  - DID-based authentication
  - Session management

## Hooks Directory (`/hooks`)

### `useSEO.ts`
- **Purpose**: SEO configuration hook
- **Features**: Dynamic SEO meta tags, structured data generation

### `useCookieConsent.ts`
- **Purpose**: Cookie consent management hook
- **Features**: Cookie consent state, preference management

### `useChatEncryption.ts`
- **Purpose**: Chat encryption hook
- **Features**: End-to-end encryption utilities for chat messages

## Utils Directory (`/utils`)

### `cookieUtils.ts`
- **Purpose**: Cookie utility functions
- **Features**: Cookie parsing, setting, getting, deletion

### `encryption.ts`
- **Purpose**: Encryption utilities
- **Features**:
  - AES-256-GCM encryption/decryption
  - Key generation and derivation
  - Salt generation
  - Secure key management

### `did-encryption.ts`
- **Purpose**: DID-based encryption utilities
- **Features**: DID-specific encryption functions, on-chain key management

## Config Directory (`/config`)

### `seo.ts`
- **Purpose**: SEO configuration
- **Features**: Default SEO settings, meta tag templates

## Types Directory (`/types`)

### `seo.ts`
- **Purpose**: SEO TypeScript type definitions
- **Features**: SEO config types, meta tag types

## Test Directory (`/test`)

### `setup.ts`
- **Purpose**: Vitest test setup
- **Features**: Test environment configuration, mocks, global test utilities

## File Structure Overview

```
src/
├── main.tsx                 # Application entry point
├── App.tsx                  # Main app component with routing
├── styles.css              # Global styles and Tailwind config
├── polyfills.ts            # Web3 polyfills
├── vite-env.d.ts          # Vite type definitions
├── components/
│   ├── Hero.tsx            # Landing page hero section
│   ├── AboutUs.tsx         # About page component
│   ├── ContactUs.tsx       # Contact page component
│   ├── SecurityAndPrivacyPolicy.tsx  # Privacy policy page
│   ├── TermsOfService.tsx  # Terms of service page
│   ├── EmailSignup.tsx     # Email subscription component
│   ├── Footer.tsx          # Site footer component
│   ├── Header.tsx          # Navigation header
│   ├── CookieBanner.tsx    # Cookie consent banner
│   ├── CookieManager.tsx   # Cookie preference manager
│   ├── Cookies.tsx         # Cookie policy page
│   ├── SEOHead.tsx         # SEO meta tags component
│   ├── ThemeToggle.tsx     # Theme toggle component
│   ├── ChatWidget.tsx      # AI chat widget with encryption
│   ├── ConnectWallet.tsx   # Web3 wallet connection
│   ├── DIDManager.tsx      # DID management component
│   ├── DPIA.tsx            # DPIA page
│   ├── Testing.tsx         # Testing tools page
│   ├── NotFound.tsx        # 404 error page
│   ├── ServerError.tsx     # 500 error page
│   └── Maintenance.tsx     # Maintenance mode page
├── contexts/
│   ├── ThemeContext.tsx    # Theme management
│   ├── WalletContext.tsx   # Wallet connection context
│   └── AuthContext.tsx     # Authentication context
├── hooks/
│   ├── useSEO.ts           # SEO configuration hook
│   ├── useCookieConsent.ts # Cookie consent hook
│   └── useChatEncryption.ts # Chat encryption hook
├── utils/
│   ├── cookieUtils.ts      # Cookie utilities
│   ├── encryption.ts       # Encryption utilities
│   └── did-encryption.ts   # DID encryption utilities
├── config/
│   └── seo.ts              # SEO configuration
├── types/
│   └── seo.ts              # SEO type definitions
└── test/
    └── setup.ts            # Test setup configuration
```

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS with custom components
- **Fonts**: Titillium Web (primary), Noto Sans (secondary)
- **Build Tool**: Vite
- **Web3**: WalletConnect, ethers.js, @reown/walletkit
- **SEO**: React Helmet Async
- **Icons**: Lucide React

## Key Design Patterns

1. **Component-based Architecture**: Each page/section is a separate component
2. **Context-based State Management**: Theme, Wallet, and Auth contexts
3. **Responsive Design**: Mobile-first approach with Tailwind breakpoints
4. **Consistent Styling**: Custom CSS classes for buttons, inputs, and typography
5. **Accessibility**: Focus states, semantic HTML, proper alt tags
6. **Performance**: Lazy loading, optimized images, efficient routing
7. **Privacy by Design**: End-to-end encryption, cookie consent, privacy-first approach
8. **Web3 Integration**: Wallet connection, DID management, blockchain authentication

## Color Scheme

- **Primary**: Gradient from primary-600 to secondary-600
- **Text**: #001515 (dark teal)
- **Background**: Gradient from neutral-light via white to neutral-dark
- **Accents**: Primary and secondary color variations

## Typography

- **Headings**: Titillium Web, 600 weight
- **Body Text**: Titillium Web, 400 weight
- **Web-safe Text**: Noto Sans, 300 weight
- **Font Sizes**: Responsive scaling with Tailwind classes

## Key Features

- **End-to-End Encryption**: AES-256-GCM encryption for chat messages
- **Web3 Integration**: Wallet connection and DID management
- **AI Chat**: SSE streaming chat with OpenAI integration
- **Privacy by Design**: Cookie consent, IP hashing, encryption
- **SEO Optimization**: Dynamic meta tags and structured data
- **Theme Support**: Dark/light theme switching
- **Accessibility**: WCAG AA compliant
- **Responsive Design**: Mobile-first approach
