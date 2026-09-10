import './globals.css';

export const metadata = {
  title: 'مركز boody groub لصيانة الهواتف',
  description: 'نظام استلام الصيانة والتوثيق الإلكتروني',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}