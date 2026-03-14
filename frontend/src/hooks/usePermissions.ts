import { useAuthStore } from '@/stores/authStore'
import { ROLE_PERMISSIONS, type Permission, type Role } from '@/lib/permissions'

/**
 * Returns whether the current user has a specific permission.
 * - super_admin / principal / teacher: based on static ROLE_PERMISSIONS map
 * - staff: based on dynamic permissions stored in authStore.staffPermissions
 */
export function usePermission(permission: Permission): boolean {
  const { user, staffPermissions } = useAuthStore()
  if (!user) return false

  const role = user.role as Role

  if (role === 'super_admin') return true

  if (role === 'staff') {
    return staffPermissions.includes(permission)
  }

  return (ROLE_PERMISSIONS[role as Exclude<Role, 'staff'>] ?? []).includes(permission)
}

/**
 * Returns a function that checks multiple permissions at once.
 * Useful for conditional rendering of sections.
 */
export function usePermissions() {
  const { user, staffPermissions } = useAuthStore()

  const can = (permission: Permission): boolean => {
    if (!user) return false
    const role = user.role as Role
    if (role === 'super_admin') return true
    if (role === 'staff') return staffPermissions.includes(permission)
    return (ROLE_PERMISSIONS[role as Exclude<Role, 'staff'>] ?? []).includes(permission)
  }

  const canAny = (...perms: Permission[]): boolean => perms.some(can)
  const canAll = (...perms: Permission[]): boolean => perms.every(can)

  const role = user?.role as Role | undefined
  const isRole = (r: Role) => role === r
  const isOneOf = (...roles: Role[]) => roles.includes(role as Role)

  return { can, canAny, canAll, role, isRole, isOneOf }
}
