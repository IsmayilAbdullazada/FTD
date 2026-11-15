import { Router } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { authenticateToken, requireStaff } from '../../middleware/auth.js';
import * as handlers from './posts.handlers.js';
const router = Router();
router.use(authenticateToken);
router.get('/', asyncHandler(handlers.listPosts));
router.get('/:id', asyncHandler(handlers.getDiscussion));
router.post('/', asyncHandler(handlers.createDiscussion));
router.post('/:id/comments', asyncHandler(handlers.addReply));
router.post('/:id/upvote', asyncHandler(handlers.toggleUpvote));
router.put('/:id/close', requireStaff, asyncHandler(handlers.setClosed));
router.put(
  '/:id/unmoderated-replies',
  requireStaff,
  asyncHandler(handlers.setReplyPolicy),
);
router.put('/:id', asyncHandler(handlers.editDiscussion));
router.delete('/:id', asyncHandler(handlers.withdrawDiscussion));
router.put('/:postId/comments/:commentId', asyncHandler(handlers.editReply));
router.delete(
  '/:postId/comments/:commentId',
  asyncHandler(handlers.withdrawReply),
);
router.post('/:id/private-note', asyncHandler(handlers.sendPrivateReply));
export default router;
