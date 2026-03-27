import * as React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const ResetButton = () => (
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Réessayer
        </button>
      )

      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error!} reset={() => this.setState({ hasError: false, error: null })} />
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <h2 className="text-2xl font-bold text-foreground">Une erreur est survenue</h2>
          <p className="text-muted-foreground text-center max-w-md">
            {this.state.error?.message || 'Une erreur inattendue s\'est produite. Veuillez réessayer.'}
          </p>
          <ResetButton />
        </div>
      )
    }

    return this.props.children
  }
}
