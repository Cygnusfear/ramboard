import { handleApi } from './routes'
import config from '../ramboard.config'

const server = Bun.serve({
  port: config.server.port,
  async fetch(req) {
    // API routes
    const apiResponse = await handleApi(req)
    if (apiResponse) return apiResponse

    // Not an API route — 404
    return new Response('Not Found', { status: 404 })
  },
})

console.log(`Ramboard API running on http://localhost:${server.port}`)
