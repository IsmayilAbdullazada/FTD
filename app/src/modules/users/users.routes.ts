import { Router } from "express";
import { env } from "../../config/env.js";
import { query } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { currentUser, persona } from "../../lib/serializers.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();
router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const requestedId =
      typeof req.query.asUser === "string" ? req.query.asUser : req.user!.id;
    if (
      requestedId !== req.user!.id &&
      (env.ENABLE_DEV_PERSONAS !== "true" || req.user!.role === "CARE_PARTNER")
    ) {
      throw new HttpError(403, "Persona switching is disabled");
    }
    const selected = await query(
      `SELECT * FROM users WHERE id=$1 AND is_active`,
      [requestedId],
    );
    if (!selected.rows[0]) throw new HttpError(404, "User not found");
    const personas =
      env.ENABLE_DEV_PERSONAS === "true" && req.user!.role !== "CARE_PARTNER"
        ? (
            await query(
              `SELECT * FROM users WHERE is_active ORDER BY role DESC,first_name,last_name`,
            )
          ).rows
        : selected.rows;
    res.json({
      user: currentUser(selected.rows[0]),
      allPersonas: personas.map(persona),
    });
  }),
);
export default router;
