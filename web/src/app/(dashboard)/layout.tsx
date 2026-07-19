'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '📈' },
  { href: '/conversations', label: 'Conversas', icon: '💬' },
  { href: '/pipeline', label: 'Funil', icon: '📊' },
  { href: '/contacts', label: 'Contatos', icon: '👥' },
  { href: '/campaigns', label: 'Campanhas', icon: '📣' },
  { href: '/instances', label: 'Conexões', icon: '📱' },
  { href: '/team', label: 'Equipe', icon: '🧑‍💼' },
  { href: '/settings', label: 'Configurações', icon: '⚙️' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg">
            💬
          </span>
          <span className="font-semibold">CRM WhatsApp</span>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                pathname.startsWith(item.href)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-2">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <span>🚪</span> Sair
          </button>
          <p className="px-3 pt-1 text-xs text-slate-400">v0.1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
