const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { v4: uuidv4 } = require('uuid')

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Server Setup
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:4173'],
        methods: ['GET', 'POST'],
    },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// In-Memory Room State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/** @type {Map<string, RoomState>} */
const rooms = new Map()

/** @type {Map<string, NodeJS.Timeout>} */
const roomTimers = new Map()

const ROOM_CLEANUP_DELAY = 10 * 60 * 1000 // 10 minutes

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ADJECTIVES = [
    'Happy', 'Lazy', 'Brave', 'Clever', 'Fluffy', 'Grumpy',
    'Speedy', 'Mighty', 'Tiny', 'Wild', 'Gentle', 'Fierce',
    'Jolly', 'Silly', 'Swift', 'Golden', 'Silver', 'Cosmic',
    'Hungry', 'Sneaky', 'Bouncy', 'Dizzy', 'Funky', 'Groovy',
]
const ANIMALS = [
    'Tiger', 'Lion', 'Eagle', 'Panda', 'Dolphin', 'Penguin',
    'Koala', 'Cheetah', 'Owl', 'Fox', 'Wolf', 'Bear',
    'Rabbit', 'Deer', 'Elephant', 'Gorilla', 'Parrot', 'Falcon',
    'Otter', 'Lynx', 'Jaguar', 'Peacock', 'Flamingo', 'Toucan',
]

function generateAnimalName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    return `${adj} ${animal}`
}

function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            id: roomId,
            currentSong: null, // { id, youtubeId, title, thumbnail, addedBy, startTime, isPlaying }
            queue: [],         // [{ id, youtubeId, title, thumbnail, addedBy, addedById }]
            users: [],         // [{ id (socketId), name }]
        })
        console.log(`[Room] Created: ${roomId}`)
    }
    return rooms.get(roomId)
}

function scheduleCleanup(roomId) {
    cancelCleanup(roomId)
    const timer = setTimeout(() => {
        const room = rooms.get(roomId)
        if (room && room.users.length === 0) {
            rooms.delete(roomId)
            roomTimers.delete(roomId)
            console.log(`[Room] Cleaned up: ${roomId}`)
        }
    }, ROOM_CLEANUP_DELAY)
    roomTimers.set(roomId, timer)
}

function cancelCleanup(roomId) {
    if (roomTimers.has(roomId)) {
        clearTimeout(roomTimers.get(roomId))
        roomTimers.delete(roomId)
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Socket.io Events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`)

    let currentRoomId = null
    let currentUser = null

    // ── join_room ──────────────────────────────────────────
    socket.on('join_room', ({ roomId }) => {
        if (!roomId) return

        currentRoomId = roomId
        cancelCleanup(roomId)

        const room = getOrCreateRoom(roomId)

        currentUser = { id: socket.id, name: generateAnimalName() }
        room.users.push(currentUser)

        socket.join(roomId)

        // Send full current state to the joining user
        socket.emit('room_state', {
            currentSong: room.currentSong,
            queue: room.queue,
            users: room.users,
            myUser: currentUser,
        })

        // Broadcast updated user list to everyone else
        socket.to(roomId).emit('users_updated', room.users)

        console.log(`[Room ${roomId}] ${currentUser.name} joined (${room.users.length} users)`)
    })

    // ── add_to_queue ───────────────────────────────────────
    socket.on('add_to_queue', ({ roomId, youtubeId, title, thumbnail }) => {
        const room = rooms.get(roomId)
        if (!room || !youtubeId) return

        const newSong = {
            id: uuidv4(),
            youtubeId,
            title: title || 'Unknown Title',
            thumbnail: thumbnail || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
            addedBy: currentUser?.name || 'Unknown',
            addedById: socket.id,
        }

        // Auto-play if nothing is currently playing
        if (!room.currentSong) {
            room.currentSong = { ...newSong, startTime: Date.now(), isPlaying: true }
            io.to(roomId).emit('playback_changed', room.currentSong)
        } else {
            room.queue.push(newSong)
            io.to(roomId).emit('queue_updated', room.queue)
        }

        console.log(`[Room ${roomId}] ${currentUser?.name} added: ${title}`)
    })

    // ── play_now ───────────────────────────────────────────
    socket.on('play_now', ({ roomId, youtubeId, title, thumbnail, songId }) => {
        const room = rooms.get(roomId)
        if (!room || !youtubeId) return

        // Remove the song from queue if it was queued (play from queue)
        if (songId) {
            room.queue = room.queue.filter((s) => s.id !== songId)
            io.to(roomId).emit('queue_updated', room.queue)
        }

        room.currentSong = {
            id: uuidv4(),
            youtubeId,
            title: title || 'Unknown Title',
            thumbnail: thumbnail || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
            addedBy: currentUser?.name || 'Unknown',
            addedById: socket.id,
            startTime: Date.now(),
            pausedElapsedMs: 0,
            isPlaying: true,
        }

        io.to(roomId).emit('playback_changed', room.currentSong)
        console.log(`[Room ${roomId}] ${currentUser?.name} playing now: ${title}`)
    })

    // ── toggle_play ────────────────────────────────────────
    socket.on('toggle_play', ({ roomId }) => {
        const room = rooms.get(roomId)
        if (!room?.currentSong) return

        const song = room.currentSong
        if (song.isPlaying) {
            // Pausing: record how many ms into the song we are
            song.pausedElapsedMs = Date.now() - (song.startTime || Date.now())
            song.isPlaying = false
        } else {
            // Resuming: adjust startTime so elapsed calc stays correct
            song.startTime = Date.now() - (song.pausedElapsedMs || 0)
            song.isPlaying = true
        }

        io.to(roomId).emit('playback_changed', room.currentSong)
    })

    // ── skip_song ──────────────────────────────────────────
    socket.on('skip_song', ({ roomId }) => {
        const room = rooms.get(roomId)
        if (!room) return

        if (room.queue.length > 0) {
            const next = room.queue.shift()
            room.currentSong = { ...next, startTime: Date.now(), isPlaying: true }
            io.to(roomId).emit('playback_changed', room.currentSong)
            io.to(roomId).emit('queue_updated', room.queue)
        } else {
            room.currentSong = null
            io.to(roomId).emit('playback_changed', null)
        }

        console.log(`[Room ${roomId}] ${currentUser?.name} skipped song`)
    })

    // ── song_ended (auto-advance) ──────────────────────────
    socket.on('song_ended', ({ roomId }) => {
        const room = rooms.get(roomId)
        if (!room) return

        // Only process if this user's currentSong matches (avoid duplicate triggers)
        if (room.queue.length > 0) {
            const next = room.queue.shift()
            room.currentSong = { ...next, startTime: Date.now(), isPlaying: true }
            io.to(roomId).emit('playback_changed', room.currentSong)
            io.to(roomId).emit('queue_updated', room.queue)
        } else {
            room.currentSong = null
            io.to(roomId).emit('playback_changed', null)
        }
    })

    // ── remove_from_queue ──────────────────────────────────
    socket.on('remove_from_queue', ({ roomId, songId }) => {
        const room = rooms.get(roomId)
        if (!room) return

        room.queue = room.queue.filter((s) => s.id !== songId)
        io.to(roomId).emit('queue_updated', room.queue)
    })

    // ── prioritize_song ────────────────────────────────────
    socket.on('prioritize_song', ({ roomId, songId }) => {
        const room = rooms.get(roomId)
        if (!room) return

        const idx = room.queue.findIndex((s) => s.id === songId)
        if (idx > 0) {
            const [song] = room.queue.splice(idx, 1)
            room.queue.unshift(song)
            io.to(roomId).emit('queue_updated', room.queue)
        }
    })

    // ── disconnect ─────────────────────────────────────────
    socket.on('disconnect', () => {
        if (!currentRoomId || !currentUser) return

        const room = rooms.get(currentRoomId)
        if (room) {
            room.users = room.users.filter((u) => u.id !== socket.id)
            socket.to(currentRoomId).emit('users_updated', room.users)

            if (room.users.length === 0) {
                scheduleCleanup(currentRoomId)
                console.log(`[Room ${currentRoomId}] Empty — cleanup scheduled`)
            }
        }

        console.log(`[Socket] ${currentUser.name} disconnected`)
    })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REST API endpoints
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.json())

// Proxy YouTube oEmbed so the browser doesn't hit CORS/401
app.get('/api/youtube-meta', async (req, res) => {
    const { videoId } = req.query
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' })

    try {
        // Node 18+ has built-in fetch; use node-fetch for older Node
        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        const response = await fetch(oEmbedUrl)

        if (!response.ok) {
            // oEmbed failed (e.g. private video) — return fallback
            return res.json({
                title: `YouTube Video (${videoId})`,
                thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            })
        }

        const data = await response.json()
        res.json({
            title: data.title || `YouTube Video (${videoId})`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            author: data.author_name || '',
        })
    } catch (err) {
        console.error('[oEmbed error]', err.message)
        res.json({
            title: `YouTube Video (${videoId})`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        })
    }
})

app.get('/health', (_, res) => {
    res.json({ status: 'ok', rooms: rooms.size })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
    console.log(`🎵 Nhạc Chung DPS Server running on http://localhost:${PORT}`)
})
