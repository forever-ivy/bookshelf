import config from './vite.config'

describe('vite build chunking', () => {
  it('keeps a real manual chunk strategy instead of only raising the warning threshold', () => {
    const buildConfig = config.build

    expect(buildConfig?.chunkSizeWarningLimit ?? 500).toBeLessThanOrEqual(500)
    expect(buildConfig?.rollupOptions?.output).toBeDefined()

    const output = Array.isArray(buildConfig?.rollupOptions?.output)
      ? buildConfig?.rollupOptions?.output[0]
      : buildConfig?.rollupOptions?.output

    expect(output).toBeDefined()
    expect(typeof output?.manualChunks).toBe('function')

    const manualChunks = output?.manualChunks as (id: string) => string | undefined

    expect(manualChunks('/virtual/node_modules/react/index.js')).toBe('vendor-react')
    expect(manualChunks('/virtual/node_modules/react-router-dom/index.js')).toBe('vendor-router')
    expect(manualChunks('/virtual/node_modules/@tanstack/react-query/build/index.js')).toBe('vendor-data')
    expect(manualChunks('/virtual/node_modules/framer-motion/dist/es/index.mjs')).toBe('vendor-motion')
    expect(manualChunks('/virtual/node_modules/recharts/es6/index.js')).toBe('vendor-charts')
  })
})
