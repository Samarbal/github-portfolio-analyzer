import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const analysis = {
  profile: { username: 'octocat', display_name: 'Octo Cat', avatar_url: null,
    profile_url: 'https://github.com/octocat', reported_public_repos: 101 },
  repositories: [{ id: 1, name: 'sample-api', url: 'https://github.com/octocat/sample-api',
    description: 'A public API', topics: ['api'], primary_language: 'Python', stars: 3,
    fork: true, created_at: '2024-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z',
    estimated_category: 'API or service' }],
  analyzed_count: 1, is_subset: true, repository_order: 'updated_desc',
  statistics: { stars_total: 3, primary_language_counts: { Python: 1 },
    latest_repository_update_at: '2025-01-02T00:00:00Z' },
  timeline: { entries: [{ repository_id: 1, name: 'sample-api',
    url: 'https://github.com/octocat/sample-api', created_at: '2024-01-02T00:00:00Z' }],
    omitted_missing_date_count: 0 },
  portfolio_overview: { category_counts: { 'Web app': 0, 'API or service': 1,
    'Data or AI': 0, 'Developer tool': 0, 'Mobile app': 0, Unclassified: 0 },
    analyzed_count: 1, factual_summary: 'Among 1 analyzed repositories, estimated categories are API or service: 1.',
    estimated: true },
}

it('loads a username, scopes facts, and shows the free estimated overview without AI', async () => {
  const requests = []
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    requests.push(url)
    return { ok: true, json: async () => analysis }
  }))
  render(<App />)
  fireEvent.change(screen.getByLabelText(/GitHub username or profile URL/i), { target: { value: 'octocat' } })
  fireEvent.click(screen.getByRole('button', { name: /Analyze profile/i }))
  expect(screen.getByText(/Loading profile/i)).toBeInTheDocument()
  expect(await screen.findByText('Octo Cat')).toBeInTheDocument()
  expect(screen.getByText(/1 of 101 public repositories analyzed/i)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Repository creation timeline/i })).toBeInTheDocument()
  expect(screen.getByText(/dates do not establish work duration or experience/i)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Portfolio Overview/i })).toBeInTheDocument()
  expect(screen.getByText(/Estimated classifications/i)).toBeInTheDocument()
  expect(screen.getByText(analysis.portfolio_overview.factual_summary)).toBeInTheDocument()
  expect(requests).toHaveLength(1)
  expect(requests[0]).toContain('/api/profile?input=octocat')
  expect(screen.queryByRole('button', { name: /Generate AI Insights/i })).not.toBeInTheDocument()
})

it('accepts a profile URL and displays a useful API error without stale results', async () => {
  let count = 0
  vi.stubGlobal('fetch', vi.fn(async () => {
    count += 1
    return count === 1
      ? { ok: true, json: async () => analysis }
      : { ok: false, json: async () => ({ code: 'PROFILE_NOT_FOUND', message: 'That GitHub profile was not found.' }) }
  }))
  render(<App />)
  const input = screen.getByLabelText(/GitHub username or profile URL/i)
  fireEvent.change(input, { target: { value: 'octocat' } })
  fireEvent.click(screen.getByRole('button', { name: /Analyze profile/i }))
  expect(await screen.findByText('Octo Cat')).toBeInTheDocument()
  fireEvent.change(input, { target: { value: 'https://github.com/nobody' } })
  fireEvent.click(screen.getByRole('button', { name: /Analyze profile/i }))
  expect(await screen.findByText('That GitHub profile was not found.')).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByText('Octo Cat')).not.toBeInTheDocument())
})
