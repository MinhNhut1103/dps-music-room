import { useMemo, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { SocketProvider } from './context/SocketContext'
import Room from './pages/Room'
import './index.css'

export default function App() {
  // ── Extract or create roomId from URL path ──────────
  const roomId = useMemo(() => {
    const match = window.location.pathname.match(/^\/room\/([a-zA-Z0-9_-]+)$/)
    if (match) return match[1]

    // First visit: create a new room and redirect
    const newId = uuidv4()
    window.history.replaceState(null, '', `/room/${newId}`)
    return newId
  }, [])

  // Keep page title updated
  useEffect(() => {
    document.title = `Nhạc Chung DPS 🎵`
  }, [])

  return (
    <SocketProvider roomId={roomId}>
      <Room roomId={roomId} />
    </SocketProvider>
  )
}
