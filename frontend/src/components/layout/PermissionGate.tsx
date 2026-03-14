import type { Permission } from '@/lib/permissions'
import { usePermissions } from '@/hooks/usePermissions'

interface Props {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean       // default: any
  fallback?: React.ReactNode // what to show if no access (default: null)
  children: React.ReactNode
}

/**
 * Conditionally renders children based on the current user's permissions.
 *
 * Usage:
 *   <PermissionGate permission="manage_students">
 *     <AddStudentButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permissions={['collect_fees', 'manage_fee_structures']} requireAll>
 *     <FeeStructureSettings />
 *   </PermissionGate>
 */
export default function PermissionGate({ permission, permissions, requireAll = false, fallback = null, children }: Props) {
  const { can, canAny, canAll } = usePermissions()

  let hasAccess = false

  if (permission) {
    hasAccess = can(permission)
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? canAll(...permissions) : canAny(...permissions)
  } else {
    hasAccess = true // no restriction specified
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
