import { useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { FaTrash, FaArrowUp, FaPlay } from 'react-icons/fa'

function QueueItem({ item }) {
    const { removeFromQueue, prioritizeSong, playNow } = useSocket()

    return (
        <li className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/5 hover:border-white/20">
            <img
                src={item.thumbnail || `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`}
                alt={item.title}
                className="w-16 h-10 object-cover rounded-lg flex-shrink-0 bg-black"
            />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate leading-tight">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">🐾 {item.addedBy}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {/* Phát ngay — also passes songId so server removes it from queue */}
                <button
                    onClick={() => playNow({ youtubeId: item.youtubeId, title: item.title, thumbnail: item.thumbnail, songId: item.id })}
                    title="Phát ngay"
                    className="w-7 h-7 rounded-lg text-white flex items-center justify-center transition-colors"
                    style={{ backgroundColor: '#32B461' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#28a050'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#32B461'}
                >
                    <FaPlay className="text-xs ml-0.5" />
                </button>
                <button
                    onClick={() => prioritizeSong(item.id)}
                    title="Ưu tiên lên đầu"
                    className="w-7 h-7 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white flex items-center justify-center transition-colors"
                >
                    <FaArrowUp className="text-xs" />
                </button>
                <button
                    onClick={() => removeFromQueue(item.id)}
                    title="Xóa"
                    className="w-7 h-7 rounded-lg bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                >
                    <FaTrash className="text-xs" />
                </button>
            </div>
        </li>
    )
}

export default function QueueList() {
    const { queue } = useSocket()

    if (queue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-600">
                <span className="text-3xl">🎵</span>
                <p className="text-sm">Hàng chờ trống. Thêm bài để bắt đầu!</p>
            </div>
        )
    }

    return (
        <ul className="flex flex-col gap-2">
            {queue.map((item) => (
                <QueueItem key={item.id} item={item} />
            ))}
        </ul>
    )
}
