import mongoose from 'mongoose';

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        console.error('FATAL ERROR: MONGO_URI is not defined in the environment variables. Please create a .env file in the /server directory.');
        process.exit(1);
    }
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        if (error.name === 'MongoServerError' && error.code === 8000) {
            console.error('\n>>> This is often a "bad auth" error. Please check your MONGO_URI credentials (username, password) and ensure your current IP is whitelisted if using MongoDB Atlas.\n');
        }
        process.exit(1); // Exit process with failure
    }
};

export default connectDB;
