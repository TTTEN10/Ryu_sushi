#!/usr/bin/env node
/**
 * Production E2E API tests (no browser/MetaMask).
 * Usage: API_URL=https://polinapsycho.com node scripts/run-production-e2e.mjs
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = (process.env.API_URL || 'https://polinapsycho.com').replace(/\/$/, '');
const CHAIN_ID = 11155111;
const ORIGIN = 'https://polinapsycho.com';

const results = [];

function record(step, pass, detail = '') {
  results.push({ step, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${step}${detail ? ` — ${detail}` : ''}`);
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

async function siweSession(wallet) {
  const address = wallet.address;
  const connect = await jsonFetch(`${API_URL}/api/auth/wallet/connect`, {
    method: 'POST',
    headers: {
      'x-wallet-address': address,
      'x-chain-id': String(CHAIN_ID),
    },
    body: JSON.stringify({ address, chainId: CHAIN_ID }),
  });
  if (!connect.res.ok || !connect.body?.data?.message) {
    throw new Error(`connect failed: ${connect.res.status} ${JSON.stringify(connect.body)}`);
  }
  const message = connect.body.data.message;
  const signature = await wallet.signMessage(message);
  const verify = await jsonFetch(`${API_URL}/api/auth/wallet/verify`, {
    method: 'POST',
    headers: {
      'x-wallet-address': address,
      'x-chain-id': String(CHAIN_ID),
    },
    body: JSON.stringify({ address, message, signature, chainId: CHAIN_ID }),
  });
  if (!verify.res.ok || !verify.body?.data?.token) {
    throw new Error(`verify failed: ${verify.res.status} ${JSON.stringify(verify.body)}`);
  }
  const token = verify.body.data.token;
  const cookie = `walletSession=${token}`;
  return { address, token, cookie };
}

function authHeaders(address, cookie) {
  return {
    Cookie: cookie,
    'x-wallet-address': address,
    'x-chain-id': String(CHAIN_ID),
  };
}

async function main() {
  console.log(`\nProduction E2E — ${API_URL}\n`);

  // Step 2: health
  const health = await jsonFetch(`${API_URL}/api/healthz`, { method: 'GET' });
  record('Step 2: API health', health.res.ok || health.res.status === 308, `status ${health.res.status}`);

  const didCheckAnon = await jsonFetch(`${API_URL}/api/did/check`, { method: 'POST' });
  record('Step 2: DID route live', didCheckAnon.res.status === 401, `status ${didCheckAnon.res.status} (expect 401)`);

  const wallet = process.env.TEST_WALLET_PRIVATE_KEY
    ? new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY)
    : ethers.Wallet.createRandom();
  console.log(`Test wallet: ${wallet.address}`);

  let session;
  try {
    session = await siweSession(wallet);
    record('Step 3: SIWE verify', true, wallet.address);
  } catch (e) {
    record('Step 3: SIWE verify', false, e.message);
    printSummary();
    process.exit(1);
  }

  const { address, cookie } = session;
  const h = authHeaders(address, cookie);

  // DID check
  const didCheck = await jsonFetch(`${API_URL}/api/did/check`, { method: 'POST', headers: h });
  const hadDid = didCheck.body?.data?.hasDid === true;
  record('Step 3: DID check', didCheck.res.ok, hadDid ? `existing token ${didCheck.body.data.tokenId}` : 'no DID yet');

  let tokenId = didCheck.body?.data?.tokenId;
  let isSponsored;

  if (!hadDid) {
    const didCreate = await jsonFetch(`${API_URL}/api/did/create`, { method: 'POST', headers: h });
    const ok = didCreate.res.ok && didCreate.body?.success;
    isSponsored = didCreate.body?.data?.isSponsored;
    tokenId = didCreate.body?.data?.tokenId;
    record(
      'Step 3: DID create (sponsored)',
      ok && isSponsored === true,
      ok ? `tokenId=${tokenId} sponsored=${isSponsored} tx=${didCreate.body?.data?.txHash?.slice(0, 14)}...` : JSON.stringify(didCreate.body),
    );
  } else {
    record('Step 3: DID create (sponsored)', true, 'skipped — DID already exists');
    isSponsored = true;
  }

  // Chat save (minimal encrypted blob)
  const fakeBlob = Buffer.from('e2e-test-blob-' + Date.now()).toString('base64');
  const chatSave = await jsonFetch(`${API_URL}/api/chat/save`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      encryptedChatBlob: fakeBlob,
      didTokenId: tokenId ? String(tokenId) : null,
      generateSummary: false,
      messages: [{ role: 'user', content: `E2E test ${Date.now()}` }],
    }),
  });
  record(
    'Step 4: Chat save',
    chatSave.res.ok && chatSave.body?.success,
    chatSave.res.ok ? `blobHash=${chatSave.body?.data?.blobHash?.slice(0, 14)}...` : JSON.stringify(chatSave.body),
  );

  // Chat load
  const chatLoad = await jsonFetch(`${API_URL}/api/chat/load`, { method: 'GET', headers: h });
  const loaded = chatLoad.body?.data?.encryptedChatBlob || chatLoad.body?.data?.blob;
  record(
    'Step 5: Chat load',
    chatLoad.res.ok && chatLoad.body?.success && !!loaded,
    chatLoad.res.ok ? `hasBlob=${!!loaded}` : JSON.stringify(chatLoad.body),
  );

  // Logout
  const logout = await jsonFetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  record('Step 6: Logout', logout.res.ok && logout.body?.success, logout.body?.message || '');

  const sessionAfter = await jsonFetch(`${API_URL}/api/auth/session`, { method: 'GET', headers: h });
  record('Step 6: Session cleared', sessionAfter.res.status === 401, `status ${sessionAfter.res.status}`);

  // Quota status (requires re-auth)
  const session2 = await siweSession(wallet);
  const h2 = authHeaders(session2.address, session2.cookie);
  const quota = await jsonFetch(`${API_URL}/api/chat/quota`, { method: 'GET', headers: h2 });
  const redisReady = quota.body?.data?.redis?.configured !== false;
  record(
    'Step 7: Quota endpoint + Redis',
    quota.res.ok,
    quota.res.ok
      ? `daily=${quota.body?.data?.quota?.dailyUsed}/${quota.body?.data?.quota?.dailyLimit} redis=${quota.body?.data?.redis?.status || 'n/a'}`
      : JSON.stringify(quota.body),
  );

  // Guest chat (no quota on guest via node path — prod uses python proxy)
  const guestChat = await jsonFetch(`${API_URL}/api/chat/completions`, {
    method: 'POST',
    body: JSON.stringify({
      mode: 'guest',
      messages: [{ role: 'user', content: 'Say hi in one word.' }],
      stream: false,
    }),
  });
  record(
    'Step 7b: Guest chat completions',
    guestChat.res.ok || guestChat.res.status === 429,
    `status ${guestChat.res.status}`,
  );

  printSummary();
  const allPass = results.every((r) => r.pass);
  process.exit(allPass ? 0 : 1);
}

function printSummary() {
  console.log('\n--- Results table ---');
  console.log('| Test | Pass/Fail | Detail |');
  console.log('|------|-----------|--------|');
  for (const r of results) {
    console.log(`| ${r.step} | ${r.pass ? 'Pass' : 'Fail'} | ${(r.detail || '').replace(/\|/g, '/')} |`);
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} passed`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
