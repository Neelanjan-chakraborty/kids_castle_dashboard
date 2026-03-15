/// <reference path="../pb_data/types.d.ts" />
/**
 * 004_seed_data.js
 * Seeds the database with sample data for development/demo:
 *   - 1 school branch (Kids Castle Main)
 *   - 1 academic year (2025-26, current)
 *   - 5 classes: Nursery, LKG, UKG, Class 1, Class 2 — each with Division A
 *   - Subjects per class (English, Math, Hindi, +EVS/Art)
 *   - 1 principal, 3 teachers, 1 staff (password: School@1234)
 *   - Teacher assignments per class
 *   - Fee structures (monthly tuition + annual dev fee)
 *   - 3 students per class (15 total) with April fee records
 *
 * NOTE: Admission numbers and roll numbers are set manually here because
 * the student hook (onRecordCreateRequest) only fires on HTTP API requests,
 * not on direct app.save() calls made inside migrations.
 */
migrate(
  (app) => {
    // ─── 1. School Branch ─────────────────────────────────────────────────
    const branchCol = app.findCollectionByNameOrId("school_branches");
    const branch = new Record(branchCol);
    branch.set("name", "Kids Castle – Main Branch");
    branch.set("address", "123 Sunshine Road, Koramangala, Bengaluru – 560034");
    branch.set("phone", "080-12345678");
    branch.set("email", "info@kidscastle.in");
    branch.set("principal", "Mrs. Priya Sharma");
    branch.set("code", "KC-MAIN");
    branch.set("is_active", true);
    app.save(branch);

    // ─── 2. Academic Year ─────────────────────────────────────────────────
    const ayCol = app.findCollectionByNameOrId("academic_years");
    const ay = new Record(ayCol);
    ay.set("name", "2025-26");
    ay.set("start_date", "2025-04-01 00:00:00.000Z");
    ay.set("end_date",   "2026-03-31 00:00:00.000Z");
    ay.set("is_current", true);
    app.save(ay);
    const ayId = ay.id;

    // ─── 3. Classes ───────────────────────────────────────────────────────
    const classCol = app.findCollectionByNameOrId("classes");
    const classDefs = [
      { name: "Nursery", display: "Nursery",          order: 1 },
      { name: "LKG",     display: "Lower KG (LKG)",   order: 2 },
      { name: "UKG",     display: "Upper KG (UKG)",   order: 3 },
      { name: "Class1",  display: "Class 1",           order: 4 },
      { name: "Class2",  display: "Class 2",           order: 5 },
    ];

    const classIds = {};
    classDefs.forEach((c) => {
      const rec = new Record(classCol);
      rec.set("name",         c.name);
      rec.set("display_name", c.display);
      rec.set("order",        c.order);
      app.save(rec);
      classIds[c.name] = rec.id;
    });

    // ─── 4. Divisions — one "A" per class ─────────────────────────────────
    const divCol = app.findCollectionByNameOrId("divisions");
    const divIds = {};
    Object.entries(classIds).forEach(([cls, cid]) => {
      const rec = new Record(divCol);
      rec.set("class_id", cid);
      rec.set("name", "A");
      app.save(rec);
      divIds[cls] = rec.id;
    });

    // ─── 5. Subjects ──────────────────────────────────────────────────────
    const subjectCol = app.findCollectionByNameOrId("subjects");
    const subjectDefs = {
      Nursery: [
        { name: "English",     code: "ENG", max: 100, pass: 35, type: "activity", order: 1 },
        { name: "Math",        code: "MTH", max: 100, pass: 35, type: "activity", order: 2 },
        { name: "Hindi",       code: "HIN", max: 100, pass: 35, type: "activity", order: 3 },
        { name: "Art & Craft", code: "ART", max: 100, pass: 35, type: "activity", order: 4 },
      ],
      LKG: [
        { name: "English",     code: "ENG", max: 100, pass: 35, type: "activity", order: 1 },
        { name: "Math",        code: "MTH", max: 100, pass: 35, type: "activity", order: 2 },
        { name: "Hindi",       code: "HIN", max: 100, pass: 35, type: "activity", order: 3 },
        { name: "Art & Craft", code: "ART", max: 100, pass: 35, type: "activity", order: 4 },
      ],
      UKG: [
        { name: "English",     code: "ENG", max: 100, pass: 35, type: "theory",   order: 1 },
        { name: "Math",        code: "MTH", max: 100, pass: 35, type: "theory",   order: 2 },
        { name: "Hindi",       code: "HIN", max: 100, pass: 35, type: "theory",   order: 3 },
        { name: "Art & Craft", code: "ART", max: 100, pass: 35, type: "activity", order: 4 },
      ],
      Class1: [
        { name: "English",     code: "ENG", max: 100, pass: 35, type: "theory",   order: 1 },
        { name: "Math",        code: "MTH", max: 100, pass: 35, type: "theory",   order: 2 },
        { name: "Hindi",       code: "HIN", max: 100, pass: 35, type: "theory",   order: 3 },
        { name: "EVS",         code: "EVS", max: 100, pass: 35, type: "theory",   order: 4 },
        { name: "Art & Craft", code: "ART", max: 100, pass: 35, type: "activity", order: 5 },
      ],
      Class2: [
        { name: "English",     code: "ENG", max: 100, pass: 35, type: "theory",   order: 1 },
        { name: "Math",        code: "MTH", max: 100, pass: 35, type: "theory",   order: 2 },
        { name: "Hindi",       code: "HIN", max: 100, pass: 35, type: "theory",   order: 3 },
        { name: "EVS",         code: "EVS", max: 100, pass: 35, type: "theory",   order: 4 },
        { name: "Art & Craft", code: "ART", max: 100, pass: 35, type: "activity", order: 5 },
      ],
    };

    Object.entries(subjectDefs).forEach(([cls, subs]) => {
      subs.forEach((s) => {
        const rec = new Record(subjectCol);
        rec.set("name",         s.name);
        rec.set("class_id",     classIds[cls]);
        rec.set("code",         s.code);
        rec.set("max_marks",    s.max);
        rec.set("pass_marks",   s.pass);
        rec.set("subject_type", s.type);
        rec.set("order",        s.order);
        app.save(rec);
      });
    });

    // ─── 6. Users ─────────────────────────────────────────────────────────
    // Password for all seed users: School@1234
    const usersCol = app.findCollectionByNameOrId("users");
    const userDefs = [
      { email: "principal@kidscastle.in",       username: "principal",      name: "Mrs. Priya Sharma",  role: "principal", phone: "9876543001" },
      { email: "teacher.nursery@kidscastle.in", username: "teacher_anjali", name: "Ms. Anjali Verma",   role: "teacher",   phone: "9876543002" },
      { email: "teacher.lkg@kidscastle.in",     username: "teacher_sunita", name: "Ms. Sunita Rao",     role: "teacher",   phone: "9876543003" },
      { email: "teacher.class1@kidscastle.in",  username: "teacher_ramesh", name: "Mr. Ramesh Kumar",   role: "teacher",   phone: "9876543004" },
      { email: "staff@kidscastle.in",           username: "staff_deepak",   name: "Mr. Deepak Patil",   role: "staff",     phone: "9876543005" },
    ];

    const userIds = {};
    userDefs.forEach((u) => {
      const rec = new Record(usersCol);
      rec.set("email",            u.email);
      rec.set("emailVisibility",  true);
      rec.set("username",         u.username);
      rec.set("name",             u.name);
      rec.set("role",             u.role);
      rec.set("phone",            u.phone);
      rec.set("is_active",        true);
      rec.set("branch_id",        branch.id);
      rec.set("verified",         true);
      rec.setPassword("School@1234");
      app.save(rec);
      userIds[u.username] = rec.id;
    });

    // ─── 7. Teacher Assignments ───────────────────────────────────────────
    const taCol = app.findCollectionByNameOrId("teacher_assignments");
    const assignments = [
      // Anjali  → Nursery-A (class teacher)
      { user: "teacher_anjali", cls: "Nursery", isClassTeacher: true },
      // Sunita  → LKG-A and UKG-A (class teacher)
      { user: "teacher_sunita", cls: "LKG",     isClassTeacher: true },
      { user: "teacher_sunita", cls: "UKG",     isClassTeacher: true },
      // Ramesh  → Class 1-A and Class 2-A (class teacher)
      { user: "teacher_ramesh", cls: "Class1",  isClassTeacher: true },
      { user: "teacher_ramesh", cls: "Class2",  isClassTeacher: true },
    ];

    assignments.forEach((a) => {
      const rec = new Record(taCol);
      rec.set("user_id",          userIds[a.user]);
      rec.set("class_id",         classIds[a.cls]);
      rec.set("division_id",      divIds[a.cls]);
      rec.set("academic_year_id", ayId);
      rec.set("is_class_teacher", a.isClassTeacher);
      rec.set("assigned_by",      userIds["principal"]);
      app.save(rec);
    });

    // ─── 8. Fee Structures ────────────────────────────────────────────────
    const fsCol = app.findCollectionByNameOrId("fee_structures");
    const feeDefs = [
      { cls: "Nursery", monthly: 1500 },
      { cls: "LKG",     monthly: 1800 },
      { cls: "UKG",     monthly: 2000 },
      { cls: "Class1",  monthly: 2200 },
      { cls: "Class2",  monthly: 2500 },
    ];

    const feeStructureIds = {};
    feeDefs.forEach((f) => {
      // Monthly tuition
      const tuition = new Record(fsCol);
      tuition.set("academic_year_id", ayId);
      tuition.set("class_id",         classIds[f.cls]);
      tuition.set("fee_type",         "tuition");
      tuition.set("amount",           f.monthly);
      tuition.set("due_day",          10);
      tuition.set("frequency",        "monthly");
      tuition.set("description",      `Monthly tuition fee – ${f.cls}`);
      app.save(tuition);
      feeStructureIds[f.cls] = tuition.id;

      // One-time annual development fee
      const annual = new Record(fsCol);
      annual.set("academic_year_id", ayId);
      annual.set("class_id",         classIds[f.cls]);
      annual.set("fee_type",         "annual");
      annual.set("amount",           5000);
      annual.set("due_day",          30);
      annual.set("frequency",        "annual");
      annual.set("description",      `Annual development fee – ${f.cls}`);
      app.save(annual);
    });

    // ─── 9. Students (3 per class × 5 classes = 15) ───────────────────────
    const studentCol = app.findCollectionByNameOrId("students");
    const studentDefs = {
      Nursery: [
        { first: "Aarav",  last: "Mehta",    dob: "2021-06-15", gender: "male",   parent: "Rajesh Mehta",      phone: "9800001001", blood: "B+" },
        { first: "Diya",   last: "Singh",    dob: "2021-08-22", gender: "female", parent: "Arvind Singh",      phone: "9800001002", blood: "O+" },
        { first: "Ishaan", last: "Patel",    dob: "2021-03-10", gender: "male",   parent: "Kiran Patel",       phone: "9800001003", blood: "A+" },
      ],
      LKG: [
        { first: "Ananya", last: "Gupta",    dob: "2020-05-18", gender: "female", parent: "Suresh Gupta",      phone: "9800002001", blood: "A+" },
        { first: "Vihaan", last: "Sharma",   dob: "2020-07-04", gender: "male",   parent: "Neeraj Sharma",     phone: "9800002002", blood: "B+" },
        { first: "Myra",   last: "Joshi",    dob: "2020-11-30", gender: "female", parent: "Prakash Joshi",     phone: "9800002003", blood: "O-" },
      ],
      UKG: [
        { first: "Arjun",  last: "Nair",     dob: "2019-04-25", gender: "male",   parent: "Sunil Nair",        phone: "9800003001", blood: "AB+" },
        { first: "Kavya",  last: "Reddy",    dob: "2019-09-12", gender: "female", parent: "Venkat Reddy",      phone: "9800003002", blood: "B-" },
        { first: "Rehan",  last: "Khan",     dob: "2019-12-05", gender: "male",   parent: "Salim Khan",        phone: "9800003003", blood: "O+" },
      ],
      Class1: [
        { first: "Pooja",  last: "Iyer",     dob: "2018-02-14", gender: "female", parent: "Subramaniam Iyer",  phone: "9800004001", blood: "A-" },
        { first: "Rohan",  last: "Desai",    dob: "2018-06-20", gender: "male",   parent: "Mahesh Desai",      phone: "9800004002", blood: "B+" },
        { first: "Sara",   last: "Thomas",   dob: "2018-10-08", gender: "female", parent: "Joseph Thomas",     phone: "9800004003", blood: "O+" },
      ],
      Class2: [
        { first: "Dev",    last: "Malhotra", dob: "2017-03-17", gender: "male",   parent: "Anil Malhotra",     phone: "9800005001", blood: "A+" },
        { first: "Priya",  last: "Pillai",   dob: "2017-07-23", gender: "female", parent: "Rajan Pillai",      phone: "9800005002", blood: "O+" },
        { first: "Zara",   last: "Hussain",  dob: "2017-11-11", gender: "female", parent: "Imran Hussain",     phone: "9800005003", blood: "B+" },
      ],
    };

    const studentIds = {};   // { "Nursery": [id1, id2, ...], ... }
    let admNum = 1;

    Object.entries(studentDefs).forEach(([cls, students]) => {
      studentIds[cls] = [];
      students.forEach((s, idx) => {
        const rec = new Record(studentCol);
        rec.set("first_name",       s.first);
        rec.set("last_name",        s.last);
        rec.set("date_of_birth",    s.dob + " 00:00:00.000Z");
        rec.set("gender",           s.gender);
        rec.set("class_id",         classIds[cls]);
        rec.set("division_id",      divIds[cls]);
        rec.set("roll_number",      idx + 1);
        rec.set("admission_number", `KC-2025-${String(admNum).padStart(4, "0")}`);
        rec.set("admission_date",   "2025-04-01 00:00:00.000Z");
        rec.set("parent_name",      s.parent);
        rec.set("parent_phone",     s.phone);
        rec.set("blood_group",      s.blood);
        rec.set("is_active",        true);
        rec.set("academic_year_id", ayId);
        app.save(rec);
        studentIds[cls].push(rec.id);
        admNum++;
      });
    });

    // ─── 10. Sample Fee Records (April 2025 tuition for all 15 students) ──
    const frCol = app.findCollectionByNameOrId("fee_records");

    Object.entries(studentIds).forEach(([cls, ids]) => {
      ids.forEach((sid, i) => {
        const rec = new Record(frCol);
        rec.set("student_id",       sid);
        rec.set("fee_structure_id", feeStructureIds[cls]);
        rec.set("academic_year_id", ayId);
        rec.set("month",            4);     // April
        rec.set("year",             2025);
        rec.set("amount_due",       feeDefs.find((f) => f.cls === cls).monthly);
        rec.set("amount_paid",      0);
        rec.set("status",           "pending");
        rec.set("receipt_number",   `KC-REC-202504-${String(admNum + i).padStart(5, "0")}`);
        app.save(rec);
      });
    });

    app.logger().info("Seed data migration completed — 15 students, 5 users, 5 classes seeded.");
  },

  // ─── Down (rollback) ──────────────────────────────────────────────────────
  (app) => {
    const emails = [
      "principal@kidscastle.in",
      "teacher.nursery@kidscastle.in",
      "teacher.lkg@kidscastle.in",
      "teacher.class1@kidscastle.in",
      "staff@kidscastle.in",
    ];
    emails.forEach((email) => {
      try { app.delete(app.findAuthRecordByEmail("users", email)); } catch (_) {}
    });

    [
      "fee_records", "fee_structures", "teacher_assignments",
      "students", "subjects", "divisions", "classes",
      "academic_years", "school_branches",
    ].forEach((name) => {
      try {
        app.findAllRecords(name).forEach((r) => {
          try { app.delete(r); } catch (_) {}
        });
      } catch (_) {}
    });
  }
);
