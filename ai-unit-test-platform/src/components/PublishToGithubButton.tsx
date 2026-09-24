'use client';

import { useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  GitPullRequest,
  Loader2,
} from 'lucide-react';

interface GeneratedFile {
  relativePath: string;
  content: string;
}

interface Props {
  repoUrl: string;
  // Optional now: required for GitHub/GitLab/Bitbucket (the requester's own
  // PAT), but NOT used for AWS CodeCommit, which authenticates via the
  // agent's own .env (IAM Git credentials) instead.
  githubToken?: string;
  files: GeneratedFile[];
  baseBranch?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

// Matches the same pattern used on the dashboard page to detect a
// CodeCommit URL, so this button knows not to require a token for it.
const CODECOMMIT_HOST_PATTERN = /^https?:\/\/git-codecommit\.[a-z0-9-]+\.amazonaws\.com\/.+/i;

function isCodeCommitUrl(url: string) {
  return CODECOMMIT_HOST_PATTERN.test(url.trim());
}

export default function PublishToGithubButton({
  repoUrl,
  githubToken,
  files,
  baseBranch,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [manualPrNote, setManualPrNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetIsCodeCommit = isCodeCommitUrl(repoUrl);

  async function handlePublish() {
    setStatus('loading');
    setError(null);
    setPrUrl(null);
    setManualPrNote(null);

    try {
      const response = await fetch('/api/publish-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          baseBranch,
          files: files.map((file) => ({
            path: file.relativePath,
            content: file.content,
          })),
          prTitle: 'Add AI-generated unit tests',
          // Omitted entirely for CodeCommit -- the backend ignores it for
          // that host anyway, but no reason to send an empty string.
          githubToken: targetIsCodeCommit ? undefined : githubToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to publish tests.');
      }

      setPrUrl(data.pullRequestUrl);
      setManualPrNote(data.manualPrNote || null);
      setStatus('success');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not publish tests to GitHub.'
      );
      setStatus('error');
    }
  }

  if (status === 'success' && prUrl) {
    return (
      <div className="publish-github-wrap">
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="publish-github-button success"
        >
          <ExternalLink size={16} />
          {targetIsCodeCommit ? 'Open Pull Requests page' : 'View Pull Request'}
        </a>
        {manualPrNote && (
          <p style={{ marginTop: '0.5rem', fontSize: '11px', opacity: 0.75 }}>
            {manualPrNote}
          </p>
        )}
      </div>
    );
  }

  // For GitHub/GitLab/Bitbucket a token is required. For CodeCommit it
  // isn't -- auth comes from the agent's own .env credentials instead.
  const missingRequiredToken = !targetIsCodeCommit && !githubToken;

  return (
    <div className="publish-github-wrap">
      <button
        type="button"
        onClick={handlePublish}
        disabled={status === 'loading' || files.length === 0 || missingRequiredToken}
        className="publish-github-button"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="spin" size={16} />
            Pushing branch &amp; opening PR...
          </>
        ) : (
          <>
            <GitPullRequest size={16} />
            Push {files.length} test file{files.length === 1 ? '' : 's'} to{' '}
            {targetIsCodeCommit ? 'CodeCommit' : 'GitHub'}
          </>
        )}
      </button>

      {status === 'error' && error && (
        <div className="publish-github-error" role="alert">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}