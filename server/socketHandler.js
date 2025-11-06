const rooms = new Map(); // In-memory store for rooms: Map<roomId, Room>

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
                playerAnswers: new Map() // Map<userId, answers[]>
            };

            rooms.set(roomId, room);
            socket.join(roomId);
            io.to(roomId).emit('roomUpdate', room);
            console.log(`Room created: ${roomId} by ${user.name}`);
        });

        socket.on('joinRoom', ({ roomId, user }) => {
            const room = rooms.get(roomId);
            if (!room) {
                socket.emit('error', 'Room not found.');
                return;
            }
            if (room.status !== 'lobby') {
                socket.emit('error', 'Quiz has already started.');
                return;
            }
            if (room.players.some(p => p.id === user.id)) {
                socket.join(roomId);
                io.to(roomId).emit('roomUpdate', room);
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
            io.to(roomId).emit('roomUpdate', room);
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
                io.to(roomId).emit('quizStarted', room);
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
                io.to(roomId).emit('gameEnded', room);
                console.log(`Game ended for room ${roomId}`);
                setTimeout(() => rooms.delete(roomId), 60000 * 10);
            }
        });
        
        const handleDisconnect = () => {
            for (const [roomId, room] of rooms.entries()) {
                const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
                if (playerIndex > -1) {
                    const leavingPlayer = room.players[playerIndex];
                    console.log(`${leavingPlayer.name} disconnected from room ${roomId}`);
                    room.players.splice(playerIndex, 1);

                    if (room.players.length === 0 || (leavingPlayer.isHost && room.status !== 'finished')) {
                         io.to(roomId).emit('error', 'The host has disconnected. The room is now closed.');
                         rooms.delete(roomId);
                         console.log(`Room ${roomId} closed.`);
                    } else {
                        io.to(roomId).emit('roomUpdate', room);
                    }
                    break;
                }
            }
        };

        socket.on('disconnect', handleDisconnect);
    });
};