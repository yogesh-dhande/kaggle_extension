import React, { useState } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[95%] px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 text-gray-800'
        }`}
      >
        {isUser ? (
          <div className="flex items-start gap-2">
            <p className="text-sm whitespace-pre-wrap flex-1">{message.content}</p>
            <User className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-500">Assistant</span>
            </div>
            <div className="text-sm prose prose-sm max-w-none">
              <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const inline = !className;
                  
                  if (!inline && match) {
                    return (
                      <div className="relative group">
                        <button
                          onClick={() => handleCopyCode(codeString)}
                          className="absolute right-2 top-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy code"
                        >
                          {copiedCode === codeString ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                        <pre className={className}>
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  }
                  
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
