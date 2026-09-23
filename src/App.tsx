import { useEffect, useState } from 'react'
import { API_BASE_URL, getHealth } from './lib/api'
import './App.css'

type ApiState = 'checking' | 'online' | 'offline'

type ConnectionDetails = {
  label: string
  description: string
}

const connectionDetails: Record<ApiState, ConnectionDetails> = {
  checking: {
    label: 'Checking API',
    description: 'Contacting the Laravel service.',
  },
  online: {
    label: 'API online',
    description: 'The service responded successfully.',
  },
  offline: {
    label: 'API unavailable',
    description: 'Start the backend and verify its CORS settings.',
  },
}

function App() {
  const [apiState, setApiState] = useState<ApiState>('checking')
  const [serviceName, setServiceName] = useState('Laravel API')

  useEffect(() => {
    const controller = new AbortController()

    void getHealth(controller.signal)
      .then((health) => {
        setServiceName(health.service)
        setApiState('online')
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setApiState('offline')
        }
      })

    return () => controller.abort()
  }, [])

  const retryApiHealth = () => {
    setApiState('checking')

    void getHealth()
      .then((health) => {
        setServiceName(health.service)
        setApiState('online')
      })
      .catch(() => setApiState('offline'))
  }

  const connection = connectionDetails[apiState]

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Log Report home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="img">
              <path d="M8 8h16v4H12v4h9v4h-9v6H8V8Z" />
            </svg>
          </span>
          <span>Log Report</span>
        </a>

        <div
          className={`connection-badge connection-badge--${apiState}`}
          role="status"
        >
          <span className="connection-dot" aria-hidden="true" />
          {connection.label}
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">Developer log platform</p>
          <h1 id="page-title">
            A clean foundation for{' '}
            <span>better log reporting.</span>
          </h1>
          <p className="intro-copy">
            The React workspace and Laravel API are connected, versioned, and
            ready for the reporting features you build next.
          </p>
        </section>

        <section className="dashboard-grid" aria-label="Project status">
          <article
            className={`card connection-card connection-card--${apiState}`}
            aria-busy={apiState === 'checking'}
          >
            <div className="card-heading">
              <div>
                <p className="card-kicker">Service health</p>
                <h2>API connection</h2>
              </div>
              <span className="live-label">Live check</span>
            </div>

            <div className="endpoint">
              <span>Health endpoint</span>
              <code>{API_BASE_URL}/v1/health</code>
            </div>

            <div className="health-row">
              <span
                className={`health-indicator health-indicator--${apiState}`}
                aria-hidden="true"
              />
              <div className="health-copy">
                <strong>{connection.label}</strong>
                <p>{connection.description}</p>
              </div>
              {apiState === 'offline' && (
                <button
                  className="retry-button"
                  type="button"
                  onClick={retryApiHealth}
                >
                  Retry
                </button>
              )}
            </div>
          </article>

          <article className="card stack-card">
            <div className="card-heading">
              <div>
                <p className="card-kicker">Included</p>
                <h2>Project stack</h2>
              </div>
            </div>

            <dl className="stack-list">
              <div>
                <dt>Frontend</dt>
                <dd>React + TypeScript + Vite</dd>
              </div>
              <div>
                <dt>Backend</dt>
                <dd>Laravel JSON API</dd>
              </div>
              <div>
                <dt>Authentication</dt>
                <dd>Laravel Sanctum</dd>
              </div>
              <div>
                <dt>Connected service</dt>
                <dd>{serviceName}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="next-steps" aria-labelledby="next-steps-title">
          <div className="section-heading">
            <p className="card-kicker">Development path</p>
            <h2 id="next-steps-title">Ready for the next layer</h2>
          </div>

          <ol className="steps-list">
            <li>
              <span className="step-number">01</span>
              <h3>Model log sources</h3>
              <p>Define the data, filters, and reporting categories.</p>
            </li>
            <li>
              <span className="step-number">02</span>
              <h3>Build report workflows</h3>
              <p>Add the API resources and screens your team needs.</p>
            </li>
            <li>
              <span className="step-number">03</span>
              <h3>Ship with confidence</h3>
              <p>Connect production services and verify the full stack.</p>
            </li>
          </ol>
        </section>
      </main>

      <footer>
        <span>Log Report</span>
        <span>React + Laravel</span>
      </footer>
    </div>
  )
}

export default App
