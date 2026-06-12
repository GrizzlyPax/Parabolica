import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Stamped at build time; shown next to the version in the main menu so a
    // deploy is grokkable at a glance ("yeah, that's this morning's push").
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
