import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: '/', label: '智能排班', icon: '📅' },
  { to: '/employees', label: '员工管理', icon: '👥' },
  { to: '/department', label: '部门事项', icon: '📋' },
  { to: '/history', label: '历史排班', icon: '🕘' },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-lg font-semibold text-gray-900">智能排班</h1>
        <p className="mt-1 text-xs text-gray-500">Newsroom Scheduler</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <footer className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
        v0.1.0 · 本地 SQLite
      </footer>
    </aside>
  );
}
