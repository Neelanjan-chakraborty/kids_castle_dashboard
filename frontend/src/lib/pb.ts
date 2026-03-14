import PocketBase from 'pocketbase'

const PB_URL = import.meta.env.VITE_PB_URL || 'http://localhost:8090'

export const pb = new PocketBase(PB_URL)

// Disable auto-cancellation so concurrent requests don't cancel each other
pb.autoCancellation(false)

export default pb
