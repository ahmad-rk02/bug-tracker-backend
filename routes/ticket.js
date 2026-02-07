const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
    createTicket,
    getTicketsByProject,
    getTicketById,
    updateTicket,
    deleteTicket,
    assignTicket,
} = require('../controllers/ticketController');

const router = express.Router();

router.use(protect); // All ticket routes require authentication

// ────────────────────────────────────────────────
// READ access: open to authenticated users (controller checks membership)
router.get('/project/:projectId', getTicketsByProject);
router.get('/:id', getTicketById);

// ────────────────────────────────────────────────
// CREATE: admin + member (controller checks project membership)
router.post('/', authorize('admin', 'member'), createTicket);

// ────────────────────────────────────────────────
// UPDATE: admin + creator + assignee (checked in controller)
router.put('/:id', protect, updateTicket);

// ────────────────────────────────────────────────
// DELETE: admin + creator (checked in controller)
router.delete('/:id', protect, deleteTicket);

// ────────────────────────────────────────────────
// ASSIGN: only admin
router.put('/:id/assign', authorize('admin'), assignTicket);

module.exports = router;