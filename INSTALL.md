# Installation Checklist

Follow this checklist to ensure proper installation of the Kaggle Notebook Automation extension.

## ✅ Pre-Installation

- [ ] Node.js v18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Chrome browser installed
- [ ] OpenAI API key ready

## ✅ Step 1: Dependencies

```bash
cd /Users/yogesh/projects/kaggle_extension
npm install
```

**Verify**: Check that `node_modules/` folder is created

## ✅ Step 2: Icons

**Option A: Browser-based (Recommended)**
1. Open `generate-icons.html` in browser
2. Download all 3 icons (16x16, 48x48, 128x128)
3. Move to `icons/` folder

**Option B: ImageMagick**
```bash
./create-icons.sh
```

**Verify**: Check that these files exist:
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

## ✅ Step 3: Build

```bash
npm run build
```

**Verify**: Check that `dist/` folder contains:
- `background.js`
- `content.js`
- `sidepanel.html`
- `manifest.json`
- `icons/` folder with 3 PNG files
- `assets/` folder with CSS

## ✅ Step 4: Load Extension

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `dist/` folder
6. Extension appears in list

**Verify**: 
- Extension shows in Chrome toolbar
- No error messages in extension card
- Extension is enabled (toggle is on)

## ✅ Step 5: Test on Kaggle

1. Go to https://www.kaggle.com/code/
2. Open any notebook or create new one
3. Click extension icon in toolbar
4. Side panel opens on right

**Verify**:
- Side panel displays "Kaggle Automation" header
- Settings icon visible
- Input box at bottom
- No console errors (F12)

## ✅ Step 6: Configure API Key

1. Click settings icon (⚙️) in side panel
2. Enter OpenAI API key
3. Click "Save"
4. Yellow settings panel closes

**Verify**:
- Alert shows "API key saved successfully"
- Settings panel closes
- Key persists after refresh

## ✅ Step 7: Test Automation

Try this simple prompt:
```
Show me the current notebook structure
```

**Verify**:
- Message appears in chat
- Agent responds
- No errors in console

## 🔧 Troubleshooting

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Extension Won't Load
- Ensure you selected `dist/` folder, not root folder
- Check Chrome console for errors
- Verify manifest.json is in dist/

### Icons Missing
- Use `generate-icons.html` to create them
- Ensure files are named exactly: `icon16.png`, `icon48.png`, `icon128.png`
- Rebuild after adding icons

### Side Panel Won't Open
- Ensure you're on a Kaggle page
- Check extension is enabled
- Try reloading the page

### Agent Not Responding
- Verify API key is saved
- Check browser console (F12) for errors
- Ensure you're on a Kaggle notebook page (not just kaggle.com)

## 📋 File Checklist

After build, verify these files exist in `dist/`:

```
dist/
├── background.js
├── content.js
├── sidepanel.html
├── manifest.json
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── assets/
    ├── index-[hash].css
    └── sidepanel-[hash].js
```

## 🎯 Success Criteria

You've successfully installed when:
- ✅ Extension loads without errors
- ✅ Side panel opens on Kaggle notebooks
- ✅ Notebook state is parsed and displayed
- ✅ Agent responds to prompts
- ✅ Tools can manipulate notebook cells

## 📚 Next Steps

- Read [QUICKSTART.md](QUICKSTART.md) for usage examples
- Check [README.md](README.md) for full documentation
- Review [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture

## 🆘 Still Having Issues?

1. Check browser console (F12) for errors
2. Verify all dependencies installed correctly
3. Ensure you're using Chrome (not Firefox/Safari)
4. Try rebuilding: `npm run build`
5. Check that Kaggle hasn't changed their DOM structure

---

**Installation Time**: ~5-10 minutes
**Difficulty**: Beginner-friendly
**Support**: Check console logs for debugging
