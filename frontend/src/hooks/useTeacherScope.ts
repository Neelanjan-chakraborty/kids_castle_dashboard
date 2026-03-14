import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import pb from '@/lib/pb'
import type { Role } from '@/lib/permissions'

interface TeacherAssignment {
  id: string
  user_id: string
  class_id: string
  division_id: string
  subject_id: string
  is_class_teacher: boolean
  expand?: { class_id?: { name: string; display_name: string }; division_id?: { name: string } }
}

/**
 * For teachers: returns the class IDs and division IDs they are assigned to.
 * For other roles: returns undefined (meaning no scope restriction).
 */
export function useTeacherScope() {
  const { user } = useAuthStore()
  const isTeacher = (user?.role as Role) === 'teacher'

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () =>
      pb.collection('teacher_assignments').getFullList<TeacherAssignment>({
        filter: `user_id = "${user!.id}"`,
        expand: 'class_id,division_id',
      }),
    enabled: isTeacher && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 min
  })

  if (!isTeacher) {
    return {
      isTeacher: false,
      isLoading: false,
      assignments: undefined,
      classIds: undefined,
      divisionIds: undefined,
      // No scoping needed — all classes visible
      scopeFilter: '',
    }
  }

  const classIds = [...new Set(assignments?.map((a) => a.class_id) ?? [])]
  const divisionIds = [...new Set(assignments?.filter((a) => a.division_id).map((a) => a.division_id) ?? [])]

  // PocketBase filter to scope student queries
  const scopeFilter =
    classIds.length > 0
      ? `class_id in ("${classIds.join('","')}")`
      : 'id = "NONE"' // no assignments — see nothing

  return {
    isTeacher: true,
    isLoading,
    assignments: assignments ?? [],
    classIds,
    divisionIds,
    scopeFilter,
  }
}
