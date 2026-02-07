const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');

const isMember = (project, userId) =>
    project.teamMembers.some((id) => id.equals(userId));

/* CREATE PROJECT → only admin */
const createProject = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create projects' });
    }

    const { title, description } = req.body;
    try {
        const project = await Project.create({
            title,
            description,
            owner: req.user._id,
            teamMembers: [req.user._id],
        });
        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

/* GET PROJECTS → all roles (only their own / joined projects) */
const getProjects = async (req, res) => {
    try {
        const projects = await Project.find({
            $or: [{ owner: req.user._id }, { teamMembers: req.user._id }],
        })
            .populate('owner', 'name email')
            .populate('teamMembers', 'name email');
        res.json(projects);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* GET SINGLE PROJECT → all roles (if member/owner) */
const getProjectById = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid project ID' });
    }
    try {
        const project = await Project.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('teamMembers', 'name email');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const isOwner = project.owner.equals(req.user._id);
        const isTeamMember = isMember(project, req.user._id);

        if (!isOwner && !isTeamMember) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        res.json(project);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* UPDATE PROJECT → only admin or owner */
const updateProject = async (req, res) => {
    if (req.user.role !== 'admin') {
        const project = await Project.findById(req.params.id);
        if (!project || !project.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only admin or project owner can update' });
        }
    }

    const { title, description } = req.body;
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        project.title = title || project.title;
        project.description = description || project.description;

        const updated = await project.save();
        res.json(updated);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* DELETE PROJECT → only admin or owner */
const deleteProject = async (req, res) => {
    if (req.user.role !== 'admin') {
        const project = await Project.findById(req.params.id);
        if (!project || !project.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only admin or project owner can delete' });
        }
    }

    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        await Project.deleteOne({ _id: project._id });
        res.json({ message: 'Project deleted successfully' });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* ADD MEMBER → only admin or owner */
const addMember = async (req, res) => {
    if (req.user.role !== 'admin') {
        const project = await Project.findById(req.params.id);
        if (!project || !project.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only admin or owner can add members' });
        }
    }

    const { email } = req.body;
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (isMember(project, user._id)) {
            return res.status(400).json({ message: 'User already in project' });
        }

        project.teamMembers.push(user._id);
        await project.save();

        const populated = await Project.findById(project._id)
            .populate('teamMembers', 'name email');

        res.json(populated);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/* REMOVE MEMBER → only admin or owner */
const removeMember = async (req, res) => {
    if (req.user.role !== 'admin') {
        const project = await Project.findById(req.params.id);
        if (!project || !project.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only admin or owner can remove members' });
        }
    }

    const { userId } = req.body;
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (project.owner.equals(userId)) {
            return res.status(400).json({ message: 'Cannot remove project owner' });
        }

        project.teamMembers = project.teamMembers.filter((id) => !id.equals(userId));
        await project.save();

        res.json(project);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    removeMember,
};