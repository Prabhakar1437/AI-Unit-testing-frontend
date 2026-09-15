'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
import DiffConfirmModal from '@/components/DiffConfirmModal';

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
}

interface GeneratedItem {
  unitName: string;
  targetPath: string;
  content: string;
  exists: boolean;
  diff: any;
}

export default function AnalyzePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<GeneratedItem | null>(null);
  const [savedPaths, setSavedPaths] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('lastAnalysis');
    if (raw) {
      try {
        setAnalysis(JSON.parse(raw));
      } catch {
        setError('The previous analysis could not be loaded.');
      }
    }
  }, []);

  const filteredFiles = useMemo(() => {
    const files = analysis?.sourceFiles?.filter((file) => !file.isTest) || [];
    const query = search.toLowerCase().trim();
    if (!query) return files;
    return files.filter((file) => file.path.toLowerCase().includes(query));
  }, [analysis, search]);

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
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed.');
      setGenerated(data.generated || []);
      if (!data.generated?.length) setError(data.message || 'No testable units were found in this file.');
    } catch (err: any) {
      setError(err?.message || 'Could not generate tests.');
    } finally {
      setGenerating(false);
    }
  }

  async function doSave(item: GeneratedItem, mode: 'create' | 'overwrite' | 'keep-both') {
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
      setSavedPaths((previous) => ({ ...previous, [item.unitName]: data.writtenPath }));
    } catch (err: any) {
      setError(err?.message || 'Could not save the generated test.');
    }
  }

  function handleSaveClick(item: GeneratedItem) {
    if (item.exists) setPendingConfirm(item);
    else void doSave(item, 'create');
  }

  async function handleRun() {
    if (!analysis || !analysis.runCommandKey) {
      setError('No runnable test command was detected for this project.');
      return;
    }

    setError(null);
    setRunning(true);
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRoot: analysis.projectRoot,
          commandKey: analysis.runCommandKey,
          testFramework: analysis.testFramework,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Test execution failed.');

      if (data.ok && data.summary) {
        sessionStorage.setItem('lastRunResults', JSON.stringify(data.summary));
        router.push('/results');
      } else {
        setError(data.message || 'Tests ran, but no readable results were returned.');
      }
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
  const progress = generated.length > 0 ? 100 : selectedFile ? 50 : 25;

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
          <p className="project-path"><FolderOpen size={14} /> {analysis.projectRoot}</p>
        </div>
        <div className="analysis-status"><span className="status-dot" /> Agent connected</div>
      </motion.div>

      <motion.div
        className="analysis-metrics"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .08 }}
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
        <div className="progress-steps"><span className="done"><Check size={12} /> Project detected</span><span className={selectedFile ? 'done' : 'current'}><span className="step-dot" /> Select source</span><span className={generated.length ? 'done' : ''}><span className="step-dot" /> Generate tests</span><span><span className="step-dot" /> Run suite</span></div>
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
              <div className="command-row"><code>{analysis.scaffold.installCommand}</code><button onClick={copyInstallCommand} className="copy-button"><Clipboard size={14} /> {copied ? 'Copied' : 'Copy'}</button></div>
            </div>
          </motion.section>
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
                <input type="radio" name="sourceFile" checked={selectedFile === file.path} onChange={() => setSelectedFile(file.path)} />
                <FileCode2 size={16} className="file-icon" /><span className="file-name">{file.path}</span>
                {file.hasExistingTest && <span className="existing-badge">tested</span>}
              </label>
            ))}
          </div>
          <div className="panel-footer"><span><CheckCircle2 size={14} /> {testCount} existing test{testCount === 1 ? '' : 's'}</span><span>Excludes config files</span></div>
        </div>

        <div className="action-panel">
          <div className="action-illustration"><div className="action-glow" /><TestTube2 size={38} /></div>
          <div className="section-kicker">Step 02</div>
          <h2>Generate a test</h2>
          <p>{selectedFile ? <>Ready to analyze <strong>{selectedFile.split(/[\\/]/).pop()}</strong>.</> : 'Select a source file to unlock AI test generation.'}</p>
          <button onClick={handleGenerate} disabled={!selectedFile || generating} className="generate-button">{generating ? <><Loader2 className="spin" size={17} /> Generating...</> : <><WandSparkles size={17} /> Generate with Gemini</>}</button>
          <div className="action-note"><Sparkles size={13} /> Jest tests • Edge cases • Error paths</div>
        </div>
      </section>

      <AnimatePresence>
        {generated.length > 0 && (
          <motion.section className="generated-section" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="panel-heading"><div><div className="section-kicker">Step 03</div><h2>Review generated tests</h2><p>Inspect the code before writing it to your project.</p></div><span className="generated-badge"><CheckCircle2 size={14} /> {generated.length} generated</span></div>
            <div className="generated-list">
              {generated.map((item) => (
                <div className="generated-card" key={item.unitName}>
                  <div className="generated-header"><div className="generated-file"><FileCode2 size={16} /> <span>{item.targetPath}</span></div>{savedPaths[item.unitName] ? <span className="saved-badge"><Check size={13} /> Saved</span> : <button onClick={() => handleSaveClick(item)} className="save-button">{item.exists ? 'Review changes' : 'Save test'} <ArrowSmall /></button>}</div>
                  <pre>{item.content}</pre>
                </div>
              ))}
            </div>
            <div className="run-section"><div><div className="section-kicker">Step 04</div><h2>Ready to execute?</h2><p>Run the validated test command and view the detailed report.</p></div><button onClick={handleRun} disabled={running} className="run-button">{running ? <><Loader2 className="spin" size={17} /> Running suite...</> : <><Play size={16} fill="currentColor" /> Run tests</>}</button></div>
          </motion.section>
        )}
      </AnimatePresence>

      {pendingConfirm && <DiffConfirmModal filePath={pendingConfirm.targetPath} existingContent={pendingConfirm.diff?.map((part: any) => (!part.added ? part.value : '')).join('') || ''} newContent={pendingConfirm.content} onCancel={() => setPendingConfirm(null)} onKeepBoth={() => { void doSave(pendingConfirm, 'keep-both'); setPendingConfirm(null); }} onConfirm={() => { void doSave(pendingConfirm, 'overwrite'); setPendingConfirm(null); }} />}
    </div>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return <div className="metric-card"><div className={`metric-icon ${color}`}><Icon size={17} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function ArrowSmall() { return <span aria-hidden="true">→</span>; }
