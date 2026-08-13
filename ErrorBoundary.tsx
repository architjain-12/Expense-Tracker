import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Expense Tracker render error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="content">
        <div className="empty-state">
          <h3>Something went wrong</h3>
          <p>The page could not be rendered.</p>
          {this.state.message && (
            <pre
              style={{
                marginTop: 16,
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                overflowX: 'auto',
                color: '#ffb4bd',
              }}
            >
              {this.state.message}
            </pre>
          )}
          <button
            className="primary-btn"
            style={{ marginTop: 16 }}
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
