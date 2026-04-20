import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from './validate.js';

const schema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
});

function makeReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('validate middleware', () => {
  it('calls next() for valid body', () => {
    const { req, res, next } = makeReqRes({ amount: 100, type: 'expense' });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 for missing required field', () => {
    const { req, res, next } = makeReqRes({ amount: 100 });
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid enum value', () => {
    const { req, res, next } = makeReqRes({ amount: 100, type: 'transfer' });
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for non-positive amount', () => {
    const { req, res, next } = makeReqRes({ amount: -50, type: 'expense' });
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('coerces req.body to parsed data', () => {
    const { req, res, next } = makeReqRes({ amount: 100, type: 'income', extra: 'ignored' });
    validate(schema)(req, res, next);
    expect(req.body).toEqual({ amount: 100, type: 'income' });
  });
});
