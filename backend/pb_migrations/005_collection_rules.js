/// <reference path="../pb_data/types.d.ts" />
/**
 * 005_collection_rules.js
 * Sets access rules on all collections via raw SQL so authenticated users
 * (principal, teacher, staff) can access them.
 *
 * Why SQL instead of app.save(col)?
 * Collections in migrations 001/002 were created with id == name
 * (e.g. id="academic_years", name="academic_years"). PocketBase 0.23.x
 * validation rejects app.save() on those collections because the ORM
 * re-checks name uniqueness against existing IDs and considers them a
 * conflict. Direct SQL updates bypass that validation safely.
 *
 * Rules:
 *   AUTH  = any authenticated user (@request.auth.id != "")
 *   ADMIN = principal or super_admin only
 */
migrate(
  (app) => {
    const AUTH  = '@request.auth.id != ""';
    const ADMIN = '@request.auth.role = "principal" || @request.auth.role = "super_admin"';

    /**
     * Each entry: [collectionName, listRule, viewRule, createRule, updateRule, deleteRule]
     * Use null to keep the rule superuser-only (most restrictive).
     */
    const collectionRules = [
      // ── Structural / config: anyone reads, only admins write ────────────────
      ["academic_years",    AUTH, AUTH, ADMIN, ADMIN, ADMIN],
      ["classes",           AUTH, AUTH, ADMIN, ADMIN, ADMIN],
      ["divisions",         AUTH, AUTH, ADMIN, ADMIN, ADMIN],
      ["subjects",          AUTH, AUTH, ADMIN, ADMIN, ADMIN],
      ["exams",             AUTH, AUTH, ADMIN, ADMIN, ADMIN],
      ["fee_structures",    AUTH, AUTH, ADMIN, ADMIN, ADMIN],
      ["school_branches",   AUTH, AUTH, ADMIN, ADMIN, ADMIN],
      ["teacher_assignments", AUTH, AUTH, ADMIN, ADMIN, ADMIN],
      ["staff_permissions", AUTH, AUTH, ADMIN, ADMIN, ADMIN],

      // ── Students: admin creates/deletes; anyone can update (hook enforces scope)
      ["students",          AUTH, AUTH, ADMIN, AUTH, ADMIN],

      // ── Attendance: anyone creates/updates (teachers mark); admin deletes ───
      ["attendance",        AUTH, AUTH, AUTH, AUTH, ADMIN],
      ["attendance_sessions", AUTH, AUTH, AUTH, AUTH, ADMIN],

      // ── Exams / marks / report cards ────────────────────────────────────────
      ["question_papers",   AUTH, AUTH, AUTH, AUTH, ADMIN],
      ["exam_marks",        AUTH, AUTH, AUTH, AUTH, ADMIN],
      ["report_cards",      AUTH, AUTH, AUTH, AUTH, ADMIN],

      // ── Fees: admin creates fee records; anyone can mark payment; admin deletes
      ["fee_records",       AUTH, AUTH, ADMIN, AUTH, ADMIN],

      // ── Teacher attendance: cron + anyone creates/updates; admin deletes ────
      ["teacher_attendance", AUTH, AUTH, AUTH, AUTH, ADMIN],

      // ── Users: authenticated users can list/view others;
      //    admin creates/deletes; anyone can update own record ─────────────────
      ["users", AUTH, AUTH, ADMIN,
        `id = @request.auth.id || ${ADMIN}`,
        ADMIN],
    ];

    collectionRules.forEach(([name, listRule, viewRule, createRule, updateRule, deleteRule]) => {
      try {
        app.db()
          .newQuery(
            "UPDATE _collections" +
            " SET listRule = {:listRule}, viewRule = {:viewRule}" +
            ", createRule = {:createRule}, updateRule = {:updateRule}" +
            ", deleteRule = {:deleteRule}" +
            " WHERE name = {:name}"
          )
          .bind({
            listRule,
            viewRule,
            createRule,
            updateRule,
            deleteRule,
            name,
          })
          .execute();
        app.logger().info("Rules applied for collection: " + name);
      } catch (err) {
        app.logger().error("Failed to set rules for " + name + ": " + err);
        throw err;
      }
    });

    app.logger().info("Collection access rules migration completed (via SQL).");
  },

  // ─── Down: revert all rules to NULL (superuser-only) ──────────────────────
  (app) => {
    const names = [
      "academic_years", "classes", "divisions", "subjects", "exams",
      "fee_structures", "school_branches", "teacher_assignments",
      "staff_permissions", "students", "attendance", "attendance_sessions",
      "question_papers", "exam_marks", "fee_records", "report_cards",
      "teacher_attendance", "users",
    ];
    names.forEach((name) => {
      try {
        app.db()
          .newQuery(
            "UPDATE _collections" +
            " SET listRule = NULL, viewRule = NULL" +
            ", createRule = NULL, updateRule = NULL, deleteRule = NULL" +
            " WHERE name = {:name}"
          )
          .bind({ name })
          .execute();
      } catch (_) {}
    });
  }
);
