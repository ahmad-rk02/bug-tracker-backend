const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
    createComment,
    getCommentsByTicket,
    deleteComment,
} = require('../controllers/commentController');

const router = express.Router();

router.use(protect); // All comment routes require authentication

// ────────────────────────────────────────────────
// READ: open to authenticated users (controller checks membership)
router.get('/:ticketId', getCommentsByTicket);

// ────────────────────────────────────────────────
// CREATE: admin + member (controller checks project membership)
router.post('/:ticketId', authorize('admin', 'member'), createComment);

// ────────────────────────────────────────────────
// DELETE: admin + own comment (checked in controller)
router.delete('/:id', protect, deleteComment);

module.exports = router;