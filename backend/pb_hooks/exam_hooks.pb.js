/// <reference path="../pb_data/types.d.ts" />

/**
 * Exam & Report Card Hooks
 * - Auto-calculate grade when marks are saved
 * - Auto-generate report card summary after all marks are entered
 */

// ─── Grade Calculation on Marks Save ───────────────────────────────────────
onRecordBeforeCreateRequest((e) => {
  calculateGrade(e.record);
}, "exam_marks");

onRecordBeforeUpdateRequest((e) => {
  calculateGrade(e.record);
}, "exam_marks");

function calculateGrade(record) {
  const subjectId = record.getString("subject_id");
  if (!subjectId) return;

  let maxMarks = 100;
  try {
    const subject = $app.dao().findRecordById("subjects", subjectId);
    maxMarks = subject.getFloat("max_marks") || 100;
  } catch (_) {}

  const obtained = record.getFloat("marks_obtained");
  const percentage = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;

  let grade = "F";
  if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B+";
  else if (percentage >= 60) grade = "B";
  else if (percentage >= 50) grade = "C";
  else if (percentage >= 40) grade = "D";

  record.set("grade", grade);
  record.set("percentage", Math.round(percentage * 100) / 100);
}

// ─── Auto-Generate Report Card Summary After Marks Save ────────────────────
onRecordAfterCreateRequest((e) => {
  generateReportCardSummary(e.record);
}, "exam_marks");

onRecordAfterUpdateRequest((e) => {
  generateReportCardSummary(e.record);
}, "exam_marks");

function generateReportCardSummary(marksRecord) {
  const studentId = marksRecord.getString("student_id");
  const examId = marksRecord.getString("exam_id");
  if (!studentId || !examId) return;

  try {
    // Fetch all marks for this student + exam
    const allMarks = $app.dao().findRecordsByFilter(
      "exam_marks",
      `student_id = "${studentId}" && exam_id = "${examId}"`,
      "",
      0,
      0
    );

    if (allMarks.length === 0) return;

    let totalMax = 0;
    let totalObtained = 0;

    allMarks.forEach((m) => {
      const subjectId = m.getString("subject_id");
      try {
        const subject = $app.dao().findRecordById("subjects", subjectId);
        totalMax += subject.getFloat("max_marks") || 100;
      } catch (_) {
        totalMax += 100;
      }
      totalObtained += m.getFloat("marks_obtained");
    });

    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    let overallGrade = "F";
    if (percentage >= 90) overallGrade = "A+";
    else if (percentage >= 80) overallGrade = "A";
    else if (percentage >= 70) overallGrade = "B+";
    else if (percentage >= 60) overallGrade = "B";
    else if (percentage >= 50) overallGrade = "C";
    else if (percentage >= 40) overallGrade = "D";

    // Calculate attendance percentage for this student
    let attendancePercent = 0;
    try {
      const exam = $app.dao().findRecordById("exams", examId);
      const academicYearId = exam.getString("academic_year_id");
      const total = $app.dao().findRecordsByFilter(
        "attendance",
        `student_id = "${studentId}" && academic_year_id = "${academicYearId}"`,
        "",
        0,
        0
      );
      const present = total.filter((a) =>
        ["present", "late", "half_day"].includes(a.getString("status"))
      );
      attendancePercent = total.length > 0
        ? Math.round((present.length / total.length) * 100 * 100) / 100
        : 0;
    } catch (_) {}

    // Upsert report_card record
    const reportCollection = $app.dao().findCollectionByNameOrId("report_cards");
    let reportCard;
    let isNew = false;

    try {
      reportCard = $app.dao().findFirstRecordByFilter(
        "report_cards",
        `student_id = "${studentId}" && exam_id = "${examId}"`
      );
    } catch (_) {
      reportCard = new Record(reportCollection);
      isNew = true;
    }

    reportCard.set("student_id", studentId);
    reportCard.set("exam_id", examId);
    reportCard.set("total_marks", totalMax);
    reportCard.set("obtained_marks", totalObtained);
    reportCard.set("percentage", Math.round(percentage * 100) / 100);
    reportCard.set("grade", overallGrade);
    reportCard.set("attendance_percentage", attendancePercent);
    reportCard.set("generated_at", new Date().toISOString().split("T")[0]);

    $app.dao().saveRecord(reportCard);
  } catch (err) {
    $app.logger().error(`Report card generation failed: ${err}`);
  }
}
