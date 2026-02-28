import { useState } from 'react'
import { useSocket } from '../context/SocketContext'
import VideoPlayer from '../components/VideoPlayer'
import QueueList from '../components/QueueList'
import AddSongForm from '../components/AddSongForm'
import UsersList from '../components/UsersList'
import { FaCopy, FaCheck, FaPlay } from 'react-icons/fa'

export default function Room({ roomId }) {
    const { currentUser, connected, queue } = useSocket()
    const [copied, setCopied] = useState(false)
    const [hasJoined, setHasJoined] = useState(false)

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Ensure user interacts with DOM before loading VideoPlayer to bypass browser autoplay restrictions
    if (!hasJoined) {
        return (
            <div className="app-bg min-h-screen flex items-center justify-center p-4">
                <div className="glass rounded-2xl p-8 max-w-sm w-full text-center flex flex-col items-center">
                    <img
                        src="https://dps.media/wp-content/uploads/2023/08/dpsmedia.svg"
                        alt="DPS Media"
                        className="h-10 w-auto mb-6"
                        style={{ filter: 'brightness(0) invert(1)' }}
                    />
                    <h1 className="text-xl font-bold text-white mb-2">Phòng nghe nhạc chung</h1>
                    <p className="text-gray-400 text-sm mb-8">Trình duyệt yêu cầu tương tác trang để tự khởi động âm thanh.</p>

                    <button
                        onClick={() => setHasJoined(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold shadow-lg transition-all active:scale-95 text-base"
                        style={{ backgroundColor: '#32B461' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#28a050'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#32B461'}
                    >
                        <FaPlay className="text-sm" />
                        Tham gia phòng
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="app-bg min-h-screen">
            {/* ── Header ── */}
            <header className="sticky top-0 z-50 glass border-b border-white/5">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <img
                            src="https://dps.media/wp-content/uploads/2023/08/dpsmedia.svg"
                            alt="DPS Media"
                            className="h-8 w-auto"
                            style={{ filter: 'brightness(0) invert(1)' }}
                        />
                        <div className="hidden sm:block w-px h-6 bg-white/10" />
                        <div className="hidden sm:block">
                            <p className="text-xs font-semibold text-white leading-none">Nhạc Chung</p>
                            <p className="text-xs text-gray-500 font-mono truncate max-w-[160px] mt-0.5">{roomId.slice(0, 8)}…</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Connection indicator */}
                        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${connected
                            ? 'text-white bg-[#32B461]/30 border border-[#32B461]/40'
                            : 'text-white bg-red-600/30 border border-red-500/40'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#32B461] animate-pulse' : 'bg-red-400'}`} />
                            {connected ? 'Online' : 'Offline'}
                        </div>

                        {/* User badge */}
                        {currentUser && (
                            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10">
                                <span className="text-base leading-none">🐾</span>
                                <span className="text-sm font-medium text-white hidden sm:inline">{currentUser.name}</span>
                            </div>
                        )}

                        {/* Copy room link */}
                        <button
                            onClick={copyLink}
                            title="Sao chép link phòng"
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-full px-3 py-1.5 border border-white/10 text-sm text-gray-300 transition-colors"
                        >
                            {copied ? <FaCheck className="text-[#32B461] text-xs" /> : <FaCopy className="text-xs" />}
                            <span className="hidden sm:inline">{copied ? 'Đã copy!' : 'Chia sẻ'}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left */}
                    <div className="flex-1 flex flex-col gap-5 min-w-0">
                        <section className="glass rounded-2xl p-4">
                            <VideoPlayer />
                        </section>

                        <section className="glass rounded-2xl p-4">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">➕ Thêm bài hát</h2>
                            <AddSongForm />
                        </section>

                        <section className="glass rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">🎶 Hàng chờ</h2>
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium text-white"
                                    style={{ backgroundColor: 'rgba(21,21,119,0.6)' }}>
                                    {queue.length} bài
                                </span>
                            </div>
                            <div className="max-h-[50vh] overflow-y-auto pr-1">
                                <QueueList />
                            </div>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:w-56 xl:w-64 flex-shrink-0">
                        <div className="lg:sticky lg:top-24">
                            <UsersList />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    )
}
