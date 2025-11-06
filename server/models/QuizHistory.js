import mongoose from 'mongoose';

const quizHistorySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    roomId: {
        type: String,
        required: true,
    },
    quizTopic: {
        type: String,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    date: {
        type: String, // Storing as ISO string
        required: true,
    },
    rank: {
        type: Number,
        required: true,
    },
    playerCount: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true,
});

const QuizHistory = mongoose.model('QuizHistory', quizHistorySchema);

export default QuizHistory;
