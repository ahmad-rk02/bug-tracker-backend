const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('../config/db');

const authRoutes = require('../routes/auth');
const projectRoutes = require('../routes/project');
const ticketRoutes = require('../routes/ticket');
const commentRoutes = require('../routes/comment');

dotenv.config();
connectDB();

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://bug-trackera.netlify.app"
        ],
        credentials: true
    })
);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/comments', commentRoutes);

app.get('/', (req, res) => {
    res.send('API is running on Vercel 🚀');
});


module.exports = app;
