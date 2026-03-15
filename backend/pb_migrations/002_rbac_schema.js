/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // ─── school_branches ──────────────────────────────────────────────────
    const branches = new Collection({
      id: "school_branches",
      name: "school_branches",
      type: "base",
      schema: [
        { name: "name",        type: "text",   required: true  },
        { name: "address",     type: "text",   required: false },
        { name: "phone",       type: "text",   required: false },
        { name: "email",       type: "text",   required: false },
        { name: "principal",   type: "text",   required: false },
        { name: "is_active",   type: "bool",   required: false },
        { name: "code",        type: "text",   required: false }, // short branch code
        { name: "logo",        type: "file",   required: false, options: { maxSelect: 1, mimeTypes: ["image/jpeg","image/png","image/webp"] } },
      ],
    });
    app.save(branches);

    // ─── teacher_assignments ──────────────────────────────────────────────
    // Tracks which teacher is assigned to which class/division/subject
    const teacherAssignments = new Collection({
      id: "teacher_assignments",
      name: "teacher_assignments",
      type: "base",
      schema: [
        { name: "user_id",          type: "relation", required: true,  options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "class_id",         type: "relation", required: true,  options: { collectionId: "classes",         maxSelect: 1 } },
        { name: "division_id",      type: "relation", required: false, options: { collectionId: "divisions",       maxSelect: 1 } },
        { name: "subject_id",       type: "relation", required: false, options: { collectionId: "subjects",        maxSelect: 1 } },
        { name: "academic_year_id", type: "relation", required: true,  options: { collectionId: "academic_years",  maxSelect: 1 } },
        { name: "is_class_teacher", type: "bool",     required: false }, // class teacher vs subject teacher
        { name: "assigned_by",      type: "relation", required: false, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
      ],
    });
    app.save(teacherAssignments);

    // ─── teacher_attendance ───────────────────────────────────────────────
    const teacherAttendance = new Collection({
      id: "teacher_attendance",
      name: "teacher_attendance",
      type: "base",
      schema: [
        { name: "user_id",    type: "relation", required: true,  options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "date",       type: "date",     required: true  },
        { name: "status",     type: "select",   required: true,  options: { values: ["present","absent","late","half_day","on_leave","holiday"], maxSelect: 1 } },
        { name: "marked_by",  type: "relation", required: false, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "in_time",    type: "text",     required: false },
        { name: "out_time",   type: "text",     required: false },
        { name: "remarks",    type: "text",     required: false },
      ],
    });
    app.save(teacherAttendance);

    // ─── staff_permissions ────────────────────────────────────────────────
    const staffPermissions = new Collection({
      id: "staff_permissions",
      name: "staff_permissions",
      type: "base",
      schema: [
        { name: "user_id",      type: "relation", required: true,  options: { collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true } },
        { name: "permissions",  type: "json",     required: false }, // array of permission strings
        { name: "granted_by",   type: "relation", required: false, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "notes",        type: "text",     required: false },
      ],
    });
    app.save(staffPermissions);

    app.logger().info("RBAC schema migration completed");
  },
  (app) => {
    ["staff_permissions", "teacher_attendance", "teacher_assignments", "school_branches"].forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name);
        app.delete(col);
      } catch (_) {}
    });
  }
);
