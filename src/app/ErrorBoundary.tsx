import { Component, type ErrorInfo, type ReactNode } from 'react'

type Variant = 'host' | 'display'

interface ErrorBoundaryProps {
  variant: Variant
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

/**
 * Route-level error boundary with two postures:
 *
 * - variant="host": may show a concise recovery message. In development the
 *   error text is included to aid debugging; production keeps it generic.
 * - variant="display": FAILS CLOSED. The projector must never show a stack
 *   trace, source paths, private data, or host controls. Regardless of
 *   environment it renders only a neutral recovery message and allows refresh.
 *   Diagnostics go to the console only.
 *
 * See docs/architecture/GAME-ENGINE-BOUNDARIES.md (fail-closed display) and
 * the error-handling section of the README.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Diagnostics live in the console, never on the projector.
    console.error('[ClassroomQuizShow] render error', error, info)
  }

  private reload = () => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    if (this.props.variant === 'display') {
      // Fail-closed projector state: neutral, no diagnostics, refreshable.
      return (
        <div className="display" role="alert" aria-labelledby="display-error">
          <p className="display__brand">Classroom Quiz Show</p>
          <h1 id="display-error" className="display__headline">
            Display paused
          </h1>
          <p className="display__subtext">
            The display hit a problem and is waiting to recover.
          </p>
        </div>
      )
    }

    // Host: concise recovery, with error text only in development.
    return (
      <main className="screen__main" role="alert" aria-labelledby="host-error">
        <h1 id="host-error">Something went wrong</h1>
        <p className="host__note">
          The host screen hit an error. Reloading usually clears it.
        </p>
        {import.meta.env.DEV && this.state.message ? (
          <pre className="host__note" style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.message}
          </pre>
        ) : null}
        <button type="button" className="btn" onClick={this.reload}>
          Reload host
        </button>
      </main>
    )
  }
}
