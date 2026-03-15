/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // ─── academic_years ───────────────────────────────────────────────────
    const academicYears = new Collection({
      id: "academic_years",
      name: "academic_years",
      type: "base",
      schema: [
        { name: "name",       type: "text",   required: true,  unique: true },
        { name: "start_date", type: "date",   required: true  },
        { name: "end_date",   type: "date",   required: true  },
        { name: "is_current", type: "bool",   required: false },
      ],
    });
    app.save(academicYears);

    // ─── classes ──────────────────────────────────────────────────────────
    const classes = new Collection({
      id: "classes",
      name: "classes",
      type: "base",
      schema: [
        { name: "name",         type: "select", required: true, options: { values: ["Nursery","LKG","UKG","Class1","Class2"], maxSelect: 1 } },
        { name: "display_name", type: "text",   required: true },
        { name: "order",        type: "number", required: false },
      ],
    });
    app.save(classes);

    // ─── divisions ────────────────────────────────────────────────────────
    const divisions = new Collection({
      id: "divisions",
      name: "divisions",
      type: "base",
      schema: [
        { name: "class_id", type: "relation", required: true, options: { collectionId: "classes", maxSelect: 1, cascadeDelete: false } },
        { name: "name",     type: "select",   required: true, options: { values: ["A","B","C","D","E"], maxSelect: 1 } },
      ],
    });
    app.save(divisions);

    // ─── students ─────────────────────────────────────────────────────────
    const students = new Collection({
      id: "students",
      name: "students",
      type: "base",
      schema: [
        { name: "first_name",       type: "text",     required: true  },
        { name: "last_name",        type: "text",     required: true  },
        { name: "date_of_birth",    type: "date",     required: false },
        { name: "gender",           type: "select",   required: false, options: { values: ["male","female","other"], maxSelect: 1 } },
        { name: "photo",            type: "file",     required: false, options: { maxSelect: 1, mimeTypes: ["image/jpeg","image/png","image/webp"] } },
        { name: "class_id",         type: "relation", required: true,  options: { collectionId: "classes",   maxSelect: 1 } },
        { name: "division_id",      type: "relation", required: true,  options: { collectionId: "divisions", maxSelect: 1 } },
        { name: "roll_number",      type: "number",   required: false },
        { name: "admission_number", type: "text",     required: false },
        { name: "admission_date",   type: "date",     required: false },
        { name: "parent_name",      type: "text",     required: true  },
        { name: "parent_phone",     type: "text",     required: true  },
        { name: "parent_email",     type: "text",     required: false },
        { name: "parent_address",   type: "text",     required: false },
        { name: "emergency_contact",type: "text",     required: false },
        { name: "blood_group",      type: "select",   required: false, options: { values: ["A+","A-","B+","B-","O+","O-","AB+","AB-","Unknown"], maxSelect: 1 } },
        { name: "is_active",        type: "bool",     required: false },
        { name: "ai_extracted_data",type: "json",     required: false },
        { name: "academic_year_id", type: "relation", required: false, options: { collectionId: "academic_years", maxSelect: 1 } },
      ],
    });
    app.save(students);

    // ─── attendance ───────────────────────────────────────────────────────
    const attendance = new Collection({
      id: "attendance",
      name: "attendance",
      type: "base",
      schema: [
        { name: "student_id",       type: "relation", required: true,  options: { collectionId: "students",       maxSelect: 1 } },
        { name: "date",             type: "date",     required: true  },
        { name: "status",           type: "select",   required: true,  options: { values: ["present","absent","late","half_day","holiday"], maxSelect: 1 } },
        { name: "marked_by",        type: "relation", required: false, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "remarks",          type: "text",     required: false },
        { name: "academic_year_id", type: "relation", required: false, options: { collectionId: "academic_years", maxSelect: 1 } },
      ],
    });
    app.save(attendance);

    // ─── attendance_sessions ──────────────────────────────────────────────
    const attendanceSessions = new Collection({
      id: "attendance_sessions",
      name: "attendance_sessions",
      type: "base",
      schema: [
        { name: "date",          type: "date",     required: true  },
        { name: "class_id",      type: "relation", required: false, options: { collectionId: "classes",   maxSelect: 1 } },
        { name: "division_id",   type: "relation", required: false, options: { collectionId: "divisions", maxSelect: 1 } },
        { name: "is_locked",     type: "bool",     required: false },
        { name: "total_present", type: "number",   required: false },
        { name: "total_absent",  type: "number",   required: false },
      ],
    });
    app.save(attendanceSessions);

    // ─── subjects ─────────────────────────────────────────────────────────
    const subjects = new Collection({
      id: "subjects",
      name: "subjects",
      type: "base",
      schema: [
        { name: "name",         type: "text",     required: true  },
        { name: "class_id",     type: "relation", required: true,  options: { collectionId: "classes", maxSelect: 1 } },
        { name: "code",         type: "text",     required: false },
        { name: "max_marks",    type: "number",   required: false },
        { name: "pass_marks",   type: "number",   required: false },
        { name: "subject_type", type: "select",   required: false, options: { values: ["theory","practical","activity"], maxSelect: 1 } },
        { name: "order",        type: "number",   required: false },
      ],
    });
    app.save(subjects);

    // ─── exams ────────────────────────────────────────────────────────────
    const exams = new Collection({
      id: "exams",
      name: "exams",
      type: "base",
      schema: [
        { name: "name",             type: "text",     required: true  },
        { name: "exam_type",        type: "select",   required: true,  options: { values: ["unit_test","half_yearly","annual","internal","other"], maxSelect: 1 } },
        { name: "academic_year_id", type: "relation", required: true,  options: { collectionId: "academic_years", maxSelect: 1 } },
        { name: "class_id",         type: "relation", required: false, options: { collectionId: "classes",        maxSelect: 1 } },
        { name: "start_date",       type: "date",     required: false },
        { name: "end_date",         type: "date",     required: false },
        { name: "is_published",     type: "bool",     required: false },
      ],
    });
    app.save(exams);

    // ─── question_papers ──────────────────────────────────────────────────
    const questionPapers = new Collection({
      id: "question_papers",
      name: "question_papers",
      type: "base",
      schema: [
        { name: "exam_id",          type: "relation", required: false, options: { collectionId: "exams",           maxSelect: 1 } },
        { name: "subject_id",       type: "relation", required: true,  options: { collectionId: "subjects",        maxSelect: 1 } },
        { name: "academic_year_id", type: "relation", required: true,  options: { collectionId: "academic_years",  maxSelect: 1 } },
        { name: "class_id",         type: "relation", required: true,  options: { collectionId: "classes",         maxSelect: 1 } },
        { name: "exam_date",        type: "date",     required: false },
        { name: "paper_file",       type: "file",     required: true,  options: { maxSelect: 1, mimeTypes: ["application/pdf","image/jpeg","image/png"] } },
        { name: "uploaded_by",      type: "relation", required: false, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "year",             type: "number",   required: true  },
        { name: "title",            type: "text",     required: false },
        { name: "tags",             type: "json",     required: false },
      ],
    });
    app.save(questionPapers);

    // ─── exam_marks ───────────────────────────────────────────────────────
    const examMarks = new Collection({
      id: "exam_marks",
      name: "exam_marks",
      type: "base",
      schema: [
        { name: "student_id",    type: "relation", required: true,  options: { collectionId: "students", maxSelect: 1 } },
        { name: "exam_id",       type: "relation", required: true,  options: { collectionId: "exams",    maxSelect: 1 } },
        { name: "subject_id",    type: "relation", required: true,  options: { collectionId: "subjects", maxSelect: 1 } },
        { name: "marks_obtained",type: "number",   required: false },
        { name: "grade",         type: "text",     required: false },
        { name: "percentage",    type: "number",   required: false },
        { name: "remarks",       type: "text",     required: false },
        { name: "entered_by",    type: "relation", required: false, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
      ],
    });
    app.save(examMarks);

    // ─── fee_structures ───────────────────────────────────────────────────
    const feeStructures = new Collection({
      id: "fee_structures",
      name: "fee_structures",
      type: "base",
      schema: [
        { name: "academic_year_id", type: "relation", required: true,  options: { collectionId: "academic_years", maxSelect: 1 } },
        { name: "class_id",         type: "relation", required: true,  options: { collectionId: "classes",        maxSelect: 1 } },
        { name: "fee_type",         type: "select",   required: true,  options: { values: ["tuition","transport","activity","annual","exam","other"], maxSelect: 1 } },
        { name: "amount",           type: "number",   required: true  },
        { name: "due_day",          type: "number",   required: false },
        { name: "frequency",        type: "select",   required: true,  options: { values: ["monthly","quarterly","annual","one_time"], maxSelect: 1 } },
        { name: "description",      type: "text",     required: false },
      ],
    });
    app.save(feeStructures);

    // ─── fee_records ──────────────────────────────────────────────────────
    const feeRecords = new Collection({
      id: "fee_records",
      name: "fee_records",
      type: "base",
      schema: [
        { name: "student_id",        type: "relation", required: true,  options: { collectionId: "students",       maxSelect: 1 } },
        { name: "fee_structure_id",  type: "relation", required: false, options: { collectionId: "fee_structures", maxSelect: 1 } },
        { name: "academic_year_id",  type: "relation", required: true,  options: { collectionId: "academic_years", maxSelect: 1 } },
        { name: "month",             type: "number",   required: false },
        { name: "year",              type: "number",   required: false },
        { name: "amount_due",        type: "number",   required: true  },
        { name: "amount_paid",       type: "number",   required: false },
        { name: "payment_date",      type: "date",     required: false },
        { name: "payment_mode",      type: "select",   required: false, options: { values: ["cash","upi","bank_transfer","cheque","online"], maxSelect: 1 } },
        { name: "transaction_ref",   type: "text",     required: false },
        { name: "status",            type: "select",   required: true,  options: { values: ["pending","partial","paid","overdue"], maxSelect: 1 } },
        { name: "collected_by",      type: "relation", required: false, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "receipt_number",    type: "text",     required: false },
        { name: "remarks",           type: "text",     required: false },
      ],
    });
    app.save(feeRecords);

    // ─── report_cards ─────────────────────────────────────────────────────
    const reportCards = new Collection({
      id: "report_cards",
      name: "report_cards",
      type: "base",
      schema: [
        { name: "student_id",             type: "relation", required: true,  options: { collectionId: "students",        maxSelect: 1 } },
        { name: "academic_year_id",       type: "relation", required: false, options: { collectionId: "academic_years",  maxSelect: 1 } },
        { name: "exam_id",                type: "relation", required: true,  options: { collectionId: "exams",           maxSelect: 1 } },
        { name: "total_marks",            type: "number",   required: false },
        { name: "obtained_marks",         type: "number",   required: false },
        { name: "percentage",             type: "number",   required: false },
        { name: "grade",                  type: "text",     required: false },
        { name: "rank",                   type: "number",   required: false },
        { name: "attendance_percentage",  type: "number",   required: false },
        { name: "remarks",                type: "text",     required: false },
        { name: "is_published",           type: "bool",     required: false },
        { name: "generated_at",           type: "date",     required: false },
      ],
    });
    app.save(reportCards);

    app.logger().info("Initial schema migration completed successfully");
  },
  // ─── Down ───────────────────────────────────────────────────────────────
  (app) => {
    const collections = [
      "report_cards", "fee_records", "fee_structures", "exam_marks",
      "question_papers", "exams", "subjects", "attendance_sessions",
      "attendance", "students", "divisions", "classes", "academic_years",
    ];
    collections.forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name);
        app.delete(col);
      } catch (_) {}
    });
  }
);
