import { Navigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import type { Permission } from '@/lib/permissions'
import { usePermissions } from '@/hooks/usePermissions'

interface Props {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  redirectTo?: string       // redirect instead of showing Unauthorized
  children: React.ReactNode
}

/**
 * Route-level guard. Renders children if user has the required permission(s).
 * Otherwise shows an Unauthorized screen or redirects.
 *
 * Usage in App.tsx:
 *   <Route path="/admin/branches" element={
 *     <RoleGuard permission="manage_branches">
 *       <BranchesPage />
 *     </RoleGuard>
 *   } />
 */
export default function RoleGuard({
  permission,
  permissions,
  requireAll = false,
  redirectTo,
  children,
}: Props) {
  const { can, canAny, canAll } = usePermissions()

  let hasAccess = false
  if (permission) {
    hasAccess = can(permission)
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? canAll(...permissions) : canAny(...permissions)
  } else {
    hasAccess = true
  }

  if (hasAccess) return <>{children}</>

  if (redirectTo) return <Navigate to={redirectTo} replace />

  return <UnauthorizedScreen />
}

function UnauthorizedScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
      <p className="text-slate-500 text-sm max-w-sm">
        You don't have permission to access this page. Contact your principal or administrator.
      </p>
      <button
        className="btn-secondary mt-6"
        onClick={() => window.history.back()}
      >
        Go Back
      </button>
    </div>
  )
}
