const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket');
const Project = require('../models/Project');

const isMember = (project, userId) =>
    project.teamMembers.some((id) => id.equals(userId));

/* CREATE COMMENT → admin + member */
const createComment = async (req, res) => {
    if (!['admin', 'member'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Only admins and members can comment' });
    }

    const { text } = req.body;
    const { ticketId } = req.params;

    try {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const project = await Project.findById(ticket.projectId);
        if (!project || !isMember(project, req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const comment = await Comment.create({
            text,
            ticketId,
            userId: req.user._id,
        });

        const populated = await comment.populate('userId', 'name email');

        res.status(201).json(populated);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* GET COMMENTS → all roles (if member) */
const getCommentsByTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const project = await Project.findById(ticket.projectId);
        if (!project || !isMember(project, req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const comments = await Comment.find({ ticketId: ticket._id })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.json(comments);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* DELETE COMMENT → admin + own comment */
const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const ticket = await Ticket.findById(comment.ticketId);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const project = await Project.findById(ticket.projectId);
        if (!project || !isMember(project, req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const isAdmin = req.user.role === 'admin';
        const isCommenter = comment.userId.equals(req.user._id);

        if (!isAdmin && !isCommenter) {
            return res.status(403).json({ message: 'Can only delete your own comment or if admin' });
        }

        await Comment.deleteOne({ _id: comment._id });
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createComment,
    getCommentsByTicket,
    deleteComment,   // ← new export
};