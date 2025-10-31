import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { NotebookState } from '../types';

interface JsonPreviewProps {
  notebookState: NotebookState | null;
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ notebookState }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (notebookState) {
      navigator.clipboard.writeText(JSON.stringify(notebookState, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!notebookState) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p className="text-sm">No notebook data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        <div className="text-sm text-gray-700">
          <span className="font-medium">{notebookState.cells.length}</span> cells
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        <pre className="text-xs font-mono bg-white border border-gray-200 rounded p-4 overflow-x-auto">
          {JSON.stringify(notebookState, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default JsonPreview;
