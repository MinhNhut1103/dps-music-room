import { useRef, useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import { FaPlay, FaPause, FaForward, FaMusic } from 'react-icons/fa'

// ─────────────────────────────────────────────────────────
// YouTube IFrame API loader (singleton)
// ─────────────────────────────────────────────────────────
let ytApiLoaded = false
let ytApiReady = false
const ytReadyCallbacks = []

function loadYouTubeAPI() {
    if (ytApiLoaded) return
    ytApiLoaded = true
    window.onYouTubeIframeAPIReady = () => {
        ytApiReady = true
        ytReadyCallbacks.forEach((cb) => cb())
        ytReadyCallbacks.length = 0
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
}
function onYTReady(cb) {
    if (ytApiReady) cb()
    else ytReadyCallbacks.push(cb)
}

// ─────────────────────────────────────────────────────────
// Calculate how many seconds into the song we are right now
// Works correctly whether the song is playing or paused.
// ─────────────────────────────────────────────────────────
function calcElapsedSeconds(song) {
    if (!song) return 0
    if (!song.isPlaying) {
        // Paused — server stored pausedElapsedMs
        return Math.max(0, (song.pausedElapsedMs || 0) / 1000)
    }
    // Playing — elapsed = now - startTime
    return Math.max(0, (Date.now() - (song.startTime || Date.now())) / 1000)
}

// ─────────────────────────────────────────────────────────
export default function VideoPlayer() {
    const { currentSong, isPlaying, togglePlay, skipSong, songEnded, queue } = useSocket()
    const containerRef = useRef(null)
    const playerRef = useRef(null)
    const lastSongIdRef = useRef(null)
    const endedSentRef = useRef(false)

    useEffect(() => { loadYouTubeAPI() }, [])

    // ── Create player when song changes ──────────────────
    useEffect(() => {
        if (!currentSong || !containerRef.current) return
        if (lastSongIdRef.current === currentSong.id) return
        lastSongIdRef.current = currentSong.id
        endedSentRef.current = false

        const elapsedSeconds = calcElapsedSeconds(currentSong)

        const createPlayer = () => {
            if (playerRef.current) {
                try { playerRef.current.destroy() } catch { }
                playerRef.current = null
            }

            playerRef.current = new window.YT.Player(containerRef.current, {
                videoId: currentSong.youtubeId,
                width: '100%',
                height: '100%',
                playerVars: {
                    autoplay: currentSong.isPlaying ? 1 : 0,
                    controls: 0,          // ← hide controls so nobody can scrub
                    disablekb: 1,         // ← disable keyboard shortcuts
                    fs: 0,                // ← disable fullscreen button
                    modestbranding: 1,
                    rel: 0,
                    start: Math.floor(elapsedSeconds),
                    iv_load_policy: 3,    // hide video annotations
                },
                events: {
                    onReady(event) {
                        // Precise seek after player is ready to compensate for startup delay
                        const currentElapsed = calcElapsedSeconds(currentSong)
                        if (currentElapsed > 1) {
                            event.target.seekTo(currentElapsed, true)
                        }
                        if (!currentSong.isPlaying) {
                            event.target.pauseVideo()
                        }
                    },
                    onStateChange(event) {
                        // YT.PlayerState.ENDED = 0
                        if (event.data === 0 && !endedSentRef.current) {
                            endedSentRef.current = true
                            songEnded()
                        }
                    },
                },
            })
        }

        onYTReady(createPlayer)
    }, [currentSong?.id])

    // ── Sync play/pause to existing player ───────────────
    useEffect(() => {
        if (!playerRef.current) return
        try {
            if (isPlaying) playerRef.current.playVideo?.()
            else playerRef.current.pauseVideo?.()
        } catch { }
    }, [isPlaying])

    // ── Cleanup ───────────────────────────────────────────
    useEffect(() => {
        return () => { try { playerRef.current?.destroy() } catch { } }
    }, [])

    return (
        <div className="flex flex-col gap-4">
            {/* Player — pointer-events blocked so nobody can click on the iframe directly */}
            <div
                className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl shadow-purple-900/40"
                style={{ aspectRatio: '16/9' }}
            >
                {currentSong ? (
                    <>
                        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
                        {/* Transparent overlay to block direct iframe interaction */}
                        <div className="absolute inset-0 cursor-default" style={{ pointerEvents: 'none' }} />
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                            <FaMusic className="text-4xl text-purple-400/50" />
                        </div>
                        <p className="text-base font-medium text-gray-400">Chưa có bài hát nào đang phát</p>
                        <p className="text-sm text-gray-600">Dán link YouTube bên dưới để bắt đầu</p>
                    </div>
                )}
            </div>

            {/* Now playing + Controls */}
            <div className="flex items-center justify-between gap-4 px-1">
                <div className="flex-1 min-w-0">
                    {currentSong ? (
                        <>
                            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#32B461' }}>Đang phát</p>
                            <p className="text-white font-semibold text-base truncate">{currentSong.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">🐾 {currentSong.addedBy}</p>
                        </>
                    ) : (
                        <p className="text-gray-500 text-sm">Không có bài nào đang phát</p>
                    )}
                </div>

                {/* Our custom controls — these go through Socket.io so all clients sync */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        disabled={!currentSong}
                        className="w-12 h-12 rounded-full disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-lg transition-all duration-200 active:scale-95"
                        style={{ backgroundColor: '#151577' }}
                        onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#1c1c99' }}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#151577'}
                    >
                        {isPlaying ? <FaPause className="text-sm" /> : <FaPlay className="text-sm ml-0.5" />}
                    </button>

                    <button
                        onClick={skipSong}
                        disabled={!currentSong && queue.length === 0}
                        title="Bỏ qua"
                        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed
                       flex items-center justify-center text-white transition-all duration-200 active:scale-95"
                    >
                        <FaForward className="text-sm" />
                    </button>
                </div>
            </div>
        </div>
    )
}
