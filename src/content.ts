import { NotebookCell, NotebookState, ChromeMessage } from './types';

// Check if we're in an iframe or main window
const isInIframe = window.self !== window.top;
const isJupyterFrame = window.location.href.includes('jupyter-proxy.kaggle.net');

console.log('Kaggle Notebook Automation content script loaded');
console.log('Context:', {
  isInIframe,
  isJupyterFrame,
  url: window.location.href,
  origin: window.location.origin
});

// DOM parsing utilities for Kaggle notebooks
class KaggleNotebookParser {
  private getCellsContainer(): Element | null {
    // Kaggle uses role="feed" with aria-label="Cells"
    const container = document.querySelector('[role="feed"][aria-label="Cells"]');
    
    if (container) {
      console.log('✅ Found cells container: [role="feed"][aria-label="Cells"]');
      return container;
    }
    
    console.error('❌ Could not find cells container');
    console.log('Available elements with role="feed":', document.querySelectorAll('[role="feed"]'));
    console.log('Available elements with aria-label="Cells":', document.querySelectorAll('[aria-label="Cells"]'));
    return null;
  }

  private getAllCells(): Element[] {
    const container = this.getCellsContainer();
    if (!container) {
      console.warn('No container found, cannot get cells');
      return [];
    }
    
    // Kaggle cells have class .jp-Cell
    const cells = Array.from(container.querySelectorAll('.jp-Cell'));
    console.log(`Found ${cells.length} cells with selector: .jp-Cell`);
    
    return cells;
  }

  private getCellType(cell: Element): 'code' | 'markdown' {
    // Check cell class names
    if (cell.classList.contains('jp-CodeCell')) {
      return 'code';
    }
    if (cell.classList.contains('jp-MarkdownCell')) {
      return 'markdown';
    }
    // Fallback: check for code editor
    if (cell.querySelector("[data-language='python']")) {
      return 'code';
    }
    return 'markdown';
  }

  private getCellContent(cell: Element): string {
    const type = this.getCellType(cell);
    
    if (type === 'code') {
      // Code is in .cm-content with data-language="python"
      // Each line is in a .cm-line div
      const codeContent = cell.querySelector('.cm-content[data-language="python"]');
      if (codeContent) {
        const lines = Array.from(codeContent.querySelectorAll('.cm-line'));
        return lines.map(line => line.textContent || '').join('\n');
      }
      return '';
    } else {
      // Markdown: try rendered view first, then editor
      const rendered = cell.querySelector('.jp-RenderedHTMLCommon');
      if (rendered) {
        return rendered.textContent || '';
      }
      
      // If not rendered, get from editor
      const editor = cell.querySelector('.cm-content[data-language="markdown"]');
      if (editor) {
        const lines = Array.from(editor.querySelectorAll('.cm-line'));
        return lines.map(line => line.textContent || '').join('\n');
      }
      
      return '';
    }
  }

  private getCellOutputs(cell: Element): string[] {
    const outputs: string[] = [];
    const outputArea = cell.querySelector('.jp-OutputArea');
    
    if (outputArea) {
      const outputElements = outputArea.querySelectorAll('.jp-OutputArea-output');
      outputElements.forEach(output => {
        const text = output.textContent?.trim();
        if (text) outputs.push(text);
      });
    }
    
    return outputs;
  }

  public parseNotebook(): NotebookState {
    console.log('=== Starting notebook parse ===');
    console.log('Current URL:', window.location.href);
    
    const cells = this.getAllCells();
    console.log(`Total cells found: ${cells.length}`);
    
    const notebookCells: NotebookCell[] = cells.map((cell, index) => {
      const cellType = this.getCellType(cell);
      const cellContent = this.getCellContent(cell);
      const cellOutputs = this.getCellOutputs(cell);
      
      console.log(`Cell ${index}:`, {
        type: cellType,
        contentLength: cellContent.length,
        outputsCount: cellOutputs.length
      });
      
      return {
        id: `cell-${index}`,
        type: cellType,
        source: cellContent,
        outputs: cellOutputs,
        index
      };
    });

    const state = {
      cells: notebookCells,
      metadata: {
        url: window.location.href,
        timestamp: Date.now()
      }
    };
    
    console.log('=== Notebook parse complete ===');
    console.log('Final state:', state);
    
    return state;
  }

  // Helper to check if a cell is active
  private isCellActive(cell: Element): boolean {
    return cell.classList.contains('jp-mod-active');
  }

  // Helper to get the currently active cell index
  private getActiveCellIndex(): number {
    const cells = this.getAllCells();
    for (let i = 0; i < cells.length; i++) {
      if (this.isCellActive(cells[i])) {
        return i;
      }
    }
    return -1;
  }

  // Navigate to a specific cell by simulating a real mouse click
  private async navigateToCell(targetIndex: number): Promise<boolean> {
    const cells = this.getAllCells();
    if (targetIndex < 0 || targetIndex >= cells.length) {
      console.error(`Target index ${targetIndex} out of bounds`);
      return false;
    }

    console.log(`Navigating to cell ${targetIndex}`);

    const targetCell = cells[targetIndex] as HTMLElement;
    const rect = targetCell.getBoundingClientRect();
    const clientX = rect.left + 10;
    const clientY = rect.top + 10;
    
    // Simulate a real mouse click sequence with coordinates
    const mouseDownEvent = new MouseEvent('mousedown', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: clientX,
      clientY: clientY
    });
    
    const mouseUpEvent = new MouseEvent('mouseup', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: clientX,
      clientY: clientY
    });
    
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: clientX,
      clientY: clientY
    });
    
    targetCell.dispatchEvent(mouseDownEvent);
    targetCell.dispatchEvent(mouseUpEvent);
    targetCell.dispatchEvent(clickEvent);
    
    // Wait for the UI to update and execution button to appear
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the cell is now active
    const activeIndex = this.getActiveCellIndex();
    if (activeIndex !== targetIndex) {
      console.error(`Failed to activate cell ${targetIndex}, active is ${activeIndex}`);
      return false;
    }
    
    console.log(`Successfully navigated to cell ${targetIndex}`);
    return true;
  }

  // Execute a cell by clicking its run button
  public async executeCell(index: number): Promise<boolean> {
    try {
      const cells = this.getAllCells();
      if (index < 0 || index >= cells.length) {
        console.error(`Cell index ${index} out of bounds`);
        return false;
      }

      // Navigate to the target cell
      const navigated = await this.navigateToCell(index);
      if (!navigated) {
        console.error('Failed to navigate to target cell');
        return false;
      }

      const cell = cells[index];
      
      // Find the input prompt area
      const inputPrompt = cell.querySelector('.jp-InputArea-prompt');
      if (!inputPrompt) {
        console.error('Input prompt not found');
        return false;
      }
      
      // Access the shadow root
      const shadowRoot = (inputPrompt as any).shadowRoot;
      if (!shadowRoot) {
        console.error('Shadow root not found in input prompt');
        return false;
      }
      
      // Find the execution button
      const executionButton = shadowRoot.querySelector('.cell-execution-button');
      if (!executionButton) {
        console.error('Execution button not found');
        return false;
      }
      
      // Find the button with role='button'
      const button = executionButton.querySelector('[role="button"]') as HTMLElement;
      if (!button) {
        console.error('Button element not found');
        return false;
      }
      
      // Click the button
      button.click();
      
      return true;
    } catch (error) {
      console.error('Error executing cell:', error);
      return false;
    }
  }

  // Add a new code cell at specified index
  public async addCodeCell(index: number, content: string = ''): Promise<boolean> {
    try {
      console.log(`Adding code cell at index ${index} with content: ${content}`);
      
      const cells = this.getAllCells();
      
      // Find the cell at or before the target index
      const targetCell = cells[Math.max(0, index - 1)];
      if (!targetCell) {
        console.error('No target cell found');
        return false;
      }
      
      // Find the cell footer
      const cellFooter = targetCell.querySelector('.jp-CellFooter');
      if (!cellFooter) {
        console.error('Cell footer not found');
        return false;
      }
      
      // Access the shadow root
      const shadowRoot = (cellFooter as any).shadowRoot;
      if (!shadowRoot) {
        console.error('Shadow root not found in cell footer');
        return false;
      }
      
      // Find the "Add a code cell" button in the shadow root
      const addButton = shadowRoot.querySelector('[title="Add a code cell"]');
      if (!addButton) {
        console.error('Add code cell button not found in shadow root');
        return false;
      }
      
      // Click the button to add a new cell
      (addButton as HTMLElement).click();
      
      // Wait for the cell to be created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If content is provided, set it in the new cell
      if (content) {
        const newCells = this.getAllCells();
        const newCell = newCells[index];
        if (newCell) {
          await this.updateCell(index, content);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error adding code cell:', error);
      return false;
    }
  }

  // Add a new markdown cell at specified index
  public async addMarkdownCell(index: number, content: string = ''): Promise<boolean> {
    try {
      console.log(`Adding markdown cell at index ${index} with content: ${content}`);
      
      const cells = this.getAllCells();
      
      // Find the cell at or before the target index
      const targetCell = cells[Math.max(0, index - 1)];
      if (!targetCell) {
        console.error('No target cell found');
        return false;
      }
      
      // Find the cell footer
      const cellFooter = targetCell.querySelector('.jp-CellFooter');
      if (!cellFooter) {
        console.error('Cell footer not found');
        return false;
      }
      
      // Access the shadow root
      const shadowRoot = (cellFooter as any).shadowRoot;
      if (!shadowRoot) {
        console.error('Shadow root not found in cell footer');
        return false;
      }
      
      // Find the "Add a markdown text cell" button in the shadow root
      const addButton = shadowRoot.querySelector('[title="Add a markdown text cell"]');
      if (!addButton) {
        console.error('Add markdown cell button not found in shadow root');
        return false;
      }
      
      // Click the button to add a new cell
      (addButton as HTMLElement).click();
      
      // Wait for the cell to be created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If content is provided, set it in the new cell
      if (content) {
        const newCells = this.getAllCells();
        const newCell = newCells[index];
        if (newCell) {
          await this.updateCell(index, content);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error adding markdown cell:', error);
      return false;
    }
  }

  // Update cell content
  public async updateCell(index: number, content: string): Promise<boolean> {
    try {
      console.log(`Updating cell ${index} with content: ${content}`);
      
      const cells = this.getAllCells();
      const cell = cells[index];
      
      if (!cell) {
        console.error(`Cell ${index} not found`);
        return false;
      }
      
      // Find the CodeMirror editor
      const editor = cell.querySelector('.cm-content');
      if (!editor) {
        console.error('Editor not found in cell');
        return false;
      }
      
      // Focus the editor
      (editor as HTMLElement).focus();
      
      // Select all existing content
      document.execCommand('selectAll', false);
      
      // Insert new content
      document.execCommand('insertText', false, content);
      
      return true;
    } catch (error) {
      console.error('Error updating cell:', error);
      return false;
    }
  }
}

// Initialize parser
const parser = new KaggleNotebookParser();

// Debug helper - expose to window for manual inspection
(window as any).debugKaggleParser = () => {
  console.log('=== Manual Debug ===');
  console.log('Document body:', document.body);
  console.log('All elements with role="feed":', document.querySelectorAll('[role="feed"]'));
  console.log('All elements with aria-label="Cells":', document.querySelectorAll('[aria-label="Cells"]'));
  console.log('Combined selector [role="feed"][aria-label="Cells"]:', document.querySelector('[role="feed"][aria-label="Cells"]'));
  console.log('All elements with "cell" in class:', document.querySelectorAll('[class*="cell"]'));
  console.log('All elements with "Cell" in class:', document.querySelectorAll('[class*="Cell"]'));
  console.log('All .jp-Cell elements:', document.querySelectorAll('.jp-Cell'));
  console.log('All code elements:', document.querySelectorAll('[data-language]'));
  console.log('All elements with aria-label:', document.querySelectorAll('[aria-label]'));
  console.log('Main content:', document.querySelector('main'));
  console.log('Parsed notebook:', parser.parseNotebook());
};

// Auto-run debug on load (only in iframe)
if (isJupyterFrame) {
  console.log('🔍 Running automatic DOM inspection...');
  setTimeout(() => {
    (window as any).debugKaggleParser();
  }, 2000);
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  console.log('Content script received message:', message);

  // Only handle messages in the Jupyter iframe
  if (!isJupyterFrame) {
    console.log('⏭️ Ignoring message in main window');
    return false;
  }

  switch (message.type) {
    case 'GET_NOTEBOOK_STATE':
      const notebookState = parser.parseNotebook();
      sendResponse({ success: true, data: notebookState });
      
      // Also send to side panel
      chrome.runtime.sendMessage({
        type: 'NOTEBOOK_STATE_UPDATE',
        payload: notebookState
      });
      break;

    case 'ADD_CODE_CELL':
      parser.addCodeCell(message.payload.index, message.payload.content)
        .then(success => sendResponse({ success }));
      return true; // Keep channel open for async response

    case 'ADD_MARKDOWN_CELL':
      parser.addMarkdownCell(message.payload.index, message.payload.content)
        .then(success => sendResponse({ success }));
      return true;

    case 'UPDATE_CELL':
      parser.updateCell(message.payload.index, message.payload.content)
        .then(success => sendResponse({ success }));
      return true;

    case 'EXECUTE_CELL':
      parser.executeCell(message.payload.index)
        .then(success => sendResponse({ success }));
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return false;
});

// Only run the notebook parser in the Jupyter iframe
if (!isJupyterFrame) {
  console.log('⏭️ Not in Jupyter iframe, skipping notebook parsing');
} else {
  console.log('✅ In Jupyter iframe, initializing notebook parser...');
  
  // Wait for the notebook to be fully loaded
  function waitForNotebook(callback: () => void, maxAttempts = 20) {
    let attempts = 0;
    
    const checkInterval = setInterval(() => {
      attempts++;
      console.log(`Attempt ${attempts}: Checking for notebook container...`);
      
      const container = document.querySelector('[role="feed"][aria-label="Cells"]');
      const cells = container?.querySelectorAll('.jp-Cell');
      
      if (container && cells && cells.length > 0) {
        console.log(`✅ Notebook ready! Found ${cells.length} cells`);
        clearInterval(checkInterval);
        callback();
      } else if (attempts >= maxAttempts) {
        console.warn('⚠️ Notebook not found after maximum attempts');
        clearInterval(checkInterval);
        // Call callback anyway to allow manual refresh
        callback();
      } else {
        console.log(`Container: ${!!container}, Cells: ${cells?.length || 0}`);
      }
    }, 500); // Check every 500ms
  }
  
  // Initialize when notebook is ready
  waitForNotebook(() => {
    console.log('Initializing notebook parser...');
    
    // Send initial state
    const initialState = parser.parseNotebook();
    chrome.runtime.sendMessage({
      type: 'NOTEBOOK_STATE_UPDATE',
      payload: initialState
    });
    
    // Set up mutation observer
    const observer = new MutationObserver(() => {
      console.log('DOM mutation detected, re-parsing notebook...');
      const notebookState = parser.parseNotebook();
      chrome.runtime.sendMessage({
        type: 'NOTEBOOK_STATE_UPDATE',
        payload: notebookState
      });
    });
    
    const cellsContainer = document.querySelector('[role="feed"][aria-label="Cells"]');
    if (cellsContainer) {
      observer.observe(cellsContainer, {
        childList: true,
        subtree: true,
        characterData: true
      });
      console.log('Mutation observer attached to cells container');
    }
  });
}
