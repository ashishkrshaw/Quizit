import React, { useState, useEffect } from 'react';
import { CreateQuizFormState, User, Question, QuizType, TimerType, GroundingSource } from '../types';
import { generateQuiz } from '../services/geminiService';
import Spinner from './Spinner';
import { UploadIcon } from './icons';
import { indianExams } from '../data/exams';

interface CreateQuizFlowProps {
    user: User;
    onQuizCreated: (quizData: { questions: Question[], sources: GroundingSource[] | null }, settings: CreateQuizFormState) => void;
}

const IT_TOPICS = ['Operating Systems', 'Cloud Computing', 'Programming Languages', 'Interview Questions', 'Math', 'Reasoning'];

const CreateQuizFlow: React.FC<CreateQuizFlowProps> = ({ user, onQuizCreated }) => {
    const [formState, setFormState] = useState<CreateQuizFormState>({
        quizType: QuizType.MCQ,
        mcqOptions: 4,
        topic: 'Cloud Computing',
        customPrompt: '',
        sourceFileName: '',
        sourceFileContent: '',
        rounds: 5,
        timerType: TimerType.PerQuestion,
        timerDuration: 30,
        sourceType: 'topic',
        state: 'National Level',
        exam: 'UPSC'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customItTopic, setCustomItTopic] = useState('');

    useEffect(() => {
        if (formState.sourceType === 'exam') {
            const topic = `A quiz on ${formState.exam} for the ${formState.state} region.`;
            setFormState(prev => ({...prev, topic}));
        }
    }, [formState.sourceType, formState.state, formState.exam]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const content = await file.text();
                setFormState(prev => ({ ...prev, sourceFileContent: content, sourceFileName: file.name, topic: `Content from ${file.name}` }));
            } catch (e) {
                setError("Could not read the file. Please ensure it's a text file.");
            }
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // If a custom IT topic is entered, it overrides any selected button.
        const finalFormState = { ...formState };
        if (formState.sourceType === 'it' && customItTopic.trim()) {
            finalFormState.topic = `A quiz on the IT topic: ${customItTopic.trim()}`;
        }

        try {
            const quizData = await generateQuiz(finalFormState);
            onQuizCreated(quizData, finalFormState);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <Spinner message="AI is crafting your custom quiz..." />;
    }

    const setTimerType = (type: TimerType) => {
        let duration = formState.timerDuration;
        if (type === TimerType.None) duration = 0;
        else if (duration === 0) duration = type === TimerType.PerQuestion ? 30 : 300;
        setFormState(prev => ({...prev, timerType: type, timerDuration: duration }));
    }

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newState = e.target.value;
        const newExam = indianExams[newState]?.[0] || '';
        setFormState(prev => ({ ...prev, state: newState, exam: newExam }));
    }

    const handleItTopicSelect = (itTopic: string) => {
        setFormState(prev => ({...prev, topic: `A quiz on the IT topic: ${itTopic}`}));
        setCustomItTopic(''); // Clear custom topic when a button is clicked
    };

    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-6">Hello, {user.name}! Let's build your quiz.</h2>
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4 text-center">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Quiz & Timer Settings */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-lg font-medium text-slate-300 mb-2">1. Quiz Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            {(Object.values(QuizType) as QuizType[]).map(type => (
                                <button type="button" key={type} onClick={() => setFormState(prev => ({...prev, quizType: type}))} className={`p-3 rounded-lg text-center font-semibold transition-all duration-200 ${formState.quizType === type ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="block text-lg font-medium text-slate-300 mb-2">2. Timer Settings</label>
                        <div className="grid grid-cols-3 gap-2">
                             {(Object.values(TimerType) as TimerType[]).map(type => (
                                <button type="button" key={type} onClick={() => setTimerType(type)} className={`p-3 rounded-lg text-center font-semibold transition-all duration-200 text-sm ${formState.timerType === type ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Timer Duration */}
                {formState.timerType !== TimerType.None && (
                    <div className="animate-fade-in">
                        <label htmlFor="timerDuration" className="block text-lg font-medium text-slate-300 mb-2">
                           Timer Duration ({formState.timerType === TimerType.PerQuestion ? 'seconds per question' : 'total seconds'})
                        </label>
                        <input id="timerDuration" type="number" min="10" value={formState.timerDuration} onChange={e => setFormState(prev => ({ ...prev, timerDuration: parseInt(e.target.value) }))} className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                )}
                
                {/* Topic & Source */}
                 <div>
                    <label className="block text-lg font-medium text-slate-300 mb-2">3. Quiz Content Source</label>
                     <div className="bg-slate-700/50 p-4 rounded-lg space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                           <button type="button" onClick={() => setFormState(prev => ({...prev, sourceType: 'topic'}))} className={`w-full p-2 rounded-lg font-semibold text-sm ${formState.sourceType === 'topic' ? 'bg-purple-600' : 'bg-slate-700'}`}>Topic/File</button>
                           <button type="button" onClick={() => setFormState(prev => ({...prev, sourceType: 'exam'}))} className={`w-full p-2 rounded-lg font-semibold text-sm ${formState.sourceType === 'exam' ? 'bg-purple-600' : 'bg-slate-700'}`}>Indian Exam</button>
                           <button type="button" onClick={() => setFormState(prev => ({...prev, sourceType: 'it'}))} className={`w-full p-2 rounded-lg font-semibold text-sm ${formState.sourceType === 'it' ? 'bg-purple-600' : 'bg-slate-700'}`}>IT Sector</button>
                        </div>
                        
                        {formState.sourceType === 'topic' && (
                             <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                                <input type="text" value={formState.topic} onChange={e => setFormState(prev => ({...prev, topic: e.target.value}))} placeholder="Enter a topic..." className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                <label htmlFor="file-upload" className="w-full flex items-center justify-center px-4 py-2 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:bg-slate-600 hover:border-purple-500 transition">
                                    <UploadIcon />
                                    <span className="text-slate-300 ml-2 truncate">{formState.sourceFileName || "Or upload a .txt file"}</span>
                                </label>
                                <input id="file-upload" type="file" className="hidden" accept=".txt" onChange={handleFileChange} />
                            </div>
                        )}
                        {formState.sourceType === 'exam' && (
                            <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                               <select value={formState.state} onChange={handleStateChange} className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                   {Object.keys(indianExams).map(state => <option key={state} value={state}>{state}</option>)}
                               </select>
                               <select value={formState.exam} onChange={e => setFormState(prev => ({...prev, exam: e.target.value}))} className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                   {indianExams[formState.state]?.map(exam => <option key={exam} value={exam}>{exam}</option>)}
                               </select>
                            </div>
                        )}
                        {formState.sourceType === 'it' && (
                            <div className="animate-fade-in space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {IT_TOPICS.map(itTopic => (
                                        <button type="button" key={itTopic} onClick={() => handleItTopicSelect(itTopic)} className={`p-2 rounded-lg font-semibold text-sm transition-all duration-200 ${formState.topic.includes(itTopic) && !customItTopic ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                            {itTopic}
                                        </button>
                                    ))}
                                </div>
                                <input type="text" value={customItTopic} onChange={e => setCustomItTopic(e.target.value)} placeholder="Or type a custom IT topic..." className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Custom Prompt */}
                 <div>
                    <label className="block text-lg font-medium text-slate-300 mb-2">4. AI Instructions (Optional)</label>
                    <textarea value={formState.customPrompt} onChange={e => setFormState(prev => ({...prev, customPrompt: e.target.value}))} placeholder="e.g., 'Focus on beginner concepts', 'Make the questions tricky'" rows={3} className="w-full px-4 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>

                {/* Rounds */}
                <div>
                    <label htmlFor="rounds" className="block text-lg font-medium text-slate-300 mb-2">5. Number of Questions: <span className="font-bold text-purple-400">{formState.rounds}</span></label>
                    <input id="rounds" type="range" min="3" max="50" value={formState.rounds} onChange={e => setFormState(prev => ({...prev, rounds: parseInt(e.target.value)}))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>

                {/* Submit */}
                <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                    Generate Quiz & Create Room
                </button>
            </form>
        </div>
    );
};

export default CreateQuizFlow;
