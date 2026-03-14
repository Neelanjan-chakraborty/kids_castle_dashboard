import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import pb from '@/lib/pb'
import type { Permission } from '@/lib/permissions'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  avatar: string
  branch_id?: string
  collectionId?: string
  collectionName?: string
}

interface AuthState {
  user: AuthUser | null
  staffPermissions: Permission[]
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: () => boolean
  refreshStaffPermissions: () => Promise<void>
}

async function loadStaffPermissions(userId: string): Promise<Permission[]> {
  try {
    const rec = await pb.collection('staff_permissions').getFirstListItem(
      `user_id = "${userId}"`
    )
    return (rec.permissions as Permission[]) ?? []
  } catch {
    return []
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: pb.authStore.isValid
        ? (pb.authStore.model as unknown as AuthUser)
        : null,
      staffPermissions: [],
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const authData = await pb.collection('users').authWithPassword(email, password)
          const user = authData.record as unknown as AuthUser

          // Load staff permissions immediately on login
          let staffPermissions: Permission[] = []
          if (user.role === 'staff') {
            staffPermissions = await loadStaffPermissions(user.id)
          }

          set({ user, staffPermissions, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        pb.authStore.clear()
        set({ user: null, staffPermissions: [] })
      },

      isAuthenticated: () => pb.authStore.isValid,

      refreshStaffPermissions: async () => {
        const { user } = get()
        if (!user || user.role !== 'staff') return
        const perms = await loadStaffPermissions(user.id)
        set({ staffPermissions: perms })
      },
    }),
    {
      name: 'kids-castle-auth',
      partialize: (state) => ({ user: state.user, staffPermissions: state.staffPermissions }),
    }
  )
)

// Sync PocketBase auth changes to store
pb.authStore.onChange(() => {
  useAuthStore.setState({
    user: pb.authStore.isValid
      ? (pb.authStore.model as unknown as AuthUser)
      : null,
  })
})
