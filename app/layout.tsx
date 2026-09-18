export const metadata = {
  title: 'My Budget API',
  description: 'iOS Shortcut Budget API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
