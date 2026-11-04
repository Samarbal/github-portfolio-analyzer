import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('uses the configured backend URL for both API requests', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://portfolio-api.onrender.com/')
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  vi.stubGlobal('fetch', fetchMock)
  const { lookupProfile, generateInsights } = await import('./api.js')

  await lookupProfile('octocat')
  await generateInsights('octocat', [1])

  expect(fetchMock.mock.calls[0][0]).toBe('https://portfolio-api.onrender.com/api/profile?input=octocat')
  expect(fetchMock.mock.calls[1][0]).toBe('https://portfolio-api.onrender.com/api/insights')
})
