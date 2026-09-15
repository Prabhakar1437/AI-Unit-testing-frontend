'use client';

import { diffLines } from 'diff';

interface Props {
  filePath: string; existingContent: string; newContent: string;
  onConfirm: () => void; onCancel: () => void; onKeepBoth: () => void;
}

export default function DiffConfirmModal({ filePath, existingContent, newContent, onConfirm, onCancel, onKeepBoth }: Props) {
  const diff = diffLines(existingContent, newContent);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-950 border border-gray-800 rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold">Test file already exists</h3>
          <p className="text-sm text-gray-500 font-mono mt-1">{filePath}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 font-mono text-xs">
          {diff.map((part, i) => (
            <pre key={i} className={part.added ? 'bg-green-950/50 text-green-300 whitespace-pre-wrap' : part.removed ? 'bg-red-950/50 text-red-300 whitespace-pre-wrap' : 'text-gray-500 whitespace-pre-wrap'}>
              {part.value}
            </pre>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-700 hover:bg-gray-900">Skip</button>
          <button onClick={onKeepBoth} className="px-4 py-2 text-sm rounded-lg border border-gray-700 hover:bg-gray-900">Keep Both (save as new file)</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-brand hover:bg-indigo-500">Overwrite</button>
        </div>
      </div>
    </div>
  );
}
