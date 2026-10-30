export async function lookupProfile(input) {
  const response = await fetch(`/api/profile?input=${encodeURIComponent(input)}`)
  const body = await response.json()
  if (!response.ok) throw new Error(body.message || 'Profile lookup failed. Please try again.')
  return body
}
