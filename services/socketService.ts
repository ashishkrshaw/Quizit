import { io, Socket } from 'socket.io-client';
import type { Room, CreateQuizFormState, Question, User, GroundingSource, ChatMessage } from '../types';

// Define event maps to strongly type the socket client
interface ServerToClientEvents {
    roomUpdate: (room: Room) => void;
    quizStarted: (room: Room) => void;
    gameEnded: (room: Room) => void;
    newChatMessage: (message: ChatMessage) => void;
    error: (message: string) => void;
}

interface ClientToServerEvents {
    createRoom: (data: { quizData: { questions: Question[], sources: GroundingSource[] | null }, settings: CreateQuizFormState, user: User }) => void;
    joinRoom: (data: { roomId: string, user: User }) => void;
    startQuiz: (data: { roomId: string }) => void;
    submitAnswers: (data: { roomId: string, answers: (string | null)[] }) => void;
    sendChatMessage: (data: { roomId: string, message: ChatMessage }) => void;
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;


// Safely determine the Socket.IO server URL for different environments.
const getSocketUrl = (): string | undefined => {
    try {
        // In a Vite development environment, `import.meta.env.DEV` is true.
        if ((import.meta as any).env.DEV) {
            // In local dev, connect to the same host so the Vite proxy can handle it.
            return undefined;
        }
    } catch (e) {
        // This catch block handles environments where `import.meta.env` is not available.
    }
    // For all other cases (production, playgrounds), use the deployed backend URL.
    return 'https://quizify.duckdns.org';
};


export const initSocketConnection = () => {
    if (socket) return;
    
    const socketUrl = getSocketUrl();
    socket = io(socketUrl);

    socket.on('connect', () => {
        console.log(`Connected to WebSocket server`);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
    });
};

export const disconnectSocket = () => {
    if(socket) {
        socket.disconnect();
        socket = null;
    }
};

// --- Emitters ---

export const createRoom = (quizData: { questions: Question[], sources: GroundingSource[] | null }, settings: CreateQuizFormState, user: User) => {
    socket?.emit('createRoom', { quizData, settings, user });
};

export const joinRoom = (roomId: string, user: User) => {
    socket?.emit('joinRoom', { roomId, user });
};

export const startQuiz = (roomId: string) => {
    socket?.emit('startQuiz', { roomId });
};

export const submitAnswers = (roomId: string, answers: (string | null)[]) => {
    socket?.emit('submitAnswers', { roomId, answers });
};

export const sendChatMessage = (roomId: string, message: ChatMessage) => {
    socket?.emit('sendChatMessage', { roomId, message });
};


// --- Listeners ---

export const onRoomUpdate = (callback: (room: Room) => void) => {
    socket?.on('roomUpdate', callback);
};

export const onQuizStarted = (callback: (room: Room) => void) => {
    socket?.on('quizStarted', callback);
};

export const onGameEnded = (callback: (room: Room) => void) => {
    socket?.on('gameEnded', callback);
};

export const onNewChatMessage = (callback: (message: ChatMessage) => void) => {
    socket?.on('newChatMessage', callback);
};

export const onError = (callback: (message: string) => void) => {
    socket?.on('error', callback);
};

export const offAllListeners = () => {
    if (!socket) return;
    socket.off('roomUpdate');
    socket.off('quizStarted');
    socket.off('gameEnded');
    socket.off('error');
    socket.off('newChatMessage');
};

// Specific listener removal for component cleanup
export const offNewChatMessage = (callback: (message: ChatMessage) => void) => {
    if (!socket) return;
    socket.off('newChatMessage', callback);
}