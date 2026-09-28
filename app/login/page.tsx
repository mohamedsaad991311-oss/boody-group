'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('تم إنشاء الحساب بنجاح! جاري تحويلك...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1117] text-[#e3e8ee] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-3xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white font-black p-4 rounded-2xl text-lg shadow-md inline-flex items-center justify-center w-16 h-16 mx-auto">
            MS
          </div>
          <h1 className="text-xl font-black">MS Fix</h1>
          <p className="text-xs text-[#8b949e]">
            {mode === 'login' ? 'تسجيل الدخول للنظام' : 'إنشاء حساب جديد'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              mode === 'login' ? 'bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white shadow' : 'text-[#8b949e]'
            }`}
          >
            دخول
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              mode === 'signup' ? 'bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white shadow' : 'text-[#8b949e]'
            }`}
          >
            حساب جديد
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-xs text-[#8b949e]">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@msfix.com"
              className="w-full bg-[#0d1117] border border-[#30363d] text-white placeholder-[#8b949e] focus:border-[#8b5cf6] outline-none p-3.5 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs text-[#8b949e]">كلمة السر</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              className="w-full bg-[#0d1117] border border-[#30363d] text-white placeholder-[#8b949e] focus:border-[#8b5cf6] outline-none p-3.5 rounded-xl text-sm"
            />
          </div>

          {mode === 'login' && (
            <div className="text-left">
              <Link
                href="/forgot-password"
                className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] hover:underline font-bold transition"
              >
                🔑 نسيت كلمة السر؟
              </Link>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-xl">
              ✅ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] hover:opacity-90 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-[#8b5cf6]/20 transition text-sm"
          >
            {loading ? '...' : mode === 'login' ? '🔓 تسجيل الدخول' : '✨ إنشاء الحساب'}
          </button>
        </form>
      </div>
    </div>
  );
}