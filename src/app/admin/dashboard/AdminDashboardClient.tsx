"use client";

import { useMemo, useState } from "react";
import {
  addProduct,
  createCrmUser,
  deleteCrmUser,
  deleteInquiry,
  deleteProduct,
  editProduct,
  logout,
  toggleProductStatus,
  updateCrmUser,
  updateInquiryStatus,
  updateSiteSettings,
} from "../actions";
import type { SiteSettingsState } from "@/lib/site-settings";

type InquiryStatus = "new" | "called" | "offer_sent" | "waiting" | "won" | "lost" | "archived";

type AdminProduct = {
  id: string;
  name: string;
  price?: string | null;
  category?: string | null;
  status?: string | null;
  images?: string[] | null;
  is_promo?: boolean | null;
  specs?: Record<string, string> | null;
  description?: string | null;
};

type AdminInquiry = {
  id: string;
  client_name: string;
  client_phone: string;
  product_name: string;
  message?: string | null;
  status?: string | null;
  created_at: string;
};

type SpecDraft = {
  id: string;
  key: string;
  value: string;
};

type ProductCategory = "container" | "prefab" | "modular";
type ProductCategoryFilter = "all" | ProductCategory;
type ProductStatusFilter = "published" | "draft" | "all";
type ProductPromoFilter = "all" | "promo" | "regular";
type AdminTab = "products" | "inquiries" | "users" | "settings";
type CrmRole = "owner" | "manager" | "sales";
type CrmUserStatus = "active" | "inactive";
type CrmPermission =
  | "view_dashboard"
  | "manage_products"
  | "delete_products"
  | "manage_leads"
  | "delete_leads"
  | "manage_users";

type CurrentCrmUser = {
  id: string;
  username: string;
  displayName: string;
  role: CrmRole;
  status: CrmUserStatus;
  isLegacy?: boolean;
};

type CrmUserRow = {
  id: string;
  username: string;
  display_name: string | null;
  role: CrmRole;
  status: CrmUserStatus;
  created_at: string;
  last_login_at: string | null;
};

const DEFAULT_CATEGORY: ProductCategory = "container";

const SPEC_TEMPLATES: Record<ProductCategory, string[]> = {
  container: [
    "Марка",
    "Модел",
    "Състояние",
    "Площ, м2",
    "Произход",
    "Ширина, мм",
    "Дължина, мм",
    "Височина, мм",
    "Товароносимост, кг/м2",
    "Дебелина на панела, мм",
    "Размери на вратата, мм",
  ],
  prefab: [
    "Марка",
    "Модел",
    "Състояние",
    "Площ, м2",
    "Гаранция",
    "Произход",
    "Ширина, мм",
    "Дължина, мм",
    "Брой етажи",
  ],
  modular: [
    "Марка",
    "Модел",
    "Състояние",
    "Площ, м2",
    "Произход",
    "Ширина, мм",
    "Дължина, мм",
    "Височина, мм",
    "Товароносимост, кг/м2",
    "Дебелина на панела, мм",
    "Размери на вратата, мм",
  ],
};

const PIPELINE_STATUSES: Array<{ value: Exclude<InquiryStatus, "archived">; label: string }> = [
  { value: "new", label: "Ново" },
  { value: "called", label: "Обадено" },
  { value: "offer_sent", label: "Оферта" },
  { value: "waiting", label: "Чака отговор" },
  { value: "won", label: "Спечелено" },
  { value: "lost", label: "Загубено" },
];

const INQUIRY_STATUS_FILTERS: Array<{ value: "all" | InquiryStatus; label: string }> = [
  { value: "all", label: "Всички" },
  ...PIPELINE_STATUSES,
  { value: "archived", label: "Архивирани" },
];

const PRODUCT_CATEGORY_FILTERS: Array<{ value: ProductCategoryFilter; label: string }> = [
  { value: "all", label: "Всички категории" },
  { value: "container", label: "Контейнери" },
  { value: "prefab", label: "Сглобяеми къщи" },
  { value: "modular", label: "Модулни къщи" },
];

const PRODUCT_STATUS_FILTERS: Array<{ value: ProductStatusFilter; label: string }> = [
  { value: "published", label: "Активни" },
  { value: "draft", label: "Скрити" },
  { value: "all", label: "Всички" },
];

const PRODUCT_PROMO_FILTERS: Array<{ value: ProductPromoFilter; label: string }> = [
  { value: "all", label: "Всички" },
  { value: "promo", label: "Само промо" },
  { value: "regular", label: "Без промо" },
];

const CRM_ROLE_LABELS: Record<CrmRole, string> = {
  owner: "Собственик",
  manager: "Мениджър",
  sales: "Търговец",
};

const CRM_STATUS_LABELS: Record<CrmUserStatus, string> = {
  active: "Активен",
  inactive: "Спрян",
};

const CRM_AUTH_SETUP_SQL = `create extension if not exists pgcrypto;

create table if not exists crm_users (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  display_name text,
  role text not null default 'sales'
    check (role in ('owner', 'manager', 'sales')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  password_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login_at timestamp with time zone
);

create table if not exists crm_sessions (
  token_hash text primary key,
  user_id uuid not null references crm_users(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists crm_sessions_user_id_idx on crm_sessions(user_id);
create index if not exists crm_sessions_expires_at_idx on crm_sessions(expires_at);

alter table crm_users enable row level security;
alter table crm_sessions enable row level security;

notify pgrst, 'reload schema';`;

const SITE_SETTINGS_SETUP_SQL = `create table if not exists site_settings (
  id text primary key default 'main',
  contact_phone text not null default '0879630620',
  contact_email text not null default 'info@astralis.bg',
  contact_address text not null default 'София, България',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into site_settings (id, contact_phone, contact_email, contact_address)
values ('main', '0879630620', 'info@astralis.bg', 'София, България')
on conflict (id) do update set
  contact_phone = excluded.contact_phone,
  contact_email = excluded.contact_email,
  contact_address = excluded.contact_address,
  updated_at = timezone('utc'::text, now());

alter table site_settings enable row level security;

create policy "Public site settings are viewable by everyone."
  on site_settings for select
  using (true);

notify pgrst, 'reload schema';`;

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

function roleCan(role: CrmRole, permission: CrmPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

function getInquiryStatusLabel(status?: string | null): string {
  switch (status) {
    case "called":
      return "Обадено";
    case "offer_sent":
      return "Оферта изпратена";
    case "waiting":
      return "Чака отговор";
    case "won":
      return "Спечелено";
    case "lost":
      return "Загубено";
    case "archived":
      return "Архивирано";
    case "new":
    default:
      return "Ново";
  }
}

function getInquiryStatusClasses(status?: string | null): string {
  switch (status) {
    case "called":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "offer_sent":
      return "bg-violet-50 text-violet-700 border-violet-100";
    case "waiting":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "won":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "lost":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "archived":
      return "bg-slate-100 text-slate-500 border-slate-200";
    case "new":
    default:
      return "bg-orange-50 text-orange-700 border-orange-100";
  }
}

function getCategoryLabel(category?: string | null): string {
  switch (category) {
    case "prefab":
      return "Сглобяема";
    case "modular":
      return "Модулна";
    case "container":
    default:
      return "Контейнер";
  }
}

function normalizePhone(phone?: string | null): string {
  return (phone || "").replace(/\D/g, "");
}

function formatInquiryDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString("bg-BG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInquirySearchText(inquiry: AdminInquiry): string {
  return [
    inquiry.client_name,
    inquiry.client_phone,
    inquiry.product_name,
    inquiry.message || "",
    getInquiryStatusLabel(inquiry.status),
  ]
    .join(" ")
    .toLowerCase();
}

function getProductImages(product?: AdminProduct | null): string[] {
  return (product?.images || [])
    .map((image) => image?.trim())
    .filter((image): image is string => Boolean(image));
}

function isProductPublished(product: AdminProduct): boolean {
  return !product.status || product.status === "published";
}

function getProductStatusFilterValue(product: AdminProduct): Exclude<ProductStatusFilter, "all"> {
  return isProductPublished(product) ? "published" : "draft";
}

function getProductSearchText(product: AdminProduct): string {
  const specs = Object.entries(product.specs || {}).flatMap(([key, value]) => [key, value]);

  return [
    product.name,
    product.price || "",
    product.category || "",
    getCategoryLabel(product.category),
    product.is_promo ? "промо" : "",
    ...specs,
  ]
    .join(" ")
    .toLowerCase();
}

function createSpecDraft(key = "", value = ""): SpecDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    key,
    value,
  };
}

function getProductSpecDrafts(product?: AdminProduct | null): SpecDraft[] {
  const entries = Object.entries(product?.specs || {});

  if (entries.length === 0) {
    return getTemplateSpecDrafts((product?.category as ProductCategory) || DEFAULT_CATEGORY);
  }

  return entries.map(([key, value]) => {
    if (key === "Година" && String(value).trim().toLowerCase() === "нов") {
      return createSpecDraft("Състояние", "Нов");
    }

    return createSpecDraft(key, String(value));
  });
}

function getTemplateSpecDrafts(category: ProductCategory): SpecDraft[] {
  return SPEC_TEMPLATES[category].map((key) =>
    createSpecDraft(key, key === "Състояние" ? "Нов" : "")
  );
}

export default function AdminDashboardClient({
  initialProducts,
  inquiries = [],
  currentUser,
  crmUsers = [],
  authSetupReady = true,
  authSetupError,
  siteSettingsState,
}: {
  initialProducts: AdminProduct[];
  inquiries?: AdminInquiry[];
  currentUser: CurrentCrmUser;
  crmUsers?: CrmUserRow[];
  authSetupReady?: boolean;
  authSetupError?: string;
  siteSettingsState?: SiteSettingsState | null;
}) {
  const canManageProducts = roleCan(currentUser.role, "manage_products");
  const canDeleteProducts = roleCan(currentUser.role, "delete_products");
  const canManageLeads = roleCan(currentUser.role, "manage_leads");
  const canDeleteLeads = roleCan(currentUser.role, "delete_leads");
  const canManageUsers = roleCan(currentUser.role, "manage_users");
  const defaultTab: AdminTab = canManageProducts ? "products" : canManageLeads ? "inquiries" : "users";
  const isBootstrappingFirstOwner = currentUser.isLegacy && authSetupReady && crmUsers.length === 0;

  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [inquirySearch, setInquirySearch] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<"all" | InquiryStatus>("all");
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState<ProductCategoryFilter>("all");
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>("published");
  const [productPromoFilter, setProductPromoFilter] = useState<ProductPromoFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(DEFAULT_CATEGORY);
  const [imageDrafts, setImageDrafts] = useState<string[]>([]);
  const [specDrafts, setSpecDrafts] = useState<SpecDraft[]>(getTemplateSpecDrafts(DEFAULT_CATEGORY));

  const inquiryHistoryByPhone = useMemo(() => {
    const history = new Map<string, AdminInquiry[]>();
    const sorted = [...inquiries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    sorted.forEach((inquiry) => {
      const key = normalizePhone(inquiry.client_phone) || inquiry.id;
      const existing = history.get(key) || [];
      existing.push(inquiry);
      history.set(key, existing);
    });

    return history;
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    const query = inquirySearch.trim().toLowerCase();

    return [...inquiries]
      .filter((inquiry) => {
        const status = (inquiry.status || "new") as InquiryStatus;

        if (inquiryStatusFilter !== "all" && status !== inquiryStatusFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        return getInquirySearchText(inquiry).includes(query);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [inquiries, inquirySearch, inquiryStatusFilter]);

  const activeProducts = useMemo(
    () => initialProducts.filter((product) => isProductPublished(product)),
    [initialProducts]
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    return initialProducts.filter((product) => {
      if (productStatusFilter !== "all" && getProductStatusFilterValue(product) !== productStatusFilter) {
        return false;
      }

      if (productCategoryFilter !== "all" && product.category !== productCategoryFilter) {
        return false;
      }

      if (productPromoFilter === "promo" && !product.is_promo) {
        return false;
      }

      if (productPromoFilter === "regular" && product.is_promo) {
        return false;
      }

      if (!query) {
        return true;
      }

      return getProductSearchText(product).includes(query);
    });
  }, [
    initialProducts,
    productCategoryFilter,
    productPromoFilter,
    productSearch,
    productStatusFilter,
  ]);

  const hiddenProductsCount = initialProducts.length - activeProducts.length;
  const hasProductFilters =
    productSearch.trim() !== "" ||
    productCategoryFilter !== "all" ||
    productStatusFilter !== "published" ||
    productPromoFilter !== "all";

  const stats = {
    totalProducts: activeProducts.length,
    promoProducts: activeProducts.filter((product) => product.is_promo).length,
    newInquiries: inquiries.filter((inquiry) => (inquiry.status || "new") === "new").length,
    workingInquiries: inquiries.filter((inquiry) =>
      ["called", "offer_sent", "waiting"].includes(inquiry.status || "")
    ).length,
    wonInquiries: inquiries.filter((inquiry) => inquiry.status === "won").length,
  };

  async function handleDelete(id: string) {
    if (!confirm("Сигурни ли сте, че искате да изтриете този продукт завинаги?")) return;
    setLoadingId(id);
    try {
      await deleteProduct(id);
    } catch (err) {
      alert("Грешка при изтриване: " + err);
    }
    setLoadingId(null);
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    setLoadingId(id + "-status");
    try {
      await toggleProductStatus(id, currentStatus);
    } catch (err) {
      alert("Грешка при промяна на статуса: " + err);
    }
    setLoadingId(null);
  }

  async function handleDeleteInq(id: string) {
    if (!confirm("Изтриване на това запитване?")) return;
    setLoadingId(id + "-delete");
    try {
      await deleteInquiry(id);
    } catch (err) {
      alert("Грешка: " + err);
    }
    setLoadingId(null);
  }

  async function handleSetInquiryStatus(id: string, status: InquiryStatus) {
    setLoadingId(id + "-status-" + status);
    try {
      await updateInquiryStatus(id, status);
    } catch (err) {
      alert("Грешка при промяна на статуса: " + err);
    }
    setLoadingId(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      if (editingProduct) {
        await editProduct(editingProduct.id, formData);
        setEditingProduct(null);
      } else {
        await addProduct(formData);
        setShowAddForm(false);
      }
      setImageDrafts([]);
      setSelectedCategory(DEFAULT_CATEGORY);
      setSpecDrafts(getTemplateSpecDrafts(DEFAULT_CATEGORY));
    } catch (err) {
      alert("Възникна грешка: " + err);
    }
    setSaving(false);
  }

  async function handleCreateCrmUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUserSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await createCrmUser(formData);
      form.reset();
    } catch (err) {
      alert("Грешка при създаване на служител: " + err);
    }
    setUserSaving(false);
  }

  async function handleUpdateCrmUser(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoadingId(id + "-user");
    try {
      await updateCrmUser(id, new FormData(e.currentTarget));
    } catch (err) {
      alert("Грешка при обновяване на служител: " + err);
    }
    setLoadingId(null);
  }

  async function handleDeleteCrmUser(id: string) {
    if (!confirm("Да изтрием ли този CRM служител? Ако просто искаш да спреш достъпа, избери статус 'Спрян'.")) {
      return;
    }

    setLoadingId(id + "-user-delete");
    try {
      await deleteCrmUser(id);
    } catch (err) {
      alert("Грешка при изтриване на служител: " + err);
    }
    setLoadingId(null);
  }

  async function handleUpdateSiteSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await updateSiteSettings(new FormData(e.currentTarget));
    } catch (err) {
      alert("Грешка при запазване на контактите: " + err);
    }
    setSettingsSaving(false);
  }

  function openAddProduct() {
    if (!canManageProducts) return;
    setShowAddForm(true);
    setEditingProduct(null);
    setSelectedCategory(DEFAULT_CATEGORY);
    setImageDrafts([]);
    setSpecDrafts(getTemplateSpecDrafts(DEFAULT_CATEGORY));
  }

  function openEdit(product: AdminProduct) {
    setEditingProduct(product);
    setShowAddForm(false);
    setSelectedCategory((product.category as ProductCategory) || DEFAULT_CATEGORY);
    setImageDrafts(getProductImages(product));
    setSpecDrafts(getProductSpecDrafts(product));
  }

  function cancelForm() {
    setShowAddForm(false);
    setEditingProduct(null);
    setSelectedCategory(DEFAULT_CATEGORY);
    setImageDrafts([]);
    setSpecDrafts(getTemplateSpecDrafts(DEFAULT_CATEGORY));
  }

  function setPrimaryImage(index: number) {
    setImageDrafts((images) => [images[index], ...images.filter((_, imageIndex) => imageIndex !== index)]);
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImageDrafts((images) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= images.length) return images;

      const updated = [...images];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  }

  function removeImage(index: number) {
    setImageDrafts((images) => images.filter((_, imageIndex) => imageIndex !== index));
  }

  function updateSpecDraft(id: string, field: "key" | "value", value: string) {
    setSpecDrafts((specs) =>
      specs.map((spec) => (spec.id === id ? { ...spec, [field]: value } : spec))
    );
  }

  function addSpecDraft() {
    setSpecDrafts((specs) => [...specs, createSpecDraft()]);
  }

  function removeSpecDraft(id: string) {
    setSpecDrafts((specs) => {
      const nextSpecs = specs.filter((spec) => spec.id !== id);
      return nextSpecs.length > 0 ? nextSpecs : [createSpecDraft()];
    });
  }

  function handleCategoryChange(category: ProductCategory) {
    setSelectedCategory(category);

    if (!editingProduct) {
      setSpecDrafts(getTemplateSpecDrafts(category));
    }
  }

  function resetProductFilters() {
    setProductSearch("");
    setProductCategoryFilter("all");
    setProductStatusFilter("published");
    setProductPromoFilter("all");
  }

  const isFormOpen = showAddForm || !!editingProduct;

  return (
    <div className="min-h-screen bg-[#F8F8F6] p-4 md:p-8 font-['Inter'] text-[#1C1C1A]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black font-['Montserrat'] tracking-tight">ASTRALIS CRM</h1>
            <p className="text-slate-500 font-medium">
              Контролен панел за управление на каталога и входящите лийдове
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>{currentUser.displayName}</span>
              <span className="text-slate-300">/</span>
              <span className="text-[#B8975A]">{CRM_ROLE_LABELS[currentUser.role]}</span>
              {currentUser.isLegacy && (
                <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 border border-amber-100">
                  Временен вход
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {canManageProducts && (
              <button
                onClick={openAddProduct}
                className="bg-[#1C1C1A] hover:bg-[#B8975A] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-black/10 text-sm uppercase tracking-wider"
              >
                + Добави продукт
              </button>
            )}
            <button
              onClick={() => logout()}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-wider"
            >
              Изход
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Общо продукти", val: stats.totalProducts, color: "text-slate-800" },
            { label: "В промоция", val: stats.promoProducts, color: "text-orange-600" },
            { label: "Нови лийдове", val: stats.newInquiries, color: "text-[#B8975A]" },
            { label: "В работа", val: stats.workingInquiries, color: "text-blue-600" },
            { label: "Спечелени", val: stats.wonInquiries, color: "text-emerald-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                {stat.label}
              </div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.val}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-6 bg-slate-200/50 p-1 rounded-xl w-fit">
          {canManageProducts && (
            <button
              onClick={() => setActiveTab("products")}
              className={`py-2.5 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                activeTab === "products"
                  ? "bg-white text-[#1C1C1A] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              📦 Каталог
            </button>
          )}
          {canManageLeads && (
            <button
              onClick={() => setActiveTab("inquiries")}
              className={`py-2.5 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === "inquiries"
                  ? "bg-white text-[#1C1C1A] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ✉️ Лийдове
              {stats.newInquiries > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {stats.newInquiries}
                </span>
              )}
            </button>
          )}
          {canManageUsers && (
            <button
              onClick={() => setActiveTab("users")}
              className={`py-2.5 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                activeTab === "users"
                  ? "bg-white text-[#1C1C1A] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              👤 Служители
            </button>
          )}
          {canManageUsers && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-2.5 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                activeTab === "settings"
                  ? "bg-white text-[#1C1C1A] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ⚙️ Настройки
            </button>
          )}
        </div>

        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-sm">
              <div className="flex flex-col xl:flex-row gap-4 xl:items-end xl:justify-between">
                <div className="flex-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em] mb-2">
                    Търсене в каталога
                  </div>
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Име, модел, цена, параметър..."
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-medium text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 xl:w-[620px]">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em] mb-2">
                      Категория
                    </div>
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value as ProductCategoryFilter)}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    >
                      {PRODUCT_CATEGORY_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em] mb-2">
                      Статус
                    </div>
                    <select
                      value={productStatusFilter}
                      onChange={(e) => setProductStatusFilter(e.target.value as ProductStatusFilter)}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    >
                      {PRODUCT_STATUS_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em] mb-2">
                      Промоция
                    </div>
                    <select
                      value={productPromoFilter}
                      onChange={(e) => setProductPromoFilter(e.target.value as ProductPromoFilter)}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    >
                      {PRODUCT_PROMO_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-xs font-bold text-slate-400">
                  Показани <span className="text-slate-800">{filteredProducts.length}</span> от{" "}
                  <span className="text-slate-800">{initialProducts.length}</span> записи
                  {hiddenProductsCount > 0 && (
                    <span className="ml-2 text-slate-400">({hiddenProductsCount} скрити)</span>
                  )}
                </div>
                {hasProductFilters && (
                  <button
                    onClick={resetProductFilters}
                    className="w-fit px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all"
                  >
                    Изчисти филтрите
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black">
                    <th className="p-5 pl-8">Снимка</th>
                    <th className="p-5">Име / модел</th>
                    <th className="p-5">Категория</th>
                    <th className="p-5 text-center">Статус</th>
                    <th className="p-5 pr-8 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="p-5 pl-8">
                          <div className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} className="w-full h-full object-cover" alt={product.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-300 font-bold uppercase">
                                No image
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{product.name}</span>
                            {product.is_promo && (
                              <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                Промо
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {product.price || "Цена по заявка"}
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {getCategoryLabel(product.category)}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <button
                            onClick={() => handleToggleStatus(product.id, product.status || "published")}
                            className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border transition-all ${
                              isProductPublished(product)
                                ? "bg-green-50 text-green-600 border-green-100"
                                : "bg-slate-100 text-slate-400 border-slate-200"
                            }`}
                          >
                            {loadingId === product.id + "-status"
                              ? "..."
                              : isProductPublished(product)
                                ? "Активен"
                                : "Скрит"}
                          </button>
                        </td>
                        <td className="p-5 pr-8 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEdit(product)}
                            className="text-slate-400 hover:text-[#B8975A] p-2 transition-colors"
                          >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {canDeleteProducts && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                            >
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center">
                        <div className="text-sm font-black text-slate-400 uppercase tracking-widest">
                          Няма продукти по този филтър
                        </div>
                        <button
                          onClick={resetProductFilters}
                          className="mt-4 px-4 py-2 rounded-xl bg-[#1C1C1A] text-white text-[10px] font-black uppercase tracking-widest"
                        >
                          Покажи активните
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "inquiries" && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em] mb-2">
                    Търсене в лийдовете
                  </div>
                  <input
                    value={inquirySearch}
                    onChange={(e) => setInquirySearch(e.target.value)}
                    placeholder="Име, телефон, продукт, съобщение..."
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-medium text-sm"
                  />
                </div>
                <div className="lg:w-72">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em] mb-2">
                    Филтър по статус
                  </div>
                  <select
                    value={inquiryStatusFilter}
                    onChange={(e) => setInquiryStatusFilter(e.target.value as "all" | InquiryStatus)}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                  >
                    {INQUIRY_STATUS_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {INQUIRY_STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setInquiryStatusFilter(filter.value)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                      inquiryStatusFilter === filter.value
                        ? "bg-[#1C1C1A] text-white border-[#1C1C1A]"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredInquiries.length > 0 ? (
              filteredInquiries.map((inquiry) => {
                const history = inquiryHistoryByPhone.get(normalizePhone(inquiry.client_phone) || inquiry.id) || [];
                const previousInquiries = history.filter((item) => item.id !== inquiry.id).slice(0, 3);
                const isRepeatCustomer = history.length > 1;
                const status = (inquiry.status || "new") as InquiryStatus;

                return (
                  <div
                    key={inquiry.id}
                    className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col gap-5 transition-all hover:border-[#B8975A]/30"
                  >
                    <div className="flex flex-col xl:flex-row gap-5 xl:items-start xl:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase">
                            {inquiry.client_name?.[0] || "?"}
                          </div>
                          <div>
                            <div className="font-black text-slate-800 text-sm">{inquiry.client_name}</div>
                            <div className="text-[11px] text-slate-400 font-bold">
                              {formatInquiryDate(inquiry.created_at)}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${getInquiryStatusClasses(
                              status
                            )}`}
                          >
                            {getInquiryStatusLabel(status)}
                          </span>
                          {isRepeatCustomer && (
                            <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border bg-slate-100 text-slate-600 border-slate-200">
                              {history.length} запитвания от този клиент
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-50/80 rounded-xl p-4 mb-3">
                          <div className="text-[10px] font-black text-[#B8975A] uppercase tracking-widest mb-2">
                            Продукт: {inquiry.product_name}
                          </div>
                          <div className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                            {inquiry.message || "Няма допълнително съобщение."}
                          </div>
                        </div>

                        {previousInquiries.length > 0 && (
                          <div className="rounded-xl border border-slate-100 bg-white p-4">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-3">
                              История на клиента
                            </div>
                            <div className="space-y-2">
                              {previousInquiries.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                                >
                                  <div className="text-sm font-bold text-slate-700">{item.product_name}</div>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
                                    <span>{formatInquiryDate(item.created_at)}</span>
                                    <span
                                      className={`px-2 py-1 rounded-full border ${getInquiryStatusClasses(item.status)}`}
                                    >
                                      {getInquiryStatusLabel(item.status)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="xl:w-[290px] flex flex-col gap-3">
                        <a
                          href={`tel:${inquiry.client_phone}`}
                          className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-green-100 transition-all border border-green-100"
                        >
                          📞 {inquiry.client_phone}
                        </a>

                        <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-3">
                            Lead pipeline
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {PIPELINE_STATUSES.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handleSetInquiryStatus(inquiry.id, option.value)}
                                disabled={loadingId === inquiry.id + "-status-" + option.value}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                  status === option.value
                                    ? "bg-[#1C1C1A] text-white border-[#1C1C1A]"
                                    : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300"
                                } disabled:opacity-60`}
                              >
                                {loadingId === inquiry.id + "-status-" + option.value ? "..." : option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSetInquiryStatus(inquiry.id, "archived")}
                            disabled={loadingId === inquiry.id + "-status-archived"}
                            className="flex-1 bg-[#1C1C1A] text-white py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-600 shadow-md shadow-black/5 disabled:opacity-60"
                          >
                            {loadingId === inquiry.id + "-status-archived" ? "..." : "Архивирай"}
                          </button>
                          {canDeleteLeads && (
                            <button
                              onClick={() => handleDeleteInq(inquiry.id)}
                              disabled={loadingId === inquiry.id + "-delete"}
                              className="flex-1 bg-white border border-slate-100 text-slate-400 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:text-red-500 hover:border-red-100 shadow-sm disabled:opacity-60"
                            >
                              {loadingId === inquiry.id + "-delete" ? "..." : "Изтрий"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="text-4xl mb-4">📭</div>
                <div className="font-bold text-slate-400 uppercase tracking-widest text-sm">
                  Няма лийдове по този филтър
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && canManageUsers && (
          <div className="space-y-5">
            {!authSetupReady ? (
              <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm">
                <div className="text-[10px] font-black text-amber-600 uppercase tracking-[0.22em] mb-2">
                  CRM Auth не е активиран
                </div>
                <h2 className="text-xl font-black font-['Montserrat'] text-slate-900 mb-2">
                  Липсват таблиците за служители и сесии
                </h2>
                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                  {authSetupError || "Първо трябва да се създадат CRM таблиците в Supabase."}
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-black text-slate-500">
                    SQL файл: scripts/sql/crm_auth.sql
                  </div>
                  <textarea
                    readOnly
                    value={CRM_AUTH_SETUP_SQL}
                    className="min-h-72 w-full rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-100 outline-none"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(CRM_AUTH_SETUP_SQL)}
                    className="w-fit rounded-xl bg-[#1C1C1A] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    Копирай SQL
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-5">
                    <div>
                      <div className="text-[10px] font-black text-[#B8975A] uppercase tracking-[0.22em] mb-2">
                        Нов служител
                      </div>
                      <h2 className="text-xl font-black font-['Montserrat'] text-slate-900">
                        {isBootstrappingFirstOwner ? "Създай първия реален собственик" : "Създай CRM достъп"}
                      </h2>
                      {isBootstrappingFirstOwner && (
                        <p className="mt-2 max-w-xl text-sm font-bold text-slate-500 leading-relaxed">
                          Това ще замени временния вход. След като го създадеш, влизаш вече с потребителско име и парола.
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        Собственик: всичко
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        Мениджър: каталог и лийдове
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        Търговец: само лийдове
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleCreateCrmUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                      name="username"
                      required
                      placeholder="Потребител"
                      className="px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    />
                    <input
                      name="displayName"
                      placeholder="Име"
                      className="px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    />
                    {isBootstrappingFirstOwner ? (
                      <>
                        <input type="hidden" name="role" value="owner" />
                        <div className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-sm text-slate-700">
                          Роля: Собственик
                        </div>
                      </>
                    ) : (
                      <select
                        name="role"
                        defaultValue="sales"
                        className="px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                      >
                        {Object.entries(CRM_ROLE_LABELS).map(([role, label]) => (
                          <option key={role} value={role}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Парола"
                      className="px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    />
                    <input type="hidden" name="status" value="active" />
                    <button
                      type="submit"
                      disabled={userSaving}
                      className="bg-[#1C1C1A] text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                    >
                      {userSaving ? "..." : "Създай"}
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black">
                        <th className="p-5 pl-8">Служител</th>
                        <th className="p-5">Роля</th>
                        <th className="p-5">Статус</th>
                        <th className="p-5">Последен вход</th>
                        <th className="p-5 pr-8 text-right">Запази</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {crmUsers.length > 0 ? (
                        crmUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors align-top">
                            <td className="p-5 pl-8">
                              <div className="font-black text-slate-800">{user.display_name || user.username}</div>
                              <div className="text-[11px] text-slate-400 font-bold">{user.username}</div>
                            </td>
                            <td colSpan={4} className="p-5 pr-8">
                              <form
                                onSubmit={(e) => handleUpdateCrmUser(user.id, e)}
                                className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-3"
                              >
                                <input type="hidden" name="username" value={user.username} />
                                <input
                                  name="displayName"
                                  defaultValue={user.display_name || ""}
                                  placeholder="Име"
                                  className="px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                                />
                                <select
                                  name="role"
                                  defaultValue={user.role}
                                  className="px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                                >
                                  {Object.entries(CRM_ROLE_LABELS).map(([role, label]) => (
                                    <option key={role} value={role}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  name="status"
                                  defaultValue={user.status}
                                  className="px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                                >
                                  {Object.entries(CRM_STATUS_LABELS).map(([status, label]) => (
                                    <option key={status} value={status}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  name="password"
                                  type="password"
                                  minLength={8}
                                  placeholder="Нова парола"
                                  className="px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                                />
                                <button
                                  type="submit"
                                  disabled={loadingId === user.id + "-user"}
                                  className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#B8975A] hover:text-[#B8975A] disabled:opacity-60"
                                >
                                  {loadingId === user.id + "-user" ? "..." : "Запази"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCrmUser(user.id)}
                                  disabled={currentUser.id === user.id || loadingId === user.id + "-user-delete"}
                                  className="bg-white border border-red-100 text-red-500 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={
                                    currentUser.id === user.id
                                      ? "Не можеш да изтриеш собствения си достъп"
                                      : "Изтрий служител"
                                  }
                                >
                                  {loadingId === user.id + "-user-delete" ? "..." : "Изтрий"}
                                </button>
                              </form>
                              <div className="mt-2 text-[11px] font-bold text-slate-400">
                                Последен вход:{" "}
                                {user.last_login_at
                                  ? new Date(user.last_login_at).toLocaleString("bg-BG")
                                  : "няма"}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-8 py-16 text-center">
                            <div className="text-sm font-black text-slate-400 uppercase tracking-widest">
                              Няма създадени CRM служители
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "settings" && canManageUsers && (
          <div className="space-y-5">
            {!siteSettingsState?.setupReady ? (
              <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm">
                <div className="text-[10px] font-black text-amber-600 uppercase tracking-[0.22em] mb-2">
                  Site settings не са активирани
                </div>
                <h2 className="text-xl font-black font-['Montserrat'] text-slate-900 mb-2">
                  Липсва таблицата за контактните данни
                </h2>
                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                  {siteSettingsState?.error || "Първо трябва да се създаде таблицата site_settings в Supabase."}
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-black text-slate-500">
                    SQL файл: scripts/sql/site_settings.sql
                  </div>
                  <textarea
                    readOnly
                    value={SITE_SETTINGS_SETUP_SQL}
                    className="min-h-72 w-full rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-100 outline-none"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(SITE_SETTINGS_SETUP_SQL)}
                    className="w-fit rounded-xl bg-[#1C1C1A] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    Копирай SQL
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="text-[10px] font-black text-[#B8975A] uppercase tracking-[0.22em] mb-2">
                  Контактни данни
                </div>
                <h2 className="text-xl font-black font-['Montserrat'] text-slate-900 mb-2">
                  Редакция на публичните контакти
                </h2>
                <p className="max-w-2xl text-sm font-bold text-slate-500 leading-relaxed mb-6">
                  Тези данни се показват в секцията “Свържете се с нас” на сайта.
                </p>

                <form onSubmit={handleUpdateSiteSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      Телефон *
                    </label>
                    <input
                      name="contact_phone"
                      required
                      defaultValue={siteSettingsState.settings.contact_phone}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      Имейл *
                    </label>
                    <input
                      name="contact_email"
                      required
                      type="email"
                      defaultValue={siteSettingsState.settings.contact_email}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      Адрес *
                    </label>
                    <input
                      name="contact_address"
                      required
                      defaultValue={siteSettingsState.settings.contact_address}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="bg-[#1C1C1A] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                    >
                      {settingsSaving ? "Запазване..." : "Запази контактите"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in custom-scrollbar">
              <h2 className="text-2xl font-black font-['Montserrat'] mb-6 border-b pb-4">
                {editingProduct ? "Редакция" : "Нов продукт"}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Модел *
                  </label>
                  <input
                    name="name"
                    defaultValue={editingProduct?.name}
                    required
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Категория *
                  </label>
                  <select
                    name="category"
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                  >
                    <option value="container">Контейнер</option>
                    <option value="prefab">Сглобяема къща</option>
                    <option value="modular">Модулна къща</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Цена
                  </label>
                  <input
                    name="price"
                    defaultValue={editingProduct?.price || ""}
                    placeholder="напр. 4500 лв. или По заявка"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Основна снимка
                  </label>
                  <div className="h-[46px] px-4 bg-slate-50 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-500">
                    {imageDrafts[0] ? (
                      <>
                        <img src={imageDrafts[0]} alt="Основна снимка" className="w-10 h-8 rounded-md object-cover border border-slate-200" />
                        <span>{imageDrafts.length} снимки</span>
                      </>
                    ) : (
                      <span>Няма избрана снимка</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#B8975A]">
                        Снимки на продукта
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        Първата снимка е основната снимка в сайта.
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white border border-slate-100 rounded-full px-3 py-1">
                      {imageDrafts.length} общо
                    </span>
                  </div>

                  {imageDrafts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {imageDrafts.map((image, index) => (
                        <div key={`${image}-${index}`} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                          <div className="relative aspect-[4/3] bg-white">
                            <img src={image} alt={`Снимка ${index + 1}`} className="w-full h-full object-contain p-2" />
                            {index === 0 && (
                              <span className="absolute top-2 left-2 rounded-full bg-[#1C1C1A] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1">
                                Основна
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-1 p-2 border-t border-slate-50">
                            <button
                              type="button"
                              onClick={() => moveImage(index, -1)}
                              disabled={index === 0}
                              className="rounded-lg bg-slate-50 px-2 py-2 text-[10px] font-black text-slate-500 disabled:opacity-30 hover:bg-slate-100"
                              title="Премести наляво"
                            >
                              Назад
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrimaryImage(index)}
                              disabled={index === 0}
                              className="rounded-lg bg-slate-50 px-2 py-2 text-[10px] font-black text-slate-500 disabled:opacity-30 hover:bg-slate-100"
                              title="Направи основна"
                            >
                              Главна
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="rounded-lg bg-red-50 px-2 py-2 text-[10px] font-black text-red-500 hover:bg-red-100"
                              title="Премахни снимка"
                            >
                              Махни
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-1 px-2 pb-2">
                            <button
                              type="button"
                              onClick={() => moveImage(index, 1)}
                              disabled={index === imageDrafts.length - 1}
                              className="rounded-lg bg-slate-50 px-2 py-2 text-[10px] font-black text-slate-500 disabled:opacity-30 hover:bg-slate-100"
                              title="Премести надясно"
                            >
                              Напред
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs font-bold text-slate-400 mb-5">
                      Все още няма снимки към този продукт.
                    </div>
                  )}

                  {imageDrafts.map((image, index) => (
                    <input key={`${image}-hidden-${index}`} type="hidden" name="existingImage" value={image} />
                  ))}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                        Качи нови снимки
                      </label>
                      <input
                        type="file"
                        name="imageFile"
                        multiple
                        accept="image/*"
                        className="w-full rounded-xl bg-white border border-slate-100 px-4 py-3 text-[10px] font-black uppercase text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                        Добави снимка чрез URL
                      </label>
                      <input
                        name="imageUrl"
                        type="url"
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-medium text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#B8975A]">
                          Технически параметри
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          Зареждат се основни параметри според категорията. Можеш да добавяш и махаш редове.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addSpecDraft}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#B8975A] hover:text-[#B8975A] transition-all"
                      >
                        + Параметър
                      </button>
                    </div>

                    <div className="space-y-2">
                      {specDrafts.map((spec, index) => (
                        <div key={spec.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 bg-white border border-slate-100 rounded-xl p-2">
                          <input
                            name="specKey"
                            value={spec.key}
                            onChange={(e) => updateSpecDraft(spec.id, "key", e.target.value)}
                            placeholder="Име на параметър"
                            className="w-full px-3 py-2 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-[#B8975A] text-xs font-bold"
                          />
                          <input
                            name="specValue"
                            value={spec.value}
                            onChange={(e) => updateSpecDraft(spec.id, "value", e.target.value)}
                            placeholder="Стойност"
                            className="w-full px-3 py-2 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-[#B8975A] text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => removeSpecDraft(spec.id)}
                            className="px-3 py-2 rounded-lg bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-100"
                            title={`Премахни параметър ${index + 1}`}
                          >
                            Махни
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Детайлно описание
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingProduct?.description || ""}
                    rows={8}
                    placeholder="Въведете пълното описание, предимства и приложение..."
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-[#B8975A] font-medium text-sm leading-relaxed"
                  ></textarea>
                </div>

                <div className="md:col-span-2 flex items-center gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                  <input
                    type="checkbox"
                    name="is_promo"
                    id="is_promo"
                    defaultChecked={Boolean(editingProduct?.is_promo)}
                    className="w-6 h-6 accent-[#B8975A]"
                  />
                  <label htmlFor="is_promo" className="text-sm font-black text-orange-800 uppercase tracking-wider">
                    Маркирай като промоция
                  </label>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-8 py-3 rounded-xl font-bold text-slate-400 uppercase text-xs tracking-widest hover:bg-slate-100"
                  >
                    Отказ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#1C1C1A] text-white px-10 py-3 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-black/20 disabled:opacity-50"
                  >
                    {saving ? "Запазване..." : "Запази продукт"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
