import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Build configuration is supplied by the process, never local secret files.
  envDir: false,
  plugins: [react()],
  build: { rolldownOptions: { output: { codeSplitting: { groups: [
    { name: 'charts', test: /node_modules[\\/](recharts|recharts-scale|d3-|victory-vendor)/, priority: 20 },
    { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 40 },
  ] } } } },
})
