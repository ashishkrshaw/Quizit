import User from '../models/User.js';

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req, res) => {
    // req.user is set by the protect middleware
    res.status(200).json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        profession: req.user.profession,
        goals: req.user.goals,
        classField: req.user.classField,
        lastInsightDate: req.user.lastInsightDate,
    });
};

// @desc    Update user data
// @route   PUT /api/users/me
// @access  Private
export const updateMe = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.user._id, req.body, {
            new: true, // Return the modified document
        }).select('-password');
        
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "Failed to update profile." });
    }
};
