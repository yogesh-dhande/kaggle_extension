# Kaggle Notebook Automation - Project Summary

## Overview

A Chrome Manifest V3 extension that uses AI agents (LangGraph + OpenAI) to automate Kaggle notebooks through natural language commands.

## Key Features

✅ **AI-Powered Automation** - Natural language control via LangGraph agents
✅ **DOM Parsing** - Extracts notebook state (cells, content, outputs)
✅ **Cell Management** - Add, update, and execute code/markdown cells
✅ **Side Panel UI** - React + Tailwind CSS chat interface
✅ **Real-time Sync** - Mutation observer tracks notebook changes
✅ **Tool Calling** - Agent uses 4 tools to manipulate notebooks

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Side Panel │◄────────┤  Background  ├────────►│   Content   │
│   (React)   │         │   Worker     │         │   Script    │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
  User Input            LangGraph Agent            Kaggle DOM
                        + OpenAI GPT-4
```

## File Structure

```
kaggle_extension/
├── src/
│   ├── components/
│   │   ├── App.tsx              # Main React app with chat UI
│   │   ├── ChatMessage.tsx      # Message bubble component
│   │   └── NotebookView.tsx     # Collapsible notebook state viewer
│   ├── agent.ts                 # LangGraph agent with 4 tools
│   ├── background.ts            # Service worker (message routing)
│   ├── content.ts               # DOM parser & manipulation
│   ├── sidepanel.tsx            # React entry point
│   ├── types.ts                 # TypeScript interfaces
│   └── index.css                # Tailwind imports
├── manifest.json                # Chrome extension manifest
├── package.json                 # Dependencies & scripts
├── vite.config.ts               # Build configuration
├── tailwind.config.js           # Tailwind setup
├── tsconfig.json                # TypeScript config
├── copy-files.js                # Post-build script
├── generate-icons.html          # Icon generator tool
├── README.md                    # Full documentation
├── SETUP.md                     # Detailed setup guide
└── QUICKSTART.md                # 5-minute quick start
```

## Core Components

### 1. Content Script (`content.ts`)
- **Purpose**: Interact with Kaggle notebook DOM
- **Key Functions**:
  - `parseNotebook()` - Extract all cells with content/outputs
  - `executeCell(index)` - Click run button via shadow DOM
  - `addCodeCell(index, content)` - Insert new code cell
  - `addMarkdownCell(index, content)` - Insert new markdown cell
  - `updateCell(index, content)` - Modify existing cell
- **DOM Selectors**:
  - Cells container: `[aria-label='Cells']`
  - Code cells: `[data-language='python']`
  - Execute button: `.cell-execution-button` (in shadow root)

### 2. LangGraph Agent (`agent.ts`)
- **Model**: GPT-4o-mini with tool calling
- **Tools**:
  1. `add_code_cell` - Insert Python code cell
  2. `add_markdown_cell` - Insert documentation cell
  3. `update_cell` - Modify existing cell content
  4. `execute_cell` - Run a code cell
- **Workflow**: StateGraph with agent → tools → agent loop

### 3. Side Panel (`App.tsx`)
- **UI Components**:
  - Settings panel for API key storage
  - Collapsible notebook state viewer
  - Chat interface with message history
  - Loading states and error handling
- **State Management**: React hooks for messages, notebook state, API key

### 4. Background Worker (`background.ts`)
- **Responsibilities**:
  - Route messages between content script and side panel
  - Run LangGraph agent with user prompts
  - Handle extension icon clicks (open side panel)

## Message Flow

```
User Input → Side Panel → Background Worker → Agent → Tools → Content Script → Kaggle DOM
                                                                      ↓
Side Panel ← Background Worker ← Agent Response ← Tool Results ← Content Script
```

## Message Types

- `GET_NOTEBOOK_STATE` - Request current notebook structure
- `ADD_CODE_CELL` - Insert code cell at index
- `ADD_MARKDOWN_CELL` - Insert markdown cell at index
- `UPDATE_CELL` - Modify cell content
- `EXECUTE_CELL` - Run code cell
- `RUN_AGENT` - Execute agent with prompt
- `NOTEBOOK_STATE_UPDATE` - Broadcast notebook changes
- `AGENT_RESPONSE` - Return agent result to UI

## Technologies

| Category | Technology | Version |
|----------|-----------|---------|
| Extension | Manifest V3 | - |
| Frontend | React | 18.3.1 |
| Styling | Tailwind CSS | 3.4.4 |
| Icons | Lucide React | 0.400.0 |
| AI Agent | LangGraph | 0.0.30 |
| LLM | OpenAI GPT-4 | via @langchain/openai |
| Language | TypeScript | 5.5.3 |
| Build Tool | Vite | 5.3.3 |
| Validation | Zod | 3.23.8 |

## Setup Steps

1. **Install**: `npm install`
2. **Icons**: Open `generate-icons.html`, download 3 icons to `icons/`
3. **Build**: `npm run build`
4. **Load**: Chrome → Extensions → Load unpacked → Select `dist/`
5. **Configure**: Open extension → Settings → Add OpenAI API key
6. **Use**: Navigate to Kaggle notebook → Send prompts

## Development Commands

```bash
npm install        # Install dependencies
npm run build      # Production build
npm run dev        # Development with watch mode
npm run type-check # TypeScript validation
```

## Example Usage

**Prompt**: "Add a code cell that imports pandas, numpy, and matplotlib"

**Agent Actions**:
1. Calls `add_code_cell` tool with index and content
2. Content script inserts cell into DOM
3. Returns success message to user

**Prompt**: "Execute the first 3 cells"

**Agent Actions**:
1. Calls `execute_cell` tool 3 times (index 0, 1, 2)
2. Content script clicks run buttons via shadow DOM
3. Returns execution status

## DOM Parsing Logic

The extension uses the DOM structure you provided:

```javascript
// Execute cell
document.querySelector("[aria-label='Cells']")
  .querySelector(".jp-InputArea-prompt")
  .shadowRoot
  .querySelector(".cell-execution-button")
  .querySelector("[role='button']")
  .click()

// Get code content
document.querySelector("[data-language='python']")
```

## Future Enhancements

- [ ] Support for more cell types (SQL, R)
- [ ] Batch operations (execute all, clear outputs)
- [ ] Cell reordering and deletion
- [ ] Export notebook as .ipynb
- [ ] Conversation history persistence
- [ ] Multi-notebook support
- [ ] Custom agent prompts/personas

## Notes

- API key stored in Chrome local storage (secure)
- TypeScript errors before `npm install` are expected
- DOM selectors may need updates if Kaggle changes UI
- Shadow DOM access required for execution buttons
- Extension only works on `https://www.kaggle.com/code/*`

## License

MIT
