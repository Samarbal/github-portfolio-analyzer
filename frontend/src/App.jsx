import { useState } from 'react'
import { lookupProfile } from './api.js'

function dateLabel(value) {
  return value ? value.slice(0, 10) : 'Unavailable'
}

export default function App() {
  const [input, setInput] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  async function submit(event) {
    event.preventDefault()
    setAnalysis(null)
    setSelectedIds([])
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

  const profile = analysis?.profile
  const stats = analysis?.statistics
  const overview = analysis?.portfolio_overview

  function toggleSelection(id) {
    setSelectedIds(current => current.includes(id)
      ? current.filter(selectedId => selectedId !== id)
      : current.length < 3 ? [...current, id] : current)
  }

  return <main className="page">
    <header>
      <p className="eyebrow">Public GitHub data</p>
      <h1>GitHub Portfolio Analyzer</h1>
      <p>Explore repository facts and estimated project categories.</p>
    </header>

    <form onSubmit={submit} className="lookup">
      <label htmlFor="profile-input">GitHub username or profile URL</label>
      <div className="lookup-row">
        <input id="profile-input" value={input} onChange={event => setInput(event.target.value)}
          placeholder="octocat or https://github.com/octocat" />
        <button type="submit" disabled={loading}>Analyze profile</button>
      </div>
    </form>

    {loading && <p role="status">Loading profile…</p>}
    {error && <p role="alert" className="error">{error}</p>}

    {analysis && <>
      <section className="card profile">
        {profile.avatar_url && <img src={profile.avatar_url} alt="" className="avatar" />}
        <div>
          <h2>{profile.display_name || profile.username}</h2>
          <a href={profile.profile_url} target="_blank" rel="noreferrer">@{profile.username} on GitHub</a>
          <p>{analysis.analyzed_count} of {profile.reported_public_repos} public repositories analyzed.</p>
          {analysis.is_subset && <p className="notice">This analysis is a subset of the public repositories reported by GitHub.</p>}
          <p>Repositories ordered by most recent update. Public forks are included.</p>
        </div>
      </section>

      <section className="card">
        <h2>Repository statistics</h2>
        <p>Calculated from the {analysis.analyzed_count} analyzed repositories only.</p>
        <div className="stats">
          <div><strong>{analysis.analyzed_count}</strong><span>Repositories analyzed</span></div>
          <div><strong>{stats.stars_total}</strong><span>Total stars</span></div>
          <div><strong>{dateLabel(stats.latest_repository_update_at)}</strong><span>Latest repository update</span></div>
        </div>
        <h3>Primary languages</h3>
        {Object.keys(stats.primary_language_counts).length
          ? <ul>{Object.entries(stats.primary_language_counts).map(([language, count]) => <li key={language}>{language}: {count}</li>)}</ul>
          : <p>Unavailable</p>}
      </section>

      <section className="card">
        <h2>Portfolio Overview</h2>
        <p className="notice">Estimated classifications of analyzed repositories, based on GitHub metadata.</p>
        <p>{overview.factual_summary}</p>
        <ul className="category-grid">{Object.entries(overview.category_counts).map(([category, count]) =>
          <li key={category}><strong>{count}</strong><span>{category}</span></li>)}</ul>
      </section>

      <section className="card">
        <h2>Repositories</h2>
        {analysis.repositories.length > 0 && <p>Select up to 3 repositories. {selectedIds.length} of 3 selected.</p>}
        {analysis.repositories.length === 0 ? <p>No public repositories were returned.</p> :
          <ul className="repo-list">{analysis.repositories.map(repository =>
            <li key={repository.id}>
              <a href={repository.url} target="_blank" rel="noreferrer">{repository.name}</a>
              <label className="repo-select">
                <input type="checkbox" checked={selectedIds.includes(repository.id)}
                  disabled={selectedIds.length === 3 && !selectedIds.includes(repository.id)}
                  onChange={() => toggleSelection(repository.id)}
                  aria-label={`Select ${repository.name}`} />
                Select repository
              </label>
              <span>Estimated: {repository.estimated_category}{repository.fork ? ' · Fork' : ''}</span>
              {repository.description && <p>{repository.description}</p>}
            </li>)}</ul>}
      </section>

      <section className="card">
        <h2>Repository creation timeline</h2>
        <p>These dates show when repositories were created; dates do not establish work duration or experience.</p>
        {analysis.timeline.omitted_missing_date_count > 0 &&
          <p>{analysis.timeline.omitted_missing_date_count} repositories omitted because creation dates were unavailable.</p>}
        {analysis.timeline.entries.length === 0 ? <p>No dated repositories to show.</p> :
          <ol>{analysis.timeline.entries.map(entry =>
            <li key={entry.repository_id}><time dateTime={entry.created_at}>{dateLabel(entry.created_at)}</time> · <a href={entry.url} target="_blank" rel="noreferrer">{entry.name}</a></li>)}</ol>}
      </section>
    </>}
  </main>
}
