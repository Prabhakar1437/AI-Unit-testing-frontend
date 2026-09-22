'use client';

import { diffLines } from 'diff';

interface Props {
  filePath: string;
  existingContent: string;
  newContent: string;
  onConfirm: () => void;
  onCancel: () => void;
  onKeepBoth: () => void;
}

export default function DiffConfirmModal({
  filePath,
  existingContent,
  newContent,
  onConfirm,
  onCancel,
  onKeepBoth,
}: Props) {
  const diff = diffLines(existingContent, newContent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-gray-800 bg-gray-950">
        <div className="border-b border-gray-800 px-6 py-4">
          <h3 className="font-semibold">Test file already exists</h3>

          <p className="mt-1 font-mono text-sm text-gray-500">
            {filePath}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 font-mono text-xs">
          {diff.map((part, index) => (
            <pre
              key={index}
              className={
                part.added
                  ? 'whitespace-pre-wrap bg-green-950/50 text-green-300'
                  : part.removed
                    ? 'whitespace-pre-wrap bg-red-950/50 text-red-300'
                    : 'whitespace-pre-wrap text-gray-500'
              }
            >
              {part.value}
            </pre>
          ))}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-900"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={onKeepBoth}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-900"
          >
            Keep Both (save as new file)
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-brand px-4 py-2 text-sm hover:bg-indigo-500"
          >
            Overwrite
          </button>
        </div>
      </div>
    </div>
  );
}