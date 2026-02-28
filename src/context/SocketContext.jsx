import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SocketContext = createContext(null)

export function SocketProvider({ roomId, children }) {
    const socketRef = useRef(null)

    const [connected, setConnected] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [currentSong, setCurrentSong] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [queue, setQueue] = useState([])
    const [users, setUsers] = useState([])

    // ── Connect & setup listeners ────────────────────────
    useEffect(() => {
        if (!roomId) return

        // In production on Vercel, this should point to your Node.js backend URL
        const serverUrl = import.meta.env.VITE_SERVER_URL || '/'
        const socket = io(serverUrl, { transports: ['websocket', 'polling'] })
        socketRef.current = socket

        socket.on('connect', () => {
            setConnected(true)
            socket.emit('join_room', { roomId })
        })

        socket.on('disconnect', () => setConnected(false))

        // Full state on join / rejoin (F5)
        socket.on('room_state', ({ currentSong, queue, users, myUser }) => {
            setCurrentSong(currentSong)
            setIsPlaying(currentSong?.isPlaying ?? false)
            setQueue(queue)
            setUsers(users)
            setCurrentUser(myUser)
        })

        socket.on('playback_changed', (song) => {
            setCurrentSong(song)
            setIsPlaying(song?.isPlaying ?? false)
        })

        socket.on('queue_updated', (q) => setQueue(q))
        socket.on('users_updated', (u) => setUsers(u))

        return () => {
            socket.disconnect()
            socketRef.current = null
        }
    }, [roomId])

    // ── Actions ──────────────────────────────────────────
    const emit = useCallback((event, data) => {
        socketRef.current?.emit(event, { roomId, ...data })
    }, [roomId])

    const addToQueue = useCallback(({ youtubeId, title, thumbnail }) => {
        emit('add_to_queue', { youtubeId, title, thumbnail })
    }, [emit])

    const playNow = useCallback(({ youtubeId, title, thumbnail, songId }) => {
        emit('play_now', { youtubeId, title, thumbnail, songId })
    }, [emit])

    const togglePlay = useCallback(() => {
        emit('toggle_play', {})
    }, [emit])

    const skipSong = useCallback(() => {
        emit('skip_song', {})
    }, [emit])

    const songEnded = useCallback(() => {
        emit('song_ended', {})
    }, [emit])

    const removeFromQueue = useCallback((songId) => {
        emit('remove_from_queue', { songId })
    }, [emit])

    const prioritizeSong = useCallback((songId) => {
        emit('prioritize_song', { songId })
    }, [emit])

    return (
        <SocketContext.Provider
            value={{
                connected,
                currentUser,
                currentSong,
                isPlaying,
                queue,
                users,
                // actions
                addToQueue,
                playNow,
                togglePlay,
                skipSong,
                songEnded,
                removeFromQueue,
                prioritizeSong,
            }}
        >
            {children}
        </SocketContext.Provider>
    )
}

export function useSocket() {
    const ctx = useContext(SocketContext)
    if (!ctx) throw new Error('useSocket must be used inside SocketProvider')
    return ctx
}
