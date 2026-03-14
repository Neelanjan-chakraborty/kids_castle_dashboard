/// <reference path="../pb_data/types.d.ts" />

/**
 * Student Lifecycle Hooks
 * - Auto-generate admission number (KC-YYYY-NNNN)
 * - Auto-assign roll number within class+division
 * - Auto-generate fee records for current academic year on student creation
 */

// ─── Before Create: Set Admission Number and Roll Number ───────────────────
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  const year = new Date().getFullYear();

  // Generate Admission Number: KC-YYYY-NNNN
  try {
    const allStudents = $app.dao().findRecordsByFilter("students", "", "-created", 1, 0);
    const nextNum = (allStudents.length + 1).toString().padStart(4, "0");
    record.set("admission_number", `KC-${year}-${nextNum}`);
  } catch (_) {
    record.set("admission_number", `KC-${year}-0001`);
  }

  // Assign Roll Number within class + division
  const classId = record.getString("class_id");
  const divisionId = record.getString("division_id");

  if (classId && divisionId) {
    try {
      const classStudents = $app.dao().findRecordsByFilter(
        "students",
        `class_id = "${classId}" && division_id = "${divisionId}" && is_active = true`,
        "",
        0,
        0
      );
      record.set("roll_number", classStudents.length + 1);
    } catch (_) {
      record.set("roll_number", 1);
    }
  }
}, "students");

// ─── After Create: Generate Fee Records ────────────────────────────────────
onRecordAfterCreateRequest((e) => {
  const student = e.record;

  let currentYear;
  try {
    currentYear = $app.dao().findFirstRecordByFilter(
      "academic_years",
      "is_current = true"
    );
  } catch (_) {
    $app.logger().warn("No current academic year; skipping fee record generation");
    return;
  }

  const classId = student.getString("class_id");
  const feeStructures = $app.dao().findRecordsByFilter(
    "fee_structures",
    `academic_year_id = "${currentYear.id}" && class_id = "${classId}"`,
    "",
    0,
    0
  );

  if (feeStructures.length === 0) return;

  const feeCollection = $app.dao().findCollectionByNameOrId("fee_records");
  const nowYear = new Date().getFullYear();

  feeStructures.forEach((structure) => {
    const frequency = structure.getString("frequency");

    // Months for Indian academic year (April to March)
    const academicMonths =
      frequency === "monthly"
        ? [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
        : frequency === "quarterly"
        ? [4, 7, 10, 1]
        : [null]; // annual or one_time

    academicMonths.forEach((month) => {
      try {
        const rec = new Record(feeCollection);
        rec.set("student_id", student.id);
        rec.set("fee_structure_id", structure.id);
        rec.set("academic_year_id", currentYear.id);
        rec.set("amount_due", structure.getFloat("amount"));
        rec.set("amount_paid", 0);
        rec.set("status", "pending");

        if (month !== null) {
          rec.set("month", month);
          // April-Dec of first year, Jan-Mar of second year
          const recYear = month >= 4 ? nowYear : nowYear + 1;
          rec.set("year", recYear);
        }

        // Generate receipt placeholder
        const receiptSeq = Math.floor(Math.random() * 900000) + 100000;
        rec.set("receipt_number", `KC-REC-${nowYear}${String(month || 0).padStart(2, "0")}-${receiptSeq}`);

        $app.dao().saveRecord(rec);
      } catch (err) {
        $app.logger().error(`Fee record creation failed: ${err}`);
      }
    });
  });

  $app.logger().info(`Fee records generated for student ${student.id}`);
}, "students");

// ─── Before Fee Record Update: Recalculate Status ──────────────────────────
onRecordBeforeUpdateRequest((e) => {
  const record = e.record;
  const amountDue = record.getFloat("amount_due");
  const amountPaid = record.getFloat("amount_paid");

  if (amountPaid >= amountDue) {
    record.set("status", "paid");
    if (!record.getString("payment_date")) {
      record.set("payment_date", new Date().toISOString().split("T")[0]);
    }
  } else if (amountPaid > 0) {
    record.set("status", "partial");
  }
  // Don't override "overdue" back to "pending" in hook — let cron handle that
}, "fee_records");
