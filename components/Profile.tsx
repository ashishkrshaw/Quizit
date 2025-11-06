import React, { useState } from 'react';
import type { User } from '../types';

interface ProfileProps {
    user: User;
    onSave: (updatedUser: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({
        name: user.name || '',
        profession: user.profession || '',
        classField: user.classField || '',
        goals: user.goals || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...user, ...formData });
    };

    return (
        <div className="animate-fade-in max-w-lg mx-auto">
            <header className="text-center mb-4">
                <h2 className="text-2xl font-extrabold mb-1">{user.profession ? 'Your Profile' : 'Complete Your Profile'}</h2>
                <p className="text-slate-400">Personalize your experience for better insights.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-lg font-medium text-slate-300 mb-2">Your Name</label>
                    <input id="name" type="text" value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                </div>
                
                <div>
                     <label className="block text-lg font-medium text-slate-300 mb-2">I am a...</label>
                     <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => setFormData(prev => ({...prev, profession: 'student'}))} className={`p-3 rounded-lg text-center font-semibold transition-all duration-200 ${formData.profession === 'student' ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            Student
                        </button>
                        <button type="button" onClick={() => setFormData(prev => ({...prev, profession: 'teacher'}))} className={`p-3 rounded-lg text-center font-semibold transition-all duration-200 ${formData.profession === 'teacher' ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            Teacher
                        </button>
                    </div>
                </div>

                <div>
                    <label htmlFor="classField" className="block text-lg font-medium text-slate-300 mb-2">
                        {formData.profession === 'teacher' ? 'Field of Expertise' : 'Class / Field of Study'}
                    </label>
                    <input id="classField" type="text" value={formData.classField} onChange={e => setFormData(prev => ({...prev, classField: e.target.value}))} placeholder="e.g., Computer Science, Grade 10 History" className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>

                <div>
                    <label htmlFor="goals" className="block text-lg font-medium text-slate-300 mb-2">My Goals</label>
                    <textarea id="goals" value={formData.goals} onChange={e => setFormData(prev => ({...prev, goals: e.target.value}))} placeholder="e.g., Prepare for my final exams, Improve my general knowledge" rows={3} className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:opacity-95 transition-opacity">
                    Save & Continue
                </button>
            </form>
        </div>
    );
};

export default Profile;
