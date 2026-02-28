import { useSocket } from '../context/SocketContext'

export default function UsersList() {
    const { users, currentUser, connected } = useSocket()

    return (
        <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    👥 Đang nghe
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'animate-pulse' : 'bg-red-500'}`}
                        style={connected ? { backgroundColor: '#32B461' } : {}} />
                    <span className="text-xs text-gray-500">{users.length} người</span>
                </div>
            </div>

            <ul className="flex flex-col gap-2">
                {users.map((user) => (
                    <li
                        key={user.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors
              ${user.id === currentUser?.id ? 'border' : 'bg-white/5'}`}
                        style={user.id === currentUser?.id ? {
                            backgroundColor: 'rgba(21,21,119,0.3)',
                            borderColor: 'rgba(21,21,119,0.6)',
                        } : {}}
                    >
                        <span className="text-base leading-none">🐾</span>
                        <span className="text-sm text-white font-medium flex-1 truncate">{user.name}</span>
                        {user.id === currentUser?.id && (
                            <span className="text-xs font-semibold" style={{ color: '#32B461' }}>Bạn</span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}
