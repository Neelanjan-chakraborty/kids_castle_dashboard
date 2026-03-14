import { Menu, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'
import { ROLE_LABELS, ROLE_COLORS, type Role } from '@/lib/permissions'
import { cn } from '@/lib/utils'

interface Props {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: Props) {
  const { user, logout } = useAuthStore()

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      {/* User menu */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900">{user?.name || 'Admin'}</p>
          <span className={cn('text-xs', ROLE_COLORS[user?.role as Role] ?? 'badge-gray')}>
            {ROLE_LABELS[user?.role as Role] ?? user?.role ?? 'User'}
          </span>
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {user?.name ? getInitials(user.name) : <User className="w-4 h-4" />}
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
