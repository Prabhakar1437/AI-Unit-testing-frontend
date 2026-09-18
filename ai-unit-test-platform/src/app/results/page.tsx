'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
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

interface CoverageFile {
  file: string;
  statements: number | null;
  branches: number | null;
  functions: number | null;
  lines: number | null;
}

interface CoverageDetails {
  statements: number | null;
  branches: number | null;
  functions: number | null;
  lines: number | null;
  files: CoverageFile[];
  reportPath?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number | null;
  coverageDetails: CoverageDetails | null;
  executionTime: number;
  failures: FailedTest[];
}

type FailureFilter = 'all' | 'failed';

export default function ResultsPage() {
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [isReal, setIsReal] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('lastRunResults');

    if (!raw) {
      setSummary(null);
      setIsReal(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeSummary(parsed);

      if (!normalized) {
        setSummary(null);
        setIsReal(false);
        return;
      }

      setSummary(normalized);
      setIsReal(true);
    } catch {
      setSummary(null);
      setIsReal(false);
    }
  }, []);

  if (!summary) {
    return (
      <div className="empty-state-page">
        <div className="empty-state-icon">
          <FileCode2 size={28} />
        </div>
        <h1>No test report available</h1>
        <p>Run the test suite from the analysis page first.</p>
        <a href="/analyze" className="secondary-button">
          Open analysis
        </a>
      </div>
    );
  }

  return (
    <ReportView
      summary={summary}
      isReal={isReal}
      onReset={() => {
        sessionStorage.removeItem('lastRunResults');
        setSummary(null);
        setIsReal(false);
      }}
    />
  );
}

function ReportView({
  summary,
  isReal,
  onReset,
}: {
  summary: TestSummary;
  isReal: boolean;
  onReset: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState<number | null>(0);
  const [filter, setFilter] = useState<FailureFilter>('all');
  const [search, setSearch] = useState('');

  const passRate =
    summary.total > 0
      ? Math.round((summary.passed / summary.total) * 100)
      : 0;

  // total === 0 means nothing actually ran (a crashed suite, a missing
  // module, a config error) -- this is a distinct state from "ran and
  // everything passed", and must never be shown as green/passing. Under
  // normal use, analyze/page.tsx's handleRun() should already catch this
  // before ever navigating here -- this is a defense-in-depth fallback.
  const suiteDidNotRun = summary.total === 0;

  const displayedFailures = useMemo(() => {
    const query = search.toLowerCase().trim();

    return summary.failures.filter((test) => {
      const matchesSearch =
        !query ||
        `${test.name} ${test.file} ${test.errorMessage}`
          .toLowerCase()
          .includes(query);

      if (!matchesSearch) return false;
      return filter === 'all' || filter === 'failed';
    });
  }, [summary.failures, search, filter]);

  return (
    <div className="results-page">
      <motion.div
        className="results-header"
        initial={reduceMotion ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <div className="eyebrow">
            <Terminal size={13} /> Execution report
          </div>
          <h1>Test results</h1>
          <p>Review suite health, failures, coverage, and execution details.</p>
        </div>

        <div className="results-actions">
          {isReal ? (
            <span className="real-badge">
              <span className="status-dot" /> Live run
            </span>
          ) : (
            <span className="sample-badge">
              <AlertCircle size={13} /> Sample report
            </span>
          )}

          <button onClick={onReset} className="clear-results">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </motion.div>

      <motion.section
        className="health-card"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="health-copy">
          <div className="health-icon">
            <Gauge size={24} />
          </div>
          <div>
            <span>Suite health</span>
            <strong>
              {suiteDidNotRun
                ? 'No tests were run'
                : summary.failed === 0
                  ? 'All tests passed'
                  : 'Attention required'}
            </strong>
            <p>
              {summary.total} tests analyzed in {summary.executionTime}s
            </p>
          </div>
        </div>

        <div className="health-progress">
          <div
            className="health-circle"
            style={{ '--progress': `${passRate * 3.6}deg` } as React.CSSProperties}
          >
            <div>
              <strong>{passRate}%</strong>
              <span>pass rate</span>
            </div>
          </div>
        </div>

        <div className="health-message">
          {suiteDidNotRun ? (
            <>
              <AlertCircle size={16} /> The test suite did not execute — check stderr from the run for
              the underlying error.
            </>
          ) : summary.failed === 0 ? (
            <>
              <CheckCircle2 size={16} /> Your suite is green.
            </>
          ) : (
            <>
              <AlertCircle size={16} /> {summary.failed} test
              {summary.failed === 1 ? '' : 's'} need attention.
            </>
          )}
        </div>
      </motion.section>

      <motion.div
        className="result-metrics"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <ResultMetric icon={FileCode2} label="Total tests" value={summary.total} tone="neutral" />
        <ResultMetric icon={CheckCircle2} label="Passed" value={summary.passed} tone="pass" />
        <ResultMetric icon={XCircle} label="Failed" value={summary.failed} tone="fail" />
        <ResultMetric icon={SkipForward} label="Skipped" value={summary.skipped} tone="skip" />
        <ResultMetric icon={Gauge} label="Coverage" value={formatPercentage(summary.coverage)} tone="coverage" />
        <ResultMetric icon={Clock3} label="Duration" value={`${summary.executionTime}s`} tone="time" />
      </motion.div>

      <CoverageSection coverage={summary.coverageDetails} />

      <section className="failure-section">
        <div className="failure-heading">
          <div>
            <div className="section-kicker">Diagnostics</div>
            <h2>Failure details</h2>
            <p>Inspect assertion differences and stack traces from the run.</p>
          </div>
          <div className="failure-count">
            <XCircle size={14} /> {summary.failed} failed
          </div>
        </div>

        <div className="failure-toolbar">
          <div className="result-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search failed tests..."
            />
          </div>

          <div className="filter-group">
            <Filter size={14} />
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={filter === 'failed' ? 'active' : ''}
              onClick={() => setFilter('failed')}
            >
              Failed
            </button>
          </div>
        </div>

        <div className="failure-list">
          {displayedFailures.length === 0 ? (
            <motion.div
              className="empty-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <CheckCircle2 size={26} />
              <h3>No failures found</h3>
              <p>There are no failed tests matching your filter.</p>
            </motion.div>
          ) : (
            displayedFailures.map((test, index) => (
              <FailureCard
                key={`${test.file}-${test.name}-${index}`}
                test={test}
                isOpen={expanded === index}
                onToggle={() =>
                  setExpanded(expanded === index ? null : index)
                }
              />
            ))
          )}
        </div>
      </section>

      <div className="results-footer-note">
        <RefreshCw size={13} /> Run the suite again from the analysis workspace to refresh this report.
      </div>
    </div>
  );
}

function normalizeSummary(value: any): TestSummary | null {
  if (!value || typeof value.total !== 'number') return null;

  return {
    total: value.total,
    passed: toNumber(value.passed) ?? 0,
    failed: toNumber(value.failed) ?? 0,
    skipped: toNumber(value.skipped) ?? 0,
    coverage: toNumber(value.coverage),
    executionTime: toNumber(value.executionTime) ?? 0,
    failures: Array.isArray(value.failures)
      ? value.failures.map(normalizeFailure)
      : [],
    coverageDetails: normalizeCoverage(
      value.coverageDetails,
      value.coverage
    ),
  };
}

function normalizeFailure(value: any): FailedTest {
  return {
    name: String(value?.name || 'Unnamed test'),
    file: String(value?.file || 'Unknown file'),
    line: toNumber(value?.line),
    expected: String(value?.expected || 'Unavailable'),
    received: String(value?.received || 'Unavailable'),
    errorMessage: String(value?.errorMessage || 'Test failed'),
    stackTrace: String(value?.stackTrace || 'No stack trace available'),
  };
}

function normalizeCoverage(
  coverage: unknown,
  fallbackLines?: number | null
): CoverageDetails | null {
  if (!coverage || typeof coverage !== 'object') return null;

  const value = coverage as any;

  return {
    statements: toNumber(value.statements),
    branches: toNumber(value.branches),
    functions: toNumber(value.functions),
    lines: toNumber(value.lines) ?? toNumber(fallbackLines),
    files: Array.isArray(value.files)
      ? value.files.map((file: any) => ({
          file: String(file?.file || 'Unknown file'),
          statements: toNumber(file?.statements),
          branches: toNumber(file?.branches),
          functions: toNumber(file?.functions),
          lines: toNumber(file?.lines),
        }))
      : [],
    reportPath: value.reportPath,
  };
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function formatPercentage(value: number | null | undefined) {
  return value === null || value === undefined
    ? 'N/A'
    : `${Number(value.toFixed(2))}%`;
}

function ResultMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`result-metric ${tone}`}>
      <div className="result-metric-icon">
        <Icon size={17} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function CoverageSection({
  coverage,
}: {
  coverage: CoverageDetails | null;
}) {
  if (!coverage) {
    return (
      <section className="coverage-section coverage-empty">
        <div className="section-kicker">Code coverage</div>
        <h2>Coverage unavailable</h2>
        <p>Run the suite with coverage enabled to see detailed metrics.</p>
      </section>
    );
  }

  return (
    <section className="coverage-section">
      <div className="coverage-heading">
        <div>
          <div className="section-kicker">Code coverage</div>
          <h2>Coverage details</h2>
          <p>Coverage collected from the latest test run.</p>
        </div>
        <div className="coverage-total">
          {formatPercentage(coverage.lines)}
        </div>
      </div>

      <div className="coverage-details-grid">
        <CoverageMetric label="Statements" value={coverage.statements} />
        <CoverageMetric label="Branches" value={coverage.branches} />
        <CoverageMetric label="Functions" value={coverage.functions} />
        <CoverageMetric label="Lines" value={coverage.lines} />
      </div>

      {coverage.files.length > 0 && (
        <div className="low-coverage-files">
          <h3>Low coverage files</h3>
          {coverage.files.slice(0, 10).map((file) => (
            <div className="coverage-file-row" key={file.file}>
              <span>{file.file}</span>
              <strong>{formatPercentage(file.lines)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CoverageMetric({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const safeValue = value === null ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div className="coverage-detail-card">
      <div
        className="coverage-ring"
        style={{ '--coverage': `${safeValue}%` } as React.CSSProperties}
      >
        <span>{formatPercentage(value)}</span>
      </div>
      <strong>{label}</strong>
    </div>
  );
}

function FailureCard({
  test,
  isOpen,
  onToggle,
}: {
  test: FailedTest;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      className={`failure-card ${isOpen ? 'open' : ''}`}
      layout
    >
      <button
        className="failure-card-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="failure-symbol">
          <X size={14} />
        </span>
        <span className="failure-name">{test.name}</span>
        <span className="failure-file">{test.file}</span>
        <ChevronDown
          className={`chevron ${isOpen ? 'rotated' : ''}`}
          size={17}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="failure-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="detail-grid">
              <Detail label="File" value={test.file} mono />
              <Detail
                label="Line"
                value={test.line === null ? 'N/A' : String(test.line)}
                mono
              />
              <Detail label="Expected" value={test.expected} mono />
              <Detail label="Received" value={test.received} mono />
            </div>

            <div className="error-block">
              <span>Error message</span>
              <code>{test.errorMessage}</code>
            </div>

            <div className="stack-block">
              <span>Stack trace</span>
              <pre>{test.stackTrace}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <code className={mono ? 'mono' : ''}>{value}</code>
    </div>
  );
}