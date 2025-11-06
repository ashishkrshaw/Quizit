import QuizHistory from '../models/QuizHistory.js';

// @desc    Get user's quiz history
// @route   GET /api/history
// @access  Private
export const getHistory = async (req, res) => {
    try {
        const history = await QuizHistory.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: "Failed to retrieve quiz history." });
    }
};

// @desc    Save a new quiz history entry
// @route   POST /api/history
// @access  Private
export const saveHistory = async (req, res) => {
    try {
        const newEntry = {
            ...req.body,
            user: req.user._id, // Associate with the logged-in user
        };
        await QuizHistory.create(newEntry);
        res.status(201).json({ message: 'History saved successfully' });
    } catch (error) {
        console.error("Error saving history:", error);
        res.status(500).json({ message: "Failed to save quiz history." });
    }
};
