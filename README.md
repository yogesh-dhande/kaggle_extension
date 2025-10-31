# Kaggle Notebook Automation Extension

A Chrome extension that automates Kaggle notebooks using AI agents powered by LangGraph and Azure OpenAI.

## Features

- 🤖 **AI-Powered Automation**: Use natural language to control your Kaggle notebooks
- 📝 **Cell Management**: Add, update, and execute code and markdown cells
- 🔄 **Real-time Sync**: Automatically tracks notebook state changes
- 💬 **Chat Interface**: Intuitive side panel for sending prompts
- 🛠️ **LangGraph Integration**: Sophisticated agent workflow with tool calling

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd kaggle_extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Setup

1. Click the extension icon when on a Kaggle notebook page
2. Click the settings icon in the side panel
3. Enter your Azure OpenAI configuration:
   - API Key
   - Instance Name
   - Deployment Name
   - API Version (optional)
4. Click "Save Configuration"

See [AZURE_SETUP.md](AZURE_SETUP.md) for detailed Azure configuration instructions.

## Usage

Once installed and configured, you can:

1. **View Notebook State**: The extension automatically parses and displays your notebook structure
2. **Send Prompts**: Type natural language commands like:
   - "Add a code cell that imports pandas and numpy"
   - "Update cell 3 to include data visualization"
   - "Execute the first 5 cells"
   - "Add a markdown cell explaining the data preprocessing steps"

3. **Agent Actions**: The AI agent will use the appropriate tools to:
   - Add code cells at specific indices
   - Add markdown cells for documentation
   - Update existing cell content
   - Execute cells to run code

## Architecture

- **Content Script** (`content.ts`): Parses Kaggle notebook DOM and executes actions
- **Background Script** (`background.ts`): Coordinates between components
- **Side Panel** (`sidepanel.tsx`): React-based UI for user interaction
- **Agent** (`agent.ts`): LangGraph-powered AI agent with tool calling

## Tools Available to the Agent

1. **add_code_cell**: Insert a new Python code cell
2. **add_markdown_cell**: Insert a new markdown cell
3. **update_cell**: Modify existing cell content
4. **execute_cell**: Run a code cell

## Development

- **Dev mode with watch**: `npm run dev`
- **Production build**: `npm run build`
- **Type checking**: `npm run type-check`

## Technologies

- **Manifest V3**: Latest Chrome extension standard
- **React**: Modern UI framework
- **Tailwind CSS**: Utility-first styling
- **LangGraph**: Agent workflow orchestration
- **OpenAI**: GPT-4 for intelligent automation
- **TypeScript**: Type-safe development
- **Vite**: Fast build tooling

## Notes

- The extension requires an active Kaggle notebook page to function
- Some DOM manipulation features may need adjustment based on Kaggle's UI updates
- API key is stored locally in Chrome storage

## License

MIT
