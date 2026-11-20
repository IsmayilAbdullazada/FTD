import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/http.js';
import {
  getGuidelinesStatus,
  acknowledgeGuidelines,
} from './policies.service.js';

const router = Router();

router.use(authenticateToken);

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const status = await getGuidelinesStatus(req.user!.id);
    res.json(status);
  }),
);

router.post(
  '/acknowledge',
  asyncHandler(async (req, res) => {
    const status = await acknowledgeGuidelines(req.user!.id);
    res.json(status);
  }),
);

export default router;