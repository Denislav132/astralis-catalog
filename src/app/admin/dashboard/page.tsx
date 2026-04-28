import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AdminDashboardClient from "./AdminDashboardClient";
import { fetchCrmUsers, getCrmSession, hasCrmPermission } from "@/lib/crm-auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getCrmSession();

  if (!session) {
    redirect("/admin");
  }

  const currentUser = session.user;

  // Fetch all products for CRM management. The client defaults to active products only.
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (productsError) console.error("Error fetching products in admin:", productsError);

  // Fetch inquiries (ignoring errors if the table doesn't exist yet)
  const { data: inquiries } = await supabaseAdmin
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  const usersState = hasCrmPermission(currentUser, "manage_users")
    ? await fetchCrmUsers()
    : { setupReady: true, users: [] };

  return (
    <AdminDashboardClient
      initialProducts={products || []}
      inquiries={inquiries || []}
      currentUser={currentUser}
      crmUsers={usersState.users}
      authSetupReady={usersState.setupReady}
      authSetupError={usersState.error}
    />
  );
}
