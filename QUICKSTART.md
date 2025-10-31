# Quick Start Guide

Get your Kaggle Notebook Automation extension up and running in 5 minutes!

## 1. Install Dependencies (2 min)

```bash
npm install
```

## 2. Generate Icons (1 min)

Open `generate-icons.html` in your browser:

```bash
open generate-icons.html
```

Click the three download buttons to get:
- icon16.png
- icon48.png
- icon128.png

Move these files to the `icons/` folder.

## 3. Build Extension (1 min)

```bash
npm run build
```

## 4. Load in Chrome (1 min)

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist/` folder
5. Done! ✅

## 5. Configure & Test (1 min)

1. Go to any Kaggle notebook: https://www.kaggle.com/code/
2. Click the extension icon
3. Click settings ⚙️ and add your OpenAI API key
4. Try: "Add a code cell that imports pandas and numpy"

## Example Prompts

- **"Show me the notebook structure"** - View all cells
- **"Add a code cell at index 0 that imports common libraries"** - Insert code
- **"Update cell 2 to include matplotlib"** - Modify existing cell
- **"Execute the first cell"** - Run code
- **"Add a markdown cell explaining the dataset"** - Add documentation

## Troubleshooting

**No icons?** Use `generate-icons.html` to create them.

**Build fails?** Run `npm install` first.

**Extension not loading?** Make sure you selected the `dist/` folder.

**Agent not responding?** Check your API key in settings.

## Next Steps

- Read [SETUP.md](SETUP.md) for detailed configuration
- Check [README.md](README.md) for full documentation
- Explore the code in `src/` to customize behavior

Happy automating! 🚀
