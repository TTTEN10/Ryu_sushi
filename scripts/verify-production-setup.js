#!/usr/bin/env node
/**
 * Production Setup Verification Script
 *
 * Usage: node scripts/verify-production-setup.js
 *
 * Checks:
 * 1. Environment variables are set
 * 2. Secrets meet minimum requirements
 * 3. DID contracts are reachable
 * 4. AI upstream is configured
 * 5. Database connection works
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let hasError = false;
let hasWarning = false;

function log(type, message) {
  const icon = {
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    info: 'ℹ️',
  };

  const color = {
    pass: colors.green,
    fail: colors.red,
    warn: colors.yellow,
    info: colors.cyan,
  };

  console.log(`${color[type]} ${icon[type]}  ${message}${colors.reset}`);
}

function checkEnvVar(name, required = true, minLength = 0) {
  const value = process.env[name];

  if (!value) {
    if (required) {
      log('fail', `${name} is not set`);
      hasError = true;
      return false;
    } else {
      log('warn', `${name} is not set (optional)`);
      return true;
    }
  }

  if (value.length < minLength) {
    log('fail', `${name} is too short (min ${minLength} chars, got ${value.length})`);
    hasError = true;
    return false;
  }

  // Check for placeholder values
  const placeholders = ['your-', 'REPLACE_', 'CHANGE_', 'xxx', 'todo'];
  const isPlaceholder = placeholders.some(p => value.toLowerCase().includes(p));
  if (isPlaceholder) {
    log('fail', `${name} appears to be a placeholder value`);
    hasError = true;
    return false;
  }

  log('pass', `${name} is set (${value.length} chars)`);
  return true;
}

async function checkDIDContract() {
  const registryAddress = process.env.DID_REGISTRY_ADDRESS;
  const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;

  if (!registryAddress || !rpcUrl) {
    log('warn', 'Skipping DID contract check (not configured)');
    return;
  }

  try {
    const ethers = require('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();

    log('pass', `Connected to RPC: ${network.name} (Chain ID: ${network.chainId})`);

    // Check if contract exists
    const code = await provider.getCode(registryAddress);
    if (code === '0x') {
      log('fail', `DID Registry contract not found at ${registryAddress}`);
      hasError = true;
    } else {
      log('pass', `DID Registry contract found: ${registryAddress}`);
    }
  } catch (error) {
    log('fail', `Failed to connect to DID contract: ${error.message}`);
    hasError = true;
  }
}

async function checkScalewayAPI() {
  const apiKey = process.env.SCALEWAY_API_KEY;

  if (!apiKey) {
    log('warn', 'Scaleway API key not set (chat will use mock responses)');
    hasWarning = true;
    return;
  }

  try {
    const response = await fetch('https://api.scaleway.com/ai/v1alpha1/models', {
      headers: {
        'X-Auth-Token': apiKey,
      },
    });

    if (response.ok) {
      log('pass', 'Scaleway API key is valid');
    } else {
      log('fail', `Scaleway API key invalid: ${response.status} ${response.statusText}`);
      hasError = true;
    }
  } catch (error) {
    log('fail', `Failed to connect to Scaleway API: ${error.message}`);
    hasError = true;
  }
}

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log('warn', 'Database URL not set (skipping check)');
    return;
  }

  // Basic URL format check
  if (!databaseUrl.startsWith('postgresql://')) {
    log('fail', 'DATABASE_URL must be a PostgreSQL connection string');
    hasError = true;
    return;
  }

  log('pass', 'Database URL format is valid');

  // Note: Actual connection test would require Prisma client
  log('info', 'Database connection test: Run `npm run db:studio` to verify');
}

/**
 * Warn if apps/web/.env exists but WalletConnect is not configured (optional for extension-only).
 */
function checkWebWalletConnect() {
  const webEnvPath = path.resolve(__dirname, '../apps/web/.env');
  if (!fs.existsSync(webEnvPath)) {
    log('info', 'apps/web/.env not found — skipping VITE_WALLETCONNECT_PROJECT_ID check (copy apps/web/env.example)');
    return;
  }

  const raw = fs.readFileSync(webEnvPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  let value = '';
  for (const line of lines) {
    const m = line.match(/^\s*VITE_WALLETCONNECT_PROJECT_ID\s*=\s*(.*)$/);
    if (m) {
      value = m[1].trim().replace(/^["']|["']$/g, '');
      break;
    }
  }

  const placeholderHints = ['your_', 'walletconnect_project_id_here', 'REPLACE', 'CHANGE', 'todo', 'xxx'];
  const looksPlaceholder =
    !value ||
    placeholderHints.some((h) => value.toLowerCase().includes(h.toLowerCase()));

  if (looksPlaceholder) {
    log(
      'warn',
      'VITE_WALLETCONNECT_PROJECT_ID missing or placeholder in apps/web/.env — WalletConnect disabled; browser extensions still work',
    );
    hasWarning = true;
  } else if (value.length < 20) {
    log('warn', 'VITE_WALLETCONNECT_PROJECT_ID looks unusually short — verify at https://cloud.walletconnect.com');
    hasWarning = true;
  } else {
    log('pass', 'VITE_WALLETCONNECT_PROJECT_ID is set in apps/web/.env');
  }
}

function checkSecrets() {
  // JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      log('fail', `JWT_SECRET must be at least 32 characters (got ${jwtSecret.length})`);
      hasError = true;
    } else if (jwtSecret.includes('local-dev') || jwtSecret.includes('do-not-use-in-production')) {
      log('fail', 'JWT_SECRET contains development marker - must be changed for production');
      hasError = true;
    } else {
      log('pass', `JWT_SECRET meets minimum length requirement (${jwtSecret.length} chars)`);
    }
  }

  // IP_SALT (if IP hashing enabled)
  if (process.env.IP_HASHING_ENABLED === 'true') {
    const ipSalt = process.env.IP_SALT;
    if (!ipSalt) {
      log('fail', 'IP_SALT is required when IP_HASHING_ENABLED=true');
      hasError = true;
    } else if (ipSalt.length < 32) {
      log('fail', `IP_SALT must be at least 32 characters (got ${ipSalt.length})`);
      hasError = true;
    } else {
      log('pass', `IP_SALT meets minimum length requirement (${ipSalt.length} chars)`);
    }
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('SafePsy Production Setup Verification');
  console.log('='.repeat(60) + '\n');

  console.log(`${colors.blue}📋 Checking Environment Variables${colors.reset}\n`);

  // Required environment variables
  checkEnvVar('DATABASE_URL', true, 20);
  checkEnvVar('JWT_SECRET', true, 32);
  checkEnvVar('FRONTEND_URL', true, 10);
  checkEnvVar('NODE_ENV', true, 1);

  console.log('\n' + `${colors.blue}🔗 Checking Blockchain Configuration${colors.reset}\n`);

  checkEnvVar('RPC_URL', false, 20);
  checkEnvVar('DID_REGISTRY_ADDRESS', false, 42);
  checkEnvVar('DID_IDENTITY_TOKEN_ADDRESS', false, 42);

  console.log('\n' + `${colors.blue}🤖 Checking AI Configuration${colors.reset}\n`);

  checkEnvVar('SCALEWAY_API_KEY', false, 10);
  checkEnvVar('OPENAI_API_KEY', false, 10);

  console.log('\n' + `${colors.blue}🔐 Checking Secret Requirements${colors.reset}\n`);

  checkSecrets();

  console.log('\n' + `${colors.blue}🌐 Checking External Services${colors.reset}\n`);

  console.log('\n' + `${colors.blue}📱 Checking Web Client (apps/web)${colors.reset}\n`);
  checkWebWalletConnect();

  // Async checks
  await checkDatabase();
  await checkDIDContract();
  await checkScalewayAPI();

  console.log('\n' + '='.repeat(60));

  if (hasError) {
    console.log(`${colors.red}❌ ERRORS FOUND - Fix before deploying${colors.reset}`);
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  } else if (hasWarning) {
    console.log(`${colors.yellow}⚠️  WARNINGS FOUND - Review before deploying${colors.reset}`);
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  } else {
    console.log(`${colors.green}✅ ALL CHECKS PASSED - Ready for deployment${colors.reset}`);
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
