/// <reference path="../pb_data/types.d.ts" />
/**
 * Extends the built-in users auth collection with:
 * - role: super_admin | principal | teacher | staff
 * - phone: contact number
 * - is_active: account status
 * - branch_id: associated school branch (optional)
 *
 * NOTE: PocketBase's built-in _pb_users_auth_ maps to the "users" collection
 * in the admin UI. We update it here to add custom fields.
 */
migrate(
  (db) => {
    try {
      const usersCollection = db.findCollectionByNameOrId("users");

      const existingNames = usersCollection.schema.map((f) => f.name);

      const newFields = [
        {
          name: "role",
          type: "select",
          required: false,
          options: { values: ["super_admin", "principal", "teacher", "staff"], maxSelect: 1 },
        },
        {
          name: "phone",
          type: "text",
          required: false,
        },
        {
          name: "is_active",
          type: "bool",
          required: false,
        },
        {
          name: "branch_id",
          type: "relation",
          required: false,
          options: { collectionId: "school_branches", maxSelect: 1 },
        },
      ];

      newFields.forEach((field) => {
        if (!existingNames.includes(field.name)) {
          usersCollection.schema.addField(field);
        }
      });

      db.saveCollection(usersCollection);
      $app.logger().info("Users collection extended with RBAC fields");
    } catch (err) {
      $app.logger().error("Failed to extend users collection: " + err);
      throw err;
    }
  },
  (db) => {
    // Rollback: remove added fields
    try {
      const usersCollection = db.findCollectionByNameOrId("users");
      ["role", "phone", "is_active", "branch_id"].forEach((name) => {
        try {
          const field = usersCollection.schema.getFieldByName(name);
          if (field) usersCollection.schema.removeField(field.getId());
        } catch (_) {}
      });
      db.saveCollection(usersCollection);
    } catch (_) {}
  }
);
