'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  ArrowRight,
  CircleDot,
  FolderSearch,
  Github,
  KeyRound,
  Loader2,
  Search,
  Sparkles,
  TestTube2,
  Wand2,
  PlayCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type Tab = 'local' | 'repo';

const supported = ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Jest'];

const pipeline = [
  {
    icon: Search,
    title: 'Detect',
    text: 'Reads your stack — language, framework, package manager, existing test setup.',
  },
  {
    icon: Wand2,
    title: 'Generate',
    text: 'Writes focused Jest tests from your real functions and components.',
  },
  {
    icon: PlayCircle,
    title: 'Run',
    text: 'Executes the suite on your own machine and reports coverage.',
  },
];

const terminalLines: { prompt?: boolean; text: string; tone?: 'ok' | 'default' }[] = [
  { prompt: true, text: 'analyze github.com/you/checkout-app' },
  { text: '✓ Detected React + TypeScript + Jest', tone: 'ok' },
  { prompt: true, text: 'generate src/components/PaymentForm.tsx' },
  { text: '✓ 9 test cases written', tone: 'ok' },
  { prompt: true, text: 'run' },
  { text: '✓ 9 passed   Coverage 91%', tone: 'ok' },
];

function TerminalDemo() {
  const reduceMotion = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(reduceMotion ? terminalLines.length : 0);

  useEffect(() => {
    if (reduceMotion) return;

    let cancelled = false;

    async function play() {
      while (!cancelled) {
        for (let i = 0; i <= terminalLines.length; i++) {
          if (cancelled) return;
          setVisibleCount(i);
          await new Promise((resolve) => setTimeout(resolve, i === 0 ? 500 : 620));
        }
        await new Promise((resolve) => setTimeout(resolve, 2400));
        if (cancelled) return;
        setVisibleCount(0);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    play();
    return () => {
      cancelled = true;
    };
  }, [reduceMotion]);

  return (
    <div className="terminal-shell">
      <div className="terminal-titlebar">
        <span className="terminal-dot" style={{ background: '#f87171' }} />
        <span className="terminal-dot" style={{ background: '#fbbf24' }} />
        <span className="terminal-dot" style={{ background: '#34d399' }} />
        <span className="terminal-titletext">ai-unit-test</span>
      </div>
      <div className="terminal-body">
        {terminalLines.slice(0, visibleCount).map((line, index) => (
          <div key={index} className={`terminal-line ${line.tone === 'ok' ? 'is-ok' : ''}`}>
            {line.prompt ? <span className="terminal-caret">$</span> : null}
            <span>{line.text}</span>
          </div>
        ))}
        <div className="terminal-cursor" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>('local');
  const [localPath, setLocalPath] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
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
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, target }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed.');

      sessionStorage.setItem(
        'lastAnalysis',
        JSON.stringify({
          ...data,
          sourceType: tab,
          sourceTarget: target,
        })
      );
      router.push('/analyze');
    } catch (err: any) {
      setError(err?.message || 'Could not analyze the project.');
    } finally {
      setLoading(false);
    }
  }

  const heroContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  };

  const heroItem: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
  };

  return (
    <div className="dashboard-page">
      <motion.section
        className="hero-section"
        variants={reduceMotion ? undefined : heroContainer}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
      >
        <div className="hero-copy">
          <motion.h1 variants={reduceMotion ? undefined : heroItem}>
            Turn your codebase into a <span className="gradient-text">tested codebase.</span>
          </motion.h1>
          <motion.p className="hero-description" variants={reduceMotion ? undefined : heroItem}>
            Point it at a repo or a local project. It reads the code, writes the tests, runs them,
            and shows you what passed — with every generated file reviewable before it touches
            anything.
          </motion.p>

          <motion.div className="supported-row" aria-label="Supported technologies" variants={reduceMotion ? undefined : heroItem}>
            <span className="supported-label">Works with</span>
            {supported.map((item) => <span className="tech-pill" key={item}>{item}</span>)}
          </motion.div>
        </div>

        <motion.div variants={reduceMotion ? undefined : heroItem}>
          <TerminalDemo />
        </motion.div>
      </motion.section>

      <motion.section
        className="workspace-card"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
      >
        <div className="workspace-heading">
          <div>
            <div className="workspace-kicker">Start a new analysis</div>
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

      <section className="pipeline-section" aria-label="How it works">
        <div className="pipeline-heading">
          <Sparkles size={14} />
          <span>How it works</span>
        </div>
        <div className="pipeline-track">
          {pipeline.map((step, index) => {
            const Icon = step.icon;
            return (
              <div className="pipeline-step" key={step.title}>
                <div className="pipeline-node">
                  <span className="pipeline-index">{index + 1}</span>
                  <Icon size={19} />
                </div>
                <div className="pipeline-copy">
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                {index < pipeline.length - 1 && <span className="pipeline-connector" />}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}