import './globals.css';
import { SupabaseProvider } from '@/components/SupabaseProvider';

export const metadata = {
  title: 'مركز Boody Group لصيانة الهواتف',
  description: 'نظام استلام الصيانة والتوثيق الإلكتروني',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}