import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Room, Question, CreateQuizFormState, QuizHistory, User, GroundingSource, AuthResponse } from './types';
import JoinScreen from './components/JoinScreen';
import HomePage from './components/HomePage';
import CreateQuizFlow from './components/CreateQuizFlow';
import Lobby from './components/Lobby';
import Quiz from './components/Quiz';
import Results from './components/Results';
import Auth from './components/Auth';
import Profile from './components/Profile';
import Insights from './components/Insights';
import { generatePersonalInsights } from './services/geminiService';
import * as api from './services/apiService';
import { 
    initSocketConnection, 
    disconnectSocket, 
    onRoomUpdate, 
    onQuizStarted, 
    onGameEnded, 
    onError, 
    offAllListeners,
    createRoom,
    joinRoom,
    startQuiz,
    submitAnswers
} from './services/socketService';
import Spinner from './components/Spinner';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(GameState.JOIN_SCREEN);
    const [room, setRoom] = useState<Room | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [insights, setInsights] = useState<string>('');
    const [isInsightLoading, setIsInsightLoading] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [isWaitingForOthers, setIsWaitingForOthers] = useState(false);

    useEffect(() => {
        const checkUserAuth = async () => {
            const token = api.getToken();
            if (token) {
                try {
                    const user = await api.checkAuth();
                    setCurrentUser(user);
                    setGameState(GameState.HOME);
                } catch (e) {
                    api.logout();
                    setGameState(GameState.JOIN_SCREEN);
                }
            }
            setIsAppLoading(false);
        };
        checkUserAuth();
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        
        initSocketConnection();

        onRoomUpdate((newRoom) => {
            setRoom(newRoom);
            if (newRoom.status === 'lobby') {
                setGameState(GameState.LOBBY);
            }
        });

        onQuizStarted((startedRoom) => {
            setRoom(startedRoom);
            setIsWaitingForOthers(false);
            setGameState(GameState.PLAYING);
        });
        
        onGameEnded((finishedRoom) => {
            setRoom(finishedRoom);
            setIsWaitingForOthers(false);
            setGameState(GameState.RESULTS);
        });

        onError((message) => {
            setError(message);
            if (gameState === GameState.LOBBY || gameState === GameState.PLAYING) {
                setRoom(null);
                setGameState(GameState.HOME);
            }
        });

        return () => {
            offAllListeners();
        };
    }, [currentUser, gameState]);

    useEffect(() => {
        const saveUserHistory = async () => {
            if (gameState === GameState.RESULTS && room && currentUser && !currentUser.isGuest && room.players.find(p => p.id === currentUser.id)) {
                const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
                const userResult = sortedPlayers.find(p => p.id === currentUser.id);
                const userRank = sortedPlayers.findIndex(p => p.id === currentUser.id) + 1;

                if (userResult) {
                    const historyEntry: QuizHistory = {
                        roomId: room.id,
                        quizTopic: room.quizSettings.topic,
                        score: userResult.score,
                        date: new Date().toISOString(),
                        rank: userRank,
                        playerCount: sortedPlayers.length
                    };
                    try {
                        await api.saveHistory(historyEntry);
                    } catch (e) {
                         console.error("Failed to save quiz history", e);
                    }
                }
            }
        };
        saveUserHistory();
    }, [gameState, room, currentUser]);
    
    const handleGuestJoin = useCallback((name: string, roomId: string) => {
        const guestUser: User = {
            id: `guest-${Date.now()}`,
            name,
            isGuest: true,
        };
        setCurrentUser(guestUser);
        setError(null);
        joinRoom(roomId, guestUser);
    }, []);

    const handleGuestCreate = useCallback((name: string) => {
         const guestUser: User = {
            id: `guest-${Date.now()}`,
            name,
            isGuest: true,
        };
        setCurrentUser(guestUser);
        setGameState(GameState.CREATING);
    }, []);

    const handleAuthSuccess = useCallback((authResponse: AuthResponse, isNewUser: boolean) => {
        api.setToken(authResponse.token);
        const user = authResponse.user;
        setCurrentUser(user);

        if (isNewUser || (!user.isGuest && !user.profession)) {
            setGameState(GameState.PROFILE_SETUP);
        } else {
            setGameState(GameState.HOME);
        }
    }, []);
    
    const handleProfileSave = async (updatedUser: User) => {
        try {
            const savedUser = await api.saveProfile(updatedUser);
            setCurrentUser(savedUser);
        } catch (err: any) {
            console.error("Failed to save profile:", err);
            setError(err.message || "Could not save your profile. Please try again.");
        }
        setGameState(GameState.HOME);
    };

    const handleCreateRoom = useCallback(() => {
        if (!currentUser) return;
        setGameState(GameState.CREATING);
        setError(null);
    }, [currentUser]);

    const handleJoinRoom = useCallback((roomId: string) => {
        if (!currentUser) return;
        setError(null);
        joinRoom(roomId, currentUser);
    }, [currentUser]);

    const handleQuizCreated = useCallback((quizData: { questions: Question[], sources: GroundingSource[] | null }, settings: CreateQuizFormState) => {
        if (!currentUser) return;
        createRoom(quizData, settings, currentUser);
    }, [currentUser]);

    const handleStartQuiz = useCallback(() => {
        if (!room) return;
        startQuiz(room.id);
    }, [room]);
    
    const handleQuizEnd = useCallback((finalPlayerAnswers: (string | null)[]) => {
        if (!room) return;
        setIsWaitingForOthers(true);
        submitAnswers(room.id, finalPlayerAnswers);
    }, [room]);

    const handleViewInsights = async () => {
        if (!currentUser || currentUser.isGuest) return;
        const today = new Date().toISOString().split('T')[0];
        const userFromApi = await api.checkAuth();
        setCurrentUser(userFromApi);
        if (userFromApi.lastInsightDate === today) {
            setError("You can only generate new insights once per day. Come back tomorrow!");
            return;
        }
        setError(null);
        setIsInsightLoading(true);
        setGameState(GameState.VIEWING_INSIGHTS);
        try {
            const history = await api.getHistory();
            if (history.length === 0) {
                 setInsights("You don't have any quiz history yet. Play a few games, and then come back for your personalized insights!");
                 setIsInsightLoading(false);
                 return;
            }
            const result = await generatePersonalInsights(history, currentUser);
            setInsights(result);
            const updatedUser = { ...currentUser, lastInsightDate: today };
            await api.saveProfile(updatedUser);
            setCurrentUser(updatedUser);
        } catch (err: any) {
            setInsights(`Error: ${err.message}`);
        } finally {
            setIsInsightLoading(false);
        }
    };

    const handlePlayAgain = () => {
        setRoom(null);
        setError(null);
        setIsWaitingForOthers(false);
        setGameState(GameState.HOME);
    };
    
    const handleLogout = () => {
        api.logout();
        disconnectSocket();
        setCurrentUser(null);
        setRoom(null);
        setError(null);
        setIsWaitingForOthers(false);
        setGameState(GameState.JOIN_SCREEN);
    };

    const renderGameState = () => {
        if (isAppLoading) {
            return <Spinner message="Loading application..." />;
        }
        switch (gameState) {
            case GameState.JOIN_SCREEN:
                return <JoinScreen 
                    onJoin={handleGuestJoin}
                    onCreate={handleGuestCreate}
                    onLoginClick={() => setGameState(GameState.AUTH)}
                />;
            case GameState.AUTH:
                return <Auth onAuthSuccess={handleAuthSuccess} />;
            case GameState.PROFILE_SETUP:
                return currentUser && <Profile user={currentUser} onSave={handleProfileSave} />;
            case GameState.VIEWING_INSIGHTS:
                return <Insights isLoading={isInsightLoading} insightText={insights} onBack={() => setGameState(GameState.HOME)} />;
            case GameState.CREATING:
                return currentUser && <CreateQuizFlow onQuizCreated={handleQuizCreated} user={currentUser} />;
            case GameState.LOBBY:
                const currentPlayerInLobby = room?.players.find(p => p.id === currentUser?.id);
                return room && currentUser && currentPlayerInLobby && <Lobby room={room} onStartQuiz={handleStartQuiz} currentUser={currentPlayerInLobby} />;
            case GameState.PLAYING:
                const currentPlayerInRoom = room?.players.find(p => p.id === currentUser?.id);
                 if (isWaitingForOthers) {
                    return <Spinner message="Waiting for other players to finish..." />;
                }
                return room && currentUser && currentPlayerInRoom && <Quiz room={room} user={currentPlayerInRoom} onQuizEnd={handleQuizEnd} />;
            case GameState.RESULTS:
                return room && currentUser && <Results room={room} onPlayAgain={handlePlayAgain} currentUserId={currentUser.id} />;
            case GameState.HOME:
            default:
                return currentUser && <HomePage 
                    onCreateRoom={handleCreateRoom} 
                    onJoinRoom={handleJoinRoom} 
                    onViewInsights={handleViewInsights}
                    onViewProfile={() => setGameState(GameState.PROFILE_SETUP)}
                    user={currentUser} 
                />;
        }
    };

    return (
        <div className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center p-4 selection:bg-purple-500 selection:text-white">
            <div className="w-full max-w-5xl mx-auto">
                <header className="text-center mb-8 flex justify-between items-center w-full">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Quizyfy
                    </h1>
                     {currentUser && gameState !== GameState.JOIN_SCREEN && (
                        <button onClick={handleLogout} className="bg-slate-700 hover:bg-rose-600/50 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Logout
                        </button>
                    )}
                </header>
                <main className="bg-slate-800 rounded-2xl shadow-2xl p-4 md:p-8 w-full">
                    {error && (gameState === GameState.HOME || gameState === GameState.AUTH) && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4 text-center animate-fade-in">{error}</p>}
                    {renderGameState()}
                </main>
            </div>
        </div>
    );
};

export default App;