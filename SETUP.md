# Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Chrome browser
- OpenAI API key

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React and React DOM
- LangGraph and LangChain
- Tailwind CSS
- TypeScript
- Vite

### 2. Create Extension Icons

You need to create three icon files in the `icons/` directory:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Option A: Use ImageMagick (if installed)**
```bash
chmod +x create-icons.sh
./create-icons.sh
```

**Option B: Create manually**
Use any image editor or online tool like:
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/

### 3. Build the Extension

```bash
npm run build
```

This will create a `dist/` folder with the compiled extension.

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from this project
5. The extension should now appear in your extensions list

### 5. Configure OpenAI API Key

1. Navigate to any Kaggle notebook: https://www.kaggle.com/code/
2. Click the extension icon in Chrome toolbar
3. The side panel will open
4. Click the settings icon (⚙️)
5. Enter your OpenAI API key
6. Click "Save"

Your API key is stored securely in Chrome's local storage.

## Development Mode

For active development with hot reload:

```bash
npm run dev
```

This will watch for file changes and rebuild automatically. You'll need to reload the extension in Chrome after each build:
1. Go to `chrome://extensions/`
2. Click the refresh icon on your extension

## Testing

1. Open a Kaggle notebook
2. Open the extension side panel
3. Try commands like:
   - "Show me the current notebook structure"
   - "Add a code cell that imports pandas"
   - "Update cell 0 to include numpy import"
   - "Execute the first cell"

## Troubleshooting

### Extension not loading
- Make sure you built the project (`npm run build`)
- Check that the `dist/` folder exists
- Verify manifest.json is in the dist folder

### Icons not showing
- Create the icon files as described in step 2
- Rebuild the extension

### Agent not responding
- Verify your OpenAI API key is correct
- Check the browser console for errors (F12)
- Ensure you're on a Kaggle notebook page

### DOM parsing issues
- Kaggle may update their UI structure
- Check browser console for errors
- You may need to update selectors in `src/content.ts`

## File Structure

```
kaggle_extension/
├── src/
│   ├── components/
│   │   ├── App.tsx           # Main React component
│   │   ├── ChatMessage.tsx   # Message display
│   │   └── NotebookView.tsx  # Notebook state viewer
│   ├── agent.ts              # LangGraph agent logic
│   ├── background.ts         # Background service worker
│   ├── content.ts            # Content script for DOM manipulation
│   ├── sidepanel.tsx         # Side panel entry point
│   ├── types.ts              # TypeScript type definitions
│   └── index.css             # Tailwind CSS imports
├── manifest.json             # Extension manifest
├── package.json              # Dependencies
├── vite.config.ts            # Build configuration
├── tailwind.config.js        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

## Next Steps

- Customize the agent prompts in `src/agent.ts`
- Adjust DOM selectors if Kaggle updates their UI
- Add more tools for additional functionality
- Improve error handling and user feedback
