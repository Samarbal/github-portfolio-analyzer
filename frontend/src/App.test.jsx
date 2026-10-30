import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App.jsx'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('switches themes with a focusable button and saves an explicit preference', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  render(<App />)
  const toggle = screen.getByRole('button', { name: 'Switch to dark mode' })
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  toggle.focus()
  expect(toggle).toHaveFocus()
  fireEvent.click(toggle)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem('portfolio-analyzer-theme')).toBe('dark')
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute('aria-pressed', 'true')
})

it('restores a saved theme across renders', () => {
  localStorage.setItem('portfolio-analyzer-theme', 'dark')
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  const view = render(<App />)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  view.unmount()
  render(<App />)
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument()
})

it('uses the system preference when no explicit theme is saved', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  render(<App />)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem('portfolio-analyzer-theme')).toBeNull()
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

const selectionAnalysis = {
  ...analysis,
  repositories: [
    ...analysis.repositories,
    { ...analysis.repositories[0], id: 2, name: 'site-dashboard',
      description: 'A website dashboard', estimated_category: 'Web app', primary_language: 'JavaScript',
      url: 'https://github.com/octocat/site-dashboard' },
    { ...analysis.repositories[0], id: 3, name: 'mystery-project',
      description: null, estimated_category: 'Unclassified', primary_language: null,
      url: 'https://github.com/octocat/mystery-project' },
    { ...analysis.repositories[0], id: 4, name: 'data-analysis',
      description: 'Data analysis', estimated_category: 'Data or AI',
      url: 'https://github.com/octocat/data-analysis' },
  ],
  analyzed_count: 4,
  portfolio_overview: { ...analysis.portfolio_overview,
    analyzed_count: 4,
    category_counts: { 'Web app': 1, 'API or service': 1, 'Data or AI': 1,
      'Developer tool': 0, 'Mobile app': 0, Unclassified: 1 },
    factual_summary: 'Among 4 analyzed repositories, estimated categories are Web app: 1, API or service: 1, Data or AI: 1, Unclassified: 1.' },
}

async function loadSelectionProfile() {
  fireEvent.change(screen.getByLabelText(/GitHub username or profile URL/i), { target: { value: 'octocat' } })
  fireEvent.click(screen.getByRole('button', { name: /Analyze profile/i }))
  await screen.findByRole('checkbox', { name: /Select sample-api/i })
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
  const timeline = screen.getByRole('heading', { name: /Repository creation timeline/i }).closest('details')
  expect(timeline).not.toHaveAttribute('open')
  fireEvent.click(screen.getByText('Repository creation timeline'))
  expect(timeline).toHaveAttribute('open')
  expect(screen.getByText(/dates do not establish work duration or experience/i)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Portfolio Overview/i })).toBeInTheDocument()
  expect(screen.getByText(/Estimated classifications/i)).toBeInTheDocument()
  expect(screen.getByText(analysis.portfolio_overview.factual_summary)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'AI Insights' })).toBeInTheDocument()
  expect(screen.getByText(/Select up to three repositories to prepare/i)).toBeInTheDocument()
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

it('selects up to three, blocks a fourth, and permits deselection and replacement without extra requests', async () => {
  const requests = []
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    requests.push(url)
    return { ok: true, json: async () => selectionAnalysis }
  }))
  render(<App />)
  await loadSelectionProfile()
  const first = screen.getByRole('checkbox', { name: /Select sample-api/i })
  fireEvent.click(first)
  fireEvent.click(screen.getByRole('button', { name: /Web app.*1/i }))
  const second = screen.getByRole('checkbox', { name: /Select site-dashboard/i })
  fireEvent.click(second)
  fireEvent.click(screen.getByRole('button', { name: /Unclassified.*1/i }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Select mystery-project/i }))
  expect(screen.getByText(/3\/3 selected/i)).toBeInTheDocument()
  expect(screen.getByText('sample-api', { selector: '.selected-name' })).toBeInTheDocument()
  expect(screen.getByText('site-dashboard', { selector: '.selected-name' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Data or AI.*1/i }))
  const fourth = screen.getByRole('checkbox', { name: /Select data-analysis/i })
  expect(fourth).toBeDisabled()
  expect(requests).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: /Web app.*1/i }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Select site-dashboard/i }))
  expect(screen.getByText(/2\/3 selected/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Data or AI.*1/i }))
  const replacement = screen.getByRole('checkbox', { name: /Select data-analysis/i })
  expect(replacement).not.toBeDisabled()
  fireEvent.click(replacement)
  expect(replacement).toBeChecked()
  expect(screen.getByText('data-analysis', { selector: '.selected-name' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Generate AI Insights/i })).not.toBeInTheDocument()
  expect(requests).toHaveLength(1)
})

it('clears the old profile selection when a new lookup starts', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => selectionAnalysis })))
  render(<App />)
  await loadSelectionProfile()
  fireEvent.click(screen.getByRole('checkbox', { name: /Select sample-api/i }))
  expect(screen.getByText(/1\/3 selected/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Analyze profile/i }))
  await waitFor(() => expect(screen.getByText(/0\/3 selected/i)).toBeInTheDocument())
  expect(screen.getByRole('checkbox', { name: /Select sample-api/i })).not.toBeChecked()
  expect(screen.getByText(/Select up to three repositories to prepare/i)).toBeInTheDocument()
})

it('searches by repository name and filters without hiding Unclassified or clearing selections', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => selectionAnalysis })))
  render(<App />)
  await loadSelectionProfile()
  fireEvent.click(screen.getByRole('checkbox', { name: /Select sample-api/i }))
  fireEvent.change(screen.getByLabelText(/Search repositories/i), { target: { value: 'DASH' } })
  expect(screen.getByRole('checkbox', { name: /Select site-dashboard/i })).toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: /Select sample-api/i })).not.toBeInTheDocument()
  expect(screen.getByText(/1\/3 selected/i)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/Search repositories/i), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: /Unclassified.*1/i }))
  expect(screen.getByRole('checkbox', { name: /Select mystery-project/i })).toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: /Select site-dashboard/i })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /All.*4/i }))
  expect(screen.getByRole('checkbox', { name: /Select sample-api/i })).toBeChecked()
  expect(screen.getByText(/4 repositories shown/i)).toBeInTheDocument()
})

it('shows an empty search result and lets the timeline collapse again', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => selectionAnalysis })))
  render(<App />)
  await loadSelectionProfile()
  fireEvent.change(screen.getByLabelText(/Search repositories/i), { target: { value: 'no-match' } })
  expect(screen.getByText(/No repositories match/i)).toBeInTheDocument()
  const summary = screen.getByText('Repository creation timeline')
  const timeline = summary.closest('details')
  fireEvent.click(summary)
  expect(timeline).toHaveAttribute('open')
  fireEvent.click(summary)
  expect(timeline).not.toHaveAttribute('open')
})
