export async function lookupProfile(input) {
  const response = await fetch(`/api/profile?input=${encodeURIComponent(input)}`)
  const body = await response.json()
  if (!response.ok) throw new Error(body.message || 'Profile lookup failed. Please try again.')
  return body
}

export async function generateInsights(username, repositoryIds) {
  const response = await fetch('/api/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, repository_ids: repositoryIds }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message || 'AI insights are unavailable. Please try again.')
  return body
}
