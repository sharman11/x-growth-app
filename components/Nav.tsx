'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/refiner', label: 'Refiner' },
  { href: '/', label: 'Library' },
  { href: '/reply', label: 'Reply' },
  { href: '/thread', label: 'Thread' },
  { href: '/saved', label: 'Saved' },
  { href: '/plan', label: 'Plan' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="hairline-b sticky top-0 z-20 bg-paper/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-ink flex items-center justify-center text-paper serif text-lg leading-none group-hover:bg-accent transition-colors">
            ✕
          </div>
          <div>
            <div className="serif text-xl leading-none">Growth Engine</div>
            <div className="mono text-[10px] tracking-widest uppercase text-muted mt-1">No-AI-Writing Edition</div>
          </div>
        </Link>
        <nav className="flex gap-1">
          {links.map(l => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`mono text-xs uppercase tracking-widest px-3 py-2 transition-colors ${
                  active ? 'bg-ink text-paper' : 'hover:bg-ink hover:text-paper'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
