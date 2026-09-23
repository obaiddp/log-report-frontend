import { ArrowLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <span aria-hidden="true"><SearchX size={34} /></span>
      <p className="eyebrow">404 · Page not found</p>
      <h1 id="not-found-title">That page is not in this workspace</h1>
      <p>The address may be outdated, or you may not have access to this record.</p>
      <Link className="button button--secondary button--default" to="/">
        <ArrowLeft size={18} aria-hidden="true" />
        Return to dashboard
      </Link>
    </section>
  )
}
