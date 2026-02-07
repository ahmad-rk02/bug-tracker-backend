const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    removeMember,
} = require('../controllers/projectController');

const router = express.Router();

router.use(protect); // All project routes require authentication

// ────────────────────────────────────────────────
// READ access: open to authenticated users (controller checks membership)
router.get('/', getProjects);
router.get('/:id', getProjectById);

// ────────────────────────────────────────────────
// WRITE access: restricted to admin (or owner in controller)
router.post('/', authorize('admin'), createProject);           // only admin
router.put('/:id', protect, updateProject);                    // admin + owner (checked in controller)
router.delete('/:id', protect, deleteProject);                 // admin + owner (checked in controller)

// ────────────────────────────────────────────────
// Team management: only admin (or owner in controller)
router.post('/:id/add-member', protect, addMember);            // admin + owner
router.post('/:id/remove-member', protect, removeMember);      // admin + owner

module.exports = router;