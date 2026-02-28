import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { generateAnimalName } from '../utils/utils'
import { v4 as uuidv4 } from 'uuid'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LocalStorage keys
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LS_STATE = 'music_room_state'     // { nowPlaying, isPlaying, queue }
const LS_USER = 'music_user'           // { id, name }
const BC_CHANNEL = 'music_room_bc'       // BroadcastChannel name

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const defaultState = () => ({
    nowPlaying: null,   // { id, title } | null
    isPlaying: false,
    queue: [],          // [{ id, youtube_id, title, thumbnail, added_by, position }]
})

function loadState() {
    try {
        const raw = localStorage.getItem(LS_STATE)
        return raw ? JSON.parse(raw) : defaultState()
    } catch {
        return defaultState()
    }
}

function saveState(state) {
    localStorage.setItem(LS_STATE, JSON.stringify(state))
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const RoomContext = createContext(null)

export function RoomProvider({ children }) {
    // ── Current user (persisted in sessionStorage) ──────
    const [currentUser] = useState(() => {
        const saved = sessionStorage.getItem(LS_USER)
        if (saved) return JSON.parse(saved)
        const user = { id: uuidv4(), name: generateAnimalName() }
        sessionStorage.setItem(LS_USER, JSON.stringify(user))
        return user
    })

    // ── Room state ───────────────────────────────────────
    const [roomState, setRoomState] = useState(loadState)

    // BroadcastChannel ref for cross-tab sync
    const bcRef = useRef(null)

    // ── Setup BroadcastChannel ───────────────────────────
    useEffect(() => {
        const bc = new BroadcastChannel(BC_CHANNEL)
        bcRef.current = bc

        // Receive state updates from other tabs
        bc.onmessage = (event) => {
            if (event.data?.type === 'STATE_UPDATE') {
                setRoomState(event.data.state)
            }
        }

        return () => bc.close()
    }, [])

    // ── Listen to localStorage changes (same-tab safety) ─
    useEffect(() => {
        const handler = (e) => {
            if (e.key === LS_STATE && e.newValue) {
                try {
                    setRoomState(JSON.parse(e.newValue))
                } catch { }
            }
        }
        window.addEventListener('storage', handler)
        return () => window.removeEventListener('storage', handler)
    }, [])

    // ── Helper: commit state change ──────────────────────
    const commit = useCallback((updater) => {
        setRoomState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            saveState(next)
            // Broadcast to other tabs
            bcRef.current?.postMessage({ type: 'STATE_UPDATE', state: next })
            return next
        })
    }, [])

    // ── Actions ──────────────────────────────────────────
    const addToQueue = useCallback(({ youtubeId, title, thumbnail }) => {
        commit((prev) => {
            const maxPos = prev.queue.length > 0
                ? Math.max(...prev.queue.map((q) => q.position))
                : 0
            const newItem = {
                id: uuidv4(),
                youtube_id: youtubeId,
                title,
                thumbnail,
                added_by: currentUser.name,
                position: maxPos + 1,
            }
            return { ...prev, queue: [...prev.queue, newItem] }
        })
    }, [commit, currentUser.name])

    const playNow = useCallback(({ youtubeId, title }) => {
        commit((prev) => ({
            ...prev,
            nowPlaying: { id: youtubeId, title },
            isPlaying: true,
        }))
    }, [commit])

    const togglePlay = useCallback(() => {
        commit((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
    }, [commit])

    const skipSong = useCallback(() => {
        commit((prev) => {
            const sorted = [...prev.queue].sort((a, b) => a.position - b.position)
            if (sorted.length === 0) {
                return { ...prev, nowPlaying: null, isPlaying: false }
            }
            const [next, ...rest] = sorted
            return {
                ...prev,
                nowPlaying: { id: next.youtube_id, title: next.title },
                isPlaying: true,
                queue: rest,
            }
        })
    }, [commit])

    const deleteFromQueue = useCallback((id) => {
        commit((prev) => ({
            ...prev,
            queue: prev.queue.filter((q) => q.id !== id),
        }))
    }, [commit])

    const prioritizeSong = useCallback((id) => {
        commit((prev) => {
            const minPos = prev.queue.length > 0
                ? Math.min(...prev.queue.map((q) => q.position))
                : 0
            return {
                ...prev,
                queue: prev.queue.map((q) =>
                    q.id === id ? { ...q, position: minPos - 1 } : q
                ),
            }
        })
    }, [commit])

    const updateTitle = useCallback((id, newTitle) => {
        commit((prev) => ({
            ...prev,
            queue: prev.queue.map((q) =>
                q.id === id ? { ...q, title: newTitle } : q
            ),
        }))
    }, [commit])

    // ── Sorted queue for consumers ───────────────────────
    const sortedQueue = [...roomState.queue].sort((a, b) => a.position - b.position)

    return (
        <RoomContext.Provider
            value={{
                currentUser,
                nowPlaying: roomState.nowPlaying,
                isPlaying: roomState.isPlaying,
                queue: sortedQueue,
                roomReady: true,      // localStorage is always ready instantly
                addToQueue,
                playNow,
                togglePlay,
                skipSong,
                deleteFromQueue,
                prioritizeSong,
                updateTitle,
            }}
        >
            {children}
        </RoomContext.Provider>
    )
}

export function useRoom() {
    const ctx = useContext(RoomContext)
    if (!ctx) throw new Error('useRoom must be used inside RoomProvider')
    return ctx
}
