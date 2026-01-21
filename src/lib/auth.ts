import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

const COOKIE_NAME = 'auth_token';

export interface AuthPayload {
  username: string;
  iat: number;
  exp: number;
}

export function verifyCredentials(username: string, password: string): boolean {
  const envUsername = process.env.APP_USERNAME;
  const envPassword = process.env.APP_PASSWORD;

  if (!envUsername || !envPassword) {
    console.error('APP_USERNAME or APP_PASSWORD not set in environment');
    return false;
  }

  return username === envUsername && password === envPassword;
}

export async function createToken(username: string, expiresIn: string = '24h'): Promise<string> {
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export async function getAuthFromCookies(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function getAuthFromRequest(request: NextRequest): Promise<AuthPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export function getCookieName(): string {
  return COOKIE_NAME;
}

export async function createRecoveryToken(folderId: string): Promise<string> {
  return new SignJWT({ folderId, type: 'recovery' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(JWT_SECRET);
}

export async function verifyRecoveryToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'recovery') return null;
    return payload.folderId as string;
  } catch {
    return null;
  }
}
