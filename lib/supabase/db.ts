import { createClient } from './client';

// ============ Receipts ============
export async function upsertReceipts(receipts: any[]) {
  const supabase = createClient();
  if (receipts.length === 0) return { success: true };
  
  const rows = receipts.map(r => ({
    id: r.id,
    receipt_number: r.receiptNumber,
    customer_name: r.customerName,
    customer_phone: r.customerPhone,
    device_type: r.deviceType || null,
    device_model: r.deviceModel || null,
    device_color: r.deviceColor || null,
    imei: r.imei || null,
    accessories: r.accessories || [],
    issues: r.issues || [],
    status: r.status || 'pending',
    price: Number(r.price) || 0,
    part_cost: Number(r.partCost) || 0,
    deposit: Number(r.deposit) || 0,
    notes: r.notes || null,
    internal_notes: r.internalNotes || null,
    received_at: r.receivedAt || null,
    expected_delivery: r.expectedDelivery || null,
    delivered_at: r.deliveredAt || null,
    is_archived: r.isArchived || false,
    archive_reason: r.archiveReason || null,
    image: r.image || null,
  }));

  const { error } = await supabase.from('receipts').upsert(rows, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchReceipts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

// ============ Inventory ============
export async function upsertInventory(items: any[]) {
  const supabase = createClient();
  if (items.length === 0) return { success: true };
  
  const rows = items.map(i => ({
    id: i.id,
    brand: i.brand,
    device_model: i.deviceModel || null,
    part_name: i.partName,
    quantity: Number(i.quantity) || 0,
    cost_price: Number(i.costPrice) || 0,
  }));

  const { error } = await supabase.from('inventory').upsert(rows, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchInventory() {
  const supabase = createClient();
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

// ============ Expenses ============
export async function upsertExpenses(expenses: any[]) {
  const supabase = createClient();
  if (expenses.length === 0) return { success: true };
  
  const rows = expenses.map(e => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount) || 0,
    type: e.type,
    date: e.date || null,
    iso_date: e.isoDate || null,
  }));

  const { error } = await supabase.from('expenses').upsert(rows, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchExpenses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

// ============ مزامنة كاملة (كل البيانات) ============
export async function syncAllToSupabase(data: {
  receipts: any[];
  inventory: any[];
  expenses: any[];
}) {
  const results = {
    receipts: await upsertReceipts(data.receipts),
    inventory: await upsertInventory(data.inventory),
    expenses: await upsertExpenses(data.expenses),
  };

  const errors = Object.entries(results)
    .filter(([_, r]) => !r.success)
    .map(([k, r]) => `${k}: ${(r as any).error}`);

  if (errors.length > 0) {
    return { success: false, error: errors.join(' | ') };
  }
  return { success: true };
}