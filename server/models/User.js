import mongoose from 'mongoose';

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profession: {
        type: String,
        enum: ['student', 'teacher', ''],
        default: '',
    },
    goals: {
        type: String,
        default: '',
    },
    classField: {
        type: String,
        default: '',
    },
    lastInsightDate: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

export default User;
