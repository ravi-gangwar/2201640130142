import { FormEvent, useMemo, useState } from 'react'

type ShortenResponse = {
  shortLink: string
  expiry: string
}

function App() {
  const [url, setUrl] = useState('')
  const [validity, setValidity] = useState<number | ''>('')
  const [shortcode, setShortcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ShortenResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const backendBase = useMemo(() => {
    const winBase = (window as any).BACKEND_BASE as string | undefined
    const envBase = (import.meta as any).env?.VITE_BACKEND_BASE as string | undefined
    const base = (winBase || envBase || 'http://localhost:3000').replace(/\/$/, '')
    return base
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const body: Record<string, unknown> = { url }
      if (typeof validity === 'number' && Number.isFinite(validity) && validity > 0) {
        body.validity = Math.floor(validity)
      }
      if (shortcode.trim().length > 0) {
        body.shortcode = shortcode.trim()
      }
      const res = await fetch(`${backendBase}/shorturls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({} as any)))?.message || 'Request failed'
        throw new Error(msg)
      }
      const data = (await res.json()) as ShortenResponse
      setResult(data)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>URL Shortener</h1>
      <form onSubmit={handleSubmit}>
        <input
          className="url"
          type="url"
          placeholder="Long URL"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="validity"
          type="number"
          min={1}
          placeholder="Validity (minutes, default 30)"
          value={validity}
          onChange={(e) => setValidity(e.target.value === '' ? '' : Number(e.target.value))}
        />
        <input
          className="shortcode"
          type="text"
          placeholder="Preferred shortcode (optional)"
          value={shortcode}
          onChange={(e) => setShortcode(e.target.value)}
        />
        <button type="submit" disabled={loading}>{loading ? 'Shortening…' : 'Shorten'}</button>
      </form>
      <div id="result">
        {error && <div style={{ color: '#b00020', marginTop: 8 }}>{error}</div>}
        {result && (
          <div className="result-card">
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ opacity: 0.8, fontSize: 13, marginBottom: 4 }}>{url}</div>
              <a href={result.shortLink} target="_blank" rel="noreferrer">
                {result.shortLink}
              </a>
              <div style={{ opacity: 0.7, fontSize: 12 }}>expires: {new Date(result.expiry).toLocaleString()}</div>
            </div>
            <button
              type="button"
              className="copy-btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.shortLink)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1200)
                } catch {}
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
