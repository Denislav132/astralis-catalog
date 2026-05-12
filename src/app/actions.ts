"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendLeadNotification } from "@/lib/lead-email";

export async function submitInquiry(formData: FormData, productId: string | undefined, productName: string) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const rawMessage = formData.get("message") as string;
  
  const assembled = formData.get("assembled") as string;
  const el = formData.get("el") as string;
  const vik = formData.get("vik") as string;
  const transport = formData.get("transport") as string;
  const crane = formData.get("crane") as string;
  const budget = formData.get("budget") as string;
  const configurationType = formData.get("configuration_type") as string;
  const configurationSize = formData.get("configuration_size") as string;
  const configurationColor = formData.get("configuration_color") as string;
  const configurationExtras = formData.getAll("configuration_extras").map(String).filter(Boolean);
  const configurationUse = formData.get("configuration_use") as string;

  if (!name || !phone) {
    throw new Error("Моля, попълнете име и телефон.");
  }

  let finalMessage = "";
  if (configurationType || configurationSize || configurationColor || configurationExtras.length || configurationUse) {
    finalMessage += "Конфигурация от сайта:\n";
    if (configurationType) finalMessage += `• Тип: ${configurationType}\n`;
    if (configurationSize) finalMessage += `• Размер: ${configurationSize}\n`;
    if (configurationColor) finalMessage += `• Цвят: ${configurationColor}\n`;
    if (configurationExtras.length) finalMessage += `• Екстри: ${configurationExtras.join(", ")}\n`;
    if (configurationUse) finalMessage += `• Предназначение: ${configurationUse}\n`;
    finalMessage += "\n";
  }

  if (assembled) finalMessage += `• Доставка: ${assembled}\n`;
  if (el) finalMessage += `• Ел. инсталация: ${el}\n`;
  if (vik) finalMessage += `• ВиК: ${vik}\n`;
  if (transport) finalMessage += `• Транспорт: ${transport}\n`;
  if (crane) finalMessage += `• Достъп за кран: ${crane}\n`;
  if (budget) finalMessage += `• Бюджет: ${budget}\n`;
  
  if (rawMessage) {
    finalMessage += `\nСъобщение от клиента:\n${rawMessage}`;
  }

  const createdAt = new Date().toISOString();

  const { error } = await supabaseAdmin.from("inquiries").insert([{
    product_id: productId || null,
    product_name: productName,
    client_name: name,
    client_phone: phone,
    message: finalMessage.trim() || null,
    status: 'new',
    created_at: createdAt,
  }]);

  if (error) {
    console.error("Inquiry error:", error);
    throw new Error("Възникна грешка при изпращането. Моля, опитайте по-късно.");
  }

  try {
    await sendLeadNotification({
      clientName: name,
      clientPhone: phone,
      productName,
      message: finalMessage.trim() || null,
      createdAt,
    });
  } catch (notificationError) {
    console.error("Lead email notification error:", notificationError);
  }

  return { success: true };
}
