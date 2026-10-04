"use client";
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { 
  fetchReceipts, fetchInventory, fetchExpenses, 
  upsertReceipts, upsertInventory, upsertExpenses, 
  deleteInventoryItem, deleteReceipt, deleteExpense, 
  logInventoryMovement, fetchInventoryMovements,
  fetchSuppliers, upsertSupplier, deleteSupplier,
  fetchSupplierInvoices, upsertSupplierInvoice, deleteSupplierInvoice,
  fetchSupplierPayments, upsertSupplierPayment, deleteSupplierPayment,
  fetchSupplierReturns, upsertSupplierReturn, deleteSupplierReturn,
createStaffMember, fetchStaff, updateStaffMember, deleteStaffMember, getCurrentUserRole, updateStaffRole, logActivity
} from '@/lib/supabase/db';
import React, { useState, useEffect, useRef } from 'react';
import SplashScreen from '@/components/SplashScreen';
import BottomNav from '@/components/BottomNav';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getTheme, classes } from '@/lib/theme';
import { syncAllToSupabase } from '@/lib/supabase/db';
/* =========================================================================
   الأنواع (Types)
   ========================================================================= */

type DeviceStatus = 'pending' | 'ready' | 'waiting_parts' | 'done';
type TabId =
  | 'home' | 'receiving' | 'receipts' | 'delivery'
  | 'inventory' | 'suppliers' | 'expenses' | 'reports'
  | 'scanner' | 'cloud' | 'staff' | 'settings';
type UserRole = 'admin' | 'technician';
type ToastType = 'success' | 'error' | 'info';
type FontSizeLevel = 'normal' | 'large' | 'xlarge';
type FontWeightLevel = 'light' | 'bold';

interface Receipt {
  id: string;
  receiptNumber: string;
  customerName: string;
  customerPhone: string;
  deviceType: string;
  deviceModel: string;
  deviceColor: string;
  imei: string;
  accessories: string[];
  issues: string[];
  status: DeviceStatus;
  price: number;
  partCost: number;
  deposit: number;
  notes: string;
  internalNotes: string;
  receivedAt: string;
  expectedDelivery: string;
  deliveredAt?: string;
  isArchived?: boolean;
  archiveReason?: string;
  image?: string;
}

interface InventoryItem {
  id: string;
  brand: string;
  deviceModel: string;
  partName: string;
  quantity: number;
  costPrice: number;
  supplierName?: string;
  minQuantity?: number;
  category?: string;
  condition?: string;
  notes?: string;
}

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  isoDate?: string;
}

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  pin: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
}

/* =========================================================================
   أدوات مساعدة
   ========================================================================= */

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeArabic = (s: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();

const escapeCSV = (v: any): string => {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const downloadFile = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* =========================================================================
   المكوّن الرئيسي
   ========================================================================= */

export default function BoodyGroupSystem() {
    // 📅 دالة تنسيق التاريخ (YYYY-MM-DD)
  const formatDate = (date: Date): string => date.toLocaleDateString('en-CA');


  /* ------------------------- States ------------------------- */
  const [reportFromDate, setReportFromDate] = useState('');
const [reportToDate, setReportToDate] = useState('');

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showSplash, setShowSplash] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [fontSizeLevel, setFontSizeLevel] = useState<FontSizeLevel>('normal');
  const [fontWeightLevel, setFontWeightLevel] = useState<FontWeightLevel>('bold');

  const [searchQuery, setSearchQuery] = useState('');
  const [receiptStatusFilter, setReceiptStatusFilter] =
    useState<'all' | DeviceStatus>('all');

  // إعدادات المركز
  const [shopName, setShopName] = useState('Boody Group - مركز صيانة');
  const [shopPhone, setShopPhone] = useState('01038084846');
  const [adminName, setAdminName] = useState('مهندس محمد سعد');
  const [admin1Phone, setAdmin1Phone] = useState('01100055005');
  const [admin2Phone, setAdmin2Phone] = useState('01100055235');
  const [adminPassword, setAdminPassword] = useState('1234');
  const [receiptPrefix, setReceiptPrefix] = useState('BG');

  // الدور والوصول
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(true);

  // PIN Modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinLockUntil, setPinLockUntil] = useState<number>(0);

  // فريق العمل
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
 const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('technician');

  const [newStaffPassword, setNewStaffPassword] = useState('');

  // نموذج الاستلام
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [dType, setDType] = useState('OPPO');
  const [dModel, setDModel] = useState('');
  const [dColor, setDColor] = useState('أسود');
  const [imei, setImei] = useState('');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [issueChoices, setIssueChoices] = useState<Record<string, string>>({});
const [partChoiceModal, setPartChoiceModal] = useState<{
  issue: string;
  options: any[];
} | null>(null);
  const [customIssue, setCustomIssue] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [partCost, setPartCost] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [deviceImage, setDeviceImage] = useState<string | null>(null);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);

  const [expectedDeliveryOption, setExpectedDeliveryOption] = useState<string>('1h');
  const [customExpectedDate, setCustomExpectedDate] = useState<string>('');
  const [deliverySearchInput, setDeliverySearchInput] = useState<string>('');

  // بيانات أساسية
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  // فلاتر المخزن
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [selectedInventoryBrandFilter, setSelectedInventoryBrandFilter] = useState('all');
const [selectedCategory, setSelectedCategory] = useState("الكل");
const [selectedCondition, setSelectedCondition] = useState("الكل");
const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // نموذج الخزينة
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expType, setExpType] = useState<'expense' | 'income'>('expense');

  // إضافة قطع للمخزن
  const [selectedPartsForInventory, setSelectedPartsForInventory] = useState<string[]>([]);
  const [bulkModelTarget, setBulkModelTarget] = useState('');
  const [bulkQty, setBulkQty] = useState<number>(1);
  const [bulkCost, setBulkCost] = useState<number>(0);
  const [bulkBrandTarget, setBulkBrandTarget] = useState('OPPO');

    // حقول المخزن الإضافية
  const [bulkSupplier, setBulkSupplier] = useState('');
  const [bulkMinQty, setBulkMinQty] = useState<number>(1);
  const [bulkCategory, setBulkCategory] = useState('original');
  const [bulkCondition, setBulkCondition] = useState('new');
  const [bulkNotes, setBulkNotes] = useState('');
  // Toast + Notifications + Confirm
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false, title: '', message: '', onConfirm: null,
  });

  // Scanner
  const [scannedResult, setScannedResult] = useState('');
  const [isScanningActive, setIsScanningActive] = useState(false);

  // Cloud
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('synced');
  
  // 🏢 الموردين
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierNotes, setNewSupplierNotes] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  
 // 📄 فواتير الموردين
const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
const [newInvoiceNumber, setNewInvoiceNumber] = useState('');
const [newInvoiceDate, setNewInvoiceDate] = useState(new Date().toLocaleDateString('en-CA'));
const [newInvoiceTotal, setNewInvoiceTotal] = useState<number>(0);
const [newInvoiceParts, setNewInvoiceParts] = useState('');
const [newInvoiceNotes, setNewInvoiceNotes] = useState('');
const [newInvoiceImage, setNewInvoiceImage] = useState<string | null>(null);

// 💵 دفعات الموردين
const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toLocaleDateString('en-CA'));

const [newPaymentMethod, setNewPaymentMethod] = useState<'cash' | 'bank' | 'wallet'>('cash');
const [newPaymentNotes, setNewPaymentNotes] = useState('');

// ↩️ مرتجعات الموردين
const [supplierReturns, setSupplierReturns] = useState<any[]>([]);
const [newReturnPartName, setNewReturnPartName] = useState('');
const [newReturnBrand, setNewReturnBrand] = useState('');
const [newReturnQuantity, setNewReturnQuantity] = useState<number>(1);
const [newReturnUnitPrice, setNewReturnUnitPrice] = useState<number>(0);
const [newReturnReason, setNewReturnReason] = useState('');
const [newReturnDate, setNewReturnDate] = useState(new Date().toLocaleDateString('en-CA'));
const [newReturnInvoiceId, setNewReturnInvoiceId] = useState('');
  // 🎛️ إدارة الـ Modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierActiveTab, setSupplierActiveTab] = useState<'invoices' | 'payments' | 'returns'>('invoices');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  /* ------------------------- ثوابت ------------------------- */

  const marketBrands = [
    'OPPO', 'Redmi', 'Samsung', 'iPhone', 'Xiaomi / Poco', 'Realme',
    'Infinix', 'Tecno', 'Vivo', 'Huawei', 'Honor', 'OnePlus',
    'Nokia', 'Lenovo', 'Itel', 'آيباد / تابلت', 'ساعة ذكية', 'أخرى',
  ];

  const commonColors = [
    'أسود', 'أبيض', 'كحلي / أزرق', 'رمادي / جرافيت', 'ذهبي',
    'فضة', 'أخضر / زيتي', 'بنفسجي', 'وردي / روز',
  ];

  const accessoriesList = [
    'علبة الجهاز', 'خط', 'خطين', 'كارت ميموري', 'جراب', 'شاحن',
  ];

  // قائمة الأعطال (issues) — تظهر للعميل عند الاستلام
 const issuesList = [
  'شاشة', 'باغة', 'ظهر', 'كاميرا أمامية', 'كاميرا خلفية',
  'بطارية', 'سوفت وير', 'شبكة', 'wifi', 'بلوتوث',
  'معالج', 'بوردة', 'بيانات', 'اضاءة',
  'سماعة أذن', 'سماعة جرس', 'مايك داخلي',
  'سوكيت شحن', 'درج خط', 'كبل شبكة',
  'عطل في الشاشة اللمس', 'صوت واطي', 'سخونة زائدة', 'بطء الجهاز',
  'فاصل باور', 'لزق شاشة', 'فلاتة باور', 'بصمة',
];

  // قائمة قطع المخزن (parts) — تظهر عند إضافة قطع للمخزن
 const partsList = [
  'شاشة', 'باغة', 'ظهر', 'كاميرا', 'فلاتة باور',
  'فلاتة صوت', 'فلاتة شحن ميكرو', 'فلاتة شحن تيب سى', 'فلاتة ربط',
  'علبة جرس', 'كبل شبكة', 'درج خط', 'بطارية',
  'سوكيت شحن', 'سماعة أذن', 'سماعة جرس', 'مايك داخلي', 'عدسة كاميرا خلفية',
  'كونكتر بوردة',
  'هاوسينج', 'عظمة شاشة', 'فلتر سماعة',
];

  /* ------------------------- دوال مساعدة ------------------------- */



  const formatDateTime = (date: Date): string => {
    const d = formatDate(date);
    const t = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return `${d} (${t})`;
  };

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const pushNotification = (title: string, body: string) => {
    const notif: NotificationItem = {
      id: generateId(),
      title,
      body,
      date: formatDateTime(new Date()),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 50));
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
  };

  const openWhatsAppDirect = (phone: string, text: string) => {
    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
    if (!cleanPhone) return;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const notifyAdminsWhatsApp = (msgTitle: string, details: string) => {
    const fullMsg = `إشعار إداري من النظام - ${msgTitle}\n\n${details}\n\n📍 ${shopName}`;
    const phones = [admin1Phone, admin2Phone].filter(Boolean);
    phones.forEach((phone, idx) => {
      setTimeout(() => {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
        if (cleanPhone) {
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMsg)}`, '_blank');
        }
      }, idx * 400);
    });
  };

  /* ------------------------- Effects ------------------------- */

  // 🔄 تحميل البيانات من Supabase (المرحلة 3B)
useEffect(() => {
  const loadFromSupabase = async () => {
    try {
      const [rRes, iRes, eRes, sRes, stRes] = await Promise.all([
        fetchReceipts(),
        fetchInventory(),
        fetchExpenses(),
        fetchSuppliers(),
        fetchStaff(),
      ]);

      if (rRes.success && rRes.data.length > 0) {
        const mapped: Receipt[] = rRes.data.map((r: any) => ({
          id: r.id,
          receiptNumber: r.receipt_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          deviceType: r.device_type || '',
          deviceModel: r.device_model || '',
          deviceColor: r.device_color || '',
          imei: r.imei || '',
          accessories: r.accessories || [],
          issues: r.issues || [],
          status: r.status || 'pending',
          price: Number(r.price) || 0,
          partCost: Number(r.part_cost) || 0,
          deposit: Number(r.deposit) || 0,
          notes: r.notes || '',
          internalNotes: r.internal_notes || '',
          receivedAt: r.received_at || '',
          expectedDelivery: r.expected_delivery || '',
          deliveredAt: r.delivered_at || undefined,
          isArchived: r.is_archived || false,
          archiveReason: r.archive_reason || undefined,
          image: r.image || undefined,
        }));
        setReceipts(mapped);
        localStorage.setItem('bg_local_cloud_receipts_v7', JSON.stringify(mapped));
      }

      if (iRes.success && iRes.data.length > 0) {
        const mapped: InventoryItem[] = iRes.data.map((i: any) => ({
          id: i.id,
          brand: i.brand,
          deviceModel: i.device_model || '',
          partName: i.part_name,
          quantity: Number(i.quantity) || 0,
          costPrice: Number(i.cost_price) || 0,
          supplierName: i.supplier_name || '',
          minQuantity: Number(i.min_quantity) || 1,
          category: i.category || 'original',
          condition: i.condition || 'new',
          notes: i.notes || '',
        }));
        setInventory(mapped);
        localStorage.setItem('bg_internal_inventory_v5', JSON.stringify(mapped));
      }

      if (eRes.success && eRes.data.length > 0) {
        const mapped: ExpenseItem[] = eRes.data.map((e: any) => ({
          id: e.id,
          title: e.title,
          amount: Number(e.amount) || 0,
          type: e.type,
          date: e.date || '',
          isoDate: e.iso_date || undefined,
        }));
        setExpenses(mapped);
        localStorage.setItem('bg_expenses_v2', JSON.stringify(mapped));
      }

      // 🏢 تحميل الموردين
      if (sRes.success && sRes.data.length > 0) {
        setSuppliers(sRes.data);
      }

      // 👥 تحميل فريق العمل
      if (stRes.success && stRes.data.length > 0) {
        const mappedStaff: StaffMember[] = stRes.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          phone: m.phone || '',
          role: m.role as UserRole,
          pin: m.pin || '',
        }));
        setStaffList(mappedStaff);
      }
    } catch (err) {
      console.error('خطأ في تحميل البيانات من Supabase:', err);
    }
  };

  loadFromSupabase();

  // 👤 جلب بيانات المستخدم الحالي
  const loadUser = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setCurrentUserEmail(user.email);
    } catch (err) {
      console.error('خطأ في جلب المستخدم:', err);
    }
  };
  loadUser();
}, []);

  // تحميل أولي من localStorage
  useEffect(() => {
    // Receipts
    const savedReceipts = localStorage.getItem('bg_local_cloud_receipts_v7');
    if (savedReceipts) setReceipts(JSON.parse(savedReceipts));

    // Inventory
    const savedInventory = localStorage.getItem('bg_internal_inventory_v5');
    if (savedInventory) {
      setInventory(JSON.parse(savedInventory));
    } else {
      const initialInv: InventoryItem[] = [
        { id: '1', brand: 'OPPO', deviceModel: 'A15 / A12', partName: 'شاشة', quantity: 3, costPrice: 1500 },
        { id: '2', brand: 'Redmi', deviceModel: 'Note 10', partName: 'شاشة', quantity: 4, costPrice: 1200 },
        { id: '3', brand: 'Samsung', deviceModel: 'A12', partName: 'بطارية', quantity: 5, costPrice: 300 },
      ];
      setInventory(initialInv);
      localStorage.setItem('bg_internal_inventory_v5', JSON.stringify(initialInv));
    }

    // Expenses
    const savedExpenses = localStorage.getItem('bg_expenses_v2');
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));

    // Staff
    const savedStaff = localStorage.getItem('bg_staff_list_v2');
    if (savedStaff) {
      setStaffList(JSON.parse(savedStaff));
    } else {
      const defaultStaff: StaffMember[] = [
        { id: '1', name: 'مهندس محمد سعد', phone: '01038084846', role: 'admin', pin: '1234' },
      ];
      setStaffList(defaultStaff);
      localStorage.setItem('bg_staff_list_v2', JSON.stringify(defaultStaff));
    }

    // Notifications
    const savedNotifs = localStorage.getItem('bg_notifications_v1');
    if (savedNotifs) setNotifications(JSON.parse(savedNotifs));

    // UI Prefs (autosave restore)
    const savedUI = localStorage.getItem('bg_ui_prefs_v1');
    if (savedUI) {
      try {
        const ui = JSON.parse(savedUI);
        if (ui.darkMode !== undefined) setDarkMode(ui.darkMode);
        if (ui.activeTab) setActiveTab(ui.activeTab);
        if (ui.fontSizeLevel) setFontSizeLevel(ui.fontSizeLevel);
        if (ui.fontWeightLevel) setFontWeightLevel(ui.fontWeightLevel);
        if (ui.isSidebarOpen !== undefined) setIsSidebarOpen(ui.isSidebarOpen);
        if (ui.receiptStatusFilter) setReceiptStatusFilter(ui.receiptStatusFilter);
      } catch {}
    }

    // Settings
    const savedSettings = localStorage.getItem('bg_settings_v6');
    if (savedSettings) {
      try {
        const cfg = JSON.parse(savedSettings);
        if (cfg.shopName) setShopName(cfg.shopName);
        if (cfg.shopPhone) setShopPhone(cfg.shopPhone);
        if (cfg.adminName) setAdminName(cfg.adminName);
        if (cfg.adminPassword) setAdminPassword(cfg.adminPassword);
        if (cfg.admin1Phone) setAdmin1Phone(cfg.admin1Phone);
        if (cfg.admin2Phone) setAdmin2Phone(cfg.admin2Phone);
        if (cfg.receiptPrefix) setReceiptPrefix(cfg.receiptPrefix);
      } catch {}
    }
  }, []);

  // Autosave UI
  useEffect(() => {
    localStorage.setItem(
      'bg_ui_prefs_v1',
      JSON.stringify({
        darkMode,
        activeTab,
        fontSizeLevel,
        fontWeightLevel,
        isSidebarOpen,
        receiptStatusFilter,
      })
    );
  }, [darkMode, activeTab, fontSizeLevel, fontWeightLevel, isSidebarOpen, receiptStatusFilter]);

  // Autosave Notifications
  useEffect(() => {
    localStorage.setItem('bg_notifications_v1', JSON.stringify(notifications));
  }, [notifications]);

  /* ------------------------- حفظ في التخزين ------------------------- */

   const saveReceiptsToLocalCloud = async (data: Receipt[]) => {
    setReceipts(data);
    localStorage.setItem('bg_local_cloud_receipts_v7', JSON.stringify(data));
    setCloudSyncStatus('syncing');
    
    try {
      const result = await upsertReceipts(data);
      if (result.success) {
        setCloudSyncStatus('synced');
      } else {
        console.error('خطأ في مزامنة الإيصالات:', result.error);
        setCloudSyncStatus('idle');
      }
    } catch (err) {
      console.error('خطأ في مزامنة الإيصالات:', err);
      setCloudSyncStatus('idle');
    }
  };

    const saveInventory = async (data: InventoryItem[]) => {
    setInventory(data);
    localStorage.setItem('bg_internal_inventory_v5', JSON.stringify(data));
    
    try {
      const result = await upsertInventory(data);
      if (!result.success) {
        console.error('خطأ في مزامنة المخزن:', result.error);
      }
    } catch (err) {
      console.error('خطأ في مزامنة المخزن:', err);
    }
  };

   const saveExpenses = async (data: ExpenseItem[]) => {
    setExpenses(data);
    localStorage.setItem('bg_expenses_v2', JSON.stringify(data));
    
    try {
      const result = await upsertExpenses(data);
      if (!result.success) {
        console.error('خطأ في مزامنة الخزينة:', result.error);
      }
    } catch (err) {
      console.error('خطأ في مزامنة الخزينة:', err);
    }
  };

  const saveStaffList = (data: StaffMember[]) => {
    setStaffList(data);
    localStorage.setItem('bg_staff_list_v2', JSON.stringify(data));
  };

  /* ------------------------- Backup / Restore ------------------------- */

  const handleExportBackup = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      shopName, shopPhone, adminName, admin1Phone, admin2Phone, adminPassword, receiptPrefix,
      receipts, inventory, expenses, staffList,
    };
    const filename = `boody-backup-${formatDate(new Date())}.json`;
    downloadFile(filename, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
    showToast('تم تصدير النسخة الاحتياطية بنجاح 💾');
    pushNotification('نسخة احتياطية', `تم تصدير نسخة بتاريخ ${formatDateTime(new Date())}`);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        openConfirm(
          'استيراد نسخة احتياطية',
          'سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة. هل أنت متأكد؟',
          () => {
            if (Array.isArray(data.receipts)) saveReceiptsToLocalCloud(data.receipts);
            if (Array.isArray(data.inventory)) saveInventory(data.inventory);
            if (Array.isArray(data.expenses)) saveExpenses(data.expenses);
            if (Array.isArray(data.staffList)) saveStaffList(data.staffList);
            if (data.shopName) setShopName(data.shopName);
            if (data.shopPhone) setShopPhone(data.shopPhone);
            if (data.adminName) setAdminName(data.adminName);
            if (data.admin1Phone) setAdmin1Phone(data.admin1Phone);
            if (data.admin2Phone) setAdmin2Phone(data.admin2Phone);
            if (data.adminPassword) setAdminPassword(data.adminPassword);
            if (data.receiptPrefix) setReceiptPrefix(data.receiptPrefix);
            localStorage.setItem(
              'bg_settings_v6',
              JSON.stringify({
                shopName: data.shopName ?? shopName,
                shopPhone: data.shopPhone ?? shopPhone,
                adminName: data.adminName ?? adminName,
                adminPassword: data.adminPassword ?? adminPassword,
                admin1Phone: data.admin1Phone ?? admin1Phone,
                admin2Phone: data.admin2Phone ?? admin2Phone,
                receiptPrefix: data.receiptPrefix ?? receiptPrefix,
              })
            );
            closeConfirm();
            showToast('تم استيراد النسخة الاحتياطية بنجاح ✅');
          }
        );
      } catch {
        showToast('ملف غير صالح أو تالف', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ------------------------- CSV Export ------------------------- */

  const handleExportReceiptsCSV = () => {
    const headers = [
      'رقم الإيصال','العميل','الهاتف','الشركة','الموديل','اللون','IMEI',
      'الأعطال','الحالة','الإجمالي','تكلفة القطع','العربون','المتبقي',
      'تاريخ الاستلام','تاريخ التسليم','ملاحظات'
    ];
    const rows = receipts.map(r => [
      r.receiptNumber, r.customerName, r.customerPhone, r.deviceType, r.deviceModel,
      r.deviceColor, r.imei, r.issues.join(' | '),
      r.status === 'done' ? 'تم التسليم'
        : r.status === 'ready' ? 'جاهز للاستلام'
        : r.status === 'waiting_parts' ? 'انتظار قطع'
        : 'قيد الصيانة',
      r.price, r.partCost, r.deposit, r.price - r.deposit,
      r.receivedAt, r.deliveredAt || '', r.notes,
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
    downloadFile(`receipts-${formatDate(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
    showToast('تم تصدير الإيصالات إلى CSV ✅');
  };

  const handleExportExpensesCSV = () => {
    const headers = ['البيان','النوع','المبلغ','التاريخ'];
    const rows = expenses.map(e => [
      e.title, e.type === 'expense' ? 'مصروف' : 'إيراد', e.amount, e.date,
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
    downloadFile(`expenses-${formatDate(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
    showToast('تم تصدير الخزينة إلى CSV ✅');
  };

  /* ------------------------- PIN ------------------------- */

  const requestAdminRole = () => {
    if (Date.now() < pinLockUntil) {
      const secs = Math.ceil((pinLockUntil - Date.now()) / 1000);
      showToast(`الحساب مقفل مؤقتًا. الرجاء المحاولة بعد ${secs} ثانية`, 'error');
      return;
    }
    setPinInput('');
    setPinError('');
    setPinModalOpen(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === adminPassword) {
      setIsAdminUnlocked(true);
      setUserRole('admin');
      setPinModalOpen(false);
      setPinAttempts(0);
      setPinError('');
      showToast('تم التحقق بنجاح — مرحبًا بك يا مدير 👨‍💼');
      pushNotification('دخول المدير', `تم تفعيل وضع المدير في ${formatDateTime(new Date())}`);
    } else {
      const attempts = pinAttempts + 1;
      setPinAttempts(attempts);
      setPinError('رمز PIN غير صحيح');
      if (attempts >= 3) {
        setPinLockUntil(Date.now() + 30_000);
        setPinAttempts(0);
        setPinModalOpen(false);
        showToast('تم قفل التحقق لمدة 30 ثانية لتجاوز عدد المحاولات', 'error');
      }
    }
  };

  const handleRoleChange = (role: UserRole) => {
    if (role === 'admin') {
      if (isAdminUnlocked) {
        setUserRole('admin');
        showToast('أنت بالفعل في وضع المدير');
      } else {
        requestAdminRole();
      }
    } else {
      setUserRole('technician');
      setIsAdminUnlocked(false);
      showToast('تم التبديل إلى وضع فني الصيانة', 'info');
    }
  };

 const handleLockAdmin = () => {
  if (isAdminUnlocked) {
    setIsAdminUnlocked(false);
    setUserRole('technician');
    showToast('تم قفل وضع المدير 🔒', 'info');
  } else {
    setPinInput('');
    setPinError('');
    setPinModalOpen(true);
  }
};

  /* ------------------------- Staff ------------------------- */

 const handleAddStaff = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
    showToast('يرجى إدخال الاسم والإيميل وكلمة السر', 'error');
    return;
  }

  const tempPassword = newStaffPassword.trim();

  const result = await createStaffMember({
    name: newStaffName.trim(),
    email: newStaffEmail.trim(),
    role: newStaffRole,
    password: tempPassword,
  });

  if (!result.success) {
    showToast('فشل إضافة الموظف: ' + result.error, 'error');
    return;
  }

  // إضافة في القائمة المحلية
  const newMember: StaffMember = {
    id: result.data.id,
    name: newStaffName.trim(),
    phone: '',
    role: newStaffRole,
    pin: tempPassword,
  };
  setStaffList([newMember, ...staffList]);

  // رسالة نجاح
  showToast(`✅ تم إضافة ${newStaffName}. بيانات الدخول: ${newStaffEmail} / ${tempPassword}`, 'success');
  pushNotification('موظف جديد', `تم إضافة ${newStaffName} كـ ${newStaffRole === 'admin' ? 'مدير' : 'فني'}`);

  // رسالة واتساب
  const waMessage =
    `🎉 مرحباً ${newStaffName}!\n\n` +
    `تم إضافتك على نظام MS Fix\n\n` +
    `📧 الإيميل: ${newStaffEmail}\n` +
    `🔑 كلمة السر: ${tempPassword}\n` +
    `👤 الدور: ${newStaffRole === 'admin' ? 'مدير عام' : 'فني صيانة'}\n\n` +
    `🔗 رابط الدخول: ${typeof window !== 'undefined' ? window.location.origin : ''}/login\n\n` +
    `⚠️ يرجى تغيير كلمة السر من الإعدادات بعد أول تسجيل دخول.`;

  // فتح WhatsApp (اختياري)
  setTimeout(() => {
    if (confirm(`تم إضافة ${newStaffName} بنجاح!\n\n${newStaffEmail} / ${tempPassword}\n\nهل تريد إرسال البيانات عبر WhatsApp؟`)) {
      const phone = prompt('رقم واتساب الموظف (مع كود الدولة، مثال: 201012345678):');
      if (phone) openWhatsAppDirect(phone, waMessage);
    }
  }, 500);

  // Reset
  setNewStaffName('');
  setNewStaffEmail('');
  setNewStaffPassword('');
  setNewStaffRole('technician');

  // ✅ مفيش signOut — إنت تفضل مدير
};

const handleToggleRole = async (member: any) => {
  const newRole = member.role === 'admin' ? 'technician' : 'admin';
  const actionText = newRole === 'admin' ? 'ترقية' : 'تخفيض';
  const confirmText = newRole === 'admin'
    ? `هل تريد ترقية "${member.name}" إلى مدير عام؟`
    : `هل تريد تخفيض "${member.name}" إلى فني صيانة؟`;

  if (!confirm(confirmText)) return;

  const result = await updateStaffRole(member.id, newRole);

  if (!result.success) {
    showToast(`فشل ${actionText}: ${result.error}`, 'error');
    return;
  }

  setStaffList(prev =>
    prev.map(s => (s.id === member.id ? { ...s, role: newRole } : s))
  );

  showToast(`تم ${actionText} "${member.name}" بنجاح`, 'success');
};
  const handleDeleteStaff = (id: string) => {
    const member = staffList.find(s => s.id === id);
    openConfirm('حذف موظف', `هل أنت متأكد من حذف "${member?.name || ''}" من النظام؟`, () => {
      saveStaffList(staffList.filter(s => s.id !== id));
      closeConfirm();
      showToast('تم حذف الموظف بنجاح', 'info');
    });
  };

  const handlePasswordResetRequest = (staffMember: StaffMember) => {
    const resetMsg =
      `طلب استعادة وتعديل كلمة السر/الـ PIN للحساب: ${staffMember.name} (هاتف: ${staffMember.phone})\n` +
      `يرجى مراجعة وتعديل الرمز بواسطة المدير المسؤول.`;
    openWhatsAppDirect(admin1Phone, resetMsg);
    showToast('تم إرسال طلب تعديل كلمة السر إلى المدير المسؤول عبر الواتساب 📱');
  };

  /* ------------------------- Cloud ------------------------- */

  const handleCloudSync = () => {
    setCloudSyncStatus('syncing');
    setTimeout(() => {
      setCloudSyncStatus('synced');
      showToast('تمت مزامنة وحفظ السحابة المحلية بنجاح 100% 💻✨');
    }, 600);
  };
  
  // 🚪 تسجيل الخروج
  const handleLogout = () => {
    openConfirm(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج من النظام؟',
      async () => {
        try {
          const supabase = createSupabaseClient();
          await supabase.auth.signOut();
          showToast('تم تسجيل الخروج بنجاح 👋');
          closeConfirm();
          setTimeout(() => {
            window.location.href = '/login';
          }, 500);
        } catch (err) {
          console.error('خطأ في تسجيل الخروج:', err);
          showToast('فشل تسجيل الخروج', 'error');
          closeConfirm();
        }
      }
    );
  };

  /* ------------------------- Inventory Integration ------------------------- */

const processInventoryOnReceipt = (deviceBrand: string, issuesList: string[], choices: Record<string, string> = {}) => {    let updatedInv = [...inventory];
    const alerts: string[] = [];

    issuesList.forEach(issue => {
      const chosenId = choices[issue];
const idx = chosenId
  ? updatedInv.findIndex(inv => inv.id === chosenId)
  : updatedInv.findIndex(inv =>
      inv.brand.toLowerCase() === deviceBrand.toLowerCase() &&
      inv.partName.toLowerCase().trim() === issue.toLowerCase().trim()
    );
            if (idx !== -1 && updatedInv[idx].quantity > 0) {
        updatedInv[idx].quantity -= 1;
        alerts.push(`تم خصم (${updatedInv[idx].partName} - ${updatedInv[idx].brand}) من المخزن`);
        
        // 📝 تسجيل حركة الاستخدام
        logInventoryMovement({
          inventoryId: updatedInv[idx].id,
          partName: updatedInv[idx].partName,
          brand: updatedInv[idx].brand,
          deviceModel: updatedInv[idx].deviceModel,
          type: 'out',
          quantity: 1,
          reason: 'استخدام في صيانة',
        });
      }
    });

    saveInventory(updatedInv);
    if (alerts.length > 0) showToast(alerts[0], 'info');
  };

  // حساب تكلفة القطع تلقائيًا من المخزن عند اختيار الأعطال
 const autoComputePartCost = (deviceBrand: string, selected: string[]): number => {
  let total = 0;
  selected.forEach(issue => {
    const chosenId = issueChoices[issue];
    const found = chosenId
      ? inventory.find(inv => inv.id === chosenId)
      : inventory.find(inv =>
          inv.brand.toLowerCase() === deviceBrand.toLowerCase() &&
          inv.partName.toLowerCase().trim() === issue.toLowerCase().trim()
        );
    if (found) total += found.costPrice || 0;
  });
  return total;
};

 useEffect(() => {
  if (userRole !== 'admin') return;
  const auto = autoComputePartCost(dType, selectedIssues);
  if (auto > 0) setPartCost(auto);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedIssues, dType, issueChoices]);
  /* ------------------------- Image Upload ------------------------- */

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDeviceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  /* ------------------------- Inventory Add ------------------------- */

    const handleBulkAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPartsForInventory.length === 0) {
      showToast('يرجى اختيار قطعة واحدة على الأقل من القائمة!', 'error');
      return;
    }

    let updatedInv = [...inventory];
    const modelTarget = bulkModelTarget.trim() || 'عام';

    selectedPartsForInventory.forEach(part => {
      const existingIdx = updatedInv.findIndex(
        i => i.brand === bulkBrandTarget &&
          i.deviceModel.toLowerCase() === modelTarget.toLowerCase() &&
          i.partName === part
      );
      if (existingIdx !== -1) {
        updatedInv[existingIdx].quantity += Number(bulkQty);
        if (bulkCost > 0) updatedInv[existingIdx].costPrice = Number(bulkCost);
        if (bulkSupplier) updatedInv[existingIdx].supplierName = bulkSupplier;
        if (bulkMinQty > 0) updatedInv[existingIdx].minQuantity = Number(bulkMinQty);
        if (bulkCategory) updatedInv[existingIdx].category = bulkCategory;
        if (bulkCondition) updatedInv[existingIdx].condition = bulkCondition;
        if (bulkNotes) updatedInv[existingIdx].notes = bulkNotes;
      } else {
        updatedInv.push({
          id: generateId(),
          brand: bulkBrandTarget,
          deviceModel: modelTarget,
          partName: part,
          quantity: Number(bulkQty),
          costPrice: Number(bulkCost),
          supplierName: bulkSupplier || undefined,
          minQuantity: Number(bulkMinQty) || 1,
          category: bulkCategory || 'original',
          condition: bulkCondition || 'new',
          notes: bulkNotes || undefined,
        });
      }
    });

    saveInventory(updatedInv);

// 📝 تسجيل الحركة لكل قطعة في السجل
selectedPartsForInventory.forEach(part => {
  const existing = updatedInv.find(i => 
    i.brand === bulkBrandTarget && 
    i.deviceModel.toLowerCase() === modelTarget.toLowerCase() && 
    i.partName === part
  );
  
  if (existing) {
    logInventoryMovement({
      inventoryId: existing.id,
      partName: part,
      brand: bulkBrandTarget,
      deviceModel: modelTarget,
      type: 'in',
      quantity: Number(bulkQty),
      reason: 'إضافة للمخزن',
      notes: bulkSupplier ? `من المورد: ${bulkSupplier}` : undefined,
    });
  }
});

setSelectedPartsForInventory([]);
setBulkModelTarget('');
setBulkQty(1);
setBulkCost(0);
setBulkSupplier('');
setBulkMinQty(1);
setBulkCategory('original');
setBulkCondition('new');
setBulkNotes('');
showToast('تم تحديث وإضافة القطع للمخزن المحلي بنجاح!');
  };

    const handleDeleteInventoryItem = (id: string) => {
    openConfirm('حذف قطعة', 'هل تريد حذف هذه القطعة من المخزن؟', async () => {
      const newInventory = inventory.filter(i => i.id !== id);
      setInventory(newInventory);
      localStorage.setItem('bg_internal_inventory_v5', JSON.stringify(newInventory));
      
      try {
        const result = await deleteInventoryItem(id);
        if (!result.success) {
          console.error('خطأ في حذف القطعة:', result.error);
          showToast('تحذير: القطعة اتحذفت من الواجهة بس مش من Supabase', 'error');
                } else {
          showToast('تم حذف القطعة من المخزن', 'info');
          
          // 📝 تسجيل حركة الحذف
          const item = inventory.find(i => i.id === id);
                    if (item) {
            logInventoryMovement({
              inventoryId: item.id,
              partName: item.partName,
              brand: item.brand,
              deviceModel: item.deviceModel,
              type: 'out',
              quantity: item.quantity,
              reason: 'حذف من المخزن',
            });
            
            // 📜 تسجيل في Activity Log
            await logActivity({
              action: 'delete',
              entity: 'inventory',
              entityId: item.id,
              entityName: item.partName,
              details: `حذف قطعة "${item.partName}" من المخزن (شركة: ${item.brand || '-'}، كمية: ${item.quantity})`,
            });
          }
        }
      } catch (err) {
        console.error('خطأ:', err);
        showToast('تحذير: فيه مشكلة في الاتصال بـ Supabase', 'error');
      }
      
      closeConfirm();
    });
  };


  /* ------------------------- Expenses ------------------------- */

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || expAmount <= 0) {
      showToast('يرجى إدخال اسم المصروف والمبلغ بشكل صحيح', 'error');
      return;
    }
    const newExp: ExpenseItem = {
      id: generateId(),
      title: expTitle,
      amount: Number(expAmount),
      type: expType,
      date: formatDateTime(new Date()),
      isoDate: new Date().toISOString(),
    };
    saveExpenses([newExp, ...expenses]);
    setExpTitle('');
    setExpAmount(0);
    showToast('تم تسجيل المعاملة المالية بنجاح');
  };

    const handleDeleteExpense = (id: string) => {
    openConfirm('حذف معاملة', 'هل تريد حذف هذه المعاملة المالية؟', async () => {
      const newExpenses = expenses.filter(x => x.id !== id);
      setExpenses(newExpenses);
      localStorage.setItem('bg_expenses_v2', JSON.stringify(newExpenses));
      
      try {
        const result = await deleteExpense(id);
        if (!result.success) {
          console.error('خطأ في حذف المعاملة:', result.error);
          showToast('تحذير: المعاملة اتحذفت من الواجهة بس مش من Supabase', 'error');
        } else {
          showToast('تم حذف المعاملة المالية', 'info');
        }
      } catch (err) {
        console.error('خطأ:', err);
      }
      
      closeConfirm();
    });
  };

  /* ------------------------- Receipt: Delivery/Print ------------------------- */

  const calculateExpectedDelivery = (): string => {
    if (expectedDeliveryOption === '1h') return 'فوراً خلال ساعة واحدة';
    if (expectedDeliveryOption === '24h') return 'فوراً خلال 24 ساعة';
    if (expectedDeliveryOption === 'custom' && customExpectedDate) return customExpectedDate;
    return 'فوراً خلال ساعة واحدة';
  };

  const printThermalReceipt = (r: Receipt) => {
    const remaining = r.price - r.deposit;
    const printWindow = window.open('', '_blank', 'width=400,height=650');
    if (!printWindow) {
      showToast('يرجى السماح بفتح النوافذ المنبثقة للطباعة', 'error');
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال صيانة - ${r.receiptNumber}</title>
        <style>
          body { font-family: 'Tahoma', Arial, sans-serif; width: 72mm; margin: 0 auto; padding: 5mm; color: #000; background: #fff; font-size: 12px; line-height: 1.45; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .header h2 { margin: 0 0 4px 0; font-size: 16px; }
          .header p { margin: 2px 0; font-size: 11px; }
          .section { margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 6px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; gap: 8px; }
          .bold { font-weight: bold; }
          .footer { text-align: center; margin-top: 10px; font-size: 10px; border-top: 1px dashed #000; padding-top: 6px; }
        </style>
      </head>
      <body onload="window.print(); setTimeout(()=>window.close(), 300);">
        <div class="header">
          <h2>${shopName}</h2>
          <p>هاتف: ${shopPhone}</p>
          <p class="bold">إيصال استلام صيانة جهاز</p>
        </div>

        <div class="section">
          <div class="row"><span class="bold">رقم الإيصال:</span> <span>${r.receiptNumber}</span></div>
          <div class="row"><span class="bold">التاريخ:</span> <span>${r.receivedAt}</span></div>
          <div class="row"><span class="bold">اسم العميل:</span> <span>${r.customerName}</span></div>
          <div class="row"><span class="bold">الهاتف:</span> <span>${r.customerPhone}</span></div>
        </div>

        <div class="section">
          <div class="row"><span class="bold">الجهاز:</span> <span>${r.deviceType} ${r.deviceModel}</span></div>
          <div class="row"><span class="bold">اللون:</span> <span>${r.deviceColor || '—'}</span></div>
          ${r.imei ? `<div class="row"><span class="bold">IMEI:</span> <span>${r.imei}</span></div>` : ''}
          <div class="row"><span class="bold">الأعطال:</span> <span>${r.issues.join(', ')}</span></div>
          ${r.accessories && r.accessories.length ? `<div class="row"><span class="bold">الملحقات:</span> <span>${r.accessories.join(', ')}</span></div>` : ''}
        </div>

        <div class="section">
          <div class="row"><span class="bold">إجمالي التكلفة:</span> <span>${r.price} ج.م</span></div>
          <div class="row"><span class="bold">العربون المدفوع:</span> <span>${r.deposit} ج.م</span></div>
          <div class="row bold"><span class="bold">المتبقي:</span> <span>${remaining} ج.م</span></div>
          ${r.expectedDelivery ? `<div class="row"><span class="bold">التسليم المتوقع:</span> <span>${r.expectedDelivery}</span></div>` : ''}
        </div>

        ${r.notes ? `<div class="section"><div class="row"><span class="bold">ملاحظات:</span> <span>${r.notes}</span></div></div>` : ''}

        <div class="footer"><p>شكراً لتعاملكم معنا 🙏</p></div>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  /* ------------------------- Receipt: Save/Edit ------------------------- */

  const resetForm = () => {
    setCName(''); setCPhone(''); setDModel(''); setImei(''); setDColor('أسود');
    setSelectedAccessories([]); setSelectedIssues([]); setCustomIssue('');
    setPrice(0); setPartCost(0); setDeposit(0); setNotes(''); setInternalNotes('');
    setDeviceImage(null);
    setEditingReceiptId(null);
    setExpectedDeliveryOption('1h');
    setCustomExpectedDate('');
  };

  const startEditingReceipt = (r: Receipt) => {
    setEditingReceiptId(r.id);
    setCName(r.customerName);
    setCPhone(r.customerPhone);
    setDType(r.deviceType || 'OPPO');
    setDModel(r.deviceModel || '');
    setDColor(r.deviceColor || 'أسود');
    setImei(r.imei || '');
    setSelectedAccessories(r.accessories || []);
    setSelectedIssues(r.issues || []);
    setPrice(r.price || 0);
    setPartCost(r.partCost || 0);
    setDeposit(r.deposit || 0);
    setNotes(r.notes || '');
    setInternalNotes(r.internalNotes || '');
    setDeviceImage(r.image || null);
    setActiveTab('receiving');
  };

  const handleSaveReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  if (!cName.trim()) {
  showToast('يرجى إدخال اسم العميل', 'error');
  return;
}

    const finalIssues = selectedIssues.length ? [...selectedIssues] : [];
    if (customIssue.trim()) finalIssues.push(customIssue.trim());
    const issuesToCheck = finalIssues.length ? finalIssues : ['فحص شامل'];

    // ---------- تعديل إيصال موجود ----------
    if (editingReceiptId) {
      const updated = receipts.map(r => {
        if (r.id !== editingReceiptId) return r;
        return {
          ...r,
          customerName: cName,
          customerPhone: cPhone,
          deviceType: dType,
          deviceModel: dModel,
          deviceColor: dColor,
          imei,
          accessories: selectedAccessories,
          issues: issuesToCheck,
          price: Number(price),
          partCost: Number(partCost),
          deposit: Number(deposit),
          notes,
          internalNotes,
          image: deviceImage || r.image,
          expectedDelivery: calculateExpectedDelivery(),
        };
      });
      saveReceiptsToLocalCloud(updated);
      showToast('تم تحديث الإيصال بنجاح في السحابة المحلية!');
      pushNotification('تعديل إيصال', `تم تعديل الإيصال ${receipts.find(r => r.id === editingReceiptId)?.receiptNumber}`);
      resetForm();
      setActiveTab('receipts');
      return;
    }

    // ---------- إنشاء إيصال جديد ----------
processInventoryOnReceipt(dType, issuesToCheck, issueChoices);
       // ---------- حساب رقم الإيصال (لا يتكرر أبدًا) ----------
    const storedCounter = parseInt(localStorage.getItem('bg_receipt_counter') || '0', 10);
    
    // احسب أعلى رقم من الإيصالات الحالية
    const maxFromReceipts = receipts.reduce((max, r) => {
      const match = r.receiptNumber.match(/-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        return n > max ? n : max;
      }
      return max;
    }, 0);
    
    // استخدم الأعلى بين العداد المخزن وأعلى رقم موجود
    const nextNum = Math.max(storedCounter, maxFromReceipts, 1000) + 1;
    
    // احفظ العداد
    localStorage.setItem('bg_receipt_counter', String(nextNum));
    
    const receiptNum = `${receiptPrefix || 'BG'}-${nextNum}`;

    const remainingAmount = Number(price) - Number(deposit);

    const newReceipt: Receipt = {
      id: generateId(),
      receiptNumber: receiptNum,
      customerName: cName,
      customerPhone: cPhone,
      deviceType: dType,
      deviceModel: dModel,
      deviceColor: dColor,
      imei,
      accessories: selectedAccessories,
      issues: issuesToCheck,
      status: 'pending',
      price: Number(price),
      partCost: Number(partCost),
      deposit: Number(deposit),
      notes,
      internalNotes,
      receivedAt: formatDateTime(new Date()),
      expectedDelivery: calculateExpectedDelivery(),
      isArchived: false,
      image: deviceImage || undefined,
    };

    saveReceiptsToLocalCloud([newReceipt, ...receipts]);

    const customerWhatsAppMsg =
      `مرحباً أستاذ/ة ${cName} 🌹\n` +
      `تم استلام جهازكم (${dType} ${dModel}) لدى ${shopName} بنجاح 📱✨\n` +
      `📌 رقم الإيصال: ${receiptNum}\n` +
      `🔧 العطل: ${issuesToCheck.join('، ')}\n` +
      `💵 العربون: ${deposit} ج.م\n` +
      `💰 الإجمالي: ${price} ج.م\n` +
      `📌 المتبقي: ${remainingAmount} ج.م\n` +
      `📞 هاتف الإدارة: ${shopPhone}`;
if (cPhone.trim()) {
  openWhatsAppDirect(cPhone, customerWhatsAppMsg);
}
    notifyAdminsWhatsApp(
      `استلام جهاز جديد - ${receiptNum}`,
      `العميل: ${cName}\nالهاتف: ${cPhone}\nالجهاز: ${dType} ${dModel}\nالأعطال: ${issuesToCheck.join('، ')}\nالإجمالي: ${price} ج.م\nالعربون: ${deposit} ج.م`
    );

    pushNotification(
      'استلام جهاز',
      `${receiptNum} — ${cName} (${dType} ${dModel})`
    );

    showToast('تم حفظ الإيصال محلياً وإرسال رسالة الاستلام للعميل بنجاح! ☁️✨');
    setActiveTab('receipts');
    resetForm();
  };

  const handleArchiveReceipt = (r: Receipt, reason: string) => {
    const updated = receipts.map(x => x.id === r.id
      ? { ...x, isArchived: true, archiveReason: reason, status: 'done' as DeviceStatus }
      : x);
    saveReceiptsToLocalCloud(updated);
    showToast(`تم أرشفة الإيصال (${reason})`, 'info');
    pushNotification('أرشفة إيصال', `${r.receiptNumber} — ${reason}`);
  };

    const handleDeleteReceipt = (id: string, receiptNum: string) => {
    openConfirm('حذف إيصال نهائياً', `هل تريد حذف الإيصال ${receiptNum} نهائياً؟ لا يمكن التراجع.`, async () => {
      const newReceipts = receipts.filter(x => x.id !== id);
      setReceipts(newReceipts);
      localStorage.setItem('bg_local_cloud_receipts_v7', JSON.stringify(newReceipts));
      
      try {
        const result = await deleteReceipt(id);
        if (!result.success) {
          console.error('خطأ في حذف الإيصال:', result.error);
          showToast('تحذير: الإيصال اتحذف من الواجهة بس مش من Supabase', 'error');
        } else {
          showToast('تم حذف الإيصال', 'info');
        }
      } catch (err) {
        console.error('خطأ:', err);
      }
      
      closeConfirm();
    });
  };

  /* ------------------------- Delivery Actions ------------------------- */

  const markReceiptReady = (r: Receipt) => {
    const updated = receipts.map(item => item.id === r.id ? { ...item, status: 'ready' as DeviceStatus } : item);
    saveReceiptsToLocalCloud(updated);
    const remaining = r.price - r.deposit;
    const msg =
      `مرحباً أستاذ/ة ${r.customerName} 🌹\n` +
      `جهازك (${r.deviceType} ${r.deviceModel}) أصبح جاهزاً للاستلام الآن من ${shopName} ✨📱\n` +
      `المتبقي: ${remaining} ج.م\n` +
      `📞 هاتف الإدارة: ${shopPhone}`;
    openWhatsAppDirect(r.customerPhone, msg);
    showToast('تم إرسال إشعار الجاهزية للعميل');
    pushNotification('جاهز للاستلام', `${r.receiptNumber} — ${r.customerName}`);
  };

  const markReceiptWaitingParts = (r: Receipt) => {
    const updated = receipts.map(item => item.id === r.id ? { ...item, status: 'waiting_parts' as DeviceStatus } : item);
    saveReceiptsToLocalCloud(updated);
    const msg =
      `مرحباً أستاذ/ة ${r.customerName} 🌹\n` +
      `نود إبلاغكم بأن جهازكم (${r.deviceType} ${r.deviceModel}) في انتظار وصول قطعة الغيار المطلوبة 🛠️\n` +
      `سنقوم بإبلاغكم فور وصولها واستكمال الصيانة بإذن الله.\n` +
      `📞 هاتف الإدارة: ${shopPhone}`;
    openWhatsAppDirect(r.customerPhone, msg);
    showToast('تم تحديث الحالة: انتظار قطع غيار', 'info');
    pushNotification('انتظار قطع', `${r.receiptNumber} — ${r.customerName}`);
  };

  const markReceiptDelivered = (r: Receipt) => {
    const updated = receipts.map(item => item.id === r.id
      ? { ...item, status: 'done' as DeviceStatus, deliveredAt: formatDateTime(new Date()) }
      : item);
    saveReceiptsToLocalCloud(updated);
    const msg =
      `مرحباً بك أستاذ/ة ${r.customerName} 🌹\n` +
      `ألف مبروك استلام جهازك (${r.deviceType} ${r.deviceModel}) بعد الصيانة بنجاح من ${shopName} 📱✨\n\n` +
      `💡 إرشادات للحفاظ على هاتفك:\n` +
      `⚡ شحن أصلي وعدم الاستخدام أثناء الشحن.\n` +
      `🛡️ حماية ضد الصدمات والحرارة العالية.\n\n` +
      `📞 الدعم الفني: ${shopPhone}`;
    openWhatsAppDirect(r.customerPhone, msg);
    showToast('تم التسليم وإرسال الإرشادات للعميل');
    pushNotification('تسليم جهاز', `${r.receiptNumber} — ${r.customerName}`);
  };

  /* ------------------------- Filters + Derived ------------------------- */

  const filteredReceipts = receipts.filter(r => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || r.receiptNumber.toLowerCase().includes(query)
      || r.customerName.toLowerCase().includes(query)
      || r.customerPhone.includes(query)
      || (r.imei && r.imei.toLowerCase().includes(query));
    if (receiptStatusFilter === 'all') return matchesSearch;
    return matchesSearch && r.status === receiptStatusFilter;
  });

  const filteredInventory = inventory.filter(item => {
  const matchesBrand = selectedInventoryBrandFilter === 'all'
    || item.brand.toLowerCase() === selectedInventoryBrandFilter.toLowerCase();
  
 const categoryMap: Record<string, string> = {
  'أصلي': 'original',
  'تجاري': 'copy',
  'مسحوب': 'pulled'
};
const matchesCategory = selectedCategory === 'الكل'
  || item.category === categoryMap[selectedCategory];
  const conditionMap: Record<string, string> = {
  'جديدة': 'new',
  'مستعملة': 'used',
  'للصيانة': 'maintenance'
};
const matchesCondition = selectedCondition === 'الكل'
  || item.condition === conditionMap[selectedCondition];
  const q = normalizeArabic(inventorySearchQuery);
  if (!q) return matchesBrand && matchesCategory;
  
  const matchesQuery =
    normalizeArabic(item.partName).includes(q)
    || normalizeArabic(item.brand).includes(q)
    || normalizeArabic(item.deviceModel).includes(q);
  
return matchesBrand && matchesCategory && matchesCondition && matchesQuery;});

  const outOfStockParts = inventory.filter(i => i.quantity === 0);

  const todayStr = formatDate(new Date());

  // ---------- الإيراد يتحقق عند التسليم ----------
  const todayDelivered = receipts.filter(r => r.deliveredAt && r.deliveredAt.includes(todayStr) && !r.isArchived);
  const todayTotalRevenue = todayDelivered.reduce((acc, r) => acc + r.price, 0);
  const todayTotalCosts = todayDelivered.reduce((acc, r) => acc + (r.partCost || 0), 0);

  const todayExpenses = expenses.filter(e => e.date && e.date.includes(todayStr));
  const todayExpenseTotal = todayExpenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
  const todayExtraIncome = todayExpenses.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);

  const todayNetProfit = (todayTotalRevenue - todayTotalCosts + todayExtraIncome) - todayExpenseTotal;
// ---------- حسابات الفترة المخصصة ----------
const rangeFrom = reportFromDate || todayStr;
const rangeTo = reportToDate || todayStr;

const rangeDelivered = receipts.filter(r => {
  if (!r.deliveredAt || r.isArchived) return false;
  const d = r.deliveredAt.split('T')[0];
  return d >= rangeFrom && d <= rangeTo;
});

const rangeTotalRevenue = rangeDelivered.reduce((acc, r) => acc + r.price, 0);
const rangeTotalCosts = rangeDelivered.reduce((acc, r) => acc + (r.partCost || 0), 0);

const rangeExpenses = expenses.filter(e => {
  if (!e.date) return false;
  const d = e.date.split('T')[0];
  return d >= rangeFrom && d <= rangeTo;
});

const rangeExpenseTotal = rangeExpenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
const rangeExtraIncome = rangeExpenses.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);

const rangeNetProfit = (rangeTotalRevenue - rangeTotalCosts + rangeExtraIncome) - rangeExpenseTotal;
  const pendingCount = receipts.filter(r => r.status === 'pending').length;
  const readyCount = receipts.filter(r => r.status === 'ready').length;
  const waitingPartsCount = receipts.filter(r => r.status === 'waiting_parts').length;
  const doneCount = receipts.filter(r => r.status === 'done').length;

  const customersOwedTotal = receipts
    .filter(r => r.status !== 'done' && !r.isArchived)
    .reduce((acc, r) => acc + (r.price - r.deposit), 0);

  const todayNewReceipts = receipts.filter(r => r.receivedAt && r.receivedAt.includes(todayStr)).length;

  const totalInventoryMoney = inventory.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  /* ------------------------- Theme ------------------------- */

    const theme = {
    bg: darkMode
      ? 'bg-[#0f0a1a] text-[#f5f3ff]'
      : 'bg-[#faf9fc] text-[#1a1625]',
    card: darkMode
      ? 'bg-[#1a0f2e] border-[#2d1f4a]'
      : 'bg-white border-[#e9e5f5] shadow-sm',
    input: darkMode
      ? 'bg-[#150e22] border-[#2d1f4a] text-white placeholder-[#8479a0] focus:border-[#a78bfa]'
      : 'bg-white border-[#e9e5f5] text-[#1a1625] placeholder-[#9c96b3] focus:border-[#8b5cf6]',
    textMuted: darkMode ? 'text-[#b8b0d0]' : 'text-[#6b6680]',
    badgeInactive: darkMode
      ? 'bg-[#231740] text-[#f5f3ff] border-[#2d1f4a]'
      : 'bg-[#f5f3ff] text-[#1a1625] border-[#e9e5f5]',
    subHeader: darkMode
      ? 'bg-[#0f0a1a]/90 border-[#2d1f4a]'
      : 'bg-white/90 border-[#e9e5f5]',
    primary: darkMode ? '#a78bfa' : '#8b5cf6',
    accent: darkMode ? '#f472b6' : '#ec4899',
    primaryBg: darkMode ? 'bg-[#a78bfa]' : 'bg-[#8b5cf6]',
    primaryHover: darkMode ? 'hover:bg-[#c4b5fd]' : 'hover:bg-[#7c3aed]',
    accentBg: darkMode ? 'bg-[#f472b6]' : 'bg-[#ec4899]',
    successBg: darkMode ? 'bg-[#34d399]' : 'bg-[#10b981]',
    warningBg: darkMode ? 'bg-[#fbbf24]' : 'bg-[#f59e0b]',
    dangerBg: darkMode ? 'bg-[#f87171]' : 'bg-[#ef4444]',
    gradient: 'bg-gradient-to-br from-[#8b5cf6] to-[#ec4899]',
  };

  const fontSizeClass =
    fontSizeLevel === 'xlarge' ? 'text-base md:text-lg'
    : fontSizeLevel === 'large' ? 'text-sm md:text-base'
    : 'text-xs md:text-sm';

  const fontWeightClass = fontWeightLevel === 'bold' ? 'font-bold' : 'font-normal';

  /* ------------------------- Menu ------------------------- */

  const menuItems: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'الرئيسية', icon: '🏠' },
  { id: 'receiving', label: 'استلام جهاز', icon: '📱' },
  { id: 'receipts', label: 'الايصالات', icon: '📋' },
  { id: 'scanner', label: 'الباركود', icon: '📷' },
  { id: 'staff', label: 'فريق العمل', icon: '👨‍💼' },
  { id: 'cloud', label: 'الحالة السحابية', icon: '☁️' },
  { id: 'delivery', label: 'تسليم', icon: '✅' },
  { id: 'inventory', label: 'المخزن', icon: '📦' },
  { id: 'suppliers', label: 'الموردين', icon: '🏢' },
  { id: 'expenses', label: 'الخزينة', icon: '💵' },
  { id: 'reports', label: 'الارباح', icon: '📊' },
  { id: 'settings', label: 'الاعدادات', icon: '⚙️' },
];
const isRestrictedForTech = (tabId: TabId) =>
  userRole === 'technician' && (
    tabId === 'reports' ||      // 📊 الأرباح
    tabId === 'expenses' ||     // 💵 الخزينة
    tabId === 'staff' ||        // 👨‍💼 فريق العمل
    tabId === 'settings' ||     // ⚙️ الإعدادات
    tabId === 'suppliers' ||    // 🏢 الموردين
    tabId === 'inventory' ||    // 📦 المخزن
       tabId === 'cloud'           // ☁️ الحالة السحابية
  );

  /* =========================================================================
     الواجهة (JSX) — الجزء 1
     ========================================================================= */

    return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      <div
        className={`min-h-screen ${theme.bg} ${fontSizeClass} ${fontWeightClass} transition-colors duration-200 flex`}
        dir="rtl"
      >

      {/* 🔔 الإشعارات العائمة (Toasts) */}
      <div className="fixed top-5 left-5 z-[999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl border text-white font-bold animate-bounce flex items-center gap-2.5 backdrop-blur-md ${
              t.type === 'error'
                ? 'bg-rose-600/90 border-rose-500'
                : t.type === 'info'
                ? 'bg-amber-600/90 border-amber-500'
                : 'bg-emerald-600/90 border-emerald-500'
            }`}
          >
            <span>{t.type === 'error' ? '❌' : t.type === 'info' ? '⚠️' : '✨'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* 🧭 الشريط الجانبي */}
     <aside
  className={`${isSidebarOpen ? 'w-64' : 'w-20'} ${
    darkMode
      ? 'bg-[#150e22] border-l-0 border-r border-[#2d1f4a]'
      : 'bg-white border-r border-[#e9e5f5]'
  } flex flex-col transition-all duration-300 z-40 shrink-0`}
>
  {/* Header + Logo */}
  <div className={`p-4 border-b ${darkMode ? 'border-[#2d1f4a]' : 'border-[#e9e5f5]'} flex items-center justify-between gap-2`}>
    {isSidebarOpen && (
      <div className="flex items-center gap-3 overflow-hidden animate-fadeIn">
        <div className="bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white font-black p-2.5 rounded-2xl text-sm shadow-lg shadow-[#8b5cf6]/30 flex items-center justify-center shrink-0">
          MS
        </div>
        <div className="overflow-hidden">
          <h2 className={`font-extrabold text-sm truncate ${darkMode ? 'text-[#f5f3ff]' : 'text-[#1a1625]'}`}>
            {shopName}
          </h2>
          <p className={`text-2xs ${theme.textMuted} truncate`}>
            نظام إدارة الصيانة
          </p>
        </div>
      </div>
    )}
    <button
      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      className={`p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${
        darkMode
          ? 'bg-[#8b5cf6]/10 text-[#a78bfa] hover:bg-[#8b5cf6]/20'
          : 'bg-[#8b5cf6]/10 text-[#8b5cf6] hover:bg-[#8b5cf6]/20'
      } ${!isSidebarOpen ? 'mx-auto' : ''}`}
      title="تبديل إظهار القائمة"
    >
      {isSidebarOpen ? '◀' : '▶'}
    </button>
  </div>

  {/* Menu Items */}
  <div className="flex-1 overflow-y-auto p-3 space-y-1">
    {menuItems.map((item, idx) => {
      const isActive = activeTab === item.id;
      const restricted = isRestrictedForTech(item.id);
      const hasBadge = item.id === 'inventory' && outOfStockParts.length > 0;

      return (
        <button
          key={item.id}
          onClick={() => {
            if (restricted) {
              showToast('عذراً، هذا القسم مخصص للمدير العام فقط!', 'error');
              return;
            }
            if (item.id === 'receiving' && !editingReceiptId) resetForm();
            setActiveTab(item.id);
          }}
          className={`w-full text-right px-3 py-3 rounded-xl transition-all duration-200 flex items-center justify-between text-xs font-bold group ${
            isActive
              ? 'bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white shadow-lg shadow-[#8b5cf6]/30 scale-[1.02]'
              : darkMode
              ? 'text-[#b8b0d0] hover:bg-[#231740] hover:text-[#f5f3ff] hover:translate-x-[-2px]'
              : 'text-[#6b6680] hover:bg-[#f5f3ff] hover:text-[#1a1625] hover:translate-x-[-2px]'
          } ${restricted ? 'opacity-50' : ''}`}
          title={!isSidebarOpen ? item.label : undefined}
          style={{ animationDelay: `${idx * 20}ms` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-lg transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            {isSidebarOpen && <span className="truncate">{item.label}</span>}
            {isSidebarOpen && hasBadge && (
              <span className="bg-gradient-to-br from-[#ec4899] to-[#f472b6] text-white text-2xs font-black rounded-full px-1.5 py-0.5 shadow-md shrink-0">
                {outOfStockParts.length}
              </span>
            )}
          </div>
          {isSidebarOpen && restricted && <span className="text-2xs shrink-0">🔒</span>}
        </button>
      );
    })}
  </div>

  {/* Footer (اختياري) */}
  {isSidebarOpen && (
    <div className={`p-3 border-t ${darkMode ? 'border-[#2d1f4a]' : 'border-[#e9e5f5]'} text-center`}>
      <p className={`text-2xs ${theme.textMuted}`}>
        MS Fix © 2026
      </p>
    </div>
  )}
</aside>

      {/* 📄 المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ================= الهيدر ================= */}
       <header
  className={`border-b ${theme.subHeader} sticky top-0 z-30 px-4 md:px-6 py-3 flex justify-between items-center gap-3 backdrop-blur-xl`}
>
  {/* اليسار: الشعار + الاسم */}
  <div className="flex items-center gap-3 min-w-0">
    <div className="bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white font-black rounded-xl shadow-lg shadow-[#8b5cf6]/30 flex items-center justify-center w-10 h-10 text-sm shrink-0">
      MS
    </div>
    <div className="min-w-0">
      <h1 className="font-extrabold text-sm md:text-base tracking-wide truncate gradient-text">
        {shopName}
      </h1>
      <p className={`text-2xs ${theme.textMuted} truncate hidden md:block`}>
        نظام إدارة مركز الصيانة
      </p>
    </div>
  </div>

  {/* اليمين: الأزرار */}
  <div className="flex items-center gap-1.5 md:gap-2">

    {/* 🔔 الإشعارات */}
    <button
      onClick={() => setNotifPanelOpen(v => !v)}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200 hover:scale-105 active:scale-95 ${theme.badgeInactive}`}
      title="الإشعارات"
    >
      🔔
      {unreadNotifs > 0 && (
        <span className="absolute -top-1 -right-1 bg-gradient-to-br from-[#ec4899] to-[#f472b6] text-white text-2xs font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg">
          {unreadNotifs}
        </span>
      )}
    </button>

    {/* ☀️/🌙 الوضع */}
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200 hover:scale-105 active:scale-95 ${theme.badgeInactive}`}
      title={darkMode ? 'الوضع الساطع' : 'الوضع الداكن'}
    >
      {darkMode ? '☀️' : '🌙'}
    </button>

    {/* 🔒 قفل المدير */}
    <button
  onClick={handleLockAdmin}
  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
    isAdminUnlocked
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
  }`}
  title={isAdminUnlocked ? 'قفل وضع المدير' : 'فتح وضع المدير (PIN)'}
>
  {isAdminUnlocked ? '🔓' : '🔒'}
</button>
  </div>
</header>

        {/* لوحة الإشعارات المنسدلة */}
        {notifPanelOpen && (
          <div
            className={`${theme.card} border-b mx-4 md:mx-8 mt-3 rounded-2xl p-4 max-h-80 overflow-y-auto space-y-2`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-indigo-400 text-sm">🔔 مركز الإشعارات</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setNotifications(ns => ns.map(n => ({ ...n, read: true })))}
                  className="text-2xs px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold"
                >
                  تعليم الكل كمقروء
                </button>
                <button
                  onClick={() => setNotifications([])}
                  className="text-2xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 font-bold"
                >
                  مسح الكل
                </button>
              </div>
            </div>
            {notifications.length === 0 && (
              <p className={`text-center text-xs py-4 ${theme.textMuted}`}>لا توجد إشعارات بعد.</p>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border flex justify-between items-start gap-3 ${
                  n.read
                    ? darkMode ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-200'
                    : darkMode ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
                }`}
              >
                <div className="min-w-0">
                  <strong className="block text-xs">{n.title}</strong>
                  <p className={`text-2xs mt-0.5 ${theme.textMuted}`}>{n.body}</p>
                  <span className={`text-2xs block mt-1 ${theme.textMuted}`}>{n.date}</span>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />}
              </div>
            ))}
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">

          {/* ================= 🏠 الرئيسية ================= */}
          {activeTab === 'home' && (
            <div className="space-y-6 max-w-5xl mx-auto">

              <div className={`${theme.card} p-8 rounded-3xl border text-center space-y-4 shadow-xl`}>
                <h2 className="text-2xl font-black text-indigo-400">مرحباً بك في نظام {shopName}</h2>
                <p className={`text-sm ${theme.textMuted}`}>
                  إدارة متكاملة لورشة الصيانة، متابعة الإيصالات، والمخزن بدقة واحترافية عالية.
                </p>
              </div>

              {/* إحصائيات سريعة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`${theme.card} p-4 rounded-2xl border text-center`}>
                  <span className={`block text-2xs ${theme.textMuted}`}>إيصالات اليوم</span>
                  <strong className="text-xl font-black text-indigo-400">{todayNewReceipts}</strong>
                </div>
                <div className={`${theme.card} p-4 rounded-2xl border text-center`}>
                  <span className={`block text-2xs ${theme.textMuted}`}>قيد الصيانة</span>
                  <strong className="text-xl font-black text-amber-400">{pendingCount}</strong>
                </div>
                <div className={`${theme.card} p-4 rounded-2xl border text-center`}>
                  <span className={`block text-2xs ${theme.textMuted}`}>جاهز للاستلام</span>
                  <strong className="text-xl font-black text-teal-400">{readyCount}</strong>
                </div>
                <div className={`${theme.card} p-4 rounded-2xl border text-center`}>
                  <span className={`block text-2xs ${theme.textMuted}`}>متبقي على العملاء</span>
                  <strong className="text-xl font-black text-rose-400">{customersOwedTotal.toLocaleString()} ج.م</strong>
                </div>
              </div>

              {/* تنبيه قطع نفذت */}
              {outOfStockParts.length > 0 && (
                <div className={`p-4 rounded-2xl border bg-rose-500/10 border-rose-500/30 text-rose-300`}>
                  <strong className="block text-sm mb-1">⚠️ تنبيه: {outOfStockParts.length} قطعة نفذت من المخزن</strong>
                  <p className="text-2xs">
                    {outOfStockParts.slice(0, 5).map(p => `${p.brand} ${p.partName}`).join(' • ')}
                    {outOfStockParts.length > 5 ? ' ...' : ''}
                  </p>
                </div>
              )}

              <div className="flex justify-center my-4">
                <button
                  onClick={() => { resetForm(); setActiveTab('receiving'); }}
                  className="w-20 h-20 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center text-4xl shadow-2xl shadow-indigo-600/50 transition transform hover:scale-105 active:scale-95"
                  title="استلام جهاز جديد"
                >
                  +
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div
                  onClick={() => setActiveTab('receipts')}
                  className={`${theme.card} p-6 rounded-3xl border text-center cursor-pointer hover:border-indigo-500 transition shadow-md`}
                >
                  <span className="text-3xl block mb-2">📋</span>
                  <h3 className="font-bold text-base">الإيصالات</h3>
                  <p className={`text-2xs mt-1 ${theme.textMuted}`}>عرض ومتابعة الإيصالات وحالة الأجهزة</p>
                </div>

                <div
                  onClick={() => setActiveTab('inventory')}
                  className={`${theme.card} p-6 rounded-3xl border text-center cursor-pointer hover:border-indigo-500 transition shadow-md relative`}
                >
                  {outOfStockParts.length > 0 && (
                    <span className="absolute top-3 left-3 bg-rose-500 text-white text-2xs font-black rounded-full px-2 py-0.5">
                      {outOfStockParts.length} نفذت
                    </span>
                  )}
                  <span className="text-3xl block mb-2">📦</span>
                  <h3 className="font-bold text-base">المخزن</h3>
                  <p className={`text-2xs mt-1 ${theme.textMuted}`}>إدارة المخزن وقطع الغيار</p>
                </div>
              </div>
            </div>
          )}

          {/* ================= 📱 استلام جهاز ================= */}
          {activeTab === 'receiving' && (
            <form
              onSubmit={handleSaveReceiptSubmit}
              className={`${theme.card} p-6 md:p-8 rounded-2xl border max-w-4xl mx-auto space-y-6`}
            >
              <div className="flex justify-between items-center border-b border-[#30363d] pb-4 flex-wrap gap-2">
                <h2 className="font-bold text-indigo-400 text-base">
                  {editingReceiptId ? '✏️ تعديل بيانات الإيصال الحالي' : '📱 استلام جهاز جديد وتاريخه بدقة'}
                </h2>
                <span className="text-2xs text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/25">
                  سحابة محلية داخل الكمبيوتر 💾
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>اسم العميل *</label>
                  <input required value={cName} onChange={e => setCName(e.target.value)} type="text" className={`w-full ${theme.input} p-3.5 rounded-xl`} placeholder="محمد أحمد" />
                </div>
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>رقم الموبايل *</label>
<input value={cPhone} onChange={e => setCPhone(e.target.value)} type="text" className={`w-full ${theme.input} p-3.5 rounded-xl`} placeholder="01038084846 (اختياري)" />                </div>
              </div>

              {/* صورة الجهاز */}
              <div className={`p-4 rounded-xl border space-y-2 ${darkMode ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-300'}`}>
                <label className="block font-bold">📷 صورة الجهاز عند الاستلام (توثيق الحالة)</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className={`w-full ${theme.input} p-2 rounded-xl`} />
                {deviceImage && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={deviceImage} alt="Device" className="w-16 h-16 object-cover rounded-xl border border-indigo-500" />
                    <button type="button" onClick={() => setDeviceImage(null)} className="text-rose-400 hover:underline">حذف الصورة</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>الشركة المصنعة *</label>
                  <select value={dType} onChange={e => setDType(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}>
                    {marketBrands.map(b => (
                      <option key={b} value={b} className={darkMode ? 'bg-[#161b22] text-white' : 'bg-white text-slate-900'}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>الموديل</label>
                  <input value={dModel} onChange={e => setDModel(e.target.value)} type="text" className={`w-full ${theme.input} p-3.5 rounded-xl`} placeholder="مثال: Note 10 / A12" />
                </div>
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>اللون</label>
                  <select value={dColor} onChange={e => setDColor(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}>
                    {commonColors.map(c => (
                      <option key={c} value={c} className={darkMode ? 'bg-[#161b22] text-white' : 'bg-white text-slate-900'}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>IMEI / سيريال</label>
                  <input value={imei} onChange={e => setImei(e.target.value)} type="text" className={`w-full ${theme.input} p-3.5 rounded-xl`} placeholder="سيريال الجهاز..." />
                </div>
              </div>

              {/* الملحقات */}
              <div>
                <label className="block mb-2 font-bold text-indigo-400">📦 ملحقات الجهاز المستلمة:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {accessoriesList.map(acc => {
                    const isSelected = selectedAccessories.includes(acc);
                    return (
                      <button
                        type="button"
                        key={acc}
                        onClick={() => {
                          if (isSelected) setSelectedAccessories(selectedAccessories.filter(a => a !== acc));
                          else setSelectedAccessories([...selectedAccessories, acc]);
                        }}
                        className={`p-3 rounded-xl text-right border transition flex items-center justify-between ${
                          isSelected ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow' : `${theme.badgeInactive} hover:opacity-80`
                        }`}
                      >
                        <span className="truncate">{acc}</span>
                        <span className="shrink-0">{isSelected ? '☑️' : '◻️'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* الأعطال */}
              <div>
                <label className="block mb-2 font-bold text-indigo-400">🛠️ حدد الأعطال المطلوبة:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                  {issuesList.map(issue => {
                    const isSelected = selectedIssues.includes(issue);
                    return (
                      <button
                        type="button"
                        key={issue}
                        onClick={() => {
  if (isSelected) {
    setSelectedIssues(selectedIssues.filter(i => i !== issue));
    const newChoices = { ...issueChoices };
    delete newChoices[issue];
    setIssueChoices(newChoices);
  } else {
    const matches = inventory.filter(inv =>
      inv.brand.toLowerCase() === dType.toLowerCase() &&
      inv.partName.toLowerCase().trim() === issue.toLowerCase().trim() &&
      inv.quantity > 0
    );
    
    if (matches.length > 1) {
      setPartChoiceModal({ issue, options: matches });
    } else if (matches.length === 1) {
      setSelectedIssues([...selectedIssues, issue]);
      setIssueChoices({ ...issueChoices, [issue]: matches[0].id });
    } else {
      setSelectedIssues([...selectedIssues, issue]);
    }
  }
}}
                        className={`p-3 rounded-xl text-right border transition flex items-center justify-between ${
                          isSelected ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow' : `${theme.badgeInactive} hover:opacity-80`
                        }`}
                      >
                        <span className="truncate">{issue}</span>
                        <span className="shrink-0">{isSelected ? '☑️' : '◻️'}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>✍️ أعطال أو تفاصيل أخرى:</label>
                  <input value={customIssue} onChange={e => setCustomIssue(e.target.value)} type="text" className={`w-full ${theme.input} p-3 rounded-xl`} placeholder="اكتب ملاحظات إضافية للعطل..." />
                </div>
              </div>

              {/* التسعير */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#30363d] pt-4">
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>سعر الصيانة للعميل (ج.م)</label>
                  <input value={price} onChange={e => setPrice(Number(e.target.value))} type="number" className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
                </div>

                {userRole === 'admin' ? (
                  <div>
                    <label className="block mb-1 text-amber-400">🔒 تكلفة القطعة الداخلية</label>
                    <input value={partCost} onChange={e => setPartCost(Number(e.target.value))} type="number" className={`w-full ${theme.input} p-3.5 rounded-xl font-bold border-amber-500/30`} />
                    <span className={`text-2xs block mt-1 ${theme.textMuted}`}>تُحسب تلقائيًا من المخزن عند اختيار الأعطال (يمكن تعديلها يدويًا).</span>
                  </div>
                ) : (
                  <div className="flex items-end">
                    <span className={`p-3.5 rounded-xl w-full text-center border font-medium ${darkMode ? 'text-zinc-400 bg-[#0d1117] border-[#30363d]' : 'text-slate-500 bg-[#f0f3f6] border-[#d0d7de]'}`}>
                      🔒 تكلفة القطعة محجوبة
                    </span>
                  </div>
                )}

                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>العربون المدفوع (ج.م)</label>
                  <input value={deposit} onChange={e => setDeposit(Number(e.target.value))} type="number" className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
                  <span className={`text-2xs block mt-1 ${theme.textMuted}`}>
                    المتبقي على العميل: {Math.max(0, Number(price) - Number(deposit))} ج.م
                  </span>
                </div>
              </div>

              {/* التسليم المتوقع */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className={`block mb-1 ${theme.textMuted}`}>⏱️ التسليم المتوقع</label>
                  <select value={expectedDeliveryOption} onChange={e => setExpectedDeliveryOption(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}>
                    <option value="1h">فوراً خلال ساعة واحدة</option>
                    <option value="24h">فوراً خلال 24 ساعة</option>
                    <option value="custom">تاريخ مخصص</option>
                  </select>
                </div>
                {expectedDeliveryOption === 'custom' && (
                  <div>
                    <label className={`block mb-1 ${theme.textMuted}`}>التاريخ المخصص</label>
                    <input value={customExpectedDate} onChange={e => setCustomExpectedDate(e.target.value)} type="text" placeholder="مثال: 2026-01-15 أو بعد أسبوع" className={`w-full ${theme.input} p-3.5 rounded-xl`} />
                  </div>
                )}
              </div>

              {/* الملاحظات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>ملاحظات للعميل (تظهر في الإيصال)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`w-full ${theme.input} p-3 rounded-xl`} placeholder="مثال: الشاشة تحتاج 3 أيام للوصول..." />
                </div>
                {userRole === 'admin' && (
                  <div>
                    <label className="block mb-1 text-amber-400">🔒 ملاحظات داخلية (لا تظهر للعميل)</label>
                    <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={3} className={`w-full ${theme.input} p-3 rounded-xl border-amber-500/30`} placeholder="ملاحظات خاصة بالفني..." />
                  </div>
                )}
              </div>

              {/* أزرار */}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition">
                  {editingReceiptId ? '💾 حفظ التعديلات' : '💾 حفظ في السحابة المحلية وإرسال رسالة الاستلام'}
                </button>
                {editingReceiptId && (
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab('receipts'); }}
                    className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold px-6 py-4 rounded-2xl transition"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ================= 📋 الإيصالات ================= */}
          {activeTab === 'receipts' && (
            <div className="space-y-4">

              <div className={`${theme.card} p-4 rounded-2xl border space-y-3`}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-bold text-indigo-400">📋 عرض ومتابعة الإيصالات في السحابة المحلية</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${theme.textMuted}`}>حالة الإيصالات:</span>
                    <select
                      value={receiptStatusFilter}
                      onChange={e => setReceiptStatusFilter(e.target.value as 'all' | DeviceStatus)}
                      className={`p-2.5 rounded-xl font-bold text-xs outline-none cursor-pointer border ${
                        darkMode ? 'bg-[#0d1117] text-indigo-300 border-[#30363d]' : 'bg-white text-indigo-600 border-[#d0d7de]'
                      }`}
                    >
                      <option value="all">📁 عرض الكل</option>
                      <option value="pending">⏳ قيد الصيانة</option>
                      <option value="ready">🔔 جاهز للاستلام</option>
                      <option value="waiting_parts">⏸️ انتظار قطع غيار</option>
                      <option value="done">✅ تم التسليم</option>
                    </select>
                  </div>
                </div>

                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="ابحث برقم الإيصال، اسم العميل، رقم الهاتف، أو سيريال الجهاز..."
                  className={`w-full ${theme.input} p-3.5 rounded-xl`}
                />

                {/* ملخص + تصدير */}
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className={`flex flex-wrap gap-3 text-2xs ${theme.textMuted}`}>
                    <span>الكل: <b className="text-indigo-400">{receipts.length}</b></span>
                    <span>قيد: <b className="text-amber-400">{pendingCount}</b></span>
                    <span>جاهز: <b className="text-teal-400">{readyCount}</b></span>
                    <span>انتظار: <b className="text-amber-400">{waitingPartsCount}</b></span>
                    <span>تم: <b className="text-emerald-400">{doneCount}</b></span>
                  </div>
                  {userRole === 'admin' && (
                    <button
                      onClick={handleExportReceiptsCSV}
                      className="text-2xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl font-bold"
                    >
                      📊 تصدير CSV
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredReceipts.map(r => {
                  const remaining = r.price - r.deposit;
                  return (
                    <div
                      key={r.id}
                      className={`${theme.card} p-5 rounded-2xl border flex flex-col gap-3 ${r.isArchived ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="font-black text-indigo-400 text-sm">{r.receiptNumber}</strong>
                            <span className="font-bold">- {r.customerName} ({r.customerPhone})</span>
                            <span className={`px-3 py-0.5 rounded-full text-2xs font-bold ${
                              r.status === 'done'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : r.status === 'ready'
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                : r.status === 'waiting_parts'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                            }`}>
                              {r.status === 'done' ? 'تم التسليم' :
                               r.status === 'ready' ? 'جاهز للاستلام' :
                               r.status === 'waiting_parts' ? 'انتظار قطع' : 'قيد الصيانة'}
                            </span>
                            {r.isArchived && (
                              <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                🗄️ {r.archiveReason || 'مؤرشف'}
                              </span>
                            )}
                          </div>

                          <p className={`mt-1.5 text-xs ${theme.textMuted}`}>
                            الجهاز: <strong className="text-indigo-400">{r.deviceType}</strong> {r.deviceModel}
                            {r.imei ? ` | IMEI: ${r.imei}` : ''} | الأعطال: {r.issues.join('، ')}
                          </p>
                          <p className={`mt-1 text-2xs ${theme.textMuted}`}>تاريخ الاستلام: {r.receivedAt}</p>

                          <div className="flex gap-4 mt-2 font-bold flex-wrap text-xs">
                            <span className="text-amber-400">المتبقي: {remaining} ج.م</span>
                            {userRole === 'admin' && (
                              <span className="text-emerald-400 border-r pr-3 border-[#30363d]">
                                الربح الصافي: {r.price - (r.partCost || 0)} ج.م
                              </span>
                            )}
                          </div>
                        </div>

                        {r.image && (
                          <img src={r.image} alt="Device" className="w-16 h-16 object-cover rounded-xl border border-zinc-700 shrink-0 shadow" />
                        )}
                      </div>

                      <div className="border-t pt-3 flex flex-wrap gap-2 justify-between items-center border-[#30363d]">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => printThermalReceipt(r)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl font-bold shadow transition flex items-center gap-1.5 text-xs"
                          >
                            🖨️ طباعة
                          </button>

                          <button
                            onClick={() => {
                              const msg =
                                `مرحباً أستاذ/ة ${r.customerName} 🌹\n` +
                                `تم استلام جهازكم (${r.deviceType} ${r.deviceModel}) لدى ${shopName} 📱✨\n` +
                                `📌 الإيصال: ${r.receiptNumber}\n` +
                                `🔧 العطل: ${r.issues.join('، ')}\n` +
                                `💵 العربون: ${r.deposit} ج.م\n` +
                                `💰 الإجمالي: ${r.price} ج.م\n` +
                                `📌 المتبقي: ${remaining} ج.م\n` +
                                `📞 هاتف الإدارة: ${shopPhone}`;
                              openWhatsAppDirect(r.customerPhone, msg);
                            }}
                            className={`border px-3.5 py-2 rounded-xl font-bold transition text-xs ${theme.badgeInactive}`}
                          >
                            💬 واتساب
                          </button>

                          <button
                            onClick={() => markReceiptReady(r)}
                            className="bg-teal-500/10 text-teal-400 border border-teal-500/30 px-3.5 py-2 rounded-xl font-bold text-xs"
                          >
                            🔔 جاهز
                          </button>

                          <button
                            onClick={() => markReceiptWaitingParts(r)}
                            className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl font-bold text-xs"
                          >
                            ⏸️ انتظار قطع
                          </button>

                          <button
                            onClick={() => markReceiptDelivered(r)}
                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl font-bold text-xs"
                          >
                            ✅ تسليم
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditingReceipt(r)}
                            className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-2 rounded-xl font-bold text-xs"
                          >
                            ✏️ تعديل
                          </button>

                          {userRole === 'admin' && !r.isArchived && (
                            <button
                              onClick={() => {
                                const reason = prompt('سبب الأرشفة (ملغى / مرتجع / أخرى):', 'ملغى');
                                if (reason && reason.trim()) handleArchiveReceipt(r, reason.trim());
                              }}
                              className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-3 py-2 rounded-xl font-bold text-xs"
                              title="أرشفة الإيصال"
                            >
                              🗄️
                            </button>
                          )}

                          {userRole === 'admin' && (
                            <button
                              onClick={() => handleDeleteReceipt(r.id, r.receiptNumber)}
                              className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-xl font-bold text-xs"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredReceipts.length === 0 && (
                  <div className={`p-8 text-center ${theme.textMuted}`}>
                    لا توجد إيصالات مطابقة في السحابة المحلية.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 📦 المخزن ================= */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">

              <div className={`${theme.card} p-5 rounded-2xl border flex justify-between items-center flex-wrap gap-4`}>
                <div>
                  <h2 className="font-bold text-indigo-400">📦 المخزن الداخلي وقطع الغيار</h2>
                  <p className={`mt-0.5 text-xs ${theme.textMuted}`}>إدارة قطع الغيار والكميات لكل شركة وموديل.</p>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-left">
                  <span className="text-2xs text-indigo-400 block font-bold">إجمالي قيمة المخزن:</span>
                  <strong className="text-lg font-black text-indigo-400">{totalInventoryMoney.toLocaleString()} ج.م</strong>
                </div>
              </div>

              {outOfStockParts.length > 0 && (
                <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/30 text-rose-300">
                  <strong className="block text-sm mb-1">⚠️ {outOfStockParts.length} قطعة نفذت من المخزن</strong>
                  <p className="text-2xs">
                    {outOfStockParts.map(p => `${p.brand} ${p.deviceModel} — ${p.partName}`).join(' • ')}
                  </p>
                </div>
              )}

              <form onSubmit={handleBulkAddInventory} className={`${theme.card} p-6 rounded-2xl border space-y-4`}>
                <h3 className="font-bold text-indigo-400">➕ إضافة أو تحديث قطع المخزن للشركات</h3>

                <div className="space-y-2">
                  <label className="block font-bold">1. اختر الشركة المصنعة:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {marketBrands.map(b => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => setBulkBrandTarget(b)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold border transition text-xs ${
                          bulkBrandTarget === b ? 'bg-indigo-600 text-white border-indigo-500 shadow' : theme.badgeInactive
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
  <div>
    <label className={`block mb-1 ${theme.textMuted}`}>2. موديل الجهاز</label>
    <input type="text" value={bulkModelTarget} onChange={e => setBulkModelTarget(e.target.value)} placeholder="مثال: A15 أو عام" className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
  </div>
  <div>
    <label className={`block mb-1 ${theme.textMuted}`}>3. الكمية المضافة *</label>
    <input type="number" value={bulkQty} onChange={e => setBulkQty(Number(e.target.value))} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
  </div>
  <div>
    <label className={`block mb-1 ${theme.textMuted}`}>4. تكلفة القطعة (ج.م) *</label>
    <input type="number" value={bulkCost} onChange={e => setBulkCost(Number(e.target.value))} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
  </div>
</div>

{/* 🆕 حقول إضافية */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  <div>
    <label className={`block mb-1 ${theme.textMuted}`}>🏢 المورد (اختياري)</label>
    <input
      type="text"
      value={bulkSupplier}
      onChange={e => setBulkSupplier(e.target.value)}
      placeholder="مثال: أحمد للموبايلات"
      className={`w-full ${theme.input} p-3.5 rounded-xl`}
      list="bulk-suppliers-list"
    />
    <datalist id="bulk-suppliers-list">
      {Array.from(new Set(inventory.map(i => i.supplierName).filter(Boolean))).map((s, idx) => (
        <option key={idx} value={s as string} />
      ))}
    </datalist>
  </div>
  <div>
    <label className={`block mb-1 ${theme.textMuted}`}>⚠️ الحد الأدنى للتنبيه</label>
    <input
      type="number"
      value={bulkMinQty}
      onChange={e => setBulkMinQty(Number(e.target.value))}
      min={1}
      className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}
    />
    <span className={`text-2xs ${theme.textMuted} block mt-1`}>
      ينبهك لما الكمية توصل للرقم ده (افتراضي: 1)
    </span>
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
  <div>
    <label className={`block mb-1 ${theme.textMuted}`}>🏷️ التصنيف</label>
    <select
      value={bulkCategory}
      onChange={e => setBulkCategory(e.target.value)}
      className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}
    >
      <option value="original">🟢 أصلي</option>
      <option value="copy">🟡 تجاري</option>
      <option value="pulled">🔵 مسحوب</option>
      <option value="other">⚪ أخرى</option>
    </select>
  </div>
  <div>
    <label className={`block mb-1 ${theme.textMuted}`}>✨ الحالة</label>
    <select
      value={bulkCondition}
      onChange={e => setBulkCondition(e.target.value)}
      className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}
    >
      <option value="new">✨ جديدة</option>
      <option value="used">🔧 مستعملة</option>
      <option value="for_repair">⚙️ للصيانة</option>
    </select>
  </div>
  <div>
    <label className={`block mb-1 ${theme.textMuted}`}>📝 ملاحظات</label>
    <input
      type="text"
      value={bulkNotes}
      onChange={e => setBulkNotes(e.target.value)}
      placeholder="ملاحظات إضافية..."
      className={`w-full ${theme.input} p-3.5 rounded-xl`}
    />
  </div>
</div>
                {/* 5. اختر قطع الغيار */}
                <div>
                  <label className="block mb-2 font-bold">5. اختر قطع الغيار:</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {partsList.map(part => {
                      const isChecked = selectedPartsForInventory.includes(part);
                      return (
                        <button
                          type="button"
                          key={part}
                          onClick={() => {
                            if (isChecked) setSelectedPartsForInventory(selectedPartsForInventory.filter(p => p !== part));
                            else setSelectedPartsForInventory([...selectedPartsForInventory, part]);
                          }}
                          className={`p-3 rounded-xl text-right border transition flex items-center justify-between text-xs ${
                            isChecked ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow' : `${theme.badgeInactive} hover:opacity-80`
                          }`}
                        >
                          <span className="truncate">{part}</span>
                          <span className="shrink-0">{isChecked ? '☑️' : '◻️'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow transition text-xs">
                  🚀 إتمام وإضافة القطع للمخزن ({bulkBrandTarget})
                </button>
              </form>

              <div className={`${theme.card} p-5 rounded-2xl border space-y-3`}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-bold text-indigo-400">🏢 فلترة المخزن:</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedInventoryBrandFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold border transition text-2xs ${
                        selectedInventoryBrandFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-500' : theme.badgeInactive
                      }`}
                    >
                      كل الشركات
                    </button>
                    {marketBrands.map(b => (
                      <button
                        key={b}
                        onClick={() => setSelectedInventoryBrandFilter(b)}
                        className={`px-3 py-1.5 rounded-xl font-bold border transition text-2xs ${
                          selectedInventoryBrandFilter === b ? 'bg-indigo-600 text-white border-indigo-500' : theme.badgeInactive
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
{/* فلتر التصنيف */}
<div className="flex gap-2 flex-wrap justify-end items-center">
  <span className={`text-sm font-bold ${theme.textMuted}`}>فلترة التصنيف:</span>
  {["الكل", "أصلي", "تجاري", "مسحوب"].map(cat => (
    <button
      key={cat}
      onClick={() => setSelectedCategory(cat)}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
        selectedCategory === cat
          ? "bg-indigo-600 text-white shadow"
          : "bg-gray-100/10 text-gray-300 hover:bg-gray-100/20"
      }`}
    >
      {cat}
    </button>
  ))}
</div>
{/* فلتر الحالة */}
<div className="flex gap-2 flex-wrap justify-end items-center">
  <span className={`text-sm font-bold ${theme.textMuted}`}>فلترة الحالة:</span>
  {["الكل", "جديدة", "مستعملة", "للصيانة"].map(cond => (
    <button
      key={cond}
      onClick={() => setSelectedCondition(cond)}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
        selectedCondition === cond
          ? "bg-emerald-600 text-white shadow"
          : "bg-gray-100/10 text-gray-300 hover:bg-gray-100/20"
      }`}
    >
      {cond}
    </button>
  ))}
</div>
                <input
                  value={inventorySearchQuery}
                  onChange={e => setInventorySearchQuery(e.target.value)}
                  type="text"
                  placeholder="بحث ذكي برقم الموديل، الصنف، أو الشركة (يتجاهل المسافات والهمزات)..."
                  className={`w-full ${theme.input} p-3.5 rounded-xl`}
                />

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className={`border-b ${theme.subHeader}`}>
                        <th className="p-3">الشركة</th>
                        <th className="p-3">موديل الجهاز</th>
                        <th className="p-3">قطعة الغيار</th>
                        <th className="p-3">التصنيف</th>
<th className="p-3">الحالة</th>
                        <th className="p-3">الكمية</th>
                        <th className="p-3">تكلفة الوحدة</th>
                        <th className="p-3">إجمالي القيمة</th>
                        <th className="p-3 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map(item => (
                        <tr key={item.id} className="border-b border-[#30363d]/40 hover:bg-indigo-500/5 transition">
                          <td className="p-3 font-bold text-indigo-400">{item.brand}</td>
                          <td className="p-3 font-semibold text-teal-400">{item.deviceModel || 'عام'}</td>
                          <td className={`p-3 font-bold ${item.quantity === 0 ? 'text-rose-400' : ''}`}>
                            {item.partName} {item.quantity === 0 && ' (⚠️ نفذت)'}
                          </td>
                          <td className="p-3">
  {item.category === 'original' && <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-2xs font-bold">🟢 أصلي</span>}
  {item.category === 'copy' && <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 text-2xs font-bold">✨ تجاري</span>}
  {item.category === 'pulled' && <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 text-2xs font-bold">📤 مسحوب</span>}
  {!item.category && <span className={`text-2xs ${theme.textMuted}`}>—</span>}
</td>
<td className="p-3">
  {item.condition === 'new' && <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-2xs font-bold">🆕 جديدة</span>}
  {item.condition === 'used' && <span className="px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-400 text-2xs font-bold">♻️ مستعملة</span>}
  {item.condition === 'maintenance' && <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 text-2xs font-bold">🔧 للصيانة</span>}
  {!item.condition && <span className={`text-2xs ${theme.textMuted}`}>—</span>}
</td>
                          <td className="p-3">
                            <span className={`px-3 py-1 rounded-lg font-black ${item.quantity === 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">{item.costPrice} ج.م</td>
                          <td className="p-3 font-black text-indigo-400">{(item.quantity * item.costPrice).toLocaleString()} ج.م</td>
                         <td className="p-3 text-center">
  <div className="flex gap-1 justify-center">
    <button
      onClick={() => {
        setEditingItem({ ...item });
        setIsEditModalOpen(true);
      }}
      className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-xl font-bold hover:bg-indigo-500/20 transition"
      title="تعديل"
    >
      ✏️
    </button>
    <button
      onClick={() => handleDeleteInventoryItem(item.id)}
      className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl font-bold hover:bg-rose-500/20 transition"
      title="حذف"
    >
      🗑️
    </button>
  </div>
</td>
                        </tr>
                      ))}
                      {filteredInventory.length === 0 && (
                        <tr>
                          <td colSpan={7} className={`p-6 text-center ${theme.textMuted}`}>لا توجد قطع مطابقة.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 💵 الخزينة ================= */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {userRole === 'technician' ? (
                <div className={`${theme.card} p-8 rounded-xl border text-center text-rose-400 font-bold`}>
                  عذراً، هذا القسم مخصص للمدير العام فقط.
                </div>
              ) : (
                <>
                  <div className={`${theme.card} p-6 rounded-2xl border`}>
                    <h2 className="font-bold text-indigo-400 mb-2">💵 إدارة المصروفات والخزينة اليومية</h2>
                    <p className={`mb-4 text-xs ${theme.textMuted}`}>
                      سجل الصادر (مصروفات نثرية، شاي، إيجار) والوارد لضبط الدرج بدقة.
                    </p>

                    <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>بيان المعاملة / المصروف *</label>
                        <input type="text" required value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="مثال: أدوات صيانة / إيجار" className={`w-full ${theme.input} p-3.5 rounded-xl`} />
                      </div>
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>المبلغ (ج.م) *</label>
                        <input type="number" required value={expAmount} onChange={e => setExpAmount(Number(e.target.value))} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
                      </div>
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>نوع المعاملة</label>
                        <select value={expType} onChange={e => setExpType(e.target.value as 'expense' | 'income')} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}>
                          <option value="expense">مصروف (صادر 🔻)</option>
                          <option value="income">إيراد إضافي (وارد 🟢)</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3.5 rounded-xl shadow transition text-xs">
                          + تسجيل المعاملة
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className={`${theme.card} p-6 rounded-2xl border space-y-4`}>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <h3 className="font-bold text-indigo-400">📋 سجل المعاملات المالية اليومية</h3>
                      <button
                        onClick={handleExportExpensesCSV}
                        className="text-2xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl font-bold"
                      >
                        📊 تصدير CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className={`border-b ${theme.subHeader}`}>
                            <th className="p-3">البيان</th>
                            <th className="p-3">التاريخ والوقت</th>
                            <th className="p-3">النوع</th>
                            <th className="p-3">المبلغ</th>
                            <th className="p-3 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map(exp => (
                            <tr key={exp.id} className="border-b border-[#30363d]/40 hover:bg-indigo-500/5 transition">
                              <td className="p-3 font-bold">{exp.title}</td>
                              <td className={`p-3 ${theme.textMuted}`}>{exp.date}</td>
                              <td className="p-3">
                                <span className={`px-3 py-1 rounded-full font-bold ${exp.type === 'expense' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                  {exp.type === 'expense' ? 'مصروف (صادر)' : 'إيراد (وارد)'}
                                </span>
                              </td>
                              <td className={`p-3 font-black ${exp.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {exp.type === 'expense' ? '-' : '+'}{exp.amount} ج.م
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl font-bold"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                          {expenses.length === 0 && (
                            <tr>
                              <td colSpan={5} className={`p-6 text-center ${theme.textMuted}`}>لا توجد معاملات مسجلة بعد.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}          {/* ================= 📷 الباركود ================= */}
          {activeTab === 'scanner' && (
            <div className={`${theme.card} p-6 rounded-2xl border max-w-2xl mx-auto space-y-6 text-center`}>
              <div>
                <h2 className="font-bold text-indigo-400 text-lg mb-1">📷 قارئ الباركود ورقم الإيصال</h2>
                <p className={`text-xs ${theme.textMuted}`}>امسح باركود الإيصال أو اكتب رقمه للوصول السريع.</p>
              </div>

              <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center gap-4 ${darkMode ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-300'}`}>
                <div className="w-full h-48 rounded-2xl bg-zinc-900 border border-indigo-500/50 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                  {isScanningActive ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-white">
                      <div className="w-48 h-12 border-2 border-dashed border-emerald-400 rounded-lg animate-pulse flex items-center justify-center">
                        <span className="text-2xs text-emerald-300 font-bold">جاري التقاط الباركود...</span>
                      </div>
                      <button
                        onClick={() => setIsScanningActive(false)}
                        className="mt-4 bg-rose-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold"
                      >
                        إيقاف الكاميرا
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <span className="text-3xl">📷</span>
                      <button
                        onClick={() => {
                          setIsScanningActive(true);
                          setTimeout(() => {
                            setIsScanningActive(false);
                            const sample = receipts[0]?.receiptNumber || 'BG-1001';
                            setScannedResult(sample);
                            showToast(`تم التعرف على الكود: ${sample}`);
                          }, 2000);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow"
                      >
                        تشغيل الكاميرا
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-full space-y-2 text-right">
                  <label className={`block text-xs ${theme.textMuted}`}>أو أدخل رقم الإيصال يدوياً:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannedResult}
                      onChange={e => setScannedResult(e.target.value)}
                      placeholder={`مثال: ${receiptPrefix}-1001`}
                      className={`w-full ${theme.input} p-3.5 rounded-xl`}
                    />
                    <button
                      onClick={() => {
                        if (!scannedResult.trim()) {
                          showToast('يرجى إدخال الكود أولاً', 'error');
                          return;
                        }
                        setSearchQuery(scannedResult);
                        setActiveTab('receipts');
                        showToast('تم العثور على الإيصال!');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 rounded-xl text-xs"
                    >
                      بحث فوري
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 👨‍💼 فريق العمل ================= */}
          {activeTab === 'staff' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {userRole === 'technician' ? (
                <div className={`${theme.card} p-8 rounded-xl border text-center text-rose-400 font-bold`}>
                  عذراً، إدارة فريق العمل مخصصة للمدير العام فقط.
                </div>
              ) : (
                <>
                  <div className={`${theme.card} p-6 rounded-2xl border`}>
                    <h2 className="font-bold text-indigo-400 text-base mb-1">👨‍💼 إضافة موظف أو مهندس صيانة جديد</h2>
                    <p className={`text-xs ${theme.textMuted} mb-4`}>قم بإضافة فنيين ومشرفين مع تحديد اسم ورقم سري PIN خاص بكل فرد.</p>

                    <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>اسم المهندس / الموظف *</label>
                        <input type="text" required value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="مثال: أحمد مصطفى" className={`w-full ${theme.input} p-3.5 rounded-xl`} />
                      </div>
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>البريد الإلكتروني *</label>
                        <input type="email" required value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} placeholder="employee@example.com" className={`w-full ${theme.input} p-3.5 rounded-xl`} />
                      </div>
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>الدور</label>
                        <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as UserRole)} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}>
                          <option value="technician">👨‍🔧 فني صيانة</option>
                          <option value="admin">👨‍💼 مدير عام</option>
                        </select>
                      </div>
                      {/* حقل كلمة السر — واحد بس */}
<div>
  <label className={`block mb-1 ${theme.textMuted}`}>كلمة السر *</label>
  <input
    type="text"
    required
    value={newStaffPassword}
    onChange={e => setNewStaffPassword(e.target.value)}
    placeholder="8+ أحرف"
    className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}
  />
</div>
                      <div>
  <label className={`block mb-1 ${theme.textMuted}`}>كلمة السر للموظف *</label>
  <input
    type="text"
    required
    value={newStaffPassword}
    onChange={e => setNewStaffPassword(e.target.value)}
    placeholder="8+ أحرف، حروف كبيرة + أرقام"
    className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`}
  />
  <span className={`text-2xs ${theme.textMuted} block mt-1`}>
    💡 مثال: Boody@2024
  </span>
</div>
                      <div className="md:col-span-4 pt-2">
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3.5 rounded-2xl shadow transition text-xs">
                          + حفظ وإضافة المهندس الجديد
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className={`${theme.card} p-6 rounded-2xl border space-y-4`}>
                    <h3 className="font-bold text-indigo-400">📋 قائمة فريق العمل والمهندسين ({staffList.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {staffList.map(member => (
                        <div key={member.id} className={`p-4 rounded-xl border flex justify-between items-center ${darkMode ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-300'}`}>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="font-bold text-sm">{member.name}</strong>
                              <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold ${member.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'}`}>
                                {member.role === 'admin' ? 'مدير عام' : 'فني صيانة'}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 ${theme.textMuted}`}>هاتف: {member.phone} | PIN: ••••</p>
                          </div>
                          <div className="flex gap-2 items-center flex-wrap">
                            <button
                              onClick={() => handlePasswordResetRequest(member)}
                              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl text-2xs font-bold"
                              title="إرسال طلب تعديل كلمة السر عبر الواتساب للمدير"
                            >
                              🔑 تعديل كلمة السر
                            </button>
                            <button
  onClick={() => handleToggleRole(member)}
  className={`border px-3 py-1.5 rounded-xl text-2xs font-bold ${
    member.role === 'admin'
      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }`}
  title={member.role === 'admin' ? 'تخفيض إلى فني' : 'ترقية إلى مدير'}
>
  {member.role === 'admin' ? '⬇️ تخفيض لفني' : '⬆️ ترقية لمدير'}
</button>
                            {staffList.length > 1 && (
                              <button
                                onClick={() => handleDeleteStaff(member.id)}
                                className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl text-2xs font-bold"
                              >
                                🗑️ حذف
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================= ☁️ السحابة المحلية ================= */}
          {activeTab === 'cloud' && (
            <div className={`${theme.card} p-6 rounded-2xl border max-w-2xl mx-auto space-y-6 text-center`}>
              <div>
                <h2 className="font-bold text-cyan-400 text-lg mb-1">💻 السحابة المحلية داخل البرنامج</h2>
                <p className={`text-xs ${theme.textMuted}`}>
                  بياناتك محفوظة محلياً بالكامل على الكمبيوتر مع إمكانية المزامنة والنسخ الاحتياطي.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-4 ${darkMode ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-300'}`}>
                <div className="flex items-center justify-between border-b border-[#30363d] pb-3 text-right flex-wrap gap-2">
                  <div>
                    <strong className="block text-sm">حالة السحابة المحلية:</strong>
                    <span className="text-xs text-emerald-400">
                      {cloudSyncStatus === 'syncing' ? 'جاري المزامنة...' : 'تعمل بكفاءة عالية على الكمبيوتر بنجاح ✅'}
                    </span>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-bold">
                    {cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Local Cloud Active'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className={`p-3 rounded-xl border ${darkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-slate-200'}`}>
                    <span className={`block text-2xs ${theme.textMuted}`}>الإيصالات</span>
                    <strong className="text-lg font-black text-indigo-400">{receipts.length}</strong>
                  </div>
                  <div className={`p-3 rounded-xl border ${darkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-slate-200'}`}>
                    <span className={`block text-2xs ${theme.textMuted}`}>قطع المخزن</span>
                    <strong className="text-lg font-black text-teal-400">{inventory.length}</strong>
                  </div>
                  <div className={`p-3 rounded-xl border ${darkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-slate-200'}`}>
                    <span className={`block text-2xs ${theme.textMuted}`}>المعاملات</span>
                    <strong className="text-lg font-black text-amber-400">{expenses.length}</strong>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap justify-center pt-2">
                  <button
                    onClick={handleCloudSync}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-3.5 rounded-2xl shadow-lg transition text-xs"
                  >
                    🔄 حفظ وتحديث السحابة المحلية الآن
                  </button>
                  <button
                    onClick={handleExportBackup}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3.5 rounded-2xl shadow-lg transition text-xs"
                  >
                    ⬇️ تصدير نسخة احتياطية (JSON)
                  </button>
                  <label className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-3.5 rounded-2xl shadow-lg transition text-xs cursor-pointer">
                    ⬆️ استيراد نسخة احتياطية
                    <input type="file" accept=".json,application/json" onChange={handleImportBackup} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================= ✅ التسليم ================= */}
          {activeTab === 'delivery' && (
            <div className={`${theme.card} p-6 rounded-2xl border max-w-xl mx-auto space-y-4`}>
              <h2 className="font-bold text-indigo-400">✅ تسليم الجهاز وإرسال إرشادات الحماية</h2>
              <input
                type="text"
                placeholder="ابحث برقم الإيصال أو اسم العميل..."
                value={deliverySearchInput}
                onChange={e => setDeliverySearchInput(e.target.value)}
                className={`w-full ${theme.input} p-3.5 rounded-xl`}
              />

              {receipts
                .filter(r =>
                  r.receiptNumber.toLowerCase().includes(deliverySearchInput.toLowerCase()) ||
                  r.customerName.toLowerCase().includes(deliverySearchInput.toLowerCase())
                )
                .map(r => {
                  const remaining = r.price - r.deposit;
                  return (
                    <div key={r.id} className={`p-4 rounded-xl border border-[#30363d] space-y-2 ${darkMode ? 'bg-[#0d1117]/50' : 'bg-slate-50'}`}>
                      <div className="flex justify-between font-bold flex-wrap gap-2">
                        <span className="text-indigo-400">{r.receiptNumber} - {r.customerName}</span>
                        <span className="text-amber-400">المتبقي: {remaining} ج.م</span>
                      </div>
                      <div className="text-xs">الجهاز: {r.deviceType} {r.deviceModel}</div>
                      {r.status !== 'done' ? (
                        <button
                          onClick={() => markReceiptDelivered(r)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-2 transition text-xs shadow"
                        >
                          ✓ تأكيد التسليم وإرسال رسالة الإرشادات النهائية واتساب
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-bold block pt-1 text-xs">
                          ✅ تم تسليم هذا الجهاز مسبقاً {r.deliveredAt ? `(${r.deliveredAt})` : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              {receipts.filter(r =>
                r.receiptNumber.toLowerCase().includes(deliverySearchInput.toLowerCase()) ||
                r.customerName.toLowerCase().includes(deliverySearchInput.toLowerCase())
              ).length === 0 && (
                <p className={`text-center py-4 text-xs ${theme.textMuted}`}>لا توجد نتائج مطابقة.</p>
              )}
            </div>
          )}

          {/* ================= 📊 التقارير والأرباح ================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {userRole === 'technician' ? (
                <div className={`${theme.card} p-8 rounded-xl border text-center text-rose-400 font-bold`}>
                  عذراً، هذا القسم محمي ومخصص للمدير العام فقط.
                </div>
              ) : (
                <div className="space-y-6">
                 <h2 className="font-bold text-emerald-400">
  📊 تقرير الحسابات والأرباح ({rangeFrom} ← {rangeTo})
</h2>
{/* فلتر الفترة */}
<div className={`${theme.card} p-4 rounded-2xl border mb-4`}>
  <div className="flex flex-wrap gap-3 items-end">
    <div className="flex-1 min-w-[140px]">
      <label className={`block mb-1 text-xs ${theme.textMuted}`}>📅 من تاريخ</label>
      <input
        type="date"
        value={reportFromDate}
        onChange={e => setReportFromDate(e.target.value)}
        className={`w-full ${theme.input} p-2.5 rounded-xl`}
      />
    </div>
    <div className="flex-1 min-w-[140px]">
      <label className={`block mb-1 text-xs ${theme.textMuted}`}>📅 إلى تاريخ</label>
      <input
        type="date"
        value={reportToDate}
        onChange={e => setReportToDate(e.target.value)}
        className={`w-full ${theme.input} p-2.5 rounded-xl`}
      />
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => {
          const today = new Date().toISOString().split('T')[0];
          setReportFromDate(today);
          setReportToDate(today);
        }}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs"
      >
        اليوم
      </button>
      <button
        onClick={() => {
          const today = new Date();
          const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          setReportFromDate(firstOfMonth.toISOString().split('T')[0]);
          setReportToDate(today.toISOString().split('T')[0]);
        }}
        className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs"
      >
        الشهر
      </button>
      <button
        onClick={() => {
          const today = new Date();
          const last7 = new Date();
          last7.setDate(today.getDate() - 7);
          setReportFromDate(last7.toISOString().split('T')[0]);
          setReportToDate(today.toISOString().split('T')[0]);
        }}
        className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs"
      >
        آخر 7 أيام
      </button>
      <button
        onClick={() => {
          setReportFromDate('');
          setReportToDate('');
        }}
        className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs"
      >
        مسح
      </button>
    </div>
  </div>
</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`${theme.card} p-5 rounded-2xl border`}>
                      <span className={`block mb-1 text-xs ${theme.textMuted}`}>إجمالي المبيعات (المسلّمة اليوم)</span>
                      <strong className="text-2xl font-black">{rangeTotalRevenue.toLocaleString()} ج.م</strong>
                    </div>
                    <div className={`${theme.card} p-5 rounded-2xl border`}>
                      <span className={`block mb-1 text-xs ${theme.textMuted}`}>تكلفة القطع المستخدمة</span>
                      <strong className="text-2xl font-black text-amber-400">{rangeTotalCosts.toLocaleString()} ج.م</strong>
                    </div>
                    <div className={`${theme.card} p-5 rounded-2xl border`}>
                      <span className={`block mb-1 text-xs ${theme.textMuted}`}>المصروفات النثرية</span>
                      <strong className="text-2xl font-black text-rose-400">{rangeExpenseTotal.toLocaleString()} ج.م</strong>
                    </div>
                    <div className={`${theme.card} p-5 rounded-2xl border`}>
                      <span className="text-emerald-400 block mb-1 font-bold text-xs">صافي الربح الفعلي 🎯</span>
                      <strong className="text-3xl font-black text-emerald-400">{rangeNetProfit.toLocaleString()} ج.م</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className={`${theme.card} p-4 rounded-2xl border text-center`}>
                      <span className={`block text-2xs ${theme.textMuted}`}>قيد الصيانة</span>
                      <strong className="text-lg font-black text-zinc-400">{pendingCount}</strong>
                    </div>
                    <div className={`${theme.card} p-4 rounded-2xl border text-center`}>
                      <span className={`block text-2xs ${theme.textMuted}`}>جاهز للاستلام</span>
                      <strong className="text-lg font-black text-teal-400">{readyCount}</strong>
                    </div>
                    <div className={`${theme.card} p-4 rounded-2xl border text-center`}>
                      <span className={`block text-2xs ${theme.textMuted}`}>انتظار قطع</span>
                      <strong className="text-lg font-black text-amber-400">{waitingPartsCount}</strong>
                    </div>
                    <div className={`${theme.card} p-4 rounded-2xl border text-center`}>
                      <span className={`block text-2xs ${theme.textMuted}`}>متبقي على العملاء</span>
                      <strong className="text-lg font-black text-rose-400">{customersOwedTotal.toLocaleString()} ج.م</strong>
                    </div>
                  </div>

                  {todayExtraIncome > 0 && (
                    <div className={`${theme.card} p-4 rounded-2xl border`}>
                      <span className={`block text-xs ${theme.textMuted}`}>إيرادات إضافية من الخزينة:</span>
                      <strong className="text-lg font-black text-emerald-400">+{todayExtraIncome.toLocaleString()} ج.م</strong>
                    </div>
                  )}

                  <div className={`${theme.card} p-4 rounded-2xl border`}>
                    <p className={`text-2xs ${theme.textMuted}`}>
                      ملاحظة: إجمالي المبيعات يُحسب فقط على الإيصالات التي تم <b>تسليمها</b> اليوم (وفق تاريخ التسليم)، لتقارير أدق محاسبياً.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ================= 🏢 الموردين ================= */}
          {activeTab === 'suppliers' && (
            <div className="space-y-6">
              {userRole === 'technician' ? (
                <div className={`${theme.card} p-8 rounded-xl border text-center text-rose-400 font-bold`}>
                  عذراً، قسم الموردين مخصص للمدير العام فقط.
                </div>
              ) : (
                <>
                  {/* إحصائيات الموردين */}
                  <div className={`${theme.card} p-5 rounded-2xl border flex justify-between items-center flex-wrap gap-4`}>
                    <div>
                      <h2 className="font-bold text-[#8b5cf6] text-lg">🏢 إدارة الموردين</h2>
                      <p className={`mt-0.5 text-xs ${theme.textMuted}`}>إدارة كاملة للموردين والفواتير والمديونيات.</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-4 py-2 rounded-xl text-center">
                        <span className="text-2xs text-[#8b5cf6] block font-bold">عدد الموردين</span>
                        <strong className="text-lg font-black text-[#8b5cf6]">{suppliers.length}</strong>
                      </div>
                    </div>
                  </div>

                  {/* نموذج إضافة مورد */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newSupplierName.trim()) {
                        showToast('يرجى إدخال اسم المورد', 'error');
                        return;
                      }
                      
                      const supplierData = {
                        id: editingSupplierId || generateId(),
                        name: newSupplierName.trim(),
                        phone: newSupplierPhone.trim(),
                        notes: newSupplierNotes.trim(),
                      };
                      
                      // حفظ في Supabase
                      const result = await upsertSupplier(supplierData);
                      if (!result.success) {
                        showToast('فشل حفظ المورد: ' + result.error, 'error');
                        return;
                      }
                      
                      // تحديث الواجهة
                      if (editingSupplierId) {
                        setSuppliers(prev => prev.map(s => s.id === editingSupplierId ? supplierData : s));
                        showToast('تم تحديث المورد بنجاح ✅');
                      } else {
                        setSuppliers(prev => [supplierData, ...prev]);
                        showToast('تم إضافة المورد بنجاح ✅');
                      }
                      
                      // Reset
                      setNewSupplierName('');
                      setNewSupplierPhone('');
                      setNewSupplierNotes('');
                      setEditingSupplierId(null);
                    }}
                    className={`${theme.card} p-6 rounded-2xl border space-y-4`}
                  >
                    <h3 className="font-bold text-[#8b5cf6]">
                      {editingSupplierId ? '✏️ تعديل مورد' : '➕ إضافة مورد جديد'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={`block mb-1 text-xs ${theme.textMuted}`}>اسم المورد *</label>
                        <input
                          type="text"
                          value={newSupplierName}
                          onChange={e => setNewSupplierName(e.target.value)}
                          placeholder="مثال: أحمد للموبايلات"
                          className={`w-full ${theme.input} p-3.5 rounded-xl`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-1 text-xs ${theme.textMuted}`}>رقم الهاتف</label>
                        <input
                          type="text"
                          value={newSupplierPhone}
                          onChange={e => setNewSupplierPhone(e.target.value)}
                          placeholder="01012345678"
                          className={`w-full ${theme.input} p-3.5 rounded-xl`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-1 text-xs ${theme.textMuted}`}>ملاحظات</label>
                        <input
                          type="text"
                          value={newSupplierNotes}
                          onChange={e => setNewSupplierNotes(e.target.value)}
                          placeholder="ملاحظات إضافية..."
                          className={`w-full ${theme.input} p-3.5 rounded-xl`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-lg transition text-xs"
                      >
                        {editingSupplierId ? '💾 حفظ التعديلات' : '➕ إضافة المورد'}
                      </button>
                      {editingSupplierId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSupplierId(null);
                            setNewSupplierName('');
                            setNewSupplierPhone('');
                            setNewSupplierNotes('');
                          }}
                          className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold px-6 py-3 rounded-xl text-xs"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>

                  {/* قائمة الموردين */}
                  <div className={`${theme.card} p-6 rounded-2xl border space-y-4`}>
                    <h3 className="font-bold text-[#8b5cf6]">📋 قائمة الموردين</h3>

                    {suppliers.length === 0 ? (
                      <div className={`text-center py-12 ${theme.textMuted}`}>
                        <span className="text-4xl block mb-3">🏢</span>
                        <p className="text-sm font-bold">لا يوجد موردين بعد</p>
                        <p className="text-xs mt-1">ابدأ بإضافة أول مورد من النموذج أعلاه</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {suppliers.map(supplier => (
                          <div
                            key={supplier.id}
                            className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                              darkMode ? 'bg-[#150e22] border-[#2d1f4a] hover:border-[#8b5cf6]/50' : 'bg-white border-[#e9e5f5] hover:border-[#8b5cf6]/50'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm truncate flex items-center gap-2">
                                  👤 {supplier.name}
                                </h4>
                                {supplier.phone && (
                                  <p className={`text-2xs mt-1 ${theme.textMuted}`}>📞 {supplier.phone}</p>
                                )}
                                {supplier.notes && (
                                  <p className={`text-2xs mt-1 ${theme.textMuted} truncate`}>📝 {supplier.notes}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                                                            <button
                                onClick={() => {
                                  setSelectedSupplier(supplier);
                                  setSupplierModalOpen(true);
                                  setSupplierActiveTab('invoices');
                                  
                                  // تحميل الفواتير والدفعات والمرتجعات
                                  (async () => {
                                    const [invRes, payRes, retRes] = await Promise.all([
                                      fetchSupplierInvoices(supplier.id),
                                      fetchSupplierPayments(supplier.id),
                                      fetchSupplierReturns(supplier.id),
                                    ]);
                                    if (invRes.success) setSupplierInvoices(invRes.data);
                                    if (payRes.success) setSupplierPayments(payRes.data);
                                    if (retRes.success) setSupplierReturns(retRes.data);
                                  })();
                                }}
                                className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 px-3 py-2 rounded-xl text-2xs font-bold transition"
                              >
                                📄 التفاصيل
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSupplierId(supplier.id);
                                  setNewSupplierName(supplier.name);
                                  setNewSupplierPhone(supplier.phone || '');
                                  setNewSupplierNotes(supplier.notes || '');
                                }}
                                className="flex-1 bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20 px-3 py-2 rounded-xl text-2xs font-bold transition"
                              >
                                ✏️ تعديل
                              </button>
                              <button
                                onClick={() => {
                                  openConfirm('حذف مورد', `هل تريد حذف "${supplier.name}"؟ سيتم حذف كل فواتيره ودفعاته.`, async () => {
                                    const result = await deleteSupplier(supplier.id);
                                    if (result.success) {
                                      setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
                                      showToast('تم حذف المورد', 'info');
                                    } else {
                                      showToast('فشل الحذف: ' + result.error, 'error');
                                    }
                                    closeConfirm();
                                  });
                                }}
                                className="bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 px-3 py-2 rounded-xl text-2xs font-bold transition"
                              >
                                🗑️ حذف
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================= ⚙️ الإعدادات ================= */}
          {activeTab === 'settings' && (
            <div className={`${theme.card} p-6 rounded-2xl border max-w-xl mx-auto space-y-6`}>
              {userRole === 'technician' ? (
                <div className="text-center text-rose-400 font-bold">إعدادات النظام متاحة للمدير العام فقط.</div>
              ) : (
                <>
                  <h2 className="font-bold text-indigo-400 text-base">⚙️ إعدادات التطبيق وتغيير اسم المركز والوصول</h2>

                  <div className="space-y-4">
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>اسم التطبيق / المركز</label>
                      <input value={shopName} onChange={e => setShopName(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
                    </div>
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>اسم المدير العام</label>
                      <input value={adminName} onChange={e => setAdminName(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
                    </div>
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>رقم الواتساب الرئيسي</label>
                      <input value={shopPhone} onChange={e => setShopPhone(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl`} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>رقم الإدارة الأول (واتساب)</label>
                        <input value={admin1Phone} onChange={e => setAdmin1Phone(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl`} />
                      </div>
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>رقم الإدارة الثاني (واتساب)</label>
                        <input value={admin2Phone} onChange={e => setAdmin2Phone(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>كلمة سر / PIN المدير</label>
                        <input type="text" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
                      </div>
                      <div>
                        <label className={`block mb-1 ${theme.textMuted}`}>بادئة ترقيم الإيصالات</label>
                        <input value={receiptPrefix} onChange={e => setReceiptPrefix(e.target.value)} placeholder="BG" className={`w-full ${theme.input} p-3.5 rounded-xl font-bold`} />
                      </div>
                    </div>
                  </div>

                  {/* حجم الخط ووزنه */}
                  <div className={`p-4 rounded-xl border space-y-4 ${darkMode ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="font-bold text-xs text-indigo-400">🔤 إعدادات حجم الخط ووزنه</h4>

                    <div>
                      <span className={`block mb-2 text-2xs ${theme.textMuted}`}>حجم الخط:</span>
                      <div className="grid grid-cols-3 gap-2">
                        {(['normal', 'large', 'xlarge'] as FontSizeLevel[]).map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setFontSizeLevel(lvl)}
                            className={`p-3 rounded-xl font-bold border transition text-xs ${
                              fontSizeLevel === lvl
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                                : theme.badgeInactive
                            }`}
                          >
                            {lvl === 'normal' ? 'متوسط' : lvl === 'large' ? 'كبير' : 'كبير جدًا'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className={`block mb-2 text-2xs ${theme.textMuted}`}>وزن الخط:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(['light', 'bold'] as FontWeightLevel[]).map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setFontWeightLevel(lvl)}
                            className={`p-3 rounded-xl font-bold border transition text-xs ${
                              fontWeightLevel === lvl
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                                : theme.badgeInactive
                            }`}
                          >
                            {lvl === 'light' ? 'خفيف' : 'تقيل'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border text-center ${darkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-slate-200'}`}>
                      <span className={`block text-2xs mb-1 ${theme.textMuted}`}>معاينة مباشرة:</span>
                      <p className={`${fontSizeClass} ${fontWeightClass}`}>هذا نص تجريبي للمعاينة — Boody Group</p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border space-y-3 ${darkMode ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50'}`}>
                    <h4 className="font-bold text-xs text-indigo-400">خيارات النظام والتحكم:</h4>
                    <div className="flex gap-3 flex-wrap"><button
  onClick={async () => {
    if (!confirm('هل أنت متأكد من مزامنة كل البيانات إلى Supabase؟ هذا سيرفع كل الإيصالات والمخزن والخزينة.')) return;
    showToast('جاري المزامنة إلى Supabase...', 'info');
    
    const result = await syncAllToSupabase({
      receipts,
      inventory,
      expenses,
    });
    
    if (result.success) {
      showToast('✅ تمت المزامنة إلى Supabase بنجاح!', 'success');
    } else {
      showToast(`❌ فشل المزامنة: ${result.error}`, 'error');
    }
  }}
  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
>
  ☁️ مزامنة إلى Supabase
</button>
                      <button onClick={handleCloudSync} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow">
                        🔄 مزامنة سحابية محلية
                      </button>
                      <button
                        onClick={() => { setUserRole('admin'); setIsAdminUnlocked(true); showToast('تم تفعيل وضع المدير العام'); }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
                      >
                        👨‍💼 تفعيل المدير العام
                      </button>
                      <button onClick={handleExportBackup} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow">
                        ⬇️ تصدير نسخة
                      </button>
                      <label className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow cursor-pointer">
                        ⬆️ استيراد نسخة
                        <input type="file" accept=".json,application/json" onChange={handleImportBackup} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.setItem(
                        'bg_settings_v6',
                        JSON.stringify({
                          shopName, shopPhone, adminName, adminPassword,
                          admin1Phone, admin2Phone, receiptPrefix,
                        })
                      );
                      showToast('تم حفظ الإعدادات وتحديث اسم التطبيق بنجاح!');
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl transition text-xs shadow-lg"
                  >
                    💾 حفظ كافة إعدادات النظام وتحديث الاسم
                  </button>
                  
                  {/* 🔐 الأمان والوصول */}
                  <div className={`p-4 rounded-xl border space-y-4 ${
                    darkMode ? 'bg-[#150e22] border-[#2d1f4a]' : 'bg-[#faf9fc] border-[#e9e5f5]'
                  }`}>
                    <h4 className="font-bold text-xs text-[#8b5cf6] flex items-center gap-2">
                      🔐 الأمان والوصول
                    </h4>

                    <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#0f0a1a]' : 'bg-white'}`}>
                      <span className={`text-xs font-bold ${theme.textMuted}`}>👤 المستخدم الحالي:</span>
                      <span className="text-xs font-black text-[#a78bfa] truncate">
                        {currentUserEmail || 'غير معروف'}
                      </span>
                    </div>

                    <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#0f0a1a]' : 'bg-white'}`}>
                      <span className={`text-xs font-bold ${theme.textMuted}`}>🕒 آخر دخول:</span>
                      <span className="text-xs font-black text-emerald-400">
                        {new Date().toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full bg-gradient-to-br from-rose-600 to-rose-500 hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 text-xs flex items-center justify-center gap-2"
                    >
                      🚪 تسجيل الخروج من النظام
                    </button>
                  </div>

                </>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ================= 🔐 PIN Modal ================= */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handlePinSubmit}
            className={`${theme.card} border rounded-2xl p-6 w-full max-w-sm space-y-4`}
          >
            <h3 className="font-bold text-indigo-400 text-center">🔒 التحقق من هوية المدير</h3>
            <p className={`text-xs text-center ${theme.textMuted}`}>أدخل رمز PIN للوصول إلى وضع المدير العام.</p>
           
            <input
              type="password"
              autoFocus
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              placeholder="••••"
              className={`w-full ${theme.input} p-4 rounded-xl text-center text-2xl tracking-widest font-black`}
            />
            {pinError && <p className="text-rose-400 text-xs text-center font-bold">{pinError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs"
              >
                دخول
              </button>
              <button
                type="button"
                onClick={() => { setPinModalOpen(false); setPinError(''); setPinInput(''); }}
                className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-3 rounded-xl text-xs"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
{/* ================= 🔧 Part Choice Modal ================= */}
{partChoiceModal && (
  <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className={`${theme.card} border rounded-2xl p-6 w-full max-w-md space-y-3`}>
      <h3 className="font-bold text-indigo-400 text-lg">
        🔧 اختر نوع القطعة: {partChoiceModal.issue}
      </h3>
      <p className={`text-xs ${theme.textMuted}`}>
        فيه أكتر من نوع في المخزن. اختر النوع اللي هيتخصم.
      </p>

      <div className="space-y-2">
        {partChoiceModal.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => {
              setSelectedIssues([...selectedIssues, partChoiceModal.issue]);
              setIssueChoices({ ...issueChoices, [partChoiceModal.issue]: opt.id });
              setPartChoiceModal(null);
            }}
            className="w-full text-right p-4 rounded-xl border bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 transition"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold">
                {opt.category === 'original' ? '🟢 أصلي' : opt.category === 'copy' ? '✨ تجاري' : '📤 مسحوب'}
              </span>
              <span className={`text-xs ${theme.textMuted}`}>
                كمية: {opt.quantity} | {opt.costPrice} ج.م
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setPartChoiceModal(null)}
        className="w-full bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-3 rounded-xl"
      >
        إلغاء
      </button>
    </div>
  </div>
)}
{/* ================= ✏️ Edit Inventory Modal ================= */}
{isEditModalOpen && editingItem && (
  <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className={`${theme.card} border rounded-2xl p-6 w-full max-w-md space-y-3`}>
      <h3 className="font-bold text-indigo-400 text-lg">✏️ تعديل القطعة</h3>

      <div>
        <label className={`text-xs font-bold ${theme.textMuted}`}>اسم القطعة</label>
        <input
          className={`w-full ${theme.input} p-2.5 rounded-xl mt-1`}
          value={editingItem.partName}
          onChange={e => setEditingItem({ ...editingItem, partName: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`text-xs font-bold ${theme.textMuted}`}>الشركة</label>
          <input
            className={`w-full ${theme.input} p-2.5 rounded-xl mt-1`}
            value={editingItem.brand}
            onChange={e => setEditingItem({ ...editingItem, brand: e.target.value })}
          />
        </div>
        <div>
          <label className={`text-xs font-bold ${theme.textMuted}`}>الموديل</label>
          <input
            className={`w-full ${theme.input} p-2.5 rounded-xl mt-1`}
            value={editingItem.deviceModel || ""}
            onChange={e => setEditingItem({ ...editingItem, deviceModel: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`text-xs font-bold ${theme.textMuted}`}>الكمية</label>
          <input
            type="number"
            className={`w-full ${theme.input} p-2.5 rounded-xl mt-1`}
            value={editingItem.quantity}
            onChange={e => setEditingItem({ ...editingItem, quantity: +e.target.value })}
          />
        </div>
        <div>
          <label className={`text-xs font-bold ${theme.textMuted}`}>التكلفة</label>
          <input
            type="number"
            className={`w-full ${theme.input} p-2.5 rounded-xl mt-1`}
            value={editingItem.costPrice}
            onChange={e => setEditingItem({ ...editingItem, costPrice: +e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={`text-xs font-bold ${theme.textMuted}`}>التصنيف</label>
        <select
          className={`w-full ${theme.input} p-2.5 rounded-xl mt-1`}
          value={editingItem.category || ""}
          onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
        >
          <option value="original">أصلي</option>
          <option value="copy">تجاري</option>
          <option value="pulled">مسحوب</option>
        </select>
      </div>

      <div>
        <label className={`text-xs font-bold ${theme.textMuted}`}>ملاحظات</label>
        <input
          className={`w-full ${theme.input} p-2.5 rounded-xl mt-1`}
          value={editingItem.notes || ""}
          onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={async () => {
            const updated = inventory.map(i =>
              i.id === editingItem.id ? editingItem : i
            );
            setInventory(updated);
            localStorage.setItem('bg_internal_inventory_v5', JSON.stringify(updated));
            
            try {
              await upsertInventory(updated);
              showToast('تم تعديل القطعة', 'success');
            } catch {
              showToast('تم التعديل محليًا', 'info');
            }
            
            setIsEditModalOpen(false);
            setEditingItem(null);
          }}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl"
        >
          💾 حفظ
        </button>
        <button
          onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}
          className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-3 rounded-xl"
        >
          إلغاء
        </button>
      </div>
    </div>
  </div>
)}
      {/* ================= 🏢 Supplier Details Modal ================= */}
      {supplierModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className={`${theme.card} border rounded-2xl w-full max-w-3xl my-8`}>
            
            {/* Header */}
            <div className="flex justify-between items-start p-5 border-b border-[#2d1f4a]">
              <div>
                <h3 className="font-bold text-[#8b5cf6] text-lg flex items-center gap-2">
                  👤 {selectedSupplier.name}
                </h3>
                {selectedSupplier.phone && (
                  <p className={`text-xs mt-1 ${theme.textMuted}`}>📞 {selectedSupplier.phone}</p>
                )}
                {selectedSupplier.notes && (
                  <p className={`text-2xs mt-1 ${theme.textMuted}`}>📝 {selectedSupplier.notes}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setSupplierModalOpen(false);
                  setSelectedSupplier(null);
                  setSupplierInvoices([]);
                  setSupplierPayments([]);
                  setSupplierReturns([]);
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
              >
                ✕
              </button>
            </div>

            {/* إحصائيات */}
            <div className="p-5 border-b border-[#2d1f4a]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <span className="block text-2xs text-emerald-400 font-bold">إجمالي الفواتير</span>
                  <strong className="text-lg font-black text-emerald-400">
                    {supplierInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0).toLocaleString()} ج.م
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <span className="block text-2xs text-amber-400 font-bold">المرتجعات</span>
                  <strong className="text-lg font-black text-amber-400">
                    {supplierReturns.reduce((s, r) => s + Number(r.total_amount || 0), 0).toLocaleString()} ج.م
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-center">
                  <span className="block text-2xs text-[#a78bfa] font-bold">المدفوع</span>
                  <strong className="text-lg font-black text-[#a78bfa]">
                    {supplierPayments.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString()} ج.م
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
                  <span className="block text-2xs text-rose-400 font-bold">المديونية</span>
                  <strong className="text-lg font-black text-rose-400">
                    {(
                      supplierInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
                      - supplierReturns.reduce((s, r) => s + Number(r.total_amount || 0), 0)
                      - supplierPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
                    ).toLocaleString()} ج.م
                  </strong>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#2d1f4a]">
              {[
                { id: 'invoices', label: '📄 الفواتير', count: supplierInvoices.length },
                { id: 'payments', label: '💵 الدفعات', count: supplierPayments.length },
                { id: 'returns', label: '↩️ المرتجعات', count: supplierReturns.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSupplierActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-xs font-bold transition-all ${
                    supplierActiveTab === tab.id
                      ? 'bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white'
                      : `${theme.textMuted} hover:bg-[#8b5cf6]/10`
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* ========== الفواتير ========== */}
              {supplierActiveTab === 'invoices' && (
                <>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newInvoiceNumber.trim() || newInvoiceTotal <= 0) {
                        showToast('يرجى إدخال رقم الفاتورة والإجمالي', 'error');
                        return;
                      }
                      
                      const invoiceData = {
  id: generateId(),
  supplierId: selectedSupplier.id,
  invoiceNumber: newInvoiceNumber.trim(),
  invoiceDate: newInvoiceDate || new Date().toLocaleDateString('en-CA'),
  totalAmount: Number(newInvoiceTotal),
  paidAmount: 0,
  parts: newInvoiceParts ? newInvoiceParts.split(',').map(p => p.trim()).filter(Boolean) : [],
  notes: newInvoiceNotes.trim(),
  status: 'pending' as const,
  invoiceImage: newInvoiceImage || undefined,
};
                      
                      const result = await upsertSupplierInvoice(invoiceData);
                      if (!result.success) {
                        showToast('فشل حفظ الفاتورة: ' + result.error, 'error');
                        return;
                      }
                      
                      setSupplierInvoices(prev => [invoiceData, ...prev]);
                      setNewInvoiceNumber('');
           setNewInvoiceDate(formatDate(new Date()));
                      setNewInvoiceTotal(0);
                      setNewInvoiceParts('');
                      setNewInvoiceNotes('');
                      setNewInvoiceImage(null);
                      showToast('تم إضافة الفاتورة بنجاح ✅');
                    }}
                    className="p-4 rounded-xl border border-[#2d1f4a] bg-[#150e22] space-y-3"
                  >
                    <h4 className="font-bold text-xs text-[#8b5cf6]">➕ إضافة فاتورة جديدة</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newInvoiceNumber}
                        onChange={e => setNewInvoiceNumber(e.target.value)}
                        placeholder="رقم الفاتورة *"
                        className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                      />
                      <input
  type="date"
  value={newInvoiceDate}
  onChange={e => setNewInvoiceDate(e.target.value)}
  className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
/>
                      <input
                        type="number"
                        value={newInvoiceTotal || ''}
                        onChange={e => setNewInvoiceTotal(Number(e.target.value))}
                        placeholder="الإجمالي *"
                        className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                      />
                    </div>
                    <input
                      type="text"
                      value={newInvoiceParts}
                      onChange={e => setNewInvoiceParts(e.target.value)}
                      placeholder="القطع (مفصولة بفاصلة)"
                      className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                    />
                    <input
                      type="text"
                      value={newInvoiceNotes}
                      onChange={e => setNewInvoiceNotes(e.target.value)}
                      placeholder="ملاحظات"
                      className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                    />
                    
                    {/* 📷 صورة الإيصال */}
                    <div className={`p-3 rounded-xl border ${darkMode ? 'bg-[#0d1117] border-[#2d1f4a]' : 'bg-slate-50 border-[#e9e5f5]'}`}>
                      <label className={`block mb-2 text-2xs font-bold ${theme.textMuted}`}>📷 صورة الإيصال (اختياري)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              showToast('الصورة كبيرة جدًا (الحد الأقصى 1 MB)', 'error');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => setNewInvoiceImage(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className={`w-full ${theme.input} p-2 rounded-lg text-xs`}
                      />
                      {newInvoiceImage && (
                        <div className="mt-2 flex items-center gap-3">
                          <img src={newInvoiceImage} alt="Invoice" className="w-16 h-16 object-cover rounded-lg border border-[#8b5cf6]/50" />
                          <button
                            type="button"
                            onClick={() => setNewInvoiceImage(null)}
                            className="text-rose-400 hover:underline text-2xs font-bold"
                          >
                            🗑️ حذف الصورة
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white font-bold py-2.5 rounded-lg text-xs"
                    >
                      ➕ إضافة الفاتورة
                    </button>
                  </form>

                  {/* قائمة الفواتير */}
                  <div className="space-y-2">
                    {supplierInvoices.length === 0 ? (
                      <p className={`text-center py-8 text-xs ${theme.textMuted}`}>لا توجد فواتير بعد</p>
                    ) : (
                      supplierInvoices.map(inv => (
                        <div key={inv.id} className="p-3 rounded-xl border border-[#2d1f4a] bg-[#150e22] flex justify-between items-center gap-2">
                        
                          {/* 📷 صورة الإيصال */}
                          {inv.invoice_image && (
                            <img
                              src={inv.invoice_image}
                              alt="Invoice"
                              className="w-12 h-12 object-cover rounded-lg cursor-pointer border border-[#8b5cf6]/50 hover:scale-105 transition-transform shrink-0"
                              onClick={() => setPreviewImage(inv.invoice_image)}
                              title="اضغط لعرض الصورة كاملة"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-xs text-[#8b5cf6]">#{inv.invoice_number}</strong>
                              <span className={`text-2xs ${theme.textMuted}`}>📅 {inv.invoice_date}</span>
                              <span className={`text-2xs px-2 py-0.5 rounded-full ${
                                inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                                inv.status === 'partial' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-rose-500/10 text-rose-400'
                              }`}>
                                {inv.status === 'paid' ? 'مدفوع' : inv.status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                              </span>
                            </div>
                            {inv.parts && inv.parts.length > 0 && (
                              <p className={`text-2xs mt-1 ${theme.textMuted} truncate`}>
                                📦 {inv.parts.join(' • ')}
                              </p>
                            )}
                          </div>
                          <div className="text-left shrink-0">
                            <strong className="text-sm font-black text-emerald-400">{Number(inv.total_amount).toLocaleString()} ج.م</strong>
                            <p className={`text-2xs ${theme.textMuted}`}>مدفوع: {Number(inv.paid_amount).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => {
                              openConfirm('حذف فاتورة', `هل تريد حذف الفاتورة #${inv.invoice_number}؟`, async () => {
                                const result = await deleteSupplierInvoice(inv.id);
                                if (result.success) {
                                  setSupplierInvoices(prev => prev.filter(i => i.id !== inv.id));
                                  showToast('تم حذف الفاتورة', 'info');
                                } else {
                                  showToast('فشل الحذف: ' + result.error, 'error');
                                }
                                closeConfirm();
                              });
                            }}
                            className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-1.5 rounded-lg text-xs shrink-0"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ========== الدفعات ========== */}
              {supplierActiveTab === 'payments' && (
                <>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (newPaymentAmount <= 0) {
                        showToast('يرجى إدخال المبلغ', 'error');
                        return;
                      }
                      
                      const paymentData = {
                        id: generateId(),
                        supplierId: selectedSupplier.id,
                        amount: Number(newPaymentAmount),
                        paymentDate: newPaymentDate || formatDate(new Date()),
                        method: newPaymentMethod,
                        notes: newPaymentNotes.trim(),
                      };
                      
                      const result = await upsertSupplierPayment(paymentData);
                      if (!result.success) {
                        showToast('فشل حفظ الدفعة: ' + result.error, 'error');
                        return;
                      }
                      
                      setSupplierPayments(prev => [paymentData, ...prev]);
                      setNewPaymentAmount(0);
                      setNewPaymentDate('');
                      setNewPaymentMethod('cash');
                      setNewPaymentNotes('');
                      showToast('تم تسجيل الدفعة بنجاح ✅');
                    }}
                    className="p-4 rounded-xl border border-[#2d1f4a] bg-[#150e22] space-y-3"
                  >
                    <h4 className="font-bold text-xs text-[#8b5cf6]">➕ تسجيل دفعة جديدة</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={newPaymentAmount || ''}
                        onChange={e => setNewPaymentAmount(Number(e.target.value))}
                        placeholder="المبلغ *"
                        className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                      />
                      <input
  type="date"
  value={newInvoiceDate}
  onChange={e => setNewInvoiceDate(e.target.value)}
  className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
/>
                      <select
                        value={newPaymentMethod}
                        onChange={e => setNewPaymentMethod(e.target.value as any)}
                        className={`w-full ${theme.input} p-2.5 rounded-lg text-xs font-bold`}
                      >
                        <option value="cash">💵 نقدي</option>
                        <option value="bank">🏦 تحويل بنكي</option>
                        <option value="wallet">📱 محفظة</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={newPaymentNotes}
                      onChange={e => setNewPaymentNotes(e.target.value)}
                      placeholder="ملاحظات"
                      className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                    />
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white font-bold py-2.5 rounded-lg text-xs"
                    >
                      ➕ تسجيل الدفعة
                    </button>
                  </form>

                  {/* قائمة الدفعات */}
                  <div className="space-y-2">
                    {supplierPayments.length === 0 ? (
                      <p className={`text-center py-8 text-xs ${theme.textMuted}`}>لا توجد دفعات بعد</p>
                    ) : (
                      supplierPayments.map(pay => (
                        <div key={pay.id} className="p-3 rounded-xl border border-[#2d1f4a] bg-[#150e22] flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-xs text-[#a78bfa]">💵 دفعة</strong>
                              <span className={`text-2xs ${theme.textMuted}`}>📅 {pay.payment_date}</span>
                              <span className={`text-2xs px-2 py-0.5 rounded-full ${
                                pay.method === 'cash' ? 'bg-emerald-500/10 text-emerald-400' :
                                pay.method === 'bank' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-purple-500/10 text-purple-400'
                              }`}>
                                {pay.method === 'cash' ? 'نقدي' : pay.method === 'bank' ? 'بنكي' : 'محفظة'}
                              </span>
                            </div>
                            {pay.notes && (
                              <p className={`text-2xs mt-1 ${theme.textMuted}`}>📝 {pay.notes}</p>
                            )}
                          </div>
                          <strong className="text-sm font-black text-emerald-400 shrink-0">{Number(pay.amount).toLocaleString()} ج.م</strong>
                          <button
                            onClick={() => {
                              openConfirm('حذف دفعة', `هل تريد حذف الدفعة؟`, async () => {
                                const result = await deleteSupplierPayment(pay.id);
                                if (result.success) {
                                  setSupplierPayments(prev => prev.filter(p => p.id !== pay.id));
                                  showToast('تم حذف الدفعة', 'info');
                                } else {
                                  showToast('فشل الحذف: ' + result.error, 'error');
                                }
                                closeConfirm();
                              });
                            }}
                            className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-1.5 rounded-lg text-xs shrink-0"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ========== المرتجعات ========== */}
              {supplierActiveTab === 'returns' && (
                <>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newReturnPartName.trim() || newReturnQuantity <= 0) {
                        showToast('يرجى إدخال اسم القطعة والكمية', 'error');
                        return;
                      }
                      
                      const totalAmount = Number(newReturnQuantity) * Number(newReturnUnitPrice);
                      const returnData = {
  id: generateId(),
  supplierId: selectedSupplier.id,
  invoiceId: newReturnInvoiceId || undefined,
  partName: newReturnPartName.trim(),
  brand: newReturnBrand.trim(),
  quantity: Number(newReturnQuantity),
  unitPrice: Number(newReturnUnitPrice),
  totalAmount: totalAmount,
  reason: newReturnReason.trim(),
  returnDate: newReturnDate || new Date().toLocaleDateString('en-CA'),
};
                      
                      const result = await upsertSupplierReturn(returnData);
if (!result.success) {
  showToast('فشل حفظ المرتجع: ' + result.error, 'error');
  return;
}

setSupplierReturns(prev => [returnData, ...prev]);

showToast('تم تسجيل المرتجع بنجاح ✅');

setNewReturnPartName('');
setNewReturnBrand('');
setNewReturnQuantity(1);
setNewReturnUnitPrice(0);
setNewReturnReason('');
setNewReturnDate(new Date().toLocaleDateString('en-CA'));
setNewReturnInvoiceId('');
                    }}
                    className="p-4 rounded-xl border border-[#2d1f4a] bg-[#150e22] space-y-3"
                  >
                    <h4 className="font-bold text-xs text-[#8b5cf6]">➕ تسجيل مرتجع جديد</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={newReturnPartName}
                        onChange={e => setNewReturnPartName(e.target.value)}
                        placeholder="اسم القطعة *"
                        className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                      />
                      <input
                        type="text"
                        value={newReturnBrand}
                        onChange={e => setNewReturnBrand(e.target.value)}
                        placeholder="الشركة"
                        className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                      />
                      <input
                        type="number"
                        value={newReturnQuantity || ''}
                        onChange={e => setNewReturnQuantity(Number(e.target.value))}
                        placeholder="الكمية *"
                        className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                      />
                      <input
                        type="number"
                        value={newReturnUnitPrice || ''}
                        onChange={e => setNewReturnUnitPrice(Number(e.target.value))}
                        placeholder="سعر الوحدة"
                        className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                      />
                    </div>
                                        <input
                      type="text"
                      value={newReturnReason}
                      onChange={e => setNewReturnReason(e.target.value)}
                      placeholder="سبب الإرجاع"
                      className={`w-full ${theme.input} p-2.5 rounded-lg text-xs`}
                    />

                    <select
                      value={newReturnInvoiceId}
                      onChange={e => setNewReturnInvoiceId(e.target.value)}
                      className={`w-full ${theme.input} p-2.5 rounded-lg text-xs font-bold`}
                    >
                      <option value="">📄 بدون ربط بفاتورة</option>
                      {supplierInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          #{inv.invoice_number} — {Number(inv.total_amount).toLocaleString()} ج.م ({inv.invoice_date})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white font-bold py-2.5 rounded-lg text-xs"
                    >
                      ➕ تسجيل المرتجع
                    </button>
                  </form>

                  {/* قائمة المرتجعات */}
                  <div className="space-y-2">
                    {supplierReturns.length === 0 ? (
                      <p className={`text-center py-8 text-xs ${theme.textMuted}`}>لا توجد مرتجعات بعد</p>
                    ) : (
                      supplierReturns.map(ret => (
                        <div key={ret.id} className="p-3 rounded-xl border border-[#2d1f4a] bg-[#150e22] flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
<strong className="text-xs text-amber-400">↩️ {ret.part_name}</strong>
{ret.invoice_id && (
  <span className="text-2xs px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#a78bfa]">
    مربوط بفاتورة
  </span>
)}
                              {ret.brand && <span className={`text-2xs ${theme.textMuted}`}>{ret.brand}</span>}
                              <span className={`text-2xs ${theme.textMuted}`}>الكمية: {ret.quantity}</span>
                            </div>
                            {ret.reason && (
                              <p className={`text-2xs mt-1 ${theme.textMuted}`}>السبب: {ret.reason}</p>
                            )}
                          </div>
                          <strong className="text-sm font-black text-amber-400 shrink-0">{Number(ret.total_amount).toLocaleString()} ج.م</strong>
                          <button
                            onClick={() => {
                              openConfirm('حذف مرتجع', `هل تريد حذف المرتجع؟`, async () => {
                                const result = await deleteSupplierReturn(ret.id);
                                if (result.success) {
                                  setSupplierReturns(prev => prev.filter(r => r.id !== ret.id));
                                  showToast('تم حذف المرتجع', 'info');
                                } else {
                                  showToast('فشل الحذف: ' + result.error, 'error');
                                }
                                closeConfirm();
                              });
                            }}
                            className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-1.5 rounded-lg text-xs shrink-0"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}


              {/* 📱 زر إرسال كشف الحساب */}
              <div className="p-5 border-t border-[#2d1f4a]">
                <button
                  onClick={() => {
                    const invoicesTotal = supplierInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
                    const returnsTotal = supplierReturns.reduce((s, r) => s + Number(r.total_amount || 0), 0);
                    const paymentsTotal = supplierPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
                    const debt = invoicesTotal - returnsTotal - paymentsTotal;

                    let msg = `📋 كشف حساب — MS Fix\n`;
                    msg += `━━━━━━━━━━━━━━━━━━━\n`;
                    msg += `👤 المورد: ${selectedSupplier.name}\n`;
                    if (selectedSupplier.phone) msg += `📞 ${selectedSupplier.phone}\n`;
                    msg += `📅 الفترة: كل المعاملات\n`;
                    msg += `━━━━━━━━━━━━━━━━━━━\n\n`;

                    if (supplierInvoices.length > 0) {
                      msg += `📄 الفواتير (${supplierInvoices.length}):\n`;
                      supplierInvoices.forEach(inv => {
                        msg += `• #${inv.invoice_number || 'بدون رقم'} — ${inv.invoice_date || ''} — ${Number(inv.total_amount).toLocaleString()} ج.م`;
                        if (Number(inv.paid_amount) > 0) msg += ` (مدفوع ${Number(inv.paid_amount).toLocaleString()})`;
                        msg += `\n`;
                      });
                      msg += `\n`;
                    }

                    if (supplierReturns.length > 0) {
                      msg += `↩️ المرتجعات (${supplierReturns.length}):\n`;
                      supplierReturns.forEach(ret => {
                        msg += `• ${ret.part_name || 'قطعة'} — ${ret.quantity || 0} × ${Number(ret.unit_price || 0).toLocaleString()} = ${Number(ret.total_amount).toLocaleString()} ج.م`;
                        if (ret.reason) msg += ` (${ret.reason})`;
                        msg += `\n`;
                      });
                      msg += `\n`;
                    }

                    if (supplierPayments.length > 0) {
                      msg += `💵 الدفعات (${supplierPayments.length}):\n`;
                      supplierPayments.forEach(pay => {
                        const methodLabel = pay.method === 'cash' ? 'نقدي' : pay.method === 'bank' ? 'بنكي' : 'محفظة';
                        msg += `• ${pay.payment_date || ''} — ${Number(pay.amount).toLocaleString()} ج.م (${methodLabel})\n`;
                      });
                      msg += `\n`;
                    }

                    msg += `━━━━━━━━━━━━━━━━━━━\n`;
                    msg += `💰 إجمالي الفواتير: ${invoicesTotal.toLocaleString()} ج.م\n`;
                    if (returnsTotal > 0) msg += `↩️ إجمالي المرتجعات: ${returnsTotal.toLocaleString()} ج.م\n`;
                    msg += `💵 إجمالي المدفوع: ${paymentsTotal.toLocaleString()} ج.م\n`;
                    msg += `🔴 المديونية: ${debt.toLocaleString()} ج.م\n`;
                    msg += `━━━━━━━━━━━━━━━━━━━\n\n`;
                    msg += `شكراً لتعاملكم معنا 🙏\n`;
                    msg += `📞 MS Fix — ${shopPhone}`;

                    if (!selectedSupplier.phone) {
                      showToast('لا يوجد رقم هاتف للمورد', 'error');
                      return;
                    }

                    openWhatsAppDirect(selectedSupplier.phone, msg);
                  }}
                  className="w-full bg-gradient-to-br from-[#25D366] to-[#128C7E] hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 text-sm"
                >
                  📱 إرسال كشف حساب واتساب
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* ================= 🖼️ Image Preview Modal ================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[1100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(null);
              }}
              className="absolute -top-12 right-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition"
              title="إغلاق"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Invoice"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl border border-[#8b5cf6]/30 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-center text-2xs text-[#b8b0d0] mt-4">
              اضغط في أي مكان خارج الصورة للإغلاق
            </p>
          </div>
        </div>
      )}

      {/* ================= ⚠️ Confirm Modal ================= */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${theme.card} border rounded-2xl p-6 w-full max-w-sm space-y-4`}>
            <h3 className="font-bold text-rose-400 text-center">{confirmDialog.title}</h3>
            <p className={`text-xs text-center ${theme.textMuted}`}>{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { confirmDialog.onConfirm?.(); }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs"
              >
                تأكيد
              </button>
              <button
                onClick={closeConfirm}
                className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-3 rounded-xl text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
               </div>
      )}

      {/* Bottom Nav للموبايل */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      </div>
    </>
  );
}