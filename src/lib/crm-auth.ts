import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { supabaseAdmin } from "@/lib/supabase-admin";

const scrypt = promisify(scryptCallback);

const CRM_SESSION_COOKIE = "crm_session";
const LEGACY_ADMIN_COOKIE = "admin_auth";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const CRM_ROLES = ["owner", "manager", "sales"] as const;
export const CRM_USER_STATUSES = ["active", "inactive"] as const;

export type CrmRole = (typeof CRM_ROLES)[number];
export type CrmUserStatus = (typeof CRM_USER_STATUSES)[number];
export type CrmPermission =
  | "view_dashboard"
  | "manage_products"
  | "delete_products"
  | "manage_leads"
  | "delete_leads"
  | "manage_users";

export type CrmUser = {
  id: string;
  username: string;
  displayName: string;
  role: CrmRole;
  status: CrmUserStatus;
  isLegacy?: boolean;
};

export type CrmUserRow = {
  id: string;
  username: string;
  display_name: string | null;
  role: CrmRole;
  status: CrmUserStatus;
  created_at: string;
  last_login_at: string | null;
};

type DbCrmUserRow = CrmUserRow & {
  password_hash: string;
};

type DbCrmSessionRow = {
  token_hash: string;
  user_id: string;
  expires_at: string;
};

const ROLE_PERMISSIONS: Record<CrmRole, CrmPermission[]> = {
  owner: [
    "view_dashboard",
    "manage_products",
    "delete_products",
    "manage_leads",
    "delete_leads",
    "manage_users",
  ],
  manager: ["view_dashboard", "manage_products", "delete_products", "manage_leads", "delete_leads"],
  sales: ["view_dashboard", "manage_leads"],
};

export const CRM_ROLE_LABELS: Record<CrmRole, string> = {
  owner: "Собственик",
  manager: "Мениджър",
  sales: "Търговец",
};

export function hasCrmPermission(user: CrmUser | null | undefined, permission: CrmPermission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
}

export function isCrmRole(value: string): value is CrmRole {
  return CRM_ROLES.includes(value as CrmRole);
}

export function isCrmUserStatus(value: string): value is CrmUserStatus {
  return CRM_USER_STATUSES.includes(value as CrmUserStatus);
}

export function normalizeUsername(value: FormDataEntryValue | string | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isMissingCrmAuthTablesError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  const message = err?.message?.toLowerCase() || "";

  return (
    err?.code === "42P01" ||
    message.includes("crm_users") ||
    message.includes("crm_sessions") ||
    message.includes("does not exist")
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:v1:${salt}:${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, version, salt, storedKey] = storedHash.split(":");
  if (algorithm !== "scrypt" || version !== "v1" || !salt || !storedKey) return false;

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKeyBuffer = Buffer.from(storedKey, "base64url");

  return storedKeyBuffer.length === derivedKey.length && timingSafeEqual(storedKeyBuffer, derivedKey);
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toCrmUser(user: CrmUserRow): CrmUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    role: user.role,
    status: user.status,
  };
}

function getLegacyOwner(): CrmUser {
  return {
    id: "legacy-admin",
    username: "legacy-admin",
    displayName: "Временен админ",
    role: "owner",
    status: "active",
    isLegacy: true,
  };
}

async function setLegacyAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.set(LEGACY_ADMIN_COOKIE, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
}

async function clearCrmCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(CRM_SESSION_COOKIE);
  cookieStore.delete(LEGACY_ADMIN_COOKIE);
}

async function createCrmSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  const { error } = await supabaseAdmin.from("crm_sessions").insert({
    token_hash: tokenHash,
    user_id: userId,
    expires_at: expiresAt,
  });

  if (error) throw error;

  const cookieStore = await cookies();
  cookieStore.set(CRM_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  cookieStore.delete(LEGACY_ADMIN_COOKIE);
}

export async function loginCrm(formData: FormData): Promise<{ error?: string } | undefined> {
  const username = normalizeUsername(formData.get("username"));
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";

  if (!password) return { error: "Въведете парола." };

  if (!username) {
    if (password === process.env.ADMIN_PASSWORD) {
      await setLegacyAdminCookie();
      redirect("/admin/dashboard");
    }

    return { error: "Въведете потребител и парола." };
  }

  const { data: user, error } = await supabaseAdmin
    .from("crm_users")
    .select("id, username, display_name, role, status, created_at, last_login_at, password_hash")
    .eq("username", username)
    .maybeSingle<DbCrmUserRow>();

  if (error) {
    if (isMissingCrmAuthTablesError(error)) {
      return { error: "CRM потребителите още не са настроени в Supabase." };
    }

    console.error("CRM login error:", error.message);
    return { error: "Възникна грешка при вход." };
  }

  if (!user || user.status !== "active") {
    return { error: "Грешен потребител или парола." };
  }

  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return { error: "Грешен потребител или парола." };
  }

  await createCrmSession(user.id);
  await supabaseAdmin.from("crm_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
  redirect("/admin/dashboard");
}

export async function getCrmSession(): Promise<{ user: CrmUser } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CRM_SESSION_COOKIE)?.value;

  if (sessionToken) {
    const tokenHash = hashSessionToken(sessionToken);
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("crm_sessions")
      .select("token_hash, user_id, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle<DbCrmSessionRow>();

    if (sessionError && !isMissingCrmAuthTablesError(sessionError)) {
      console.error("CRM session error:", sessionError.message);
    }

    if (sessionError && isMissingCrmAuthTablesError(sessionError)) {
      return cookieStore.get(LEGACY_ADMIN_COOKIE)?.value === "true" ? { user: getLegacyOwner() } : null;
    }

    if (session) {
      if (new Date(session.expires_at).getTime() <= Date.now()) {
        await supabaseAdmin.from("crm_sessions").delete().eq("token_hash", tokenHash);
        cookieStore.delete(CRM_SESSION_COOKIE);
        return null;
      }

      const { data: user, error: userError } = await supabaseAdmin
        .from("crm_users")
        .select("id, username, display_name, role, status, created_at, last_login_at")
        .eq("id", session.user_id)
        .maybeSingle<CrmUserRow>();

      if (userError && !isMissingCrmAuthTablesError(userError)) {
        console.error("CRM user session error:", userError.message);
      }

      if (user && user.status === "active") {
        return { user: toCrmUser(user) };
      }

      await supabaseAdmin.from("crm_sessions").delete().eq("token_hash", tokenHash);
      cookieStore.delete(CRM_SESSION_COOKIE);
    }
  }

  if (cookieStore.get(LEGACY_ADMIN_COOKIE)?.value === "true") {
    return { user: getLegacyOwner() };
  }

  return null;
}

export async function requireCrmUser(): Promise<CrmUser> {
  const session = await getCrmSession();

  if (!session) {
    redirect("/admin");
  }

  return session.user;
}

export async function requireCrmPermission(permission: CrmPermission): Promise<CrmUser> {
  const user = await requireCrmUser();

  if (!hasCrmPermission(user, permission)) {
    throw new Error("Нямате права за това действие.");
  }

  return user;
}

export async function logoutCrm() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CRM_SESSION_COOKIE)?.value;

  if (sessionToken) {
    await supabaseAdmin.from("crm_sessions").delete().eq("token_hash", hashSessionToken(sessionToken));
  }

  await clearCrmCookies();
  redirect("/admin");
}

export async function fetchCrmUsers(): Promise<{
  setupReady: boolean;
  users: CrmUserRow[];
  error?: string;
}> {
  const { data, error } = await supabaseAdmin
    .from("crm_users")
    .select("id, username, display_name, role, status, created_at, last_login_at")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingCrmAuthTablesError(error)) {
      return {
        setupReady: false,
        users: [],
        error: "CRM auth таблиците още не са създадени в Supabase.",
      };
    }

    console.error("Fetch CRM users error:", error.message);
    return { setupReady: true, users: [], error: error.message };
  }

  return { setupReady: true, users: (data || []) as CrmUserRow[] };
}
