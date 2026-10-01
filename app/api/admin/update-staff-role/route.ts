import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  try {
    // 1) التحقق من المستخدم
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // 2) التحقق إن اللي بيطلب مدير
   const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// التحقق من الـ role:
// 1) نجرب user_metadata أولًا (أسرع)
// 2) بعدين نجرب جدول staff بالإيميل
const userEmail = user.email || '';
const metadataRole = user.user_metadata?.role || user.app_metadata?.role;
let isAdmin = metadataRole === 'admin';

// ← fallback: الإيميلات المسموح بها كمدير
const ADMIN_EMAILS = [
  'mohamedsaad991311@gmail.com',
];
if (!isAdmin && ADMIN_EMAILS.includes(userEmail)) {
  isAdmin = true;
}

if (!isAdmin) {
  const { data: requesterByEmail } = await supabaseAdmin
    .from('staff')
    .select('role')
    .eq('email', userEmail)
    .maybeSingle();
  isAdmin = requesterByEmail?.role === 'admin';
}

if (!isAdmin) {
  return NextResponse.json(
    { success: false, error: 'هذا الإجراء متاح للمدير العام فقط' },
    { status: 403 }
  );
}

    // 3) قراءة البيانات
    const body = await request.json();
    const { staffId, newRole } = body;

    if (!staffId || !newRole) {
      return NextResponse.json(
        { success: false, error: 'بيانات ناقصة' },
        { status: 400 }
      );
    }

    if (newRole !== 'admin' && newRole !== 'technician') {
      return NextResponse.json(
        { success: false, error: 'الصلاحية غير صحيحة' },
        { status: 400 }
      );
    }

    // 4) منع تخفيض آخر مدير
   

    // 5) تحديث الـ role
    const { error: updateError } = await supabaseAdmin
      .from('staff')
      .update({ role: newRole })
      .eq('id', staffId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { staffId, newRole },
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'حدث خطأ' },
      { status: 500 }
    );
  }
}