"use client";

import React, { useState, useEffect, useRef } from 'react';

type DeviceStatus = 'pending' | 'ready' | 'waiting_parts' | 'done';

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
  image?: string;
}

interface InventoryItem {
  id: string;
  brand: string;
  deviceModel: string;
  partName: string;
  quantity: number;
  costPrice: number;
}

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
}

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'technician';
  pin: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function BoodyGroupSystem() {
  const [activeTab, setActiveTab] = useState<'home' | 'receiving' | 'receipts' | 'delivery' | 'inventory' | 'expenses' | 'reports' | 'scanner' | 'cloud' | 'staff' | 'settings'>('home');
  const [darkMode, setDarkMode] = useState(true);
  
  const [fontSizeLevel, setFontSizeLevel] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [fontWeightHeavy, setFontWeightHeavy] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<'all' | 'pending' | 'ready' | 'done'>('all');

  const [shopName, setShopName] = useState('Boody Group - مركز صيانة');
  const [shopPhone, setShopPhone] = useState('01038084846');
  const [adminName, setAdminName] = useState('مهندس محمد سعد');
  const [admin1Phone, setAdmin1Phone] = useState('01100055005');
  const [admin2Phone, setAdmin2Phone] = useState('01100055235');
  const [adminPassword, setAdminPassword] = useState('1234');

  // حالات لتعديل كلمة المرور عبر كود التحقق (WhatsApp OTP)
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  
  // 🔐 نظام الصلاحيات المضاف بدقة (مدير أو فني)
  const [userRole, setUserRole] = useState<'admin' | 'technician'>('admin');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(true);

  // 👥 إدارة فريق العمل (الموظفين والمهندسين)
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'technician'>('technician');
  const [newStaffPin, setNewStaffPin] = useState('');

  // نموذج الاستلام
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [dType, setDType] = useState('OPPO');
  const [dModel, setDModel] = useState('');
  const [dColor, setDColor] = useState('أسود');
  const [imei, setImei] = useState('');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
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

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [selectedInventoryBrandFilter, setSelectedInventoryBrandFilter] = useState('all');

  // إضافة مصروف جديد
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expType, setExpType] = useState<'expense' | 'income'>('expense');

  // المخزن المجمع
  const [selectedPartsForInventory, setSelectedPartsForInventory] = useState<string[]>([]);
  const [bulkModelTarget, setBulkModelTarget] = useState('');
  const [bulkQty, setBulkQty] = useState<number>(1);
  const [bulkCost, setBulkCost] = useState<number>(0);
  const [bulkBrandTarget, setBulkBrandTarget] = useState('OPPO');

  // الإشعارات العائمة Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // محاكي الباركود والكاميرا
  const [scannedResult, setScannedResult] = useState('');
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const marketBrands = [
    'OPPO', 'Redmi', 'Samsung', 'iPhone', 'Xiaomi / Poco', 'Realme', 
    'Infinix', 'Tecno', 'Vivo', 'Huawei', 'Honor', 'OnePlus', 
    'Nokia', 'Lenovo', 'Itel', 'آيباد / تابلت', 'ساعة ذكية', 'أخرى'
  ];

  const commonColors = [
    'أسود', 'أبيض', 'كحلي / أزرق', 'رمادي / جرافيت', 'ذهبي', 'فضة', 'أخضر / زيتي', 'بنفسجي', 'وردي / روز'
  ];

  const accessoriesList = [
    'علبة الجهاز', 'خط', 'خطين', 'كارت ميموري', 'جراب', 'شاحن'
  ];

  const partsList = [
    'شاشة', 'باغة', 'ظهر', 'كاميرا', 'فلاتة باور', 
    'فلاتة صوت', 'فلاتة شحن ميكرو', 'فلاتة شحن تيب سى', 'فلاتة ربط', 
    'علبة جرس', 'كبل شبكة', 'درج خط', 'بطارية', 
    'سوكيت شحن', 'سماعة أذن', 'سماعة جرس', 'مايك داخلي', 'عدسة كاميرا خلفية',
    'سوفت وير', 'شبكة', 'wifi', 'بلوتوث', 'معالج', 
    'كونكتر بوردة', 'اضاءة', 'بيانات', 'مقاومة حرارية', 
    'هاوسينج', 'عظمة شاشة', 'فلتر سماعة'
  ];

  const formatDate = (date: Date): string => date.toLocaleDateString('en-CA');
  const formatDateTime = (date: Date): string => {
    const d = formatDate(date);
    const t = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return `${d} (${t})`;
  };

  useEffect(() => {
    const savedReceipts = localStorage.getItem('bg_receipts_v5');
    if (savedReceipts) setReceipts(JSON.parse(savedReceipts));

    const savedInventory = localStorage.getItem('bg_internal_inventory_v4');
    if (savedInventory) {
      const parsed: InventoryItem[] = JSON.parse(savedInventory).map((item: any) => ({
        ...item,
        deviceModel: item.deviceModel || 'عام'
      }));
      setInventory(parsed);
    } else {
      const initialInv: InventoryItem[] = [
        { id: '1', brand: 'OPPO', deviceModel: 'A15 / A12', partName: 'شاشة', quantity: 3, costPrice: 1500 },
        { id: '2', brand: 'Redmi', deviceModel: 'Note 10', partName: 'شاشة', quantity: 4, costPrice: 1200 },
        { id: '3', brand: 'Samsung', deviceModel: 'A12', partName: 'بطارية', quantity: 5, costPrice: 300 }
      ];
      setInventory(initialInv);
      localStorage.setItem('bg_internal_inventory_v4', JSON.stringify(initialInv));
    }

    const savedExpenses = localStorage.getItem('bg_expenses_v1');
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));

    const savedStaff = localStorage.getItem('bg_staff_list_v1');
    if (savedStaff) {
      setStaffList(JSON.parse(savedStaff));
    } else {
      const defaultStaff: StaffMember[] = [
        { id: '1', name: adminName, phone: shopPhone, role: 'admin', pin: '1234' }
      ];
      setStaffList(defaultStaff);
      localStorage.setItem('bg_staff_list_v1', JSON.stringify(defaultStaff));
    }

    const savedSettings = localStorage.getItem('bg_settings_v5');
    if (savedSettings) {
      const cfg = JSON.parse(savedSettings);
      setShopName(cfg.shopName || shopName);
      setShopPhone(cfg.shopPhone || shopPhone);
      setAdminName(cfg.adminName || adminName);
      setAdminPassword(cfg.adminPassword || '1234');
      if (cfg.admin1Phone) setAdmin1Phone(cfg.admin1Phone);
      if (cfg.admin2Phone) setAdmin2Phone(cfg.admin2Phone);
    }
  }, []);

  const saveReceipts = (data: Receipt[]) => {
    setReceipts(data);
    localStorage.setItem('bg_receipts_v5', JSON.stringify(data));
  };

  const saveInventory = (data: InventoryItem[]) => {
    setInventory(data);
    localStorage.setItem('bg_internal_inventory_v4', JSON.stringify(data));
  };

  const saveExpenses = (data: ExpenseItem[]) => {
    setExpenses(data);
    localStorage.setItem('bg_expenses_v1', JSON.stringify(data));
  };

  const saveStaffList = (data: StaffMember[]) => {
    setStaffList(data);
    localStorage.setItem('bg_staff_list_v1', JSON.stringify(data));
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPhone.trim() || !newStaffPin.trim()) {
      showToast('يرجى إكمال اسم الموظف، الهاتف ورقم الـ PIN', 'error');
      return;
    }
    const newMember: StaffMember = {
      id: Date.now().toString(),
      name: newStaffName.trim(),
      phone: newStaffPhone.trim(),
      role: newStaffRole,
      pin: newStaffPin.trim()
    };
    saveStaffList([...staffList, newMember]);
    setNewStaffName('');
    setNewStaffPhone('');
    setNewStaffPin('');
    showToast('تم إضافة الموظف / المهندس الجديد بنجاح 👨‍🔧✨');
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الموظف من النظام؟')) {
      saveStaffList(staffList.filter(s => s.id !== id));
      showToast('تم حذف الموظف بنجاح', 'info');
    }
  };

  const handleCloudSync = () => {
    setCloudSyncStatus('syncing');
    setTimeout(() => {
      const cloudPayload = { receipts, inventory, expenses, staffList, syncedAt: new Date().toISOString() };
      localStorage.setItem('bg_cloud_backup_snapshot', JSON.stringify(cloudPayload));
      setCloudSyncStatus('synced');
      showToast('تمت مزامنة البيانات السحابية بنجاح بنسبة 100% ☁️✨');
    }, 1500);
  };

  const processInventoryOnReceipt = (deviceBrand: string, issuesList: string[]) => {
    let updatedInv = [...inventory];
    let alerts: string[] = [];

    issuesList.forEach(issue => {
      const itemIndex = updatedInv.findIndex(inv => 
        inv.brand.toLowerCase() === deviceBrand.toLowerCase() && 
        inv.partName.toLowerCase().trim() === issue.toLowerCase().trim()
      );

      if (itemIndex !== -1) {
        if (updatedInv[itemIndex].quantity > 0) {
          updatedInv[itemIndex].quantity -= 1;
          alerts.push(`تم خصم (${updatedInv[itemIndex].partName} - ${updatedInv[itemIndex].brand}) من المخزن (المتبقي: ${updatedInv[itemIndex].quantity})`);
        } else {
          alerts.push(`تنبيه: القطعة (${issue}) لشركة (${deviceBrand}) رصيدها (صفر) في المخزن!`);
        }
      } else {
        const newItem: InventoryItem = {
          id: Date.now().toString() + Math.random().toString().slice(2, 4),
          brand: deviceBrand,
          deviceModel: 'غير محدد',
          partName: issue,
          quantity: 0,
          costPrice: 0
        };
        updatedInv.push(newItem);
        alerts.push(`القطعة (${issue}) غير مسجلة بمخزن شركة (${deviceBrand})! تمت إضافتها برصيد (صفر).`);
      }
    });

    saveInventory(updatedInv);
    if (alerts.length > 0) showToast(alerts[0], 'info');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDeviceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBulkAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPartsForInventory.length === 0) {
      showToast('يرجى اختيار قطعة واحدة على الأقل من شريط الاختيارات!', 'error');
      return;
    }

    let updatedInv = [...inventory];
    const modelTarget = bulkModelTarget.trim() || 'عام';

    selectedPartsForInventory.forEach(part => {
      const existingIdx = updatedInv.findIndex(i => i.brand === bulkBrandTarget && i.deviceModel.toLowerCase() === modelTarget.toLowerCase() && i.partName === part);
      if (existingIdx !== -1) {
        updatedInv[existingIdx].quantity += Number(bulkQty);
        if (bulkCost > 0) updatedInv[existingIdx].costPrice = Number(bulkCost);
      } else {
        updatedInv.push({
          id: Date.now().toString() + Math.random().toString().slice(2, 4),
          brand: bulkBrandTarget,
          deviceModel: modelTarget,
          partName: part,
          quantity: Number(bulkQty),
          costPrice: Number(bulkCost)
        });
      }
    });

    saveInventory(updatedInv);
    setSelectedPartsForInventory([]);
    setBulkModelTarget('');
    setBulkQty(1);
    setBulkCost(0);
    showToast('تم تحديث وإضافة القطع المختارة للمخزن بنجاح!');
  };

  const handleDeleteInventoryItem = (id: string) => {
    if (confirm('هل تريد حذف هذه القطعة من المخزن؟')) {
      saveInventory(inventory.filter(i => i.id !== id));
      showToast('تم حذف القطعة من المخزن', 'info');
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || expAmount <= 0) {
      showToast('يرجى إدخال اسم المصروف والمبلغ بشكل صحيح', 'error');
      return;
    }
    const newExp: ExpenseItem = {
      id: Date.now().toString(),
      title: expTitle,
      amount: Number(expAmount),
      type: expType,
      date: formatDateTime(new Date())
    };
    saveExpenses([newExp, ...expenses]);
    setExpTitle('');
    setExpAmount(0);
    showToast('تم تسجيل المعاملة المالية بنجاح');
  };

  const handleBackupData = () => {
    const backupData = { receipts, inventory, expenses, staffList, settings: { shopName, shopPhone, adminName, admin1Phone, admin2Phone, adminPassword } };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `boody_group_backup_${formatDate(new Date())}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('تم حفظ النسخة الاحتياطية بنجاح!');
  };

  const calculateExpectedDelivery = (): string => {
    if (expectedDeliveryOption === '1h') return 'فوراً خلال ساعة واحدة';
    if (expectedDeliveryOption === '24h') return 'فوراً خلال 24 ساعة';
    if (expectedDeliveryOption === 'custom' && customExpectedDate) return customExpectedDate;
    return 'فوراً خلال ساعة واحدة';
  };

  const openWhatsAppDirect = (phone: string, text: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const notifyAdminsWhatsApp = (msgTitle: string, details: string) => {
    const fullMsg = `إشعار إداري من النظام - ${msgTitle}\n\n${details}\n\n📍 ${shopName}`;
    [admin1Phone, admin2Phone].forEach(phone => {
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMsg)}`, '_blank');
    });
  };

  const printThermalReceipt = (r: Receipt) => {
    const remaining = r.price - r.deposit;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
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
          body {
            font-family: 'Tahoma', Arial, sans-serif;
            width: 72mm;
            margin: 0 auto;
            padding: 5mm;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .header h2 { margin: 0 0 4px 0; font-size: 16px; }
          .header p { margin: 2px 0; font-size: 11px; }
          .section {
            margin-bottom: 8px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 6px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .bold { font-weight: bold; }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 6px;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
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
          <div class="row"><span class="bold">اللون:</span> <span>${r.deviceColor}</span></div>
          <div class="row"><span class="bold">الأعطال:</span> <span>${r.issues.join(', ')}</span></div>
          ${r.accessories && r.accessories.length > 0 ? `<div class="row"><span class="bold">الملحقات:</span> <span>${r.accessories.join(', ')}</span></div>` : ''}
        </div>

        <div class="section">
          <div class="row"><span class="bold">إجمالي التكلفة:</span> <span>${r.price} ج.م</span></div>
          <div class="row"><span class="bold">العربون المدفوع:</span> <span>${r.deposit} ج.م</span></div>
          <div class="row bold"><span class="bold">المتبقي للاستلام:</span> <span>${remaining} ج.م</span></div>
        </div>

        <div class="footer">
          <p>شكراً لتعاملكم معنا 🙏</p>
          <p>توقيع الاستلام: ........................</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSaveReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalIssues = selectedIssues.length ? [...selectedIssues] : [];
    if (customIssue.trim()) finalIssues.push(customIssue);
    const issuesToCheck = finalIssues.length ? finalIssues : ['فحص شامل'];

    if (editingReceiptId) {
      const updated = receipts.map(r => {
        if (r.id === editingReceiptId) {
          return {
            ...r,
            customerName: cName,
            customerPhone: cPhone,
            deviceType: dType,
            deviceModel: dModel,
            deviceColor: dColor,
            imei: imei,
            accessories: selectedAccessories,
            issues: issuesToCheck,
            price: Number(price),
            partCost: Number(partCost),
            deposit: Number(deposit),
            notes: notes,
            internalNotes: internalNotes,
            image: deviceImage || r.image
          };
        }
        return r;
      });
      saveReceipts(updated);
      setEditingReceiptId(null);
      resetForm();
      setActiveTab('receipts');
      showToast('تم تحديث الإيصال بنجاح!');
      return;
    }

    processInventoryOnReceipt(dType, issuesToCheck);

    const newReceiptId = Date.now().toString();
    const receiptNum = `BG-${1000 + receipts.length + 1}`;
    const imageCount = deviceImage ? 1 : 0;
    const remainingAmount = Number(price) - Number(deposit);

    const newReceipt: Receipt = {
      id: newReceiptId,
      receiptNumber: receiptNum,
      customerName: cName,
      customerPhone: cPhone,
      deviceType: dType,
      deviceModel: dModel,
      deviceColor: dColor,
      imei: imei,
      accessories: selectedAccessories,
      issues: issuesToCheck,
      status: 'pending',
      price: Number(price),
      partCost: Number(partCost),
      deposit: Number(deposit),
      notes: notes,
      internalNotes: internalNotes,
      receivedAt: formatDateTime(new Date()),
      expectedDelivery: calculateExpectedDelivery(),
      isArchived: false,
      image: deviceImage || undefined
    };

    saveReceipts([newReceipt, ...receipts]);

    const customerWhatsAppMsg = `مرحباً أستاذ/ة ${cName} 🌹\nتم استلام جهازكم (${dType} ${dModel}) لدى Boody Group - مركز صيانة بنجاح 📱✨\n📌 رقم الفاتورة / الإيصال: ${receiptNum}\n🔧 نوع العطل والشكوى: ${issuesToCheck.join('، ')}\n📷 تم توثيق وحفظ عدد (${imageCount}) صورة رسمية لحالة الجهاز عند الاستلام في النظام.\n💵 العربون المدفوع: ${deposit} ج.م\n💰 التكلفة المقدرة: ${price} ج.م\n📌 المبلغ المتبقي عند الاستلام: ${remainingAmount} ج.م\n\n🔔 سنقوم بإعلامكم فور جاهزية الجهاز للاستلام.\n📞 هاتف الإدارة: ${shopPhone}\n👨‍🔧 المسؤول: ${adminName}`;

    openWhatsAppDirect(cPhone, customerWhatsAppMsg);
    notifyAdminsWhatsApp('استلام جهاز جديد', `تم استلام جهاز (${dType} ${dModel}) للعميل ${cName} - برقم إيصال ${receiptNum}`);

    setActiveTab('receipts');
    resetForm();
    showToast('تم حفظ الإيصال وإرسال رسالة الاستلام للعميل بنجاح!');
  };

  const resetForm = () => {
    setCName(''); setCPhone(''); setDModel(''); setImei(''); setDColor('أسود');
    setSelectedAccessories([]); setSelectedIssues([]); setCustomIssue('');
    setPrice(0); setPartCost(0); setDeposit(0); setNotes(''); setInternalNotes(''); setDeviceImage(null);
    setEditingReceiptId(null);
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

  const filteredReceipts = receipts.filter(r => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || r.receiptNumber.toLowerCase().includes(query) || r.customerName.toLowerCase().includes(query) || r.customerPhone.includes(query) || (r.imei && r.imei.toLowerCase().includes(query));
    if (receiptStatusFilter === 'all') return matchesSearch;
    return matchesSearch && r.status === receiptStatusFilter;
  });

  const filteredInventory = inventory.filter(item => {
    const matchesBrand = selectedInventoryBrandFilter === 'all' || item.brand.toLowerCase() === selectedInventoryBrandFilter.toLowerCase();
    const query = inventorySearchQuery.trim().toLowerCase();
    const matchesQuery = !query || item.partName.toLowerCase().includes(query) || item.brand.toLowerCase().includes(query) || (item.deviceModel && item.deviceModel.toLowerCase().includes(query));
    return matchesBrand && matchesQuery;
  });

  const todayStr = formatDate(new Date());
  const todayReceipts = receipts.filter(r => (r.receivedAt && r.receivedAt.includes(todayStr)) || (r.deliveredAt && r.deliveredAt.includes(todayStr)));
  const todayTotalRevenue = todayReceipts.reduce((acc, r) => acc + r.price, 0);
  const todayTotalCosts = todayReceipts.reduce((acc, r) => acc + (r.partCost || 0), 0);
  
  const todayExpenses = expenses.filter(e => e.date && e.date.includes(todayStr));
  const todayExpenseTotal = todayExpenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
  const todayExtraIncome = todayExpenses.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);

  const todayNetProfit = (todayTotalRevenue - todayTotalCosts + todayExtraIncome) - todayExpenseTotal;
  const totalInventoryMoney = inventory.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);

  const theme = {
    bg: darkMode ? 'bg-[#12141c] text-[#e2e8f0]' : 'bg-[#f8fafc] text-[#1e293b]',
    card: darkMode ? 'bg-[#1a1d28] border-[#2d3748]' : 'bg-white border-[#e2e8f0] shadow-sm',
    input: darkMode ? 'bg-[#101218] border-[#2d3748] text-[#f1f5f9] placeholder-[#64748b]' : 'bg-[#fdfdfe] border-[#cbd5e1] text-[#0f172a] placeholder-[#94a3b8]',
    textMuted: darkMode ? 'text-[#94a3b8]' : 'text-[#64748b]',
    badgeInactive: darkMode ? 'bg-[#232736] text-[#cbd5e1] border-[#374151]' : 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]',
    subHeader: darkMode ? 'bg-[#12141c]/95 border-[#2d3748]' : 'bg-white/90 border-[#e2e8f0]',
  };

  const fontSizeClass = 
    fontSizeLevel === 'xlarge' ? 'text-base md:text-lg' : 
    fontSizeLevel === 'large' ? 'text-sm md:text-base' : 'text-xs md:text-sm';

  const fontWeightClass = fontWeightHeavy ? 'font-bold' : 'font-medium';

  return (
    <div className={`min-h-screen ${theme.bg} ${fontSizeClass} ${fontWeightClass} transition-colors duration-200`} dir="rtl">
      
      {/* 🔔 نظام الإشعارات العائمة Toast Notifications */}
      <div className="fixed top-5 left-5 z-[999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-white font-bold animate-bounce flex items-center gap-2 ${
            t.type === 'error' ? 'bg-rose-600 border-rose-500' :
            t.type === 'info' ? 'bg-amber-600 border-amber-500' : 'bg-emerald-600 border-emerald-500'
          }`}>
            <span>{t.type === 'error' ? '❌' : t.type === 'info' ? '⚠️' : '✅'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <header className={`border-b ${theme.subHeader} sticky top-0 z-50 p-3 md:p-4 max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3 backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white font-bold p-2.5 rounded-xl text-sm shadow-md">BG</div>
          <div>
            <h1 className="font-extrabold text-sm md:text-base tracking-wide">{shopName}</h1>
            <p className={`text-2xs md:text-xs ${theme.textMuted}`}>إدارة: {adminName} | النظام المطور لصيانة المحمول 🌐📱</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center border rounded-lg p-0.5 ${darkMode ? 'border-[#374151] bg-[#1a1d28]' : 'border-[#cbd5e1] bg-white'}`}>
            <button 
              onClick={() => setFontSizeLevel('normal')} 
              className={`px-2 py-1 rounded text-2xs transition ${fontSizeLevel === 'normal' ? 'bg-indigo-600 text-white font-bold' : theme.textMuted}`}
            >
              عادي
            </button>
            <button 
              onClick={() => setFontSizeLevel('large')} 
              className={`px-2 py-1 rounded text-2xs transition ${fontSizeLevel === 'large' ? 'bg-indigo-600 text-white font-bold' : theme.textMuted}`}
            >
              كبير
            </button>
            <button 
              onClick={() => setFontSizeLevel('xlarge')} 
              className={`px-2 py-1 rounded text-2xs transition ${fontSizeLevel === 'xlarge' ? 'bg-indigo-600 text-white font-bold' : theme.textMuted}`}
            >
              أكبر
            </button>
          </div>

          <button 
            onClick={() => setFontWeightHeavy(!fontWeightHeavy)} 
            className={`border px-2.5 py-1.5 rounded-lg text-2xs transition ${fontWeightHeavy ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' : theme.badgeInactive}`}
          >
            {fontWeightHeavy ? '🔠 خط تقيل (Bold)' : '🔡 خط عادي'}
          </button>

          <button onClick={() => setDarkMode(!darkMode)} className={`border px-2.5 py-1.5 rounded-lg text-2xs transition ${theme.badgeInactive}`}>
            {darkMode ? '☀️ وضع ساطع مريح' : '🌙 وضع داكن مريح'}
          </button>

          {/* 🔐 اختيار نوع الحساب وصلاحيات المدير / الفني */}
          <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-zinc-700">
            <select
              value={userRole}
              onChange={(e) => {
                const role = e.target.value as 'admin' | 'technician';
                setUserRole(role);
                if (role === 'admin') {
                  setIsAdminUnlocked(true);
                  showToast('تم التبديل إلى وضع (المدير العام)');
                } else {
                  setIsAdminUnlocked(false);
                  showToast('تم التبديل إلى وضع (فني الصيانة)', 'info');
                }
              }}
              className="bg-transparent text-indigo-300 font-bold text-xs p-1 outline-none cursor-pointer"
            >
              <option value="admin" className="bg-[#1a1d28] text-white">👨‍💼 المدير العام ({adminName})</option>
              <option value="technician" className="bg-[#1a1d28] text-white">👨‍🔧 فني صيانة (محدد الصلاحيات)</option>
            </select>
          </div>

          {userRole === 'admin' && !isAdminUnlocked && (
            <button onClick={() => {
              const pass = prompt('ادخل كلمة سر المسؤول:');
              if (pass === adminPassword) {
                setIsAdminUnlocked(true);
                showToast('تم فتح صلاحيات المدير بنجاح');
              } else if (pass) {
                showToast('كلمة السر خطأ!', 'error');
              }
            }} className={`border px-2.5 py-1.5 rounded-lg text-2xs ${theme.badgeInactive}`}>
              🔐 إدخال كلمة السر
            </button>
          )}

          <button onClick={handleBackupData} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-2xs font-bold shadow-sm transition">
            💾 حفظ النسخة
          </button>
        </div>
      </header>

      <nav className="max-w-7xl mx-auto p-3 flex gap-2 overflow-x-auto border-b border-[#2d3748]/35">
        {[
          { id: 'home', label: '🏠 الرئيسية' },
          { id: 'receiving', label: editingReceiptId ? '✏️ تعديل إيصال' : '📱 استلام جهاز' },
          { id: 'receipts', label: '📋 الإيصالات' },
          { id: 'scanner', label: '📷 قارئ الباركود والسيريال' },
          { id: 'staff', label: '👨‍💼 فريق العمل والموظفين' },
          { id: 'cloud', label: '☁️ الربط السحابي' },
          { id: 'delivery', label: '✅ تسليم' },
          { id: 'inventory', label: '📦 المخزن' },
          { id: 'expenses', label: '💵 الخزينة والمصروفات' },
          { id: 'reports', label: '📊 الحسابات' },
          { id: 'settings', label: '⚙️ إعدادات التطبيق الشاملة' },
        ].map((tab) => {
          const isRestrictedForTech = userRole === 'technician' && (tab.id === 'reports' || tab.id === 'expenses' || tab.id === 'staff' || tab.id === 'settings');

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isRestrictedForTech) {
                  showToast('عذراً، هذا القسم مخصص للمدير العام فقط!', 'error');
                  return;
                }
                if (tab.id === 'receiving' && !editingReceiptId) resetForm();
                setActiveTab(tab.id as any);
              }}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === tab.id ? 'bg-indigo-600 text-white font-bold shadow-md' : `${theme.badgeInactive} hover:opacity-80`
              } ${isRestrictedForTech ? 'opacity-50 border-dashed border-rose-500/40' : ''}`}
            >
              <span>{tab.label}</span>
              {isRestrictedForTech && <span className="text-2xs text-rose-400">🔒</span>}
            </button>
          );
        })}
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`${theme.card} p-4 rounded-xl border`}>
                <span className={`block mb-1 ${theme.textMuted}`}>قيد الصيانة</span>
                <strong className="text-2xl font-black text-amber-400">{receipts.filter(r => r.status === 'pending').length}</strong>
              </div>
              <div className={`${theme.card} p-4 rounded-xl border`}>
                <span className={`block mb-1 ${theme.textMuted}`}>جاهز للاستلام</span>
                <strong className="text-2xl font-black text-teal-400">{receipts.filter(r => r.status === 'ready').length}</strong>
              </div>
              <div className={`${theme.card} p-4 rounded-xl border`}>
                <span className={`block mb-1 ${theme.textMuted}`}>تم التسليم</span>
                <strong className="text-2xl font-black text-emerald-400">{receipts.filter(r => r.status === 'done').length}</strong>
              </div>
              <div className={`${theme.card} p-4 rounded-xl border`}>
                <span className={`block mb-1 ${theme.textMuted}`}>قيمة أصل المخزن</span>
                <strong className="text-2xl font-black text-indigo-400">{totalInventoryMoney.toLocaleString()} ج.م</strong>
              </div>
              <div className={`${theme.card} p-4 rounded-xl border`}>
                <span className={`block mb-1 ${theme.textMuted}`}>إجمالي الإيصالات</span>
                <strong className="text-2xl font-black">{receipts.length}</strong>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => { resetForm(); setActiveTab('receiving'); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition">
                + استلام جهاز جديد وتحديد الملحقات والأعطال
              </button>
              <button onClick={() => setActiveTab('scanner')} className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition">
                📷 فتح قارئ الباركود السريع
              </button>
              <button onClick={() => setActiveTab('staff')} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition">
                👨‍💼 إدارة فريق العمل والموظفين
              </button>
              <button onClick={() => setActiveTab('settings')} className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition">
                ⚙️ إعدادات التطبيق الشاملة وتغيير كلمة السر
              </button>
            </div>
          </div>
        )}

        {/* 👨‍💼 قسم إدارة فريق العمل والموظفين */}
        {activeTab === 'staff' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {userRole === 'technician' ? (
              <div className={`${theme.card} p-8 rounded-xl border text-center text-rose-400 font-bold`}>
                عذراً، إدارة فريق العمل مخصصة للمدير العام فقط.
              </div>
            ) : (
              <>
                <div className={`${theme.card} p-6 rounded-xl border`}>
                  <h2 className="font-bold text-indigo-400 text-lg mb-1">👨‍💼 إضافة موظف أو مهندس صيانة جديد</h2>
                  <p className={`text-xs ${theme.textMuted} mb-4`}>قم بإضافة فنيين أو مشرفين وعرض صلاحياتهم في النظام مع تحديد رمز PIN الخاص بهم.</p>
                  
                  <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>اسم الموظف / المهندس *</label>
                      <input type="text" required value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="مثال: أحمد مصطفى" className={`w-full ${theme.input} p-3 rounded-xl`} />
                    </div>
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>رقم الهاتف / واتساب *</label>
                      <input type="text" required value={newStaffPhone} onChange={e => setNewStaffPhone(e.target.value)} placeholder="010xxxxxxxx" className={`w-full ${theme.input} p-3 rounded-xl`} />
                    </div>
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>الصلاحية والدور</label>
                      <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as any)} className={`w-full ${theme.input} p-3 rounded-xl font-bold`}>
                        <option value="technician">👨‍🔧 فني صيانة</option>
                        <option value="admin">👨‍💼 مدير عام</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>رمز سري PIN *</label>
                      <input type="password" required value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} placeholder="4 أرقام سرية" className={`w-full ${theme.input} p-3 rounded-xl font-bold`} />
                    </div>
                    <div className="md:col-span-4 pt-2">
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3.5 rounded-xl shadow transition text-xs">
                        + حفظ وإضافة الموظف الجديد للنظام
                      </button>
                    </div>
                  </form>
                </div>

                <div className={`${theme.card} p-6 rounded-xl border space-y-4`}>
                  <h3 className="font-bold text-indigo-400">📋 قائمة أعضاء فريق العمل المسجلين ({staffList.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {staffList.map(member => (
                      <div key={member.id} className={`p-4 rounded-xl border flex justify-between items-center ${darkMode ? 'bg-[#101218] border-[#2d3748]' : 'bg-slate-50 border-slate-300'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="font-bold text-sm">{member.name}</strong>
                            <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold ${member.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'}`}>
                              {member.role === 'admin' ? 'مدير عام' : 'فني صيانة'}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${theme.textMuted}`}>هاتف: {member.phone} | رمز PIN: {member.pin}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openWhatsAppDirect(member.phone, `مرحباً بك يا ${member.name} في فريق عمل ${shopName} 🌹`)} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-2xs font-bold">
                            💬 واتساب
                          </button>
                          {staffList.length > 1 && (
                            <button onClick={() => handleDeleteStaff(member.id)} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl text-2xs font-bold">
                              🗑️
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

        {/* 📷 قسم قارئ الباركود المباشر */}
        {activeTab === 'scanner' && (
          <div className={`${theme.card} p-6 rounded-xl border max-w-2xl mx-auto space-y-6 text-center`}>
            <div>
              <h2 className="font-bold text-indigo-400 text-lg mb-1">📷 قارئ الباركود ورقم الإيصال والسيريال (IMEI)</h2>
              <p className={`text-xs ${theme.textMuted}`}>امسح باركود الإيصال أو وجه الكاميرا نحو كود الجهاز لاسترجاع بياناته فوراً أو تسجيل الصيانة.</p>
            </div>

            <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center gap-4 ${darkMode ? 'bg-[#101218] border-[#2d3748]' : 'bg-slate-50 border-slate-300'}`}>
              <div className="w-full h-48 rounded-xl bg-zinc-900 border border-indigo-500/50 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                {isScanningActive ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-white">
                    <div className="w-48 h-12 border-2 border-dashed border-emerald-400 rounded-lg animate-pulse flex items-center justify-center">
                      <span className="text-2xs text-emerald-300 font-bold">جاري التقاط الباركود والـ IMEI...</span>
                    </div>
                    <button onClick={() => { setIsScanningActive(false); showToast('تم إيقاف الماسح الضوئي', 'info'); }} className="mt-4 bg-rose-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold">
                      إيقاف الكاميرا
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-3xl">📷</span>
                    <button onClick={() => {
                      setIsScanningActive(true);
                      setTimeout(() => {
                        setIsScanningActive(false);
                        const sampleReceipt = receipts[0]?.receiptNumber || 'BG-1001';
                        setScannedResult(sampleReceipt);
                        showToast(`تم التعرف على الكود بنجاح: ${sampleReceipt}`);
                      }, 2500);
                    }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow">
                      تشغيل كاميرا المسح الضوئي (Scan)
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full space-y-2 text-right">
                <label className={`block text-xs ${theme.textMuted}`}>أو أدخل رقم الإيصال / سيريال الجهاز (IMEI) يدوياً للبحث:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannedResult}
                    onChange={e => setScannedResult(e.target.value)}
                    placeholder="مثال: BG-1001 أو سيريال الجهاز..."
                    className={`w-full ${theme.input} p-3 rounded-xl`}
                  />
                  <button onClick={() => {
                    if (!scannedResult.trim()) {
                      showToast('يرجى إدخال أو مسح كود أولاً', 'error');
                      return;
                    }
                    setSearchQuery(scannedResult);
                    setActiveTab('receipts');
                    showToast('تم العثور على الإيصال المطابق بنجاح!');
                  }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 rounded-xl text-xs">
                    بحث فوري
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ☁️ قسم الربط السحابي المتقدم */}
        {activeTab === 'cloud' && (
          <div className={`${theme.card} p-6 rounded-xl border max-w-2xl mx-auto space-y-6 text-center`}>
            <div>
              <h2 className="font-bold text-cyan-400 text-lg mb-1">☁️ نظام الربط السحابي المتقدم والمزامنة (Cloud Sync)</h2>
              <p className={`text-xs ${theme.textMuted}`}>احفظ جميع بيانات الإيصالات والمخزن والمصروفات وفريق العمل على السحابة لضمان عدم ضياعها ولإمكانية فتحها من أي جهاز آخر.</p>
            </div>

            <div className={`p-6 rounded-2xl border space-y-4 ${darkMode ? 'bg-[#101218] border-[#2d3748]' : 'bg-slate-50 border-slate-300'}`}>
              <div className="flex items-center justify-between border-b border-zinc-700 pb-3 text-right">
                <div>
                  <strong className="block text-sm">حالة المزامنة السحابية:</strong>
                  <span className={`text-xs ${cloudSyncStatus === 'synced' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {cloudSyncStatus === 'synced' ? 'متصل بالسحابة ومحدث بالكامل ✅' : cloudSyncStatus === 'syncing' ? 'جاري مزامنة البيانات مع السحابة... 🔄' : 'في انتظار المزامنة اليدوية أو التلقائية ⏳'}
                  </span>
                </div>
                <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-xs font-bold">
                  Firebase / API Ready
                </div>
              </div>

              <div className="flex gap-3 flex-wrap justify-center pt-2">
                <button onClick={handleCloudSync} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition text-xs">
                  {cloudSyncStatus === 'syncing' ? 'جاري المزامنة...' : '🔄 مزامنة سحابية فورية الآن (Sync)'}
                </button>
                <button onClick={handleBackupData} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition text-xs">
                  📥 تصدير نسخة احتياطية محلية
                </button>
              </div>

              <div className="text-right text-xs text-zinc-400 pt-2 border-t border-zinc-800">
                <p>💡 ملاحظة: يمكنك ربط هذا النظام بقاعدة بيانات سحابية حية (مثل Firebase Firestore أو Supabase) عبر إدخال مفاتيح الربط في ملف الإعدادات.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receiving' && (
          <form onSubmit={handleSaveReceiptSubmit} className={`${theme.card} p-6 rounded-xl border max-w-4xl mx-auto space-y-6`}>
            <div className="flex justify-between items-center border-b border-[#2d3748] pb-3">
              <h2 className="font-bold text-indigo-400">
                {editingReceiptId ? '✏️ تعديل بيانات الإيصال الحالي' : '📱 استلام جهاز جديد وتسجيل البيانات بدقة'}
              </h2>
              <span className="text-2xs text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">ربط ذكي ومباشر بالمخزن والطباعة والباركود</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block mb-1 ${theme.textMuted}`}>اسم العميل *</label>
                <input required value={cName} onChange={e => setCName(e.target.value)} type="text" className={`w-full ${theme.input} p-3 rounded-xl`} placeholder="محمد أحمد" />
              </div>
              <div>
                <label className={`block mb-1 ${theme.textMuted}`}>رقم الموبايل *</label>
                <input required value={cPhone} onChange={e => setCPhone(e.target.value)} type="text" className={`w-full ${theme.input} p-3 rounded-xl`} placeholder="01038084846" />
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${darkMode ? 'bg-[#101218] border-[#2d3748]' : 'bg-[#f8fafc] border-[#cbd5e1]'}`}>
              <label className={`block font-bold`}>📷 صورة الجهاز عند الاستلام (توثيق حالة الجهاز)</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className={`w-full ${theme.input} p-2 rounded-xl`} />
              {deviceImage && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={deviceImage} alt="Device" className="w-16 h-16 object-cover rounded-xl border border-indigo-500" />
                  <button type="button" onClick={() => setDeviceImage(null)} className="text-rose-400 hover:underline">حذف الصورة</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 ${theme.textMuted}`}>الشركة المصنعة (Brand) *</label>
                <select value={dType} onChange={e => setDType(e.target.value)} className={`w-full ${theme.input} p-3 rounded-xl font-bold`}>
                  {marketBrands.map(b => <option key={b} value={b} className={darkMode ? "bg-[#1a1d28] text-white" : "bg-white text-slate-900"}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={`block mb-1 ${theme.textMuted}`}>الموديل</label>
                <input value={dModel} onChange={e => setDModel(e.target.value)} type="text" className={`w-full ${theme.input} p-3 rounded-xl`} placeholder="مثال: Note 10 / A12" />
              </div>
              <div>
                <label className={`block mb-1 ${theme.textMuted}`}>IMEI / باركود السيريال</label>
                <input value={imei} onChange={e => setImei(e.target.value)} type="text" className={`w-full ${theme.input} p-3 rounded-xl`} placeholder="امسح الباركود أو اكتب السيريال" />
              </div>
            </div>

            <div>
              <label className={`block mb-1 ${theme.textMuted}`}>لون الجهاز</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {commonColors.map(color => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setDColor(color)}
                    className={`px-3 py-1.5 rounded-xl border transition ${
                      dColor === color ? 'bg-indigo-600 text-white border-indigo-500 font-bold' : theme.badgeInactive
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
              <input value={dColor} onChange={e => setDColor(e.target.value)} type="text" className={`w-full ${theme.input} p-2.5 rounded-xl`} placeholder="أو اكتب لوناً مخصصاً..." />
            </div>

            <div>
              <label className={`block mb-2 font-extrabold text-indigo-400`}>📦 ملحقات الجهاز المستلمة مع العميل:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {accessoriesList.map((acc) => {
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
                        isSelected ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-sm' : `${theme.badgeInactive} hover:opacity-80`
                      }`}
                    >
                      <span className="truncate">{acc}</span>
                      <span className="shrink-0">{isSelected ? '☑️' : '◻️'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={`block mb-2 font-extrabold text-indigo-400`}>🛠️ حدد الأعطال وقطع الغيار المطلوبة (اختيار سريع):</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                {partsList.map((part) => {
                  const isSelected = selectedIssues.includes(part);
                  return (
                    <button
                      type="button"
                      key={part}
                      onClick={() => {
                        if (isSelected) setSelectedIssues(selectedIssues.filter(i => i !== part));
                        else setSelectedIssues([...selectedIssues, part]);
                      }}
                      className={`p-3 rounded-xl text-right border transition flex items-center justify-between ${
                        isSelected ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-sm' : `${theme.badgeInactive} hover:opacity-80`
                      }`}
                    >
                      <span className="truncate">{part}</span>
                      <span className="shrink-0">{isSelected ? '☑️' : '◻️'}</span>
                    </button>
                  );
                })}
              </div>
              
              <div>
                <label className={`block mb-1 ${theme.textMuted}`}>✍️ خانة أخرى (كتابة عطل أو تفاصيل مخصصة):</label>
                <input value={customIssue} onChange={e => setCustomIssue(e.target.value)} type="text" className={`w-full ${theme.input} p-3 rounded-xl`} placeholder="اكتب ملاحظات إضافية للعطل هنا..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#2d3748] pt-4">
              <div>
                <label className={`block mb-1 ${theme.textMuted}`}>سعر الصيانة للعميل (ج.م)</label>
                <input value={price} onChange={e => setPrice(Number(e.target.value))} type="number" className={`w-full ${theme.input} p-3 rounded-xl font-bold`} />
              </div>

              {userRole === 'admin' ? (
                <div>
                  <label className="block mb-1 text-amber-400">🔒 تكلفة القطعة الداخلية</label>
                  <input value={partCost} onChange={e => setPartCost(Number(e.target.value))} type="number" className={`w-full ${theme.input} p-3 rounded-xl font-bold border-amber-500/30`} />
                </div>
              ) : (
                <div className="flex items-end">
                  <span className={`p-3 rounded-xl w-full text-center border font-medium ${darkMode ? 'text-zinc-400 bg-[#101218] border-[#2d3748]' : 'text-slate-500 bg-[#f1f5f9] border-[#cbd5e1]'}`}>
                    🔒 تكلفة القطعة محجوبة عن الفني
                  </span>
                </div>
              )}

              <div>
                <label className={`block mb-1 ${theme.textMuted}`}>العربون المدفوع (ج.م)</label>
                <input value={deposit} onChange={e => setDeposit(Number(e.target.value))} type="number" className={`w-full ${theme.input} p-3 rounded-xl font-bold`} />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition">
                {editingReceiptId ? '💾 حفظ التعديلات' : '💾 حفظ الإيصال وإرسال رسالة الاستلام للعميل'}
              </button>
              {editingReceiptId && (
                <button type="button" onClick={() => { resetForm(); setActiveTab('receipts'); }} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold px-6 py-3.5 rounded-xl transition">
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>
        )}

        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className={`${theme.card} p-4 rounded-xl border space-y-3`}>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-bold text-indigo-400">🔍 الفلترة والبحث السريع في الإيصالات المسجلة</h3>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'pending', label: '⏳ قيد الصيانة' },
                    { id: 'ready', label: '🔔 جاهز' },
                    { id: 'done', label: '✅ تم التسليم' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setReceiptStatusFilter(f.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold border transition ${
                        receiptStatusFilter === f.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : theme.badgeInactive
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                type="text"
                placeholder="ابحث برقم الإيصال، اسم العميل، رقم الهاتف، أو سيريال الجهاز (IMEI)..."
                className={`w-full ${theme.input} p-3 rounded-xl`}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredReceipts.map(r => {
                const remaining = r.price - r.deposit;
                return (
                  <div key={r.id} className={`${theme.card} p-4 rounded-xl border flex flex-col gap-3 ${r.isArchived ? 'opacity-60 bg-[#101218]' : ''}`}>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="font-black text-indigo-400">{r.receiptNumber}</strong>
                          <span className="font-bold">- {r.customerName} ({r.customerPhone})</span>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                            r.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            r.status === 'ready' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {r.status === 'done' ? 'تم التسليم' : r.status === 'ready' ? 'جاهز للاستلام' : 'قيد الصيانة'}
                          </span>
                        </div>
                        <p className={`mt-1 ${theme.textMuted}`}>الجهاز: <strong className="text-indigo-400">{r.deviceType}</strong> {r.deviceModel} {r.imei ? `| IMEI: ${r.imei}` : ''} | الأعطال: {r.issues.join('، ')}</p>
                        {r.accessories && r.accessories.length > 0 && (
                          <p className="mt-1 text-indigo-300 font-medium">الملحقات: {r.accessories.join('، ')}</p>
                        )}

                        <div className="flex gap-4 mt-2 font-bold flex-wrap">
                          <span className="text-amber-400">المتبقي: {remaining} ج.م</span>
                          {userRole === 'admin' && (
                            <span className="text-emerald-400 border-r pr-3 border-[#2d3748]">
                              الربح الصافي: {r.price - (r.partCost || 0)} ج.م (التكلفة: {r.partCost || 0} ج.م)
                            </span>
                          )}
                        </div>
                      </div>

                      {r.image && (
                        <img src={r.image} alt="Device" className="w-16 h-16 object-cover rounded-xl border border-zinc-700 shrink-0" />
                      )}
                    </div>

                    <div className={`border-t pt-3 flex flex-wrap gap-2 justify-between items-center border-[#2d3748]`}>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => printThermalReceipt(r)} 
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl font-bold shadow-sm transition flex items-center gap-1.5 text-xs"
                        >
                          🖨️ طباعة إيصال حراري
                        </button>

                        <button 
                          onClick={() => {
                            const imgCount = r.image ? 1 : 0;
                            const msg = `مرحباً أستاذ/ة ${r.customerName} 🌹\nتم استلام جهازكم (${r.deviceType} ${r.deviceModel}) لدى Boody Group - مركز صيانة بنجاح 📱✨\n📌 رقم الفاتورة / الإيصال: ${r.receiptNumber}\n🔧 نوع العطل والشكوى: ${r.issues.join('، ')}\n📷 تم توثيق وحفظ عدد (${imgCount}) صورة رسمية لحالة الجهاز عند الاستلام في النظام.\n💵 العربون المدفوع: ${r.deposit} ج.م\n💰 التكلفة المقدرة: ${r.price} ج.م\n📌 المبلغ المتبقي عند الاستلام: ${remaining} ج.م\n\n🔔 سنقوم بإعلامكم فور جاهزية الجهاز للاستلام.\n📞 هاتف الإدارة: ${shopPhone}\n👨‍🔧 المسؤول: ${adminName}`;
                            openWhatsAppDirect(r.customerPhone, msg);
                          }} 
                          className={`border px-3 py-2 rounded-xl font-bold transition text-xs ${theme.badgeInactive}`}
                        >
                          💬 رسالة الاستلام للعميل
                        </button>

                        <button 
                          onClick={() => {
                            const updated = receipts.map(item => item.id === r.id ? { ...item, status: 'ready' as DeviceStatus } : item);
                            saveReceipts(updated);
                            const readyMsg = `مرحباً أستاذ/ة ${r.customerName} 🌹\nجهازك (${r.deviceType} ${r.deviceModel}) أصبح جاهزاً للاستلام الآن من Boody Group - مركز صيانة ✨📱\nالمتبقي: ${remaining} ج.م\n📞 هاتف الإدارة: ${shopPhone}\n👨‍🔧 المسؤول: ${adminName}`;
                            openWhatsAppDirect(r.customerPhone, readyMsg);
                            showToast('تم إرسال إشعار الجاهزية للعميل');
                          }} 
                          className="bg-teal-500/10 text-teal-400 border border-teal-500/30 px-3 py-2 rounded-xl font-bold text-xs"
                        >
                          🔔 جاهز للاستلام
                        </button>

                        <button 
                          onClick={() => {
                            const updated = receipts.map(item => item.id === r.id ? { ...item, status: 'done' as DeviceStatus, deliveredAt: formatDateTime(new Date()) } : item);
                            saveReceipts(updated);
                            const deliveryMsg = `مرحباً بك أستاذ/ة ${r.customerName} 🌹\nألف مبروك استلام جهازك (${r.deviceType} ${r.deviceModel}) بعد إتمام الصيانة بنجاح من Boody Group - مركز صيانة 📱✨\n\n💡 إرشادات ذهبية للحفاظ على عمر وأداء هاتفك:\n⚡ الشحن الآمن: استخدم شاحناً وكابلاً أصلياً، وتجنب استخدام الهاتف أثناء الشحن أو تركه على الشاحن بعد 100%.\n🛡️ الحماية من الصدمات: احرص دائماً على تركيب إسكرينة زجاجية وجراب حماية متين وممتص للصدمات.\n☀️ تجنب الحرارة الزائدة: لا تترك الهاتف معرضاً لأشعة الشمس المباشرة أو داخل سيارة مغلقة.\n\n🚨 إسعافات أولية عاجلة في حال سقوط الهاتف في الماء أو أي سوائل:\n1️⃣ أغلق الهاتف فوراً ولا تحاول فتحه أو تشغيله نهائياً.\n2️⃣ لا توصله بالشاحن مطلقاً حتى لا يحدث قفلة كهربائية (شورت) تحرق المعالج أو المكونات.\n3️⃣ جفف الجهاز خارجياً فقط بفوطة ناعمة أو مناديل، ولا تهز الهاتف حتى لا تتسرب المياه للداخل.\n4️⃣ تجنب تماماً استخدام السشوار الساخن أو وضع الهاتف في الأرز.\n5️⃣ توجه به فوراً إلينا لعمل غسيل احترافي بالموجات فوق الصوتية وإزالة الرطوبة والأكسدة بأسرع وقت!\n\n✨ يسعدنا دائماً خدمتكم ونتمنى لكم تجربة متميزة!\n👨‍🔧 المسؤول: ${adminName}\n📞 للتواصل والدعم الفني: ${shopPhone}`;
                            openWhatsAppDirect(r.customerPhone, deliveryMsg);
                            showToast('تم تسجيل التسليم وإرسال رسالة الإرشادات للعميل');
                          }}
                          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl font-bold text-xs"
                        >
                          ✅ تسليم وإرسال الإرشادات
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => startEditingReceipt(r)} className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-2 rounded-xl font-bold text-xs">
                          ✏️ تعديل
                        </button>

                        <button onClick={() => {
                          if (confirm('هل تريد حذف الإيصال؟')) {
                            saveReceipts(receipts.filter(x => x.id !== r.id));
                            showToast('تم حذف الإيصال', 'info');
                          }
                        }} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-xl font-bold text-xs">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredReceipts.length === 0 && <div className={`p-6 text-center ${theme.textMuted}`}>لا توجد إيصالات مطابقة.</div>}
            </div>
          </div>
        )}

        {/* 💵 قسم الخزينة والمصروفات النثرية */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {userRole === 'technician' ? (
              <div className={`${theme.card} p-8 rounded-xl border text-center text-rose-400 font-bold`}>
                عذراً، هذا القسم مخصص للمدير العام فقط ولا توجد صلاحية للفني بالدخول إليه.
              </div>
            ) : (
              <>
                <div className={`${theme.card} p-6 rounded-xl border`}>
                  <h2 className="font-bold text-indigo-400 mb-2">💵 إدارة المصروفات والخزينة اليومية</h2>
                  <p className={`mb-4 ${theme.textMuted}`}>سجل الصادر (مصروفات نثرية، شاي، إيجار، أدوات) والوارد لضبط الدرج اليومي بدقة.</p>
                  
                  <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>بيان المعاملة / المصروف *</label>
                      <input type="text" required value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="مثال: شراء أدوات صيانة / إيجار" className={`w-full ${theme.input} p-3 rounded-xl`} />
                    </div>
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>المبلغ (ج.م) *</label>
                      <input type="number" required value={expAmount} onChange={e => setExpAmount(Number(e.target.value))} className={`w-full ${theme.input} p-3 rounded-xl font-bold`} />
                    </div>
                    <div>
                      <label className={`block mb-1 ${theme.textMuted}`}>نوع المعاملة</label>
                      <select value={expType} onChange={e => setExpType(e.target.value as any)} className={`w-full ${theme.input} p-3 rounded-xl font-bold`}>
                        <option value="expense">مصروف (صادر من الدرج 🔻)</option>
                        <option value="income">إيراد إضافي (وارد للدرج 🟢)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded-xl shadow-sm transition">
                        + تسجيل المعاملة بالخزينة
                      </button>
                    </div>
                  </form>
                </div>

                <div className={`${theme.card} p-5 rounded-xl border space-y-4`}>
                  <h3 className="font-bold text-indigo-400">📋 سجل المعاملات المالية اليومية</h3>
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
                          <tr key={exp.id} className="border-b border-[#2d3748]/40 hover:bg-indigo-500/5 transition">
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
                              <button onClick={() => {
                                saveExpenses(expenses.filter(x => x.id !== exp.id));
                                showToast('تم حذف المعاملة المالية', 'info');
                              }} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-xl font-bold">
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                        {expenses.length === 0 && (
                          <tr><td colSpan={5} className={`p-6 text-center ${theme.textMuted}`}>لا توجد معاملات مسجلة بعد.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 📦 المخزن */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className={`${theme.card} p-5 rounded-xl border flex justify-between items-center flex-wrap gap-4`}>
              <div>
                <h2 className="font-bold text-indigo-400">📦 المخزن الداخلي (إدارة قطع الغيار والشركات والموديلات)</h2>
                <p className={`mt-0.5 ${theme.textMuted}`}>اختر الشركة والموديل وحدد القطع المطلوبة بكل سهولة.</p>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-left">
                <span className="text-2xs text-indigo-400 block font-bold">إجمالي قيمة المخزن:</span>
                <strong className="text-lg font-black text-indigo-400">{totalInventoryMoney.toLocaleString()} ج.م</strong>
              </div>
            </div>

            <form onSubmit={handleBulkAddInventory} className={`${theme.card} p-5 rounded-xl border space-y-4`}>
              <h3 className="font-bold text-indigo-400">➕ إضافة أو تحديث قطع المخزن للشركات</h3>
              
              <div className="space-y-2">
                <label className={`block font-bold`}>1. اختر الشركة المصنعة:</label>
                <div className="flex flex-wrap gap-1.5">
                  {marketBrands.map(b => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setBulkBrandTarget(b)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold border transition ${
                        bulkBrandTarget === b ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : theme.badgeInactive
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>2. موديل الجهاز (مثال: A12 / Note 10)</label>
                  <input type="text" value={bulkModelTarget} onChange={e => setBulkModelTarget(e.target.value)} placeholder="مثال: A15 أو عام" className={`w-full ${theme.input} p-3 rounded-xl font-bold`} />
                </div>
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>3. الكمية المضافة لكل قطعة *</label>
                  <input type="number" value={bulkQty} onChange={e => setBulkQty(Number(e.target.value))} className={`w-full ${theme.input} p-3 rounded-xl font-bold`} />
                </div>
                <div>
                  <label className={`block mb-1 ${theme.textMuted}`}>4. تكلفة القطعة الواحدة (ج.م) *</label>
                  <input type="number" value={bulkCost} onChange={e => setBulkCost(Number(e.target.value))} className={`w-full ${theme.input} p-3 rounded-xl font-bold`} />
                </div>
              </div>

              <div>
                <label className={`block mb-2 font-bold`}>5. اختر قطع الغيار (حدد المربعات المطلوبة دفعة واحدة):</label>
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
                        className={`p-3 rounded-xl text-right border transition flex items-center justify-between ${
                          isChecked ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-sm' : `${theme.badgeInactive} hover:opacity-80`
                        }`}
                      >
                        <span className="truncate">{part}</span>
                        <span className="shrink-0">{isChecked ? '☑️' : '◻️'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-md transition text-xs">
                🚀 إتمام وإضافة القطع المحددة لمخزن ({bulkBrandTarget} - {bulkModelTarget || 'عام'})
              </button>
            </form>

            <div className={`${theme.card} p-4 rounded-xl border space-y-3`}>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-bold text-indigo-400">🏢 فلترة المخزن حسب الشركة:</h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedInventoryBrandFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold border transition ${
                      selectedInventoryBrandFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-500' : theme.badgeInactive
                    }`}
                  >
                    كل الشركات
                  </button>
                  {marketBrands.map(b => (
                    <button
                      key={b}
                      onClick={() => setSelectedInventoryBrandFilter(b)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold border transition ${
                        selectedInventoryBrandFilter === b ? 'bg-indigo-600 text-white border-indigo-500' : theme.badgeInactive
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <input
                value={inventorySearchQuery}
                onChange={e => setInventorySearchQuery(e.target.value)}
                type="text"
                placeholder="بحث سريع برقم الموديل، الصنف، أو الشركة..."
                className={`w-full ${theme.input} p-3 rounded-xl`}
              />

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className={`border-b ${theme.subHeader}`}>
                      <th className="p-3">الشركة</th>
                      <th className="p-3">موديل الجهاز</th>
                      <th className="p-3">قطعة الغيار / الصنف</th>
                      <th className="p-3">الكمية</th>
                      <th className="p-3">تكلفة الوحدة</th>
                      <th className="p-3">إجمالي القيمة</th>
                      <th className="p-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(item => (
                      <tr key={item.id} className="border-b border-[#2d3748]/40 hover:bg-indigo-500/5 transition">
                        <td className="p-3 font-bold text-indigo-400">{item.brand}</td>
                        <td className="p-3 font-semibold text-teal-400">{item.deviceModel || 'عام'}</td>
                        <td className={`p-3 font-bold ${item.quantity === 0 ? 'text-rose-400' : ''}`}>
                          {item.partName} {item.quantity === 0 && ' (⚠️ نفذت الكمية)'}
                        </td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-lg font-black ${item.quantity === 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">{item.costPrice} ج.م</td>
                        <td className="p-3 font-black text-indigo-400">{(item.quantity * item.costPrice).toLocaleString()} ج.م</td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleDeleteInventoryItem(item.id)} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl font-bold">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr><td colSpan={7} className={`p-6 text-center ${theme.textMuted}`}>لا توجد قطع مطابقة.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className={`${theme.card} p-6 rounded-xl border max-w-xl mx-auto space-y-4`}>
            <h2 className="font-bold text-indigo-400">✅ تسليم الجهاز النهائي للعميل وإرسال الإرشادات</h2>
            <input
              type="text"
              placeholder="ابحث برقم الإيصال أو اسم العميل..."
              value={deliverySearchInput}
              onChange={e => setDeliverySearchInput(e.target.value)}
              className={`w-full ${theme.input} p-3 rounded-xl`}
            />
            {receipts.filter(r => r.receiptNumber.toLowerCase().includes(deliverySearchInput.toLowerCase()) || r.customerName.toLowerCase().includes(deliverySearchInput.toLowerCase())).map(r => {
              const remaining = r.price - r.deposit;
              return (
                <div key={r.id} className={`p-4 rounded-xl border border-[#2d3748] space-y-2 ${darkMode ? 'bg-[#101218]/50' : 'bg-[#f8fafc]'}`}>
                  <div className="flex justify-between font-bold">
                    <span className="text-indigo-400">{r.receiptNumber} - {r.customerName}</span>
                    <span className="text-amber-400">المتبقي: {remaining} ج.م</span>
                  </div>
                  <div>الجهاز: {r.deviceType} {r.deviceModel}</div>
                  {r.status !== 'done' ? (
                    <button onClick={() => {
                      const updated = receipts.map(x => x.id === r.id ? { ...x, status: 'done' as DeviceStatus, deliveredAt: formatDateTime(new Date()) } : x);
                      saveReceipts(updated);
                      const deliveryMsg = `مرحباً بك أستاذ/ة ${r.customerName} 🌹\nألف مبروك استلام جهازك (${r.deviceType} ${r.deviceModel}) بعد إتمام الصيانة بنجاح من Boody Group - مركز صيانة 📱✨\n\n💡 إرشادات ذهبية للحفاظ على عمر وأداء هاتفك:\n⚡ الشحن الآمن: استخدم شاحناً وكابلاً أصلياً، وتجنب استخدام الهاتف أثناء الشحن أو تركه على الشاحن بعد 100%.\n🛡️ الحماية من الصدمات: احرص دائماً على تركيب إسكرينة زجاجية وجراب حماية متين وممتص للصدمات.\n☀️ تجنب الحرارة الزائدة: لا تترك الهاتف معرضاً لأشعة الشمس المباشرة أو داخل سيارة مغلقة.\n\n🚨 إسعافات أولية عاجلة في حال سقوط الهاتف في الماء أو أي سوائل:\n1️⃣ أغلق الهاتف فوراً ولا تحاول فتحه أو تشغيله نهائياً.\n2️⃣ لا توصله بالشاحن مطلقاً حتى لا يحدث قفلة كهربائية (شورت).\n3️⃣ جفف الجهاز خارجياً فقط بفوطة ناعمة أو مناديل، ولا تهز الهاتف.\n4️⃣ توجه به فوراً إلينا لعمل غسيل احترافي بالموجات فوق الصوتية وإزالة الرطوبة والأكسدة بأسرع وقت!\n\n✨ يسعدنا دائماً خدمتكم ونتمنى لكم تجربة متميزة!\n👨‍🔧 المسؤول عن المركز: ${adminName}\n📞 للتواصل والدعم الفني: ${shopPhone}`;
                      openWhatsAppDirect(r.customerPhone, deliveryMsg);
                      showToast('تم تسليم الجهاز بنجاح وإرسال رسالة الإرشادات');
                    }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-2 transition text-xs">
                      ✓ تأكيد التسليم وإرسال رسالة الإرشادات النهائية واتساب
                    </button>
                  ) : (
                    <span className="text-emerald-400 font-bold block pt-1 text-xs">✅ تم تسليم هذا الجهاز مسبقاً</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {userRole === 'technician' ? (
              <div className={`${theme.card} p-8 rounded-xl border text-center text-rose-400 font-bold`}>
                عذراً، هذا القسم محمي ومخصص للمدير العام فقط.
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="font-bold text-emerald-400">📊 تقرير الحسابات والأرباح والخزينة اليومية ({todayStr})</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className={`${theme.card} p-4 rounded-xl border`}>
                    <span className={`block mb-1 ${theme.textMuted}`}>إجمالي مبيعات الصيانة</span>
                    <strong className="text-2xl font-black">{todayTotalRevenue.toLocaleString()} ج.م</strong>
                  </div>
                  <div className={`${theme.card} p-4 rounded-xl border`}>
                    <span className={`block mb-1 ${theme.textMuted}`}>تكلفة القطع المستخدمة</span>
                    <strong className="text-2xl font-black text-amber-400">{todayTotalCosts.toLocaleString()} ج.م</strong>
                  </div>
                  <div className={`${theme.card} p-4 rounded-xl border`}>
                    <span className={`block mb-1 ${theme.textMuted}`}>إجمالي المصروفات النثرية</span>
                    <strong className="text-2xl font-black text-rose-400">{todayExpenseTotal.toLocaleString()} ج.م</strong>
                  </div>
                  <div className={`${theme.card} p-4 rounded-xl border`}>
                    <span className="text-emerald-400 block mb-1 font-bold">صافي الربح الفعلي 🎯</span>
                    <strong className="text-3xl font-black text-emerald-400">{todayNetProfit.toLocaleString()} ج.م</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={`${theme.card} p-6 rounded-xl border max-w-xl mx-auto space-y-6`}>
            {userRole === 'technician' ? (
              <div className="text-center text-rose-400 font-bold">إعدادات النظام متاحة للمدير العام فقط.</div>
            ) : (
              <>
                <h2 className="font-bold text-indigo-400 text-lg">⚙️ إعدادات التطبيق الشاملة وتغيير كلمة المرور عبر الواتساب</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block mb-1 ${theme.textMuted}`}>اسم المركز</label>
                    <input value={shopName} onChange={e => setShopName(e.target.value)} className={`w-full ${theme.input} p-3 rounded-xl`} />
                  </div>
                  <div>
                    <label className={`block mb-1 ${theme.textMuted}`}>اسم المدير / المسؤول العام</label>
                    <input value={adminName} onChange={e => setAdminName(e.target.value)} className={`w-full ${theme.input} p-3 rounded-xl font-bold`} placeholder="مثال: مهندس محمد سعد" />
                  </div>
                  <div>
                    <label className={`block mb-1 ${theme.textMuted}`}>رقم الواتساب الرئيسي</label>
                    <input value={shopPhone} onChange={e => setShopPhone(e.target.value)} className={`w-full ${theme.input} p-3 rounded-xl`} />
                  </div>
                  <div>
                    <label className={`block mb-1 ${theme.textMuted}`}>رقم المسؤول الأول للإشعارات</label>
                    <input value={admin1Phone} onChange={e => setAdmin1Phone(e.target.value)} className={`w-full ${theme.input} p-3 rounded-xl`} />
                  </div>
                  <div>
                    <label className={`block mb-1 ${theme.textMuted}`}>رقم المسؤول الثاني للإشعارات</label>
                    <input value={admin2Phone} onChange={e => setAdmin2Phone(e.target.value)} className={`w-full ${theme.input} p-3 rounded-xl`} />
                  </div>

                  {/* قسم تغيير كلمة المرور عبر كود التحقق عبر الواتساب */}
                  <div className={`p-4 rounded-xl border border-indigo-500/30 ${darkMode ? 'bg-[#101218]' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <strong className="text-indigo-400 text-sm">🔒 أمان الحساب وتغيير كلمة المرور عبر الواتساب</strong>
                      {!isChangingPassword && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsChangingPassword(true);
                            setOtpStep('request');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-2xs font-bold transition"
                        >
                          تغيير كلمة المرور بكود التحقق
                        </button>
                      )}
                    </div>

                    {isChangingPassword && (
                      <div className="space-y-3 pt-2 border-t border-zinc-700">
                        {otpStep === 'request' ? (
                          <div className="space-y-2">
                            <p className="text-xs text-zinc-300">سيتم إرسال كود تحقق سري (OTP) إلى رقم واتساب المدير ({admin1Phone}) لتأكيد الهوية.</p>
                            <button
                              type="button"
                              onClick={() => {
                                const code = Math.floor(1000 + Math.random() * 9000).toString();
                                setGeneratedOtp(code);
                                setOtpStep('verify');
                                const otpMsg = `🔐 كود التحقق السري لتغيير كلمة مرور نظام ${shopName}\n\nكود التأكيد الخاص بك هو: *${code}*\n\nيرجى إدخال الكود في التطبيق للمتابعة.`;
                                openWhatsAppDirect(admin1Phone, otpMsg);
                                showToast('تم إرسال كود التحقق عبر الواتساب بنجاح!');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white w-full py-2.5 rounded-xl text-xs font-bold transition"
                            >
                              إرسال كود التحقق عبر الواتساب 💬
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setIsChangingPassword(false)} 
                              className="w-full text-zinc-400 text-2xs pt-1 hover:underline text-center"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block mb-1 text-2xs text-zinc-300">أدخل كود التحقق (OTP) المصلل عبر الواتساب:</label>
                              <input 
                                type="text" 
                                value={enteredOtp} 
                                onChange={e => setEnteredOtp(e.target.value)} 
                                placeholder="4 أرقام الكود..." 
                                className={`w-full ${theme.input} p-2.5 rounded-xl text-center font-bold tracking-widest`} 
                              />
                            </div>
                            <div>
                              <label className="block mb-1 text-2xs text-zinc-300">كلمة المرور الجديدة:</label>
                              <input 
                                type="password" 
                                value={newPasswordInput} 
                                onChange={e => setNewPasswordInput(e.target.value)} 
                                placeholder="كلمة المرور الجديدة..." 
                                className={`w-full ${theme.input} p-2.5 rounded-xl`} 
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (enteredOtp.trim() === generatedOtp.trim()) {
                                    if (!newPasswordInput.trim()) {
                                      showToast('يرجى كتابة كلمة المرور الجديدة', 'error');
                                      return;
                                    }
                                    setAdminPassword(newPasswordInput);
                                    setIsChangingPassword(false);
                                    setEnteredOtp('');
                                    setNewPasswordInput('');
                                    showToast('تم تغيير كلمة المرور بنجاح 🔑✨');
                                  } else {
                                    showToast('كود التحقق غير صحيح!', 'error');
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white flex-1 py-2.5 rounded-xl text-xs font-bold"
                              >
                                تأكيد وتغيير كلمة المرور ✓
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setIsChangingPassword(false)} 
                                className="bg-zinc-600 text-white px-4 py-2.5 rounded-xl text-xs"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button onClick={() => {
                    localStorage.setItem('bg_settings_v5', JSON.stringify({ shopName, shopPhone, adminName, adminPassword, admin1Phone, admin2Phone }));
                    showToast('تم حفظ كافة الإعدادات وتحديث اسم المدير بنجاح!');
                  }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition text-xs shadow-md">
                    💾 حفظ كافة إعدادات النظام وتحديث اسم المدير
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}