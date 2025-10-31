import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Code, FileText } from 'lucide-react';
import { NotebookState } from '../types';

interface NotebookViewProps {
  notebookState: NotebookState;
}

const NotebookView: React.FC<NotebookViewProps> = ({ notebookState }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
          <span className="text-sm font-medium text-gray-700">
            Notebook State ({notebookState.cells.length} cells)
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {notebookState.cells.map((cell) => (
              <div
                key={cell.id}
                className="border border-gray-200 rounded-lg p-2 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  {cell.type === 'code' ? (
                    <Code className="w-3 h-3 text-blue-600" />
                  ) : (
                    <FileText className="w-3 h-3 text-green-600" />
                  )}
                  <span className="font-medium text-gray-700">
                    Cell {cell.index} ({cell.type})
                  </span>
                </div>
                <pre className="text-gray-600 whitespace-pre-wrap overflow-hidden text-ellipsis max-h-20">
                  {cell.source.substring(0, 100)}
                  {cell.source.length > 100 ? '...' : ''}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotebookView;
