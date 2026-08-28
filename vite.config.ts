import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import https from 'node:https'

/**
 * /kreta/{instituteCode}/path → https://{instituteCode}.e-kreta.hu/path
 * Dinamikus host, mert minden iskolának saját subdomainje van.
 */
function kretaInstituteProxy(): Plugin {
  return {
    name: 'kreta-institute-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/kreta/')) {
          next()
          return
        }

        const match = url.match(/^\/kreta\/([^/?]+)(\/.*)?(\?.*)?$/)
        if (!match) {
          res.statusCode = 400
          res.end('Invalid /kreta/ URL')
          return
        }

        const institute = match[1]
        const pathPart = match[2] || '/'
        const query = match[3] || ''
        const targetPath = pathPart + query
        const targetHost = `${institute}.e-kreta.hu`

        const headers: Record<string, string | string[] | undefined> = {
          ...req.headers,
          host: targetHost,
        }
        delete headers['origin']
        delete headers['referer']

        const proxyReq = https.request(
          {
            hostname: targetHost,
            path: targetPath,
            method: req.method,
            headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
            proxyRes.pipe(res)
          }
        )

        proxyReq.on('error', (err) => {
          console.error('[kreta-proxy]', targetHost + targetPath, err.message)
          if (!res.headersSent) {
            res.statusCode = 502
            res.end(`Proxy error: ${err.message}`)
          }
        })

        req.pipe(proxyReq)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), kretaInstituteProxy()],
  server: {
    proxy: {
      // e-KRÉTA Identity Provider
      '/idp': {
        target: 'https://idp.e-kreta.hu',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/idp/, ''),
      },
      // Saját / közösségi intézménylista
      '/sulinet': {
        target: 'https://sulinet.site.je',
        changeOrigin: true,
        secure: true,
        timeout: 15000,
        proxyTimeout: 15000,
        rewrite: (path) => path.replace(/^\/sulinet/, ''),
      },
      // Intézménylista (új publikus API)
      '/global': {
        target: 'https://kretaglobalapi.e-kreta.hu',
        changeOrigin: true,
        secure: true,
        timeout: 15000,
        proxyTimeout: 15000,
        rewrite: (path) => path.replace(/^\/global/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[proxy /global]', err.message)
            if (res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'text/plain' })
              res.end('Institute list proxy error')
            }
          })
        },
      },
      // Intézménylista (mobil API tartalék)
      '/global-mobile': {
        target: 'https://kretaglobalmobileapi2.ekreta.hu',
        changeOrigin: true,
        secure: true,
        timeout: 15000,
        proxyTimeout: 15000,
        rewrite: (path) => path.replace(/^\/global-mobile/, ''),
      },
      '/global-mobile-old': {
        target: 'https://kretaglobalmobileapi.ekreta.hu',
        changeOrigin: true,
        secure: true,
        timeout: 15000,
        proxyTimeout: 15000,
        rewrite: (path) => path.replace(/^\/global-mobile-old/, ''),
      },
    },
  },
})
