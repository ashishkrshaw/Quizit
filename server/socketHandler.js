const rooms = new Map(); // In-memory store for rooms: Map<roomId, Room>

// Helper to create a JSON-safe snapshot of a room for emitting over sockets.
const serializeRoom = (room) => {
    if (!room) return null;
    const playerAnswersObj = {};
    try {
        if (room.playerAnswers && typeof room.playerAnswers.entries === 'function') {
            for (const [uid, answers] of room.playerAnswers.entries()) {
                playerAnswersObj[uid] = answers;
            }
        }
    } catch (e) {
        // ignore serialization errors
    }

    return {
        id: room.id,
        players: (room.players || []).map(p => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost, answers: p.answers || [], isGuest: p.isGuest })),
        quiz: room.quiz || [],
        groundingSources: room.groundingSources || null,
        currentQuestionIndex: room.currentQuestionIndex,
        status: room.status,
        quizType: room.quizType,
        quizSettings: room.quizSettings,
        playerAnswers: playerAnswersObj,
        createdAt: room.createdAt || null,
    };
};

export const initSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('createRoom', ({ quizData, settings, user }) => {
            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const hostPlayer = {
                id: user.id,
                name: user.name,
                score: 0,
                isHost: true,
                answers: [],
                isGuest: user.isGuest,
                socketId: socket.id
            };

            const room = {
                id: roomId,
                players: [hostPlayer],
                quiz: quizData.questions,
                groundingSources: quizData.sources,
                currentQuestionIndex: 0,
                status: 'lobby',
                quizType: settings.quizType,
                quizSettings: settings,
                playerAnswers: new Map(), // Map<userId, answers[]>
                createdAt: Date.now(),
                cleanupTimeout: null
            };

            rooms.set(roomId, room);
            socket.join(roomId);
            io.to(roomId).emit('roomUpdate', serializeRoom(room));
            console.log(`Room created: ${roomId} by ${user.name}`);
        });

        socket.on('joinRoom', ({ roomId, user }) => {
            const room = rooms.get(roomId);
            if (!room) {
                socket.emit('error', 'Room not found.');
                return;
            }
            // Allow rejoining in-progress rooms (so users who refresh can re-enter).
            if (room.status === 'finished') {
                socket.emit('error', 'Quiz has already finished.');
                return;
            }

            // If user already exists in room (reconnect), update their socketId and rejoin
            const existingPlayer = room.players.find(p => p.id === user.id);
            if (existingPlayer) {
                existingPlayer.socketId = socket.id;
                socket.join(roomId);
                // If a cleanup timeout was scheduled because room was empty, clear it
                if (room.cleanupTimeout) {
                    clearTimeout(room.cleanupTimeout);
                    room.cleanupTimeout = null;
                }
                io.to(roomId).emit('roomUpdate', serializeRoom(room));
                return;
            }

            const newPlayer = {
                id: user.id,
                name: user.name,
                score: 0,
                isHost: false,
                answers: [],
                isGuest: user.isGuest,
                socketId: socket.id
            };

            room.players.push(newPlayer);
            socket.join(roomId);
            // Clear any scheduled cleanup since a player joined
            if (room.cleanupTimeout) {
                clearTimeout(room.cleanupTimeout);
                room.cleanupTimeout = null;
            }
            io.to(roomId).emit('roomUpdate', serializeRoom(room));
            console.log(`${user.name} joined room ${roomId}`);
        });

        socket.on('startQuiz', ({ roomId }) => {
            const room = rooms.get(roomId);
            if (room && room.players.find(p => p.socketId === socket.id)?.isHost) {
                room.status = 'in-progress';
                room.players = room.players.map(p => ({
                    ...p,
                    answers: new Array(room.quiz.length).fill(null),
                }));
                io.to(roomId).emit('quizStarted', serializeRoom(room));
                console.log(`Quiz started for room ${roomId}`);
            }
        });
        
        socket.on('sendChatMessage', ({ roomId, message }) => {
            // Broadcast the message to all clients in the room, including the sender
            io.to(roomId).emit('newChatMessage', message);
            console.log(`Message in room ${roomId} from ${message.sender}: ${message.text}`);
        });

        socket.on('submitAnswers', ({ roomId, answers }) => {
            const room = rooms.get(roomId);
            const player = room?.players.find(p => p.socketId === socket.id);

            if (!room || !player) return;
            
            room.playerAnswers.set(player.id, answers);
            player.answers = answers;

            if (room.playerAnswers.size === room.players.length) {
                room.players.forEach(p => {
                    let newScore = 0;
                    const submittedAnswers = room.playerAnswers.get(p.id) || [];
                    submittedAnswers.forEach((answer, index) => {
                        if (answer && room.quiz[index] && room.quiz[index].correctAnswer.toLowerCase() === answer.toLowerCase().trim()) {
                            newScore += 1;
                        }
                    });
                    p.score = newScore;
                });

                room.status = 'finished';
                io.to(roomId).emit('gameEnded', serializeRoom(room));
                console.log(`Game ended for room ${roomId}`);
                // Schedule deletion after 10 minutes by default
                room.cleanupTimeout = setTimeout(() => rooms.delete(roomId), 60000 * 10);
            }
        });
        
        const handleDisconnect = () => {
            for (const [roomId, room] of rooms.entries()) {
                const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
                if (playerIndex > -1) {
                    const leavingPlayer = room.players[playerIndex];
                    console.log(`${leavingPlayer.name} disconnected from room ${roomId}`);
                    room.players.splice(playerIndex, 1);

                    // If there are still players, notify them. If not, schedule cleanup depending on timer type.
                    if (room.players.length === 0) {
                        const timerType = room.quizSettings?.timerType || 'None';
                        const timeoutMs = (timerType === 'None') ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5min for none, 60min otherwise
                        room.cleanupTimeout = setTimeout(() => {
                            rooms.delete(roomId);
                            console.log(`Room ${roomId} cleaned up after inactivity.`);
                        }, timeoutMs);
                        console.log(`Scheduled cleanup for room ${roomId} in ${timeoutMs / 1000} seconds.`);
                        // Also emit roomUpdate so any reconnecting clients see latest state
                        io.to(roomId).emit('roomUpdate', serializeRoom(room));
                    } else {
                        // If the host left but players remain, pick a new host (first player)
                        if (leavingPlayer.isHost && room.status !== 'finished') {
                            room.players[0].isHost = true;
                            console.log(`Host left; transferred host to ${room.players[0].name} in room ${roomId}`);
                        }
                        io.to(roomId).emit('roomUpdate', serializeRoom(room));
                    }
                    break;
                }
            }
        };

        socket.on('disconnect', handleDisconnect);
    });
};