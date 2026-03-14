/// <reference path="../pb_data/types.d.ts" />

/**
 * Daily Attendance Cron Jobs
 * - 6:00 AM: Initialize attendance records for all active students
 * - 11:59 PM: Lock sessions and compute daily summaries
 * Monthly Fee Overdue Detection
 * - 1st of every month 8:00 AM: Mark overdue fees
 */

// ─── Daily Attendance Initialization ───────────────────────────────────────
cronAdd("daily_attendance_init", "0 6 * * *", () => {
  const today = new Date().toISOString().split("T")[0];

  // Get current academic year
  let currentYear;
  try {
    currentYear = $app.dao().findFirstRecordByFilter(
      "academic_years",
      "is_current = true"
    );
  } catch (_) {
    $app.logger().warn("No current academic year found, skipping attendance init");
    return;
  }

  // Get all active students
  const students = $app.dao().findRecordsByFilter(
    "students",
    "is_active = true",
    "-created",
    0,
    0
  );

  if (students.length === 0) {
    $app.logger().info("No active students found for attendance init");
    return;
  }

  const attendanceCollection = $app.dao().findCollectionByNameOrId("attendance");
  let created = 0;
  let skipped = 0;

  students.forEach((student) => {
    try {
      // Skip if already exists for today
      $app.dao().findFirstRecordByFilter(
        "attendance",
        `student_id = "${student.id}" && date = "${today}"`
      );
      skipped++;
    } catch (_) {
      // Not found — create a default "absent" record
      try {
        const record = new Record(attendanceCollection);
        record.set("student_id", student.id);
        record.set("date", today);
        record.set("status", "absent");
        record.set("academic_year_id", currentYear.id);
        $app.dao().saveRecord(record);
        created++;
      } catch (err) {
        $app.logger().error(`Failed to create attendance for student ${student.id}: ${err}`);
      }
    }
  });

  $app.logger().info(
    `Attendance init for ${today}: ${created} created, ${skipped} already existed`
  );
});

// ─── Daily Attendance Lock + Summary ───────────────────────────────────────
cronAdd("daily_attendance_lock", "59 23 * * *", () => {
  const today = new Date().toISOString().split("T")[0];

  const sessions = $app.dao().findRecordsByFilter(
    "attendance_sessions",
    `date = "${today}" && is_locked = false`,
    "",
    0,
    0
  );

  sessions.forEach((session) => {
    const classId = session.getString("class_id");
    const divisionId = session.getString("division_id");

    // Build filter for students in this class/division
    const studentFilter = classId && divisionId
      ? `class_id = "${classId}" && division_id = "${divisionId}" && is_active = true`
      : "is_active = true";

    const students = $app.dao().findRecordsByFilter("students", studentFilter, "", 0, 0);
    const studentIds = students.map((s) => s.id);

    const countByStatus = (status) =>
      studentIds.filter((sid) => {
        try {
          const rec = $app.dao().findFirstRecordByFilter(
            "attendance",
            `student_id = "${sid}" && date = "${today}" && status = "${status}"`
          );
          return !!rec;
        } catch (_) {
          return false;
        }
      }).length;

    session.set("is_locked", true);
    session.set("total_present", countByStatus("present") + countByStatus("late") + countByStatus("half_day"));
    session.set("total_absent", countByStatus("absent"));
    $app.dao().saveRecord(session);
  });

  $app.logger().info(`Attendance sessions locked for ${today}`);
});

// ─── Monthly Fee Overdue Detection ─────────────────────────────────────────
cronAdd("monthly_fee_overdue", "0 8 1 * *", () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Academic month: April = month 4 of year N, March = month 3 of year N+1
  const pendingRecords = $app.dao().findRecordsByFilter(
    "fee_records",
    `status = "pending"`,
    "",
    0,
    0
  );

  let updated = 0;
  pendingRecords.forEach((record) => {
    const recMonth = record.getInt("month");
    const recYear = record.getInt("year");

    // If this fee was for a past month/year, mark overdue
    const isPast =
      recYear < currentYear ||
      (recYear === currentYear && recMonth < currentMonth);

    if (isPast) {
      record.set("status", "overdue");
      $app.dao().saveRecord(record);
      updated++;
    }
  });

  $app.logger().info(`Fee overdue update: ${updated} records marked overdue`);
});
