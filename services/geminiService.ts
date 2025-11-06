import type { CreateQuizFormState, Question, QuizHistory, User, GroundingSource } from '../types';

// Safely determine the API base URL for different environments.
const getApiBaseUrl = (): string => {
    try {
        if ((import.meta as any).env.DEV) {
            // In local dev, use a relative path. The /api prefix will be handled
            // by the Vite proxy.
            return '';
        }
    } catch (e) {
        // This catch block handles environments where `import.meta.env` is not available.
    }
    // For all other cases (production, playgrounds), use the deployed backend URL.
    return 'https://quizit-6jve.onrender.com';
};
const API_BASE_URL = getApiBaseUrl();


// Helper to get the auth token for secure API requests
const getToken = () => localStorage.getItem('authToken');

// This function now calls our own backend, not Google's API directly.
// The backend is responsible for securely calling the Gemini API.
const generateQuiz = async (config: CreateQuizFormState): Promise<{ questions: Question[], sources: GroundingSource[] | null }> => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/quiz/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate quiz' }));
        throw new Error(errorData.message || 'An unknown error occurred while generating the quiz.');
    }

    return response.json();
};

// This function also calls our own backend for generating insights.
const generatePersonalInsights = async (history: QuizHistory[], user: User): Promise<string> => {
     const token = getToken();
     const response = await fetch(`${API_BASE_URL}/api/insights/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ history, user }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate insights' }));
        throw new Error(errorData.message || 'An unknown error occurred while generating insights.');
    }
    
    const { insights } = await response.json();
    return insights;
};

export { generateQuiz, generatePersonalInsights };