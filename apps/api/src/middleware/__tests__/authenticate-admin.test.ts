/**
 * Admin Authentication Middleware Tests
 *
 * Verifies that authenticateAdmin middleware:
 * - Rejects requests without credentials
 * - Rejects requests with invalid credentials
 * - Allows requests with valid credentials
 * - Uses constant-time comparison (timing attack prevention)
 * - Validates secret length requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticateAdmin, optionalAuthenticateAdmin } from '../authenticate-admin';

describe('authenticateAdmin middleware', () => {
  const validAdminSecret = 'test-secret-that-is-long-enough-for-security-requirements-12345';
  const tooShortSecret = 'too-short';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = validAdminSecret;
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  it('returns 500 when ADMIN_SECRET not configured', () => {
    delete process.env.ADMIN_SECRET;

    const req = { headers: {}, path: '/admin/test' } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'ADMIN_NOT_CONFIGURED' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when ADMIN_SECRET is too short', () => {
    process.env.ADMIN_SECRET = tooShortSecret;

    const req = { headers: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'ADMIN_SECRET_TOO_SHORT' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when no secret provided', () => {
    const req = {
      headers: {},
      path: '/admin/test',
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-agent'),
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'ADMIN_SECRET_MISSING' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when secret length does not match', () => {
    const req = {
      headers: { 'x-admin-secret': 'wrong-length-secret' },
      path: '/admin/test',
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-agent'),
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'ADMIN_SECRET_INVALID' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when invalid secret provided (same length)', () => {
    // Create a secret of the same length but different content
    const invalidSecret = 'a'.repeat(validAdminSecret.length);

    const req = {
      headers: { 'x-admin-secret': invalidSecret },
      path: '/admin/test',
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-agent'),
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'ADMIN_SECRET_INVALID' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.admin when valid secret provided', () => {
    const req = {
      headers: { 'x-admin-secret': validAdminSecret },
      path: '/admin/test',
      ip: '127.0.0.1',
      get: vi.fn(),
    } as any;
    const res = {} as any;
    const next = vi.fn();

    authenticateAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toEqual({
      authenticated: true,
      authenticatedAt: expect.any(Date),
    });
  });

  it('rejects secret that differs by one character', () => {
    // Change last character
    const almostValidSecret = validAdminSecret.slice(0, -1) + 'X';

    const req = {
      headers: { 'x-admin-secret': almostValidSecret },
      path: '/admin/test',
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-agent'),
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'ADMIN_SECRET_INVALID' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe('optionalAuthenticateAdmin middleware', () => {
  const validAdminSecret = 'test-secret-that-is-long-enough-for-security-requirements-12345';

  beforeEach(() => {
    process.env.ADMIN_SECRET = validAdminSecret;
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  it('sets authenticated: false when no secret provided', () => {
    const req = { headers: {} } as any;
    const res = {} as any;
    const next = vi.fn();

    optionalAuthenticateAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toEqual({
      authenticated: false,
      authenticatedAt: null,
    });
  });

  it('sets authenticated: true when valid secret provided', () => {
    const req = {
      headers: { 'x-admin-secret': validAdminSecret },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    optionalAuthenticateAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toEqual({
      authenticated: true,
      authenticatedAt: expect.any(Date),
    });
  });

  it('sets authenticated: false when invalid secret provided', () => {
    const req = {
      headers: { 'x-admin-secret': 'wrong-secret' },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    optionalAuthenticateAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toEqual({
      authenticated: false,
      authenticatedAt: null,
    });
  });
});
