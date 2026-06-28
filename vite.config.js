import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'], // Ensure your icon is in the public folder
      manifest: {
        name: 'Mecora Software',
        short_name: 'Mecora',
        description: 'Inventory and Sales Management',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/favicon.png', 
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})