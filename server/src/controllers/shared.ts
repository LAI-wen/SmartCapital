import { Request, Response } from 'express';

export function getAuthenticatedLineUserId(req: Request, res: Response): string | null {
  const authenticatedLineUserId = req.user?.lineUserId;

  if (!authenticatedLineUserId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required'
    });
    return null;
  }

  return authenticatedLineUserId;
}

export function ensureAuthenticatedUser(
  req: Request,
  res: Response,
  requestedLineUserId?: unknown
): string | null {
  const authenticatedLineUserId = getAuthenticatedLineUserId(req, res);
  if (!authenticatedLineUserId) {
    return null;
  }

  if (
    requestedLineUserId !== undefined &&
    requestedLineUserId !== null &&
    requestedLineUserId !== authenticatedLineUserId
  ) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: lineUserId does not match authenticated user'
    });
    return null;
  }

  return authenticatedLineUserId;
}
