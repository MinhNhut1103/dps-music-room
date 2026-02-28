import { useRoom } from '../context/RoomContext'

export default function UserBadge() {
    const { currentUser } = useRoom()

    return (
        <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10">
            <span className="text-base leading-none">🐾</span>
            <span className="text-sm font-medium text-purple-300">{currentUser.name}</span>
        </div>
    )
}
