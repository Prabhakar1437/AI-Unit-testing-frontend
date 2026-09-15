'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCode2,
  Filter,
  Gauge,
  RefreshCw,
  RotateCcw,
  Search,
  SkipForward,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';

interface FailedTest {
  name: string;
  file: string;
  line: number | null;
  expected: string;
  received: string;
  errorMessage: string;
  stackTrace: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number | null;
  executionTime: number;
  failures: FailedTest[];
}

const MOCK_SUMMARY: TestSummary = {
  total: 42,
  passed: 36,
  failed: 4,
  skipped: 2,
  coverage: 87,
  executionTime: 12.43,
  failures: [
    {
      name: 'should show error when password is empty',
      file: 'src/components/Login/Login.test.tsx',
      line: 42,
      expected: '"Password is required"',
      received: 'undefined',
      errorMessage: 'expect(received).toBe(expected)',
      stackTrace: 'at Object.<anonymous> (Login.test.tsx:42:21)\n  at processTicksAndRejections (node:internal/process/task_queues:95:5)',
    },
  ],
};

type FailureFilter = 'all' | 'failed';

export default function ResultsPage() {
  const reduceMotion = useReducedMotion();
  const [summary, setSummary] = useState<TestSummary>(MOCK_SUMMARY);
  const [isReal, setIsReal] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [filter, setFilter] = useState<FailureFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('lastRunResults');
    if (!raw) return;
    try {
      setSummary(JSON.parse(raw));
      setIsReal(true);
    } catch {
      setIsReal(false);
    }
  }, []);

  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  const displayedFailures = useMemo(() => {
    const query = search.toLowerCase().trim();
    return summary.failures.filter((test) => {
      const matchesSearch = !query || `${test.name} ${test.file}`.toLowerCase().includes(query);
      return filter === 'all' && matchesSearch ? true : filter === 'failed' && matchesSearch;
    });
  }, [summary.failures, search, filter]);

  function clearResults() {
    sessionStorage.removeItem('lastRunResults');
    setSummary(MOCK_SUMMARY);
    setIsReal(false);
    setExpanded(0);
  }

  return (
    <div className="results-page">
      <motion.div
        className="results-header"
        initial={reduceMotion ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <div className="eyebrow"><Terminal size={13} /> Execution report</div>
          <h1>Test results</h1>
          <p>Review suite health, failures, and execution details.</p>
        </div>
        <div className="results-actions">
          {isReal ? (
            <span className="real-badge"><span className="status-dot" /> Live run</span>
          ) : (
            <span className="sample-badge"><AlertCircle size={13} /> Sample report</span>
          )}
          <button onClick={clearResults} className="clear-results"><RotateCcw size={14} /> Reset</button>
        </div>
      </motion.div>

      <motion.section
        className="health-card"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .08 }}
      >
        <div className="health-copy">
          <div className="health-icon"><Gauge size={24} /></div>
          <div><span>Suite health</span><strong>{summary.failed === 0 ? 'All tests passed' : 'Attention required'}</strong><p>{summary.total} tests analyzed in {summary.executionTime}s</p></div>
        </div>
        <div className="health-progress">
          <div className="health-circle" style={{ '--progress': `${passRate * 3.6}deg` } as React.CSSProperties}><div><strong>{passRate}%</strong><span>pass rate</span></div></div>
        </div>
        <div className="health-message">{summary.failed === 0 ? <><CheckCircle2 size={16} /> Your suite is green.</> : <><AlertCircle size={16} /> {summary.failed} test{summary.failed === 1 ? '' : 's'} need attention.</>}</div>
      </motion.section>

      <motion.div
        className="result-metrics"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .14 }}
      >
        <ResultMetric icon={FileCode2} label="Total tests" value={summary.total} tone="neutral" />
        <ResultMetric icon={CheckCircle2} label="Passed" value={summary.passed} tone="pass" />
        <ResultMetric icon={XCircle} label="Failed" value={summary.failed} tone="fail" />
        <ResultMetric icon={SkipForward} label="Skipped" value={summary.skipped} tone="skip" />
        <ResultMetric icon={Gauge} label="Coverage" value={summary.coverage !== null ? `${summary.coverage}%` : 'N/A'} tone="coverage" />
        <ResultMetric icon={Clock3} label="Duration" value={`${summary.executionTime}s`} tone="time" />
      </motion.div>

      <section className="failure-section">
        <div className="failure-heading">
          <div><div className="section-kicker">Diagnostics</div><h2>Failure details</h2><p>Inspect assertion differences and stack traces from the run.</p></div>
          <div className="failure-count"><XCircle size={14} /> {summary.failed} failed</div>
        </div>

        <div className="failure-toolbar">
          <div className="result-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search failed tests..." /></div>
          <div className="filter-group"><Filter size={14} /><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'failed' ? 'active' : ''} onClick={() => setFilter('failed')}>Failed</button></div>
        </div>

        <div className="failure-list">
          {displayedFailures.length === 0 ? (
            <motion.div className="empty-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><CheckCircle2 size={26} /><h3>No failures found</h3><p>There are no failed tests matching your filter.</p></motion.div>
          ) : displayedFailures.map((test, index) => (
            <FailureCard key={`${test.file}-${test.name}-${index}`} test={test} isOpen={expanded === index} onToggle={() => setExpanded(expanded === index ? null : index)} />
          ))}
        </div>
      </section>

      <div className="results-footer-note"><RefreshCw size={13} /> Run the suite again from the analysis workspace to refresh this report.</div>
    </div>
  );
}

function ResultMetric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return <div className={`result-metric ${tone}`}><div className="result-metric-icon"><Icon size={17} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function FailureCard({ test, isOpen, onToggle }: { test: FailedTest; isOpen: boolean; onToggle: () => void }) {
  return (
    <motion.div className={`failure-card ${isOpen ? 'open' : ''}`} layout>
      <button className="failure-card-header" onClick={onToggle} aria-expanded={isOpen}>
        <span className="failure-symbol"><X size={14} /></span>
        <span className="failure-name">{test.name}</span>
        <span className="failure-file">{test.file}</span>
        <ChevronDown className={`chevron ${isOpen ? 'rotated' : ''}`} size={17} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div className="failure-details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="detail-grid">
              <Detail label="File" value={test.file} mono /><Detail label="Line" value={test.line !== null ? String(test.line) : 'N/A'} mono /><Detail label="Expected" value={test.expected} mono /><Detail label="Received" value={test.received} mono />
            </div>
            <div className="error-block"><span>Error message</span><code>{test.errorMessage}</code></div>
            <div className="stack-block"><span>Stack trace</span><pre>{test.stackTrace}</pre></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-item"><span>{label}</span><code className={mono ? 'mono' : ''}>{value}</code></div>;
}
