#!/usr/bin/env node
/* global process, console, URL, fetch */
/**
 * Prereqs for "Staging E2E (Sepolia checklist)" in programming_sprint.md.
 * - Validates apps/web/.env (if present) against repo sepolia-latest DID identity token.
 * - Optionally probes API /healthz when STAGING_API_ORIGIN or parsed VITE_API_URL is set.
 *
 * Usage:
 *   node apps/web/scripts/verify-sepolia-staging-checklist.mjs
 *   STAGING_API_ORIGIN=https://api.example.com node apps/web/scripts/verify-sepolia-staging-checklist.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..', '..');
const sepoliaLatest = path.join(repoRoot, 'apps', 'api', 'deployments', 'sepolia-latest.json');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function isAddress(s) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(s || '').trim());
}

function healthOriginFromApiUrl(apiUrl) {
  const u = String(apiUrl || '').trim().replace(/\/$/, '');
  if (!u) return null;
  if (u.endsWith('/api')) return u.slice(0, -4);
  try {
    const { origin } = new URL(u);
    return origin;
  } catch {
    return null;
  }
}

async function fetchJsonRpc(rpcUrl, body) {
  const r = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
  return r.json();
}

async function main() {
  const failures = [];
  const notes = [];

  const expected = JSON.parse(fs.readFileSync(sepoliaLatest, 'utf8'));
  const expectedDid =
    expected?.contracts?.DIDIdentityTokenV2?.address ||
    expected?.contracts?.DIDIdentityToken?.address;

  if (!expectedDid || !isAddress(expectedDid)) {
    failures.push(`Could not read DID identity token from ${path.relative(repoRoot, sepoliaLatest)}`);
  }

  const webEnvPath = path.join(webRoot, '.env');
  const webEnv = parseEnvFile(webEnvPath);

  const did = (webEnv.VITE_DID_IDENTITY_TOKEN_ADDRESS || '').trim();
  if (!fs.existsSync(webEnvPath)) {
    notes.push(`No ${path.relative(repoRoot, webEnvPath)} — create from apps/web/env.example (Vite reads at dev/build time).`);
  } else if (!did) {
    failures.push('VITE_DID_IDENTITY_TOKEN_ADDRESS is missing in apps/web/.env');
  } else if (!isAddress(did)) {
    failures.push('VITE_DID_IDENTITY_TOKEN_ADDRESS is not a 0x + 40 hex address');
  } else if (expectedDid && did.toLowerCase() !== String(expectedDid).toLowerCase()) {
    failures.push(
      `VITE_DID_IDENTITY_TOKEN_ADDRESS (${did}) does not match apps/api/deployments/sepolia-latest.json (${expectedDid})`,
    );
  }

  const apiUrlRaw = (webEnv.VITE_API_URL || '').trim();
  if (apiUrlRaw) {
    notes.push('VITE_API_URL is set — ensure it points at the API that serves this web app (see getApiBaseUrl in src/config/api.ts).');
  } else {
    notes.push('VITE_API_URL unset — dev uses same-origin /api (Vite proxy); staging/prod builds need explicit origin if SPA and API differ.');
  }

  const stagingOrigin = (process.env.STAGING_API_ORIGIN || '').trim();
  const healthBase = stagingOrigin || healthOriginFromApiUrl(apiUrlRaw);
  if (healthBase) {
    const healthUrl = `${healthBase.replace(/\/$/, '')}/healthz`;
    try {
      const res = await fetch(healthUrl, { redirect: 'manual' });
      if (res.status !== 200) {
        failures.push(`GET ${healthUrl} returned ${res.status} (expected 200)`);
      } else {
        const text = await res.text();
        if (text.trim() !== 'ok') {
          failures.push(`GET ${healthUrl} body was not "ok" (got ${JSON.stringify(text.slice(0, 80))})`);
        } else {
          notes.push(`API health OK: ${healthUrl}`);
        }
      }
    } catch (e) {
      failures.push(`GET ${healthUrl} failed: ${e?.message || e}`);
    }
  } else {
    notes.push('Skipped API /healthz (set STAGING_API_ORIGIN=https://your-api-host or VITE_API_URL in apps/web/.env).');
  }

  const rpc =
    (webEnv.VITE_RPC_URL || '').trim() ||
    (process.env.SEPOLIA_RPC_URL || '').trim() ||
    'https://ethereum-sepolia-rpc.publicnode.com';
  try {
    const j = await fetchJsonRpc(rpc, { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] });
    const id = j?.result ? parseInt(j.result, 16) : NaN;
    if (id !== 11155111) {
      failures.push(`RPC ${rpc} eth_chainId expected 11155111 (0xaa36a7), got ${j?.result} (${id})`);
    } else {
      notes.push(`Sepolia RPC OK (${rpc}) chainId=11155111`);
    }
  } catch (e) {
    failures.push(`Sepolia RPC check failed (${rpc}): ${e?.message || e}`);
  }

  console.log('--- Sepolia staging checklist (automated prereqs) ---\n');
  for (const n of notes) console.log(`ℹ ${n}`);
  console.log('');
  if (failures.length) {
    for (const f of failures) console.log(`✖ ${f}`);
    console.log('\nFix env drift: align apps/web/.env with apps/api/deployments/sepolia-latest.json and your staging API host.');
    process.exit(1);
  }
  console.log('All automated checks passed.');
  console.log('\nManual steps still required: wallet → SIWE → DID → chat save → refresh → decrypt → Sepolia explorer tx.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
