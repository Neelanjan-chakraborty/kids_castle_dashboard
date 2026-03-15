/// <reference path="../pb_data/types.d.ts" />
/**
 * Extends the built-in users auth collection with:
 * - role: super_admin | principal | teacher | staff
 * - phone: contact number
 * - is_active: account status
 * - branch_id: associated school branch (optional)
 */
migrate(
  (app) => {
    try {
      const usersCollection = app.findCollectionByNameOrId("users");

      const existingNames = usersCollection.fields.map((f) => f.name);

      if (!existingNames.includes("role")) {
        usersCollection.fields.add(new SelectField({
          name: "role",
          required: false,
          values: ["super_admin", "principal", "teacher", "staff"],
          maxSelect: 1,
        }));
      }

      if (!existingNames.includes("phone")) {
        usersCollection.fields.add(new TextField({
          name: "phone",
          required: false,
        }));
      }

      if (!existingNames.includes("is_active")) {
        usersCollection.fields.add(new BoolField({
          name: "is_active",
          required: false,
        }));
      }

      if (!existingNames.includes("branch_id")) {
        usersCollection.fields.add(new RelationField({
          name: "branch_id",
          required: false,
          collectionId: "school_branches",
          maxSelect: 1,
        }));
      }

      app.save(usersCollection);
      app.logger().info("Users collection extended with RBAC fields");
    } catch (err) {
      app.logger().error("Failed to extend users collection: " + err);
      throw err;
    }
  },
  (app) => {
    // Rollback: remove added fields
    try {
      const usersCollection = app.findCollectionByNameOrId("users");
      ["role", "phone", "is_active", "branch_id"].forEach((name) => {
        try {
          const field = usersCollection.fields.getByName(name);
          if (field) usersCollection.fields.remove(field);
        } catch (_) {}
      });
      app.save(usersCollection);
    } catch (_) {}
  }
);
