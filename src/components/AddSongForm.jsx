import { useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { extractYouTubeId, fetchYouTubeMeta } from '../utils/utils'
import { FaPlus, FaBolt, FaLink } from 'react-icons/fa'

export default function AddSongForm() {
    const { addToQueue, playNow } = useSocket()
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (mode) => {
        setError('')
        const videoId = extractYouTubeId(url.trim())
        if (!videoId) {
            setError('Link YouTube không hợp lệ. Vui lòng kiểm tra lại.')
            return
        }

        setLoading(true)
        try {
            const meta = await fetchYouTubeMeta(videoId)
            const payload = { youtubeId: videoId, title: meta.title, thumbnail: meta.thumbnail }
            if (mode === 'queue') addToQueue(payload)
            else playNow(payload)
            setUrl('')
        } catch {
            setError('Có lỗi xảy ra khi xử lý bài hát.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-white/30 transition-colors">
                <FaLink className="text-gray-500 flex-shrink-0 text-sm" />
                <input
                    type="text"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit('queue')}
                    placeholder="Dán link YouTube vào đây..."
                    disabled={loading}
                    className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
                />
                {url && (
                    <button onClick={() => { setUrl(''); setError('') }} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
                )}
            </div>

            <div className="flex gap-2">
                {/* Add to queue — brand color #151577 */}
                <button
                    onClick={() => handleSubmit('queue')}
                    disabled={loading || !url.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                     disabled:opacity-40 disabled:cursor-not-allowed
                     text-white text-sm font-semibold transition-all active:scale-95"
                    style={{ backgroundColor: '#151577' }}
                    onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#1c1c99' }}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#151577'}
                >
                    <FaPlus className="text-xs" />
                    {loading ? 'Đang xử lý...' : 'Thêm vào hàng chờ'}
                </button>

                {/* Play now — accent color #32B461 */}
                <button
                    onClick={() => handleSubmit('now')}
                    disabled={loading || !url.trim()}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                     disabled:opacity-40 disabled:cursor-not-allowed
                     text-white text-sm font-semibold transition-all active:scale-95"
                    style={{ backgroundColor: '#32B461' }}
                    onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#28a050' }}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#32B461'}
                >
                    <FaBolt className="text-xs" />
                    Phát ngay
                </button>
            </div>

            {error && <p className="text-red-400 text-xs px-1">⚠️ {error}</p>}
        </div>
    )
}
