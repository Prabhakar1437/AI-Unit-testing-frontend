'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DiffConfirmModal from '@/components/DiffConfirmModal';
import PublishToGithubButton from '@/components/PublishToGithubButton';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
  Code2,
  FileCode2,
  FolderOpen,
  GitBranch,
  Loader2,
  Play,
  Search,
  Settings2,
  Sparkles,
  TestTube2,
  WandSparkles,
  X,
} from 'lucide-react';

interface SourceFile {
  path: string;
  isTest: boolean;
  hasExistingTest: boolean;
}

interface ScaffoldInfo {
  filesWritten: string[];
  packageJsonUpdated: string;
  installCommand: string;
}

interface Analysis {
  projectRoot: string;
  isSingleFile: boolean;
  language: string;
  framework: string;
  testFramework: string;
  testFrameworkInstalled: boolean;
  packageManager: string;
  runCommandKey: string | null;
  sourceFiles: SourceFile[];
  scaffold: ScaffoldInfo | null;
  // Which repo/path was analyzed, and the requester's own token used to do
  // it (if it was a repo). Both are set by the dashboard page and travel
  // forward via sessionStorage so the publish step can reuse them without
  // asking the user to paste the token twice.
  sourceType?: 'local' | 'repo';
  sourceTarget?: string;
  githubToken?: string;
}

interface GeneratedItem {
  relativePath: any;
  unitName: string;
  targetPath: string;
  content: string;
  exists: boolean;
  diff: any;
  modelUsed?: string | null;
}

interface TestCase {
  title: string;
  category: string;
  priority: string;
  oracle: string;
}

interface PlanUnit {
  name: string;
  kind: string;
  reason: string;
  cases: TestCase[];
}

interface TestPlan {
  target: string;
  framework: string;
  testFramework: string;
  assumptions: string[];
  units: PlanUnit[];
}

interface EnvironmentState {
  ready: boolean;
  installed: boolean;
  executable: string | null;
  commandKey: string | null;
  message: string;
}

export default function AnalyzePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [planning, setPlanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<GeneratedItem | null>(null);
  const [savedPaths, setSavedPaths] = useState<Record<string, string>>({});
  const [environment, setEnvironment] = useState<EnvironmentState | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('lastAnalysis');
    if (!raw) return;

    try {
      setAnalysis(JSON.parse(raw));
    } catch {
      setError('The previous analysis could not be loaded.');
    }
  }, []);

  const filteredFiles = useMemo(() => {
    const files = analysis?.sourceFiles?.filter((file) => !file.isTest) || [];
    const query = search.toLowerCase().trim();

    if (!query) return files;
    return files.filter((file) => file.path.toLowerCase().includes(query));
  }, [analysis, search]);

  function clearWorkflowAfterFileChange() {
    setTestPlan(null);
    setGenerated([]);
    setEnvironment(null);
    setError(null);
  }

  async function handlePlan() {
    if (!analysis || !selectedFile) return;

    setError(null);
    setPlanning(true);
    setTestPlan(null);
    setGenerated([]);

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: selectedFile,
          language: analysis.language,
          framework: analysis.framework,
          testFramework: analysis.testFramework,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Test planning failed.');

      setTestPlan(data.plan);
    } catch (err: any) {
      setError(err?.message || 'Could not create the AI test plan.');
    } finally {
      setPlanning(false);
    }
  }

  async function handleGenerate() {
    if (!analysis || !selectedFile) return;

    setError(null);
    setGenerating(true);
    setGenerated([]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: selectedFile,
          projectRoot: analysis.projectRoot,
          language: analysis.language,
          framework: analysis.framework,
          testFramework: analysis.testFramework,
          testPlan,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed.');

      setGenerated(data.generated || []);

      if (!data.generated?.length) {
        setError(data.message || 'No testable units were found in this file.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not generate tests.');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePlanOrGenerate() {
    if (!testPlan) {
      await handlePlan();
      return;
    }

    await handleGenerate();
  }

  async function doSave(
    item: GeneratedItem,
    mode: 'create' | 'overwrite' | 'keep-both'
  ) {
    if (!analysis) return;

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRoot: analysis.projectRoot,
          targetPath: item.targetPath,
          content: item.content,
          mode,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');

      setSavedPaths((previous) => ({
        ...previous,
        [item.unitName]: data.writtenPath,
      }));
    } catch (err: any) {
      setError(err?.message || 'Could not save the generated test.');
    }
  }

  function handleSaveClick(item: GeneratedItem) {
    if (item.exists) {
      setPendingConfirm(item);
      return;
    }

    void doSave(item, 'create');
  }

  async function handleEnvironmentCheck() {
    if (!analysis) return false;

    try {
      const response = await fetch('/api/environment-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRoot: analysis.projectRoot,
          testFramework: analysis.testFramework,
          commandKey: analysis.runCommandKey,
        }),
      });

      const data = await response.json();
      const state: EnvironmentState = {
        ready: Boolean(data.ready),
        installed: Boolean(data.installed),
        executable: data.executable || null,
        commandKey: data.commandKey || analysis.runCommandKey,
        message: data.message || data.error || 'Environment check failed.',
      };

      setEnvironment(state);
      return state.ready;
    } catch (err: any) {
      const state: EnvironmentState = {
        ready: false,
        installed: false,
        executable: null,
        commandKey: analysis.runCommandKey,
        message: err?.message || 'Could not reach the local agent.',
      };

      setEnvironment(state);
      return false;
    }
  }

  async function handleRun() {
    if (!analysis || !analysis.runCommandKey) {
      setError('No runnable test command was detected for this project.');
      return;
    }

    setError(null);
    setRunning(true);

    try {
      const environmentReady = await handleEnvironmentCheck();

      if (!environmentReady) {
        setError(
          environment?.message ||
            'The test environment is not ready. Install the detected test framework first.'
        );
        return;
      }

      const response = await fetch('/api/run-validated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRoot: analysis.projectRoot,
          commandKey: analysis.runCommandKey,
          testFramework: analysis.testFramework,
        }),
      });

        const data = await response.json();

        // Only block navigation for infrastructure failures — not for suites that ran and had failing tests.
        if (!response.ok) {
          const details = [
            data.message,
            data.environment?.message,
            data.stderr,
          ]
            .filter(Boolean)
            .join(' ');

          throw new Error(
            details || 'Could not execute the test command.'
          );
        }

        if (data.phase !== 'completed' || !data.summary) {
          throw new Error(
            data.message ||
              'The test run did not produce a completed report.'
          );
        }

        // Store reports even if tests failed.
        sessionStorage.setItem(
          'lastRunResults',
          JSON.stringify(data.summary)
        );

        router.push('/results');
    } catch (err: any) {
      setError(err?.message || 'Could not run tests.');
    } finally {
      setRunning(false);
    }
  }

  async function copyInstallCommand() {
    const command = analysis?.scaffold?.installCommand;
    if (!command) return;

    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!analysis) {
    return (
      <div className="empty-state-page">
        <div className="empty-state-icon"><FolderOpen size={28} /></div>
        <h1>No analysis found</h1>
        <p>Start from the dashboard to analyze a local project or repository.</p>
        <a href="/" className="secondary-button">Back to dashboard</a>
      </div>
    );
  }

  const sourceCount = analysis.sourceFiles?.length || 0;
  const testCount = analysis.sourceFiles?.filter((file) => file.hasExistingTest).length || 0;
  const progress = generated.length > 0 ? 100 : testPlan ? 75 : selectedFile ? 50 : 25;

  // The publish button only makes sense when the source was a GitHub/GitLab/
  // Bitbucket repo (not an arbitrary local folder), a token was captured for
  // it, and there's something generated to push.
  const canPublishToGithub =
    analysis.sourceType === 'repo' &&
    Boolean(analysis.sourceTarget) &&
    Boolean(analysis.githubToken) &&
    generated.length > 0;

  return (
    <div className="analysis-page">
      <motion.div
        className="analysis-topbar"
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <div className="eyebrow"><Sparkles size={13} /> Analysis workspace</div>
          <h1>Project intelligence</h1>
          <p className="project-path">
            <FolderOpen size={14} />{' '}
            {analysis.sourceType === 'repo' && analysis.sourceTarget
              ? analysis.sourceTarget
              : analysis.projectRoot}
          </p>
        </div>
        <div className="analysis-status"><span className="status-dot" /> Agent connected</div>
      </motion.div>

      <motion.div
        className="analysis-metrics"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <Metric icon={Code2} label="Language" value={analysis.language} color="blue" />
        <Metric icon={GitBranch} label="Framework" value={analysis.framework} color="purple" />
        <Metric icon={TestTube2} label="Test framework" value={analysis.testFramework} color="green" />
        <Metric icon={Settings2} label="Package manager" value={analysis.packageManager} color="orange" />
        <Metric icon={FileCode2} label="Source files" value={String(sourceCount)} color="cyan" />
      </motion.div>

      <div className="analysis-progress">
        <div className="progress-label"><span>Analysis workflow</span><span>{progress}% ready</span></div>
        <div className="progress-track"><motion.div className="progress-value" animate={{ width: `${progress}%` }} /></div>
        <div className="progress-steps">
          <span className="done"><Check size={12} /> Project detected</span>
          <span className={selectedFile ? 'done' : 'current'}><span className="step-dot" /> Select source</span>
          <span className={testPlan ? 'done' : ''}><span className="step-dot" /> Test plan</span>
          <span className={generated.length ? 'done' : ''}><span className="step-dot" /> Generate tests</span>
          <span><span className="step-dot" /> Run suite</span>
        </div>
      </div>

      <AnimatePresence>
        {analysis.scaffold && (
          <motion.section
            className="setup-banner"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="setup-icon"><WandSparkles size={19} /></div>
            <div className="setup-content">
              <div className="setup-title">Jest setup required</div>
              <p>Configuration was prepared for this project. Install the dependencies below before generating or running tests.</p>
              <div className="command-row">
                <code>{analysis.scaffold.installCommand || 'Install command unavailable. Re-analyze the project.'}</code>
                <button onClick={copyInstallCommand} className="copy-button"><Clipboard size={14} /> {copied ? 'Copied' : 'Copy'}</button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {environment && (
          <motion.div
            className={environment.ready ? 'environment-ready' : 'environment-warning'}
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {environment.ready ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
            <span>{environment.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div className="analysis-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <AlertTriangle size={17} /><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="source-workspace">
        <div className="source-panel">
          <div className="panel-heading"><div><div className="section-kicker">Step 01</div><h2>Select source file</h2><p>Choose a component or module to test with AI.</p></div><span className="file-count">{sourceCount} files</span></div>
          <div className="file-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files..." /></div>
          <div className="file-list">
            {filteredFiles.length === 0 ? <div className="no-files">No matching source files found.</div> : filteredFiles.map((file) => (
              <label key={file.path} className={`file-row ${selectedFile === file.path ? 'selected' : ''}`}>
                <input type="radio" name="sourceFile" checked={selectedFile === file.path} onChange={() => { setSelectedFile(file.path); clearWorkflowAfterFileChange(); }} />
                <FileCode2 size={16} className="file-icon" /><span className="file-name">{toDisplayPath(file.path, analysis.projectRoot)}</span>
                {file.hasExistingTest && <span className="existing-badge">tested</span>}
              </label>
            ))}
          </div>
          <div className="panel-footer"><span><CheckCircle2 size={14} /> {testCount} existing test{testCount === 1 ? '' : 's'}</span><span>Excludes config files</span></div>
        </div>

        <div className="action-panel">
          <div className="action-illustration"><div className="action-glow" /><TestTube2 size={38} /></div>
          <div className="section-kicker">Step {testPlan ? '03' : '02'}</div>
          <h2>{testPlan ? 'Generate test code' : 'Create a test plan'}</h2>
          <p>{selectedFile ? <>Ready to analyze <strong>{selectedFile.split(/[\\/]/).pop()}</strong>.</> : 'Select a source file to unlock AI test generation.'}</p>
          <button onClick={handlePlanOrGenerate} disabled={!selectedFile || planning || generating} className="generate-button">
            {planning ? <><Loader2 className="spin" size={17} /> Creating plan...</> : generating ? <><Loader2 className="spin" size={17} /> Generating tests...</> : testPlan ? <><WandSparkles size={17} /> Generate test code</> : <><WandSparkles size={17} /> Create test plan</>}
          </button>
          <div className="action-note"><Sparkles size={13} /> Behavior tests • Edge cases • Error paths</div>
        </div>
      </section>

      <AnimatePresence>
        {testPlan && (
          <motion.section className="test-plan-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="panel-heading"><div><div className="section-kicker">AI test plan</div><h2>Review planned coverage</h2><p>Confirm the behaviors before generating test code.</p></div><span className="generated-badge">{testPlan.units.length} units</span></div>
            {testPlan.assumptions.length > 0 && <div className="plan-assumptions"><strong>Assumptions</strong>{testPlan.assumptions.map((assumption) => <span key={assumption}>{assumption}</span>)}</div>}
            <div className="plan-units">{testPlan.units.map((unit) => <div className="plan-unit" key={unit.name}><div className="plan-unit-heading"><div><strong>{unit.name}</strong><span>{unit.kind}</span></div><span>{unit.cases.length} cases</span></div><p>{unit.reason}</p><div className="plan-cases">{unit.cases.map((testCase) => <div className="plan-case" key={`${unit.name}-${testCase.title}`}><span className={`priority-${testCase.priority.toLowerCase()}`}>{testCase.priority}</span><div><strong>{testCase.title}</strong><small>{testCase.category} · {testCase.oracle}</small></div></div>)}</div></div>)}</div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {generated.length > 0 && (
          <motion.section className="generated-section" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="panel-heading"><div><div className="section-kicker">Step 04</div><h2>Review generated tests</h2><p>Inspect the code before writing it to your project.</p></div><span className="generated-badge"><CheckCircle2 size={14} /> {generated.length} generated</span></div>
            <div className="generated-list">{generated.map((item) => <div className="generated-card" key={item.unitName}><div className="generated-header"><div className="generated-file"><FileCode2 size={16} /> <span>{toDisplayPath(item.targetPath, analysis.projectRoot)}</span></div>{savedPaths[item.unitName] ? <span className="saved-badge"><Check size={13} /> Saved</span> : <button onClick={() => handleSaveClick(item)} className="save-button">{item.exists ? 'Review changes' : 'Save test'} <ArrowSmall /></button>}</div><pre>{item.content}</pre></div>)}</div>
            <div className="run-section"><div><div className="section-kicker">Step 05</div><h2>Ready to execute?</h2><p>Validate the environment, run the suite, and view the detailed report.</p></div><button onClick={handleRun} disabled={running} className="run-button">{running ? <><Loader2 className="spin" size={17} /> Running suite...</> : <><Play size={16} fill="currentColor" /> Run tests</>}</button></div>
          </motion.section>
        )}
      </AnimatePresence>

      {canPublishToGithub && (
        <PublishToGithubButton
          repoUrl={analysis.sourceTarget as string}
          githubToken={analysis.githubToken as string}
          files={generated.map((g) => ({ relativePath: g.relativePath, content: g.content }))}
        />
      )}

      {pendingConfirm && <DiffConfirmModal filePath={toDisplayPath(pendingConfirm.targetPath, analysis.projectRoot)} existingContent={pendingConfirm.diff?.map((part: any) => (!part.added ? part.value : '')).join('') || ''} newContent={pendingConfirm.content} onCancel={() => setPendingConfirm(null)} onKeepBoth={() => { void doSave(pendingConfirm, 'keep-both'); setPendingConfirm(null); }} onConfirm={() => { void doSave(pendingConfirm, 'overwrite'); setPendingConfirm(null); }} />}
    </div>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return <div className="metric-card"><div className={`metric-icon ${color}`}><Icon size={17} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function ArrowSmall() {
  return <span aria-hidden="true">→</span>;
}

// Turns an absolute file path like
// C:\Users\you\AppData\Local\Temp\ai-test-platform\04b6f448.../ui/src/pages/Router.tsx
// into a short, readable, project-relative one: ui/src/pages/Router.tsx
// so the UI never shows the confusing local temp-folder location.
function toDisplayPath(fullPath: string, projectRoot: string) {
  if (!fullPath) return fullPath;
  const normalizedFull = fullPath.replace(/\\/g, '/');
  const normalizedRoot = projectRoot.replace(/\\/g, '/').replace(/\/$/, '');
  return normalizedFull.startsWith(normalizedRoot)
    ? normalizedFull.slice(normalizedRoot.length + 1)
    : normalizedFull;
}