import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, CreditCard,
  BookOpen, FileText, GraduationCap, Settings, Castle,
  X, Building2, UserCog, Shield, ClipboardList, BookOpenCheck
} from 'lucide-react'
import { SCHOOL_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { ROLE_LABELS, ROLE_COLORS, type Role } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  permission?: Parameters<ReturnType<typeof usePermissions>['can']>[0]
  roles?: Role[] // show only for these roles (overrides permission)
}

const NAV_SECTIONS: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    heading: 'Academic',
    items: [
      { to: '/students',   icon: Users,         label: 'Students',        permission: 'view_students' },
      { to: '/attendance', icon: CalendarCheck,  label: 'Attendance',      permission: 'mark_student_attendance' },
      { to: '/fees',       icon: CreditCard,     label: 'Fees',            permission: 'view_fees' },
      { to: '/exams',      icon: GraduationCap,  label: 'Exams & Marks',   permission: 'manage_exams' },
      { to: '/papers',     icon: BookOpen,       label: 'Question Papers', permission: 'upload_question_papers' },
      { to: '/reports',    icon: FileText,       label: 'Report Cards',    permission: 'view_reports' },
    ],
  },
  {
    heading: 'Staff',
    items: [
      { to: '/teacher-attendance', icon: ClipboardList, label: 'Staff Attendance', permission: 'mark_teacher_attendance' },
      { to: '/assign-classes',     icon: BookOpenCheck, label: 'Assign Classes',   permission: 'assign_classes' },
      { to: '/staff-permissions',  icon: Shield,        label: 'Staff Permissions',permission: 'manage_staff_permissions' },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { to: '/users',    icon: UserCog,    label: 'Users',         permissions: ['manage_users_all', 'manage_users_school'] as never },
      { to: '/branches', icon: Building2,  label: 'Branches',      permission: 'manage_branches' },
      { to: '/settings', icon: Settings,   label: 'Settings',      permission: 'manage_academic_settings' },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { can, canAny, role } = usePermissions()
  const { user } = useAuthStore()

  const isVisible = (item: NavItem) => {
    if (item.roles) return item.roles.includes(role as Role)
    if ((item as { permissions?: Parameters<typeof canAny> }).permissions) {
      return canAny(...((item as { permissions: Parameters<typeof canAny> }).permissions))
    }
    if (item.permission) return can(item.permission)
    return true
  }

  return (
    <aside
      className={cn(
        'fixed lg:relative z-30 inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Castle className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{SCHOOL_NAME}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ROLE_COLORS[role as Role] ?? 'badge-gray')}>
              {ROLE_LABELS[role as Role] ?? role}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto lg:hidden p-1 rounded hover:bg-slate-100 text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <p className="text-xs text-slate-500">Logged in as</p>
        <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {NAV_SECTIONS.map((section, si) => {
          const visibleItems = section.items.filter(isVisible)
          if (!visibleItems.length) return null
          return (
            <div key={si}>
              {section.heading && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 mb-1.5">
                  {section.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">Kids Castle v1.0</p>
      </div>
    </aside>
  )
}
