import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  try {
    // 1) التحقق من المستخدم الحالي (المدير)
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
        { success: false, error: 'غير مصرح — يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    // 2) قراءة البيانات من الـ Request
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'بيانات ناقصة' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    // 3) استخدام Service Role لإضافة الموظف
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

    // 4) إنشاء حساب Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'فشل إنشاء الحساب' },
        { status: 500 }
      );
    }

    // 5) إضافة في جدول staff
    const staffId = crypto.randomUUID();
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        id: staffId,
        name: name.trim(),
        phone: '',
        email: email.trim(),
        role: role,
        pin: password,
        user_id: authData.user.id,
        is_active: true,
        created_at: new Date().toISOString(),
      });

    if (staffError) {
      // حذف الحساب لو الإضافة فشلت
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, error: staffError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: staffId,
        user_id: authData.user.id,
        email: email.trim(),
        password: password,
      },
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}