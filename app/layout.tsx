import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Growth Engine — X',
  description: 'Daily tweet ideas, reply angles, and thread plans. You write the words.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="relative-content min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
