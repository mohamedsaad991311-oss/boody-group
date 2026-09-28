'use client';

type TabId = 'home' | 'receiving' | 'receipts' | 'delivery'
  | 'inventory' | 'suppliers' | 'expenses' | 'reports'
  | 'scanner' | 'cloud' | 'staff' | 'settings';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const items: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'الرئيسية', icon: '🏠' },
  { id: 'receiving', label: 'استلام', icon: '📱' },
  { id: 'receipts', label: 'الإيصالات', icon: '📋' },
  { id: 'inventory', label: 'المخزن', icon: '📦' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#1a0f2e]/95 backdrop-blur-xl border-t border-[#2d1f4a] px-2 pb-[env(safe-area-inset-bottom)]"
      dir="rtl"
    >
      <div className="grid grid-cols-5 gap-1 py-2">
        {items.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white shadow-lg shadow-[#8b5cf6]/30 scale-105'
                  : 'text-[#b8b0d0] hover:bg-[#231740]'
              }`}
            >
              <span className={`text-lg transition-transform ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-bold ${isActive ? 'text-white' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}