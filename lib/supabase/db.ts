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
    supplier_name: i.supplierName || null,
    min_quantity: Number(i.minQuantity) || 1,
    category: i.category || 'original',
    condition: i.condition || 'new',
    notes: i.notes || null,
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


// ============ Delete ============

export async function deleteInventoryItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteReceipt(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('receipts').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteExpense(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}


// ============ Inventory Movements (سجل الحركة) ============

export async function logInventoryMovement(data: {
  inventoryId: string;
  partName?: string;
  brand?: string;
  deviceModel?: string;
  type: 'in' | 'out' | 'adjust' | 'return';
  quantity: number;
  reason?: string;
  receiptId?: string;
  supplierInvoiceId?: string;
  notes?: string;
}) {
  const supabase = createClient();
  
  const row = {
    id: crypto.randomUUID(),
    inventory_id: data.inventoryId,
    part_name: data.partName || null,
    brand: data.brand || null,
    device_model: data.deviceModel || null,
    type: data.type,
    quantity: data.quantity,
    reason: data.reason || null,
    receipt_id: data.receiptId || null,
    supplier_invoice_id: data.supplierInvoiceId || null,
    notes: data.notes || null,
  };
  
  const { error } = await supabase.from('inventory_movements').insert(row);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchInventoryMovements(inventoryId?: string) {
  const supabase = createClient();
  
  let query = supabase
    .from('inventory_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (inventoryId) {
    query = query.eq('inventory_id', inventoryId);
  }
  
  const { data, error } = await query;
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function deleteInventoryMovement(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('inventory_movements').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// 🏢 Suppliers — إدارة الموردين
// ============================================================

export async function fetchSuppliers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function upsertSupplier(supplier: {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from('suppliers').upsert({
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone || null,
    notes: supplier.notes || null,
  }, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteSupplier(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// 📄 Supplier Invoices — فواتير الموردين
// ============================================================

export async function fetchSupplierInvoices(supplierId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('supplier_invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (supplierId) query = query.eq('supplier_id', supplierId);
  const { data, error } = await query;
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function upsertSupplierInvoice(invoice: {
  id: string;
  supplierId: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount: number;
  paidAmount?: number;
  parts?: string[];
  notes?: string;
  status?: 'pending' | 'partial' | 'paid';
  invoiceImage?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from('supplier_invoices').upsert({
    id: invoice.id,
    supplier_id: invoice.supplierId,
    invoice_number: invoice.invoiceNumber || null,
    invoice_date: invoice.invoiceDate || null,
    total_amount: invoice.totalAmount || 0,
    paid_amount: invoice.paidAmount || 0,
    parts: invoice.parts || [],
    notes: invoice.notes || null,
    status: invoice.status || 'pending',
    invoice_image: invoice.invoiceImage || null,
  }, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
export async function deleteSupplierInvoice(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('supplier_invoices').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// 💵 Supplier Payments — دفعات الموردين
// ============================================================

export async function fetchSupplierPayments(supplierId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('supplier_payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (supplierId) query = query.eq('supplier_id', supplierId);
  const { data, error } = await query;
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function upsertSupplierPayment(payment: {
  id: string;
  supplierId: string;
  invoiceId?: string;
  amount: number;
  paymentDate?: string;
  method?: 'cash' | 'bank' | 'wallet';
  notes?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from('supplier_payments').upsert({
    id: payment.id,
    supplier_id: payment.supplierId,
    invoice_id: payment.invoiceId || null,
    amount: payment.amount || 0,
    payment_date: payment.paymentDate || null,
    method: payment.method || 'cash',
    notes: payment.notes || null,
  }, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteSupplierPayment(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('supplier_payments').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// ↩️ Supplier Returns — مرتجعات الموردين
// ============================================================

export async function fetchSupplierReturns(supplierId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('supplier_returns')
    .select('*')
    .order('created_at', { ascending: false });
  if (supplierId) query = query.eq('supplier_id', supplierId);
  const { data, error } = await query;
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function upsertSupplierReturn(ret: {
  id: string;
  supplierId: string;
  invoiceId?: string;
  partName?: string;
  brand?: string;
  deviceModel?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  reason?: string;
  returnDate?: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from('supplier_returns').upsert({
    id: ret.id,
    supplier_id: ret.supplierId,
    invoice_id: ret.invoiceId || null,
    part_name: ret.partName || null,
    brand: ret.brand || null,
    device_model: ret.deviceModel || null,
    quantity: ret.quantity || 0,
    unit_price: ret.unitPrice || 0,
    total_amount: ret.totalAmount || 0,
    reason: ret.reason || null,
    return_date: ret.returnDate || null,
    notes: ret.notes || null,
  }, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteSupplierReturn(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('supplier_returns').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}


// ============================================================
// 👥 Staff Management — إدارة فريق العمل مع Auth
// ============================================================

export async function fetchStaff() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function createStaffMember(staff: {
  name: string;
  email: string;
  role: 'admin' | 'technician';
  pin?: string;
}) {
  const supabase = createClient();
  
  try {
    // 1) إنشاء حساب Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: staff.email,
     password: staff.pin || 'Boody@2024',
    });
    
    if (authError) {
      return { success: false, error: authError.message };
    }
    
    if (!authData.user) {
      return { success: false, error: 'فشل إنشاء الحساب' };
    }
    
    // 2) إضافة في جدول staff
    const staffId = crypto.randomUUID();
const { error: staffError } = await supabase.from('staff').insert({
  id: staffId,
  name: staff.name,
  phone: '',
  email: staff.email,
  role: staff.role,
  pin: staff.pin || '12345678',
  user_id: authData.user.id,
  is_active: true,
  created_at: new Date().toISOString(),
});
    
        if (staffError) {
      return { success: false, error: staffError.message };
    }
    
    // 3) ⚠️ signOut فورًا — عشان ما نسيطرش على جلسة الموظف
    await supabase.auth.signOut();
    
    return { 
      success: true, 
      data: { 
        id: staffId, 
        user_id: authData.user.id,
        email: staff.email,
        password: staff.pin || '12345678',
        needsReLogin: true,
      } 
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'حدث خطأ' };
  }
}

export async function updateStaffMember(staffId: string, data: {
  name?: string;
  email?: string;
  role?: 'admin' | 'technician';
  pin?: string;
  is_active?: boolean;
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from('staff')
    .update(data)
    .eq('id', staffId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteStaffMember(staffId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('staff').delete().eq('id', staffId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getCurrentUserRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, role: null };
  
  const { data, error } = await supabase
    .from('staff')
    .select('role, name')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (error || !data) return { success: false, role: null };
  return { success: true, role: data.role, name: data.name };
}