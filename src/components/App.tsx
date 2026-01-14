import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Loader2, BookOpen, MessageSquare, FileJson, RefreshCw, Code2, MessageCircle, Trash2, Code, FileText } from 'lucide-react';
import { Message, NotebookState, LLMConfig, LLMProvider, AgentMode } from '../types';
import ChatMessage from './ChatMessage';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notebookState, setNotebookState] = useState<NotebookState | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'openai',
    apiKey: '',
    model: '',
    temperature: 0.3,
    maxTokens: 4096
  });
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'json'>('chat');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load LLM config from storage
    chrome.storage.local.get(['llm_config'], (result) => {
      if (result.llm_config) {
        setLlmConfig(result.llm_config);
      }
    });

    // Listen for notebook state updates
    const messageListener = (message: any) => {
      if (message.type === 'NOTEBOOK_STATE_UPDATE') {
        setNotebookState(message.payload);
      } else if (message.type === 'AGENT_RESPONSE') {
        setIsLoading(false);
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: message.payload.response,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Request initial notebook state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_NOTEBOOK_STATE' });
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!llmConfig.apiKey) {
      alert('Please configure LLM settings');
      setShowSettings(true);
      return;
    }

    if (!notebookState) {
      alert('Notebook state not loaded. Please ensure you are on a Kaggle notebook page and refresh if needed.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Send to background script to run agent
    chrome.runtime.sendMessage({
      type: 'RUN_AGENT',
      payload: {
        prompt: input,
        notebookState,
        llmConfig,
        mode: agentMode
      }
    });
  };

  const handleSaveConfig = () => {
    if (!llmConfig.apiKey) {
      alert('Please provide an API key');
      return;
    }
    chrome.storage.local.set({ llm_config: llmConfig }, () => {
      setShowSettings(false);
      alert('LLM configuration saved successfully');
    });
  };

  const handleRefreshNotebook = () => {
    setIsRefreshing(true);
    
    // Request notebook state from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_NOTEBOOK_STATE' }, () => {
          // Animation will stop when we receive the update
          setTimeout(() => setIsRefreshing(false), 1000);
        });
      } else {
        setIsRefreshing(false);
      }
    });
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    
    const confirmed = window.confirm('Are you sure you want to clear the chat history? This action cannot be undone.');
    if (confirmed) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-800">Kaggle Automation</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Agent Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAgentMode('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                agentMode === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title="Chat mode - Get help and suggestions without modifying the notebook"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => setAgentMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                agentMode === 'code'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title="Code mode - Agent can add and execute cells in the notebook"
            >
              <Code2 className="w-3.5 h-3.5" />
              Code
            </button>
          </div>
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear chat history"
          >
            <Trash2 className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">LLM Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Provider *
              </label>
              <select
                value={llmConfig.provider}
                onChange={(e) => setLlmConfig({...llmConfig, provider: e.target.value as LLMProvider, model: ''})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                API Key *
              </label>
              <input
                type="password"
                value={llmConfig.apiKey}
                onChange={(e) => setLlmConfig({...llmConfig, apiKey: e.target.value})}
                placeholder={`Your ${llmConfig.provider === 'openai' ? 'OpenAI' : llmConfig.provider === 'anthropic' ? 'Anthropic' : 'Google'} API key`}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Model (optional)
              </label>
              <input
                type="text"
                value={llmConfig.model || ''}
                onChange={(e) => setLlmConfig({...llmConfig, model: e.target.value})}
                placeholder={
                  llmConfig.provider === 'openai' ? 'e.g., gpt-4o (default)' :
                  llmConfig.provider === 'anthropic' ? 'e.g., claude-3-5-sonnet-20241022 (default)' :
                  'e.g., gemini-1.5-pro (default)'
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Temperature (optional)
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={llmConfig.temperature ?? 0.3}
                onChange={(e) => setLlmConfig({...llmConfig, temperature: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Tokens (optional)
              </label>
              <input
                type="number"
                min="1"
                max="32000"
                step="1"
                value={llmConfig.maxTokens ?? 4096}
                onChange={(e) => setLlmConfig({...llmConfig, maxTokens: parseInt(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSaveConfig}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'json'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FileJson className="w-4 h-4" />
            Notebook Preview
          </button>
        </div>
        <button
          onClick={handleRefreshNotebook}
          disabled={isRefreshing}
          className="mr-2 p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh notebook state"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg font-medium mb-2">Welcome to Kaggle Coding Agent</p>
                <p className="text-sm">Chat with the notebook or write code using LLMs</p>
              </div>
            )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Agent is working...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Enter your prompt... (Shift+Enter for new line)"
                disabled={isLoading}
                rows={3}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none overflow-y-auto"
                style={{ maxHeight: '200px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!notebookState ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p className="text-sm">No notebook data available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notebookState.cells.map((cell) => (
                <div
                  key={cell.id}
                  className="border border-gray-200 rounded-lg p-3 bg-white"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {cell.type === 'code' ? (
                      <Code className="w-4 h-4 text-blue-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-green-600" />
                    )}
                    <span className="font-medium text-gray-700 text-sm">
                      Cell {cell.index} ({cell.type})
                    </span>
                  </div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-96 bg-gray-50 p-2 rounded border border-gray-100">
                    {cell.source}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
