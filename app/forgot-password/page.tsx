'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setSuccess('تم إرسال رابط الاستعادة على بريدك الإلكتروني. راجع صندوق الوارد ✉️');
      setEmail('');
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
            🔑
          </div>
          <h1 className="text-xl font-black">نسيت كلمة السر؟</h1>
          <p className="text-xs text-[#8b949e]">
            أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة السر
          </p>
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
            {loading ? '...' : '📧 إرسال رابط الاستعادة'}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] hover:underline font-bold transition"
            >
              ← رجوع لتسجيل الدخول
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}