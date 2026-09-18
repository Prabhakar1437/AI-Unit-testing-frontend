'use client';

import { useState } from 'react';
import { GitPullRequest, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

interface GeneratedFile {
  relativePath: string;
  content: string;
}

interface Props {
  repoUrl: string;
  files: GeneratedFile[];
  baseBranch?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function PublishToGithubButton({
  repoUrl,
  files,
  baseBranch = 'main',
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setStatus('loading');
    setError(null);
    setPrUrl(null);

    try {
      const response = await fetch('/api/publish-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          baseBranch,
          files: files.map((f) => ({ path: f.relativePath, content: f.content })),
          prTitle: 'Add AI-generated unit tests',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to publish tests.');
      }

      setPrUrl(data.pullRequestUrl);
      setStatus('success');
    } catch (err: any) {
      setError(err?.message || 'Could not publish tests to GitHub.');
      setStatus('error');
    }
  }

  if (status === 'success' && prUrl) {
    return (
      <a
        href={prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="publish-github-button success"
      >
        <ExternalLink size={16} /> View Pull Request
      </a>
    );
  }

  return (
    <div className="publish-github-wrap">
      <button
        type="button"
        onClick={handlePublish}
        disabled={status === 'loading' || files.length === 0}
        className="publish-github-button"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="spin" size={16} /> Pushing branch & opening PR...
          </>
        ) : (
          <>
            <GitPullRequest size={16} /> Push {files.length} test file
            {files.length === 1 ? '' : 's'} to GitHub
          </>
        )}
      </button>

      {status === 'error' && error && (
        <div className="publish-github-error" role="alert">
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </div>
  );
}
