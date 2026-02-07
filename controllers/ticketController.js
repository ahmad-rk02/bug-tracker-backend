const Ticket = require('../models/Ticket');
const Project = require('../models/Project');
const mongoose = require('mongoose');

const isMember = (project, userId) =>
    project.teamMembers.some((id) => id.equals(userId));

/* CREATE TICKET → admin + member (if in project) */
const createTicket = async (req, res) => {
    if (!['admin', 'member'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Only admins and members can create tickets' });
    }

    const { title, description, priority, assignee, projectId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
    }

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (!isMember(project, req.user._id)) {
            return res.status(403).json({ message: 'You must be a project member to create tickets' });
        }

        const ticket = await Ticket.create({
            title,
            description,
            priority: priority || 'medium',
            projectId,
            createdBy: req.user._id,
            assignee: mongoose.Types.ObjectId.isValid(assignee) ? assignee : null,
            status: 'To Do',
        });

        res.status(201).json(ticket);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* GET TICKETS BY PROJECT → all roles (if member) */
const getTicketsByProject = async (req, res) => {
    const { projectId } = req.params;
    const { status, priority, assignee, search } = req.query;

    try {
        const project = await Project.findById(projectId);
        if (!project || !isMember(project, req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to view this project' });
        }

        const query = { projectId };
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (mongoose.Types.ObjectId.isValid(assignee)) query.assignee = assignee;
        if (search) query.title = { $regex: search, $options: 'i' };

        const tickets = await Ticket.find(query)
            .populate('assignee', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(tickets);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* GET SINGLE TICKET → all roles (if member) */
const getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('assignee', 'name email')
            .populate('createdBy', 'name email');

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const project = await Project.findById(ticket.projectId);
        if (!project || !isMember(project, req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(ticket);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* UPDATE TICKET → admin + creator + assignee */
const updateTicket = async (req, res) => {
    const { title, description, priority, status, assignee } = req.body;

    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const project = await Project.findById(ticket.projectId);
        if (!project || !isMember(project, req.user._id)) {
            return res.status(403).json({ message: 'Not a project member' });
        }

        const isAdmin = req.user.role === 'admin';
        const isCreator = ticket.createdBy.equals(req.user._id);
        const isAssignee = ticket.assignee && ticket.assignee.equals(req.user._id);

        if (!isAdmin && !isCreator && !isAssignee) {
            return res.status(403).json({ message: 'Not authorized to update this ticket' });
        }

        if (title !== undefined) ticket.title = title;
        if (description !== undefined) ticket.description = description;
        if (priority !== undefined) ticket.priority = priority;
        if (status !== undefined) ticket.status = status;

        // Assignee handling
        if (assignee === null || assignee === '') {
            ticket.assignee = null;
        } else if (mongoose.Types.ObjectId.isValid(assignee)) {
            // Only admin can assign to others
            if (!isAdmin && assignee !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Only admins can assign to other users' });
            }
            ticket.assignee = assignee;
        }

        const updated = await ticket.save();
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* DELETE TICKET → only admin + creator */
const deleteTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const project = await Project.findById(ticket.projectId);
        if (!project || !isMember(project, req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const isAdmin = req.user.role === 'admin';
        const isCreator = ticket.createdBy.equals(req.user._id);

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ message: 'Only admin or ticket creator can delete' });
        }

        await Ticket.deleteOne({ _id: ticket._id });
        res.json({ message: 'Ticket deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* ASSIGN TICKET → only admin */
const assignTicket = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can assign tickets' });
    }

    const { assignee } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assignee)) {
        return res.status(400).json({ message: 'Invalid assignee ID' });
    }

    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const project = await Project.findById(ticket.projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (!isMember(project, assignee)) {
            return res.status(400).json({ message: 'Assignee must be a project member' });
        }

        ticket.assignee = assignee;
        await ticket.save();

        res.json(ticket);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createTicket,
    getTicketsByProject,
    getTicketById,
    updateTicket,
    deleteTicket,
    assignTicket,
};