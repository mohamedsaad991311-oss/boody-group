import './globals.css';
import { SupabaseProvider } from '@/components/SupabaseProvider';

export const metadata = {
  title: 'MS Fix - لصيانة الهواتف',
  description: 'نظام استلام الصيانة والتوثيق الإلكتروني',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f0a1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="font-cairo antialiased">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}