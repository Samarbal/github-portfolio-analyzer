import { useEffect, useRef, useState } from 'react'
import { generateInsights, lookupProfile } from './api.js'

const categories = ['All', 'Web app', 'API or service', 'Data or AI', 'Developer tool', 'Mobile app', 'Unclassified']
const themeKey = 'portfolio-analyzer-theme'

function initialTheme() {
  try {
    const saved = window.localStorage.getItem(themeKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Storage may be unavailable in a private browser context. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function dateLabel(value) {
  return value ? value.slice(0, 10) : 'Unavailable'
}

function EvidenceLinks({ ids, references }) {
  return <span className="evidence-links">Evidence: {ids.map((id, index) => {
    const reference = references.find(item => item.id === id)
    return <span key={id}>{index > 0 && ', '}<a href={reference.url} target="_blank" rel="noreferrer">
      {reference.kind === 'readme' ? 'README' : 'Repository'} {reference.repository_id} ↗
    </a></span>
  })}</span>
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme)
  const [input, setInput] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [insight, setInsight] = useState(null)
  const [insightError, setInsightError] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)
  const generationVersion = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { window.localStorage.setItem(themeKey, next) } catch { /* Keep the toggle usable without storage. */ }
  }

  async function submit(event) {
    event.preventDefault()
    generationVersion.current += 1
    setAnalysis(null)
    setSelectedIds([])
    setSearch('')
    setCategory('All')
    setInsight(null)
    setInsightError('')
    setInsightLoading(false)
    setError('')
    setLoading(true)
    try {
      setAnalysis(await lookupProfile(input.trim()))
    } catch (failure) {
      setError(failure.message || 'Profile lookup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelection(id) {
    generationVersion.current += 1
    setInsight(null)
    setInsightError('')
    setInsightLoading(false)
    setSelectedIds(current => current.includes(id)
      ? current.filter(selectedId => selectedId !== id)
      : current.length < 3 ? [...current, id] : current)
  }

  async function requestInsights() {
    if (!profile || selectedIds.length < 1 || selectedIds.length > 3 || insightLoading) return
    const version = ++generationVersion.current
    setInsight(null)
    setInsightError('')
    setInsightLoading(true)
    try {
      const result = await generateInsights(profile.username, selectedIds)
      if (version === generationVersion.current) setInsight(result)
    } catch (failure) {
      if (version === generationVersion.current) setInsightError(failure.message || 'AI insights are unavailable.')
    } finally {
      if (version === generationVersion.current) setInsightLoading(false)
    }
  }

  const profile = analysis?.profile
  const stats = analysis?.statistics
  const overview = analysis?.portfolio_overview
  const languageCounts = Object.entries(stats?.primary_language_counts || {})
  const selectedRepositories = analysis?.repositories.filter(repository => selectedIds.includes(repository.id)) || []
  const visibleRepositories = analysis?.repositories.filter(repository =>
    (category === 'All' || repository.estimated_category === category) &&
    repository.name.toLowerCase().includes(search.trim().toLowerCase())
  ) || []

  return <main className="page">
    <header className="dashboard-header">
      <div className="header-copy">
        <div className="header-title-row">
          <div>
            <p className="eyebrow">Public GitHub portfolio dashboard</p>
            <h1>GitHub Portfolio Analyzer</h1>
            <p>Explore repository facts, estimated project categories, and project history.</p>
          </div>
          <button className="theme-toggle" type="button" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </div>
      <form onSubmit={submit} className="lookup">
        <label htmlFor="profile-input">GitHub username or profile URL</label>
        <div className="lookup-row">
          <input id="profile-input" value={input} onChange={event => setInput(event.target.value)}
            placeholder="octocat or https://github.com/octocat" />
          <button type="submit" disabled={loading}>Analyze profile</button>
        </div>
      </form>
    </header>

    {loading && <p role="status" className="status-banner">Loading profile…</p>}
    {error && <p role="alert" className="error">{error}</p>}

    <div className="dashboard-grid">
      <div className="main-column">
        {analysis ? <>
          <section className="card profile-card">
            <div className="profile-top">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="avatar" />
                : <div className="avatar avatar-fallback" aria-hidden="true">{profile.username.slice(0, 1).toUpperCase()}</div>}
              <div>
                <p className="section-kicker">Public profile</p>
                <h2>{profile.display_name || profile.username}</h2>
                <a href={profile.profile_url} target="_blank" rel="noreferrer">@{profile.username} on GitHub ↗</a>
              </div>
            </div>
            <p className="scope-copy">{analysis.analyzed_count} of {profile.reported_public_repos} public repositories analyzed. Up to 100 public repositories are included, ordered by most recent update; public forks are included.</p>
            {analysis.is_subset && <p className="notice">This analysis is a subset of the public repositories reported by GitHub.</p>}
          </section>

          <section className="stats-grid" aria-label="Repository statistics">
            <div className="stat-card">
              <span>Repositories analyzed</span>
              <strong>{analysis.analyzed_count}</strong>
            </div>
            <div className="stat-card">
              <span>Total stars</span>
              <strong>{stats.stars_total}</strong>
            </div>
            <div className="stat-card languages-card">
              <span>Primary languages</span>
              {languageCounts.length
                ? <ul className="language-list">{languageCounts.map(([language, count]) =>
                    <li key={language}>{language} <strong>{count}</strong></li>)}</ul>
                : <strong>Unavailable</strong>}
            </div>
          </section>
          <p className="stats-caption">Statistics cover the analyzed repositories only. Latest repository update: {dateLabel(stats.latest_repository_update_at)}.</p>

          <section className="card overview-card">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Free portfolio view</p>
                <h2>Portfolio Overview</h2>
              </div>
              <span className="estimate-badge">Estimated classifications</span>
            </div>
            <p>{overview.factual_summary}</p>
            <ul className="category-grid">{Object.entries(overview.category_counts).map(([name, count]) =>
              <li key={name}><strong>{count}</strong><span>{name}</span></li>)}</ul>
          </section>

          <section className="card explorer-card">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Browse the analyzed set</p>
                <h2>Repository Explorer</h2>
              </div>
              <strong className="selection-counter">{selectedIds.length}/3 selected</strong>
            </div>
            <p className="helper-copy">Select up to three repositories. Search and filters keep your selection.</p>
            {analysis.repositories.length === 0
              ? <p className="empty-state">No public repositories were returned.</p>
              : <>
                <label className="search-label" htmlFor="repository-search">Search repositories</label>
                <input id="repository-search" className="search-input" type="search" value={search}
                  onChange={event => setSearch(event.target.value)} placeholder="Search by repository name" />
                <div className="category-filters" aria-label="Filter repositories by estimated category">
                  {categories.map(name => {
                    const count = name === 'All' ? analysis.analyzed_count : overview.category_counts[name] ?? 0
                    return <button key={name} type="button" aria-pressed={category === name}
                      onClick={() => setCategory(name)}>{name} <span>{count}</span></button>
                  })}
                </div>
                <p className="result-count">{visibleRepositories.length} repositories shown</p>
                {visibleRepositories.length === 0
                  ? <p className="empty-state">No repositories match this search and category.</p>
                  : <div className="repo-scroll" tabIndex="0" aria-label="Repository results">
                    <ul className="repo-list">{visibleRepositories.map(repository =>
                      <li key={repository.id} className={'repo-row' + (selectedIds.includes(repository.id) ? ' is-selected' : '')}>
                        <div className="repo-content">
                          <a className="repo-name" href={repository.url} target="_blank" rel="noreferrer">{repository.name} ↗</a>
                          {repository.description && <p className="repo-description">{repository.description}</p>}
                          <div className="repo-meta">
                            <span>{repository.primary_language || 'Language unavailable'}</span>
                            <span>Estimated: {repository.estimated_category}</span>
                            {repository.fork && <span>Fork</span>}
                          </div>
                        </div>
                        <label className="repo-select">
                          <input type="checkbox" checked={selectedIds.includes(repository.id)}
                            disabled={selectedIds.length === 3 && !selectedIds.includes(repository.id)}
                            onChange={() => toggleSelection(repository.id)}
                            aria-label={'Select ' + repository.name} />
                          <span>{selectedIds.includes(repository.id) ? 'Selected' : 'Select'}</span>
                        </label>
                      </li>)}</ul>
                  </div>}
              </>}
          </section>

          <details className="card timeline-card">
            <summary>
              <div>
                <p className="section-kicker">Repository dates</p>
                <h2>Repository creation timeline</h2>
              </div>
              <span className="timeline-hint">Show timeline</span>
            </summary>
            <div className="timeline-content">
              <p>These dates show when repositories were created; dates do not establish work duration or experience.</p>
              {analysis.timeline.omitted_missing_date_count > 0 &&
                <p>{analysis.timeline.omitted_missing_date_count} repositories omitted because creation dates were unavailable.</p>}
              {analysis.timeline.entries.length === 0
                ? <p>No dated repositories to show.</p>
                : <ol>{analysis.timeline.entries.map(entry =>
                  <li key={entry.repository_id}><time dateTime={entry.created_at}>{dateLabel(entry.created_at)}</time>
                    <a href={entry.url} target="_blank" rel="noreferrer">{entry.name}</a></li>)}</ol>}
            </div>
          </details>
        </> : !loading && !error && <section className="card welcome-card">
          <h2>Start with a public GitHub profile</h2>
          <p>Enter a username or profile URL to see repository statistics, estimated categories, and a creation timeline.</p>
        </section>}
      </div>

      <aside className="insights-column">
        <section className="card insights-panel" aria-live="polite">
          <div className="insights-icon" aria-hidden="true">✦</div>
          <p className="section-kicker">Selected project context</p>
          <h2>AI Insights</h2>
          {selectedRepositories.length
            ? <>
              <p>{selectedRepositories.length} selected {selectedRepositories.length === 1 ? 'repository' : 'repositories'}:</p>
              <ul className="selected-list">{selectedRepositories.map(repository =>
                <li key={repository.id} className="selected-name">{repository.name}</li>)}</ul>
            </>
            : <p className="empty-state">Select up to three repositories to prepare your insights.</p>}
          <button type="button" className="generate-button" onClick={requestInsights}
            disabled={!analysis || selectedIds.length === 0 || insightLoading}>
            {insightLoading ? 'Generating insights…' : 'Generate AI Insights'}
          </button>
          {insightLoading && <p role="status">Preparing selected repository evidence and generating insights…</p>}
          {insightError && <p role="alert" className="insight-error">{insightError}</p>}
          {insight && <div className="insight-result">
            <p className="insight-label">AI interpretation · Provider used: {insight.provider_used}</p>
            <h3>Professional summary</h3>
            <p className="summary-claims">{insight.professional_summary.claims.map((claim, index) =>
              <span key={index}>{index > 0 && ' '}{claim.text} <EvidenceLinks ids={claim.evidence_ids} references={insight.evidence_references} /></span>)}</p>
            <h3>Potential strengths</h3>
            {insight.potential_strengths.length
              ? <ul className="insight-items">{insight.potential_strengths.map((claim, index) =>
                <li key={index}>{claim.text} <EvidenceLinks ids={claim.evidence_ids} references={insight.evidence_references} /></li>)}</ul>
              : <p>No potential strengths were supported by the selected evidence.</p>}
            <h3>Portfolio recommendations</h3>
            <ol className="insight-items">{insight.portfolio_recommendations.map((item, index) =>
              <li key={index}>{item.action} <EvidenceLinks ids={item.evidence_ids} references={insight.evidence_references} /></li>)}</ol>
            <h3>README availability</h3>
            <ul className="readme-status-list">{insight.readme_status.map(item => {
              const repository = selectedRepositories.find(candidate => candidate.id === item.repository_id)
              return <li key={item.repository_id}>{repository?.name || 'Selected repository'}: {item.status}.
                {item.url && <> <a href={item.url} target="_blank" rel="noreferrer">View README ↗</a>.</>}
                {item.readme_truncated && ' Only the first 4,000 characters were analyzed; later details may be omitted.'}
                {item.status === 'missing' && ' No README was found.'}
                {item.status === 'empty' && ' The README is empty.'}
                {item.status === 'unavailable' && ' README content was unavailable.'}</li>
            })}</ul>
            <p className="insights-note">Review the linked public evidence to assess whether each interpretation is supported.</p>
          </div>}
          {!insight && !insightError && !insightLoading && <p className="insights-note">Insights are generated only when you choose repositories and click the button.</p>}
        </section>
      </aside>
    </div>
  </main>
}
