// ============================================================
// Random Animal Name Generator
// ============================================================
const adjectives = [
    'Happy', 'Lazy', 'Brave', 'Clever', 'Fluffy', 'Grumpy',
    'Speedy', 'Mighty', 'Tiny', 'Wild', 'Gentle', 'Fierce',
    'Jolly', 'Silly', 'Swift', 'Golden', 'Silver', 'Cosmic',
    'Hungry', 'Sneaky', 'Bouncy', 'Dizzy', 'Funky', 'Groovy',
];

const animals = [
    'Tiger', 'Lion', 'Eagle', 'Panda', 'Dolphin', 'Penguin',
    'Koala', 'Cheetah', 'Owl', 'Fox', 'Wolf', 'Bear',
    'Rabbit', 'Deer', 'Elephant', 'Gorilla', 'Parrot', 'Falcon',
    'Otter', 'Lynx', 'Jaguar', 'Peacock', 'Flamingo', 'Toucan',
];

export function generateAnimalName() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    return `${adj} ${animal}`;
}

// ============================================================
// YouTube ID Extractor
// ============================================================
export function extractYouTubeId(url) {
    if (!url) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// ============================================================
// Fetch YouTube video metadata via server-side proxy
// (avoids CORS/401 issues when calling oEmbed from browser)
// ============================================================
export async function fetchYouTubeMeta(videoId) {
    try {
        const res = await fetch(`/api/youtube-meta?videoId=${videoId}`)
        if (!res.ok) throw new Error('Server meta fetch failed')
        const data = await res.json()
        return {
            title: data.title || `YouTube Video (${videoId})`,
            thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            author: data.author || '',
        }
    } catch {
        return {
            title: `YouTube Video (${videoId})`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            author: '',
        }
    }
}
