'use client';

import { FormEvent, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  FolderSearch,
  Github,
  GitBranch,
  KeyRound,
  Loader2,
  Sparkles,
  Terminal,
  TestTube2,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type Tab = 'local' | 'repo';

const capabilities = [
  { icon: FolderSearch, title: 'Detect your stack', text: 'Identify language, framework, package manager, and test setup.' },
  { icon: Sparkles, title: 'Generate with AI', text: 'Create focused Jest tests from real functions and components.' },
  { icon: Terminal, title: 'Run locally', text: 'Execute validated test commands on your own machine.' },
];

const supported = ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Jest'];

export default function DashboardPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>('local');
  const [localPath, setLocalPath] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = tab === 'local' ? localPath.trim() : repoUrl.trim();

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!target) {
      setError(tab === 'local' ? 'Enter a local project path to continue.' : 'Enter a repository URL to continue.');
      return;
    }

    if (tab === 'repo') {
      const validRepo = /^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/.+/i.test(target);
      if (!validRepo) {
        setError('Use a valid GitHub, GitLab, or Bitbucket repository URL.');
        return;
      }

      if (!githubToken.trim()) {
        setError('Enter your GitHub Personal Access Token to analyze and publish to this repo.');
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: tab,
          target,
          // Only sent for repo analysis; the backend uses it to clone
          // (possibly private) repos as the requester, not as a shared
          // server-side identity. Never persisted server-side.
          githubToken: tab === 'repo' ? githubToken.trim() : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed.');

      // Carry forward what was analyzed AND the token used, so the
      // /analyze page can later publish back to the same repo as the
      // same person, without asking them to paste the token twice.
      // sessionStorage is per-browser-tab and cleared on close -- the
      // token never touches any server-side file.
      sessionStorage.setItem(
        'lastAnalysis',
        JSON.stringify({
          ...data,
          sourceType: tab,
          sourceTarget: target,
          githubToken: tab === 'repo' ? githubToken.trim() : undefined,
        })
      );
      router.push('/analyze');
    } catch (err: any) {
      setError(err?.message || 'Could not analyze the project.');
    } finally {
      setLoading(false);
    }
  }

  const enterAnimation = reduceMotion
    ? undefined
    : { opacity: 1, y: 0 };

  return (
    <div className="dashboard-page">
      <motion.section
        className="hero-section"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={enterAnimation}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-icon"><Sparkles size={14} /></span>
            Intelligent test engineering
          </div>
          <h1>Turn your codebase into a <span className="gradient-text">tested codebase.</span></h1>
          <p className="hero-description">
            Analyze a project, generate reliable Jest tests with AI, review every change,
            and run the suite locally — all from one focused workspace.
          </p>

          <div className="supported-row" aria-label="Supported technologies">
            <span className="supported-label">Works with</span>
            {supported.map((item) => <span className="tech-pill" key={item}>{item}</span>)}
          </div>
        </div>

        <motion.div
          className="hero-orbit"
          animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="orbit-core"><TestTube2 size={38} /></div>
          <div className="orbit-node node-one"><CheckCircle2 size={16} /></div>
          <div className="orbit-node node-two"><Zap size={16} /></div>
          <div className="orbit-node node-three"><GitBranch size={16} /></div>
        </motion.div>
      </motion.section>

      <motion.section
        className="workspace-card"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={enterAnimation}
        transition={{ duration: 0.55, delay: 0.12, ease: 'easeOut' }}
      >
        <div className="workspace-heading">
          <div>
            <div className="section-kicker">Start a new analysis</div>
            <h2>Where should we begin?</h2>
          </div>
          <div className="secure-badge"><KeyRound size={14} /> Local-first</div>
        </div>

        <div className="tab-switcher" role="tablist" aria-label="Project source">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'local'}
            className={`source-tab ${tab === 'local' ? 'selected' : ''}`}
            onClick={() => { setTab('local'); setError(null); }}
          >
            <FolderSearch size={17} />
            <span><strong>Local project</strong><small>Read from your machine</small></span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'repo'}
            className={`source-tab ${tab === 'repo' ? 'selected' : ''}`}
            onClick={() => { setTab('repo'); setError(null); }}
          >
            <Github size={17} />
            <span><strong>Repository URL</strong><small>Clone GitHub, GitLab, or Bitbucket</small></span>
          </button>
        </div>

        <form onSubmit={handleAnalyze} className="analysis-form">
          <label htmlFor="project-target" className="input-label">
            {tab === 'local' ? 'Project path' : 'Repository URL'}
          </label>
          <div className={`input-wrap ${error ? 'has-error' : ''}`}>
            <span className="input-leading">{tab === 'local' ? <FolderSearch size={18} /> : <Github size={18} />}</span>
            <input
              id="project-target"
              value={target}
              onChange={(event) => tab === 'local' ? setLocalPath(event.target.value) : setRepoUrl(event.target.value)}
              placeholder={tab === 'local' ? 'C:\\Projects\\MyReactApp' : 'https://github.com/company/project'}
              autoComplete="off"
              spellCheck={false}
            />
            {target && !loading && <CircleDot className="input-valid" size={17} />}
          </div>
          <p className="input-hint">
            {tab === 'local'
              ? 'The local agent reads files directly. Your source code is not uploaded.'
              : 'The agent creates a temporary workspace and analyzes the repository locally.'}
          </p>

          {tab === 'repo' && (
            <>
              <label htmlFor="github-token" className="input-label" style={{ marginTop: '1rem' }}>
                Your GitHub Personal Access Token
              </label>
              <div className="input-wrap">
                <span className="input-leading"><KeyRound size={18} /></span>
                <input
                  id="github-token"
                  type="password"
                  value={githubToken}
                  onChange={(event) => setGithubToken(event.target.value)}
                  placeholder="ghp_..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <p className="input-hint">
                Used only for this session to read and push to repos you have access to — never stored on
                any server.{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Create a classic token
                </a>{' '}
                with the <code>repo</code> scope if you don't have one yet.
              </p>
            </>
          )}

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                className="error-message"
                role="alert"
                initial={{ opacity: 0, height: 0, y: -5 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -5 }}
              >
                <span>!</span>{error}
              </motion.div>
            )}
          </AnimatePresence>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? <><Loader2 className="spin" size={18} /> Analyzing project...</> : <>{tab === 'local' ? 'Analyze project' : 'Analyze repository'} <ArrowRight size={18} /></>}
          </button>
        </form>
      </motion.section>

      <section className="capabilities-grid" aria-label="Platform capabilities">
        {capabilities.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              className="capability-card"
              key={item.title}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={enterAnimation}
              transition={{ duration: 0.45, delay: 0.2 + index * 0.08 }}
              whileHover={reduceMotion ? undefined : { y: -4 }}
            >
              <div className="capability-icon"><Icon size={19} /></div>
              <div><h3>{item.title}</h3><p>{item.text}</p></div>
              <span className="step-number">0{index + 1}</span>
            </motion.div>
          );
        })}
      </section>

      <div className="workflow-line">
        <span className="workflow-dot active" /> Detect
        <span className="workflow-connector" />
        <span className="workflow-dot" /> Generate
        <span className="workflow-connector" />
        <span className="workflow-dot" /> Review
        <span className="workflow-connector" />
        <span className="workflow-dot" /> Run
      </div>
    </div>
  );
}