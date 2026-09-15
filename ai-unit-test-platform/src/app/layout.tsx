import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Unit Testing Platform',
  description: 'Analyze projects, generate Jest tests with AI, and run them locally.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />

          <header className="site-header">
            <div className="header-inner">
              <a href="/" className="brand" aria-label="AI Unit Testing Platform home">
                <span className="brand-mark">AI</span>
                <span className="brand-copy">
                  <span className="brand-title">Unit Testing Platform</span>
                  <span className="brand-subtitle">AI-assisted developer workspace</span>
                </span>
              </a>

              <nav className="main-nav" aria-label="Main navigation">
                <a href="/" className="nav-link active">Dashboard</a>
                <a href="/results" className="nav-link">Results</a>
              </nav>
            </div>
          </header>

          <main className="site-main">{children}</main>

          <footer className="site-footer">
            <span className="status-dot" />
            Local-first testing workspace
            <span className="footer-separator">•</span>
            Your source code stays on your machine
          </footer>
        </div>
      </body>
    </html>
  );
}