import { runAgent } from './agent';
import { ChromeMessage } from './types';

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((message: ChromeMessage) => {

  if (message.type === 'RUN_AGENT') {
    const { prompt, notebookState, llmConfig, mode } = message.payload;

    // Run the agent asynchronously
    runAgent(prompt, notebookState, llmConfig, mode || 'code')
      .then(response => {
        // Send response back to side panel
        chrome.runtime.sendMessage({
          type: 'AGENT_RESPONSE',
          payload: { response }
        });
      })
      .catch(error => {
        console.error('Error running agent:', error);
        chrome.runtime.sendMessage({
          type: 'AGENT_RESPONSE',
          payload: { response: `Error: ${error.message}` }
        });
      });

    // Return true to indicate async response
    return true;
  }

  // Forward other messages to the appropriate destination
  if (message.type === 'NOTEBOOK_STATE_UPDATE') {
    // Forward to side panel
    chrome.runtime.sendMessage(message);
  }

  return false;
});
