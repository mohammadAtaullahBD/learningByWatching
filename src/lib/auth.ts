import { cookies } from "next/headers";
import { getD1Database } from "@/lib/d1";

type UserRow = {
  username: string;
  role: "user" | "admin";
};

const SESSION_COOKIE = "session";
const SESSION_TTL_DAYS = 30;

const encoder = new TextEncoder();

const toBase64 = (bytes: ArrayBuffer | Uint8Array): string => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const hashPassword = async (password: string, salt: Uint8Array) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const saltBuffer =
    salt.buffer instanceof ArrayBuffer ? salt.buffer : salt.slice().buffer;

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );

  return toBase64(derived);
};

export const generateSalt = (): Uint8Array => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
};

export const generateToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const setSessionCookie = async (token: string) => {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
};

export const clearSessionCookie = async () => {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
};

export const getSessionToken = async (): Promise<string | null> => {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
};

export const getSessionUser = async (): Promise<UserRow | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  const db = await getD1Database();
  if (!db) return null;

  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `SELECT u.username as username, u.role as role
       FROM sessions s
       JOIN users u ON u.username = s.username
       WHERE s.token = ?1 AND s.expires_at > ?2`,
    )
    .bind(token, now)
    .first<UserRow>();

  return row ?? null;
};

export const requireUser = async (): Promise<UserRow> => {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }
  return user;
};

export const requireAdmin = async (): Promise<UserRow> => {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("ADMIN_REQUIRED");
  }
  return user;
};

export const parseStoredSalt = (salt: string): Uint8Array => fromBase64(salt);
