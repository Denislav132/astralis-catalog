"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearCrmCookies,
  CRM_ROLES,
  CRM_USER_STATUSES,
  getCrmUsersCount,
  hashPassword,
  isCrmRole,
  isCrmUserStatus,
  loginCrm,
  logoutCrm,
  normalizeUsername,
  requireCrmPermission,
} from "@/lib/crm-auth";

const ALLOWED_INQUIRY_STATUSES = [
  "new",
  "called",
  "offer_sent",
  "waiting",
  "won",
  "lost",
  "archived",
] as const;

export async function login(formData: FormData) {
  return loginCrm(formData);
}

export async function logout() {
  return logoutCrm();
}

export async function deleteProduct(id: string) {
  await requireCrmPermission("delete_products");
  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/dashboard");
}

export async function toggleProductStatus(id: string, currentStatus: string) {
  await requireCrmPermission("manage_products");
  const newStatus = currentStatus === "published" ? "draft" : "published";
  const { error } = await supabaseAdmin.from("products").update({ status: newStatus }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/dashboard");
}

async function uploadImage(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { data, error } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, file);
    
  if (error) throw new Error("Грешка при качване на снимката: " + error.message);
  
  const { data: publicUrlData } = supabaseAdmin.storage
    .from('product-images')
    .getPublicUrl(fileName);
    
  return publicUrlData.publicUrl;
}

function getStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

async function collectImages(formData: FormData): Promise<string[]> {
  const existingImages = formData
    .getAll("existingImage")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const imageUrl = getStringValue(formData.get("imageUrl"));
  const imageFiles = formData.getAll("imageFile") as File[];
  const imagesList = imageUrl ? [...existingImages, imageUrl] : [...existingImages];

  for (const file of imageFiles) {
    if (file && file.size > 0) {
      const uploadedUrl = await uploadImage(file);
      if (uploadedUrl) imagesList.push(uploadedUrl);
    }
  }

  return imagesList;
}

function collectSpecs(formData: FormData): Record<string, string> {
  const specs: Record<string, string> = {};
  const specKeys = formData.getAll("specKey");
  const specValues = formData.getAll("specValue");

  specKeys.forEach((rawKey, index) => {
    const key = getStringValue(rawKey);
    const value = getStringValue(specValues[index] || null);

    if (key && value) {
      specs[key] = value;
    }
  });

  return specs;
}

export async function addProduct(formData: FormData) {
  await requireCrmPermission("manage_products");
  const imagesList = await collectImages(formData);
  const specs = collectSpecs(formData);

  const newProduct = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    price: (formData.get("price") as string) || "Цена по заявка",
    category: formData.get("category") as string,
    status: "published",
    images: imagesList,
    specs: specs,
    is_promo: formData.get("is_promo") === "on",
  };

  const { error } = await supabaseAdmin.from("products").insert([newProduct]);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/dashboard");
}

export async function editProduct(id: string, formData: FormData) {
  await requireCrmPermission("manage_products");
  const imagesList = await collectImages(formData);
  const specs = collectSpecs(formData);

  const updateData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    price: (formData.get("price") as string) || "Цена по заявка",
    category: formData.get("category") as string,
    specs: specs,
    is_promo: formData.get("is_promo") === "on",
    images: imagesList,
  };

  const { error } = await supabaseAdmin.from("products").update(updateData).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/dashboard");
}

export async function archiveInquiry(id: string) {
  await requireCrmPermission("manage_leads");
  const { error } = await supabaseAdmin.from("inquiries").update({ status: 'archived' }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/dashboard");
}

export async function updateInquiryStatus(id: string, status: string) {
  await requireCrmPermission("manage_leads");
  if (!ALLOWED_INQUIRY_STATUSES.includes(status as (typeof ALLOWED_INQUIRY_STATUSES)[number])) {
    throw new Error("Невалиден статус на запитването.");
  }

  const { error } = await supabaseAdmin.from("inquiries").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/dashboard");
}

export async function deleteInquiry(id: string) {
  await requireCrmPermission("delete_leads");
  const { error } = await supabaseAdmin.from("inquiries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/dashboard");
}

function getRequiredString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validateCrmUserPayload(formData: FormData, requirePassword: boolean) {
  const username = normalizeUsername(formData.get("username"));
  const displayName = getRequiredString(formData, "displayName");
  const role = getRequiredString(formData, "role");
  const status = getRequiredString(formData, "status") || "active";
  const password = getRequiredString(formData, "password");

  if (!/^[a-z0-9._@-]{3,80}$/.test(username)) {
    throw new Error("Потребителят трябва да е поне 3 символа и да съдържа само букви, цифри, точка, тире, долна черта или @.");
  }

  if (!isCrmRole(role)) {
    throw new Error(`Ролята трябва да е една от: ${CRM_ROLES.join(", ")}.`);
  }

  if (!isCrmUserStatus(status)) {
    throw new Error(`Статусът трябва да е един от: ${CRM_USER_STATUSES.join(", ")}.`);
  }

  if (requirePassword && password.length < 8) {
    throw new Error("Паролата трябва да е поне 8 символа.");
  }

  if (!requirePassword && password && password.length < 8) {
    throw new Error("Новата парола трябва да е поне 8 символа.");
  }

  return { username, displayName, role, status, password };
}

export async function createCrmUser(formData: FormData) {
  const currentUser = await requireCrmPermission("manage_users");
  const { username, displayName, role, status, password } = validateCrmUserPayload(formData, true);
  const usersState = currentUser.isLegacy ? await getCrmUsersCount() : null;

  if (currentUser.isLegacy && usersState?.setupReady && usersState.count > 0) {
    throw new Error("Временният вход вече е спрян. Влезте с реален owner потребител.");
  }

  const effectiveRole = currentUser.isLegacy ? "owner" : role;
  const effectiveStatus = currentUser.isLegacy ? "active" : status;

  const { error } = await supabaseAdmin.from("crm_users").insert({
    username,
    display_name: displayName || username,
    role: effectiveRole,
    status: effectiveStatus,
    password_hash: await hashPassword(password),
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Вече има служител с това потребителско име.");
    }

    throw new Error(error.message);
  }

  revalidatePath("/admin/dashboard");

  if (currentUser.isLegacy) {
    await clearCrmCookies();
    redirect("/admin");
  }
}

export async function updateCrmUser(id: string, formData: FormData) {
  const currentUser = await requireCrmPermission("manage_users");
  const { displayName, role, status, password } = validateCrmUserPayload(formData, false);

  if (currentUser.id === id && (role !== "owner" || status !== "active")) {
    throw new Error("Не можеш да махнеш собствените си owner права или да деактивираш себе си.");
  }

  const updateData: Record<string, string> = {
    display_name: displayName || "",
    role,
    status,
  };

  if (password) {
    updateData.password_hash = await hashPassword(password);
  }

  const { error } = await supabaseAdmin.from("crm_users").update(updateData).eq("id", id);
  if (error) throw new Error(error.message);

  if (status !== "active") {
    await supabaseAdmin.from("crm_sessions").delete().eq("user_id", id);
  }

  revalidatePath("/admin/dashboard");
}

export async function deleteCrmUser(id: string) {
  const currentUser = await requireCrmPermission("manage_users");

  if (currentUser.id === id) {
    throw new Error("Не можеш да изтриеш собствения си CRM достъп.");
  }

  const { error } = await supabaseAdmin.from("crm_users").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/dashboard");
}
