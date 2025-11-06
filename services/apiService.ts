import type { User, QuizHistory, AuthResponse } from '../types';

// Safely determine the API base URL for different environments.
const getApiBaseUrl = (): string => {
    try {
        // In a Vite development environment, `import.meta.env.DEV` is true.
        // The code will try to access `import.meta.env`. If it's undefined, a TypeError
        // will be thrown and caught, and the production URL will be returned.
        if ((import.meta as any).env.DEV) {
            // In local dev, use a relative path. The /api prefix will be handled
            // by the Vite proxy.
            return '';
        }
    } catch (e) {
        // This catch block handles environments where `import.meta.env` is not available,
        // such as the AI Studio playground or a production build without Vite env vars.
    }
    // For all other cases (production, playgrounds), use the deployed backend URL.
    return 'https://quizyfy.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();
const TOKEN_KEY = 'authToken';

// --- Token Management ---

export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const logout = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

// --- Generic API Fetch Wrapper ---

async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        // Try to parse error message from backend, otherwise use default
        const errorData = await response.json().catch(() => ({ message: 'An unexpected error occurred.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    // Handle cases with no response body (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return null; 
}


// --- Authentication ---

export const signup = async (name: string, email: string, password_raw: string): Promise<AuthResponse> => {
    return apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: password_raw }),
    });
};

export const login = async (email: string, password_raw: string): Promise<AuthResponse> => {
    return apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: password_raw }),
    });
};

// This function would be called on app load to verify the token and get user data
export const checkAuth = async (): Promise<User> => {
    return apiFetch('/api/users/me'); // A protected route that returns the current user
};


// --- User Profile ---

export const saveProfile = async (userToUpdate: User): Promise<User> => {
    if (userToUpdate.isGuest) return userToUpdate; // Don't save guest profiles to backend

    return apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(userToUpdate),
    });
};


// --- Quiz History ---

export const getHistory = async (): Promise<QuizHistory[]> => {
    return apiFetch('/api/history');
};

export const saveHistory = async (newEntry: QuizHistory): Promise<void> => {
    await apiFetch('/api/history', {
        method: 'POST',
        body: JSON.stringify(newEntry),
    });
};