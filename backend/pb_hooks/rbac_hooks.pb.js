/// <reference path="../pb_data/types.d.ts" />

/**
 * RBAC & Teacher Attendance Hooks
 * - Daily teacher attendance initialization at 6:00 AM
 * - Role-based access validation helpers
 * - User creation defaults
 */

// ─── Daily Teacher Attendance Initialization ──────────────────────────────
cronAdd("daily_teacher_attendance_init", "0 6 * * *", () => {
  const today = new Date().toISOString().split("T")[0];

  // Get all teacher and staff users
  const staffUsers = $app.dao().findRecordsByFilter(
    "_pb_users_auth_",
    `role = "teacher" || role = "principal" || role = "staff"`,
    "",
    0,
    0
  );

  if (staffUsers.length === 0) return;

  const collection = $app.dao().findCollectionByNameOrId("teacher_attendance");
  let created = 0;

  staffUsers.forEach((user) => {
    try {
      $app.dao().findFirstRecordByFilter(
        "teacher_attendance",
        `user_id = "${user.id}" && date = "${today}"`
      );
      // Already exists
    } catch (_) {
      try {
        const rec = new Record(collection);
        rec.set("user_id", user.id);
        rec.set("date", today);
        rec.set("status", "absent"); // Default absent
        $app.dao().saveRecord(rec);
        created++;
      } catch (err) {
        $app.logger().error(`Teacher attendance init failed for ${user.id}: ${err}`);
      }
    }
  });

  $app.logger().info(`Teacher attendance init for ${today}: ${created} created`);
});

// ─── User Creation: Set Default Role ─────────────────────────────────────
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  // Default role to "staff" if not set
  if (!record.getString("role")) {
    record.set("role", "staff");
  }
  // Default is_active
  if (record.get("is_active") === null || record.get("is_active") === undefined) {
    record.set("is_active", true);
  }
}, "_pb_users_auth_");

// ─── Staff Permissions: Ensure Record Exists on User Creation ─────────────
onRecordAfterCreateRequest((e) => {
  const user = e.record;
  if (user.getString("role") !== "staff") return;

  try {
    const col = $app.dao().findCollectionByNameOrId("staff_permissions");
    const rec = new Record(col);
    rec.set("user_id", user.id);
    rec.set("permissions", []); // Empty by default - principal must grant
    $app.dao().saveRecord(rec);
    $app.logger().info(`Staff permissions record created for user ${user.id}`);
  } catch (err) {
    $app.logger().error(`Failed to create staff_permissions for ${user.id}: ${err}`);
  }
}, "_pb_users_auth_");

// ─── Access Control: Teacher can only update own class attendance ──────────
onRecordBeforeUpdateRequest((e) => {
  const adminId = e.httpContext.get("authRecord")?.getId?.();
  if (!adminId) return; // Unauthenticated — PocketBase rules handle this

  let actor;
  try {
    actor = $app.dao().findRecordById("_pb_users_auth_", adminId);
  } catch (_) { return; }

  const role = actor.getString("role");

  // Teachers can only update attendance records for their assigned classes
  if (role === "teacher") {
    const record = e.record;
    const studentId = record.getString("student_id");
    if (!studentId) return;

    try {
      const student = $app.dao().findRecordById("students", studentId);
      const classId = student.getString("class_id");

      // Check teacher has assignment for this class
      const assignments = $app.dao().findRecordsByFilter(
        "teacher_assignments",
        `user_id = "${adminId}" && class_id = "${classId}"`,
        "",
        1,
        0
      );

      if (assignments.length === 0) {
        throw new BadRequestError("You are not assigned to this student's class");
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
      // Student not found - let through, other validations will catch it
    }
  }
}, "attendance");
