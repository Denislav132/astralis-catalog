import { supabaseAdmin } from "@/lib/supabase-admin";

export type SiteSettings = {
  contact_phone: string;
  contact_email: string;
  contact_address: string;
};

export type SiteSettingsState = {
  setupReady: boolean;
  settings: SiteSettings;
  error?: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  contact_phone: "0879630620",
  contact_email: "info@astralis.bg",
  contact_address: "София, България",
};

export function isMissingSiteSettingsTableError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  const message = err?.message?.toLowerCase() || "";

  return (
    err?.code === "42P01" ||
    err?.code === "PGRST205" ||
    message.includes("site_settings") ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

export function normalizeSiteSettings(settings?: Partial<SiteSettings> | null): SiteSettings {
  return {
    contact_phone: settings?.contact_phone?.trim() || DEFAULT_SITE_SETTINGS.contact_phone,
    contact_email: settings?.contact_email?.trim() || DEFAULT_SITE_SETTINGS.contact_email,
    contact_address: settings?.contact_address?.trim() || DEFAULT_SITE_SETTINGS.contact_address,
  };
}

export async function fetchSiteSettings(): Promise<SiteSettingsState> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("contact_phone, contact_email, contact_address")
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    if (isMissingSiteSettingsTableError(error)) {
      return {
        setupReady: false,
        settings: DEFAULT_SITE_SETTINGS,
        error: "Таблицата site_settings още не е създадена в Supabase.",
      };
    }

    console.error("Site settings error:", error.message);
    return {
      setupReady: true,
      settings: DEFAULT_SITE_SETTINGS,
      error: error.message,
    };
  }

  return {
    setupReady: true,
    settings: normalizeSiteSettings(data),
  };
}
