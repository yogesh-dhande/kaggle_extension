#!/bin/bash

# Simple script to create placeholder icons using ImageMagick
# If ImageMagick is not installed, you'll need to create icons manually

if command -v convert &> /dev/null; then
    echo "Creating placeholder icons..."
    
    # Create a simple blue square with white text
    convert -size 128x128 xc:#2563eb -gravity center -pointsize 60 -fill white -annotate +0+0 "K" icons/icon128.png
    convert icons/icon128.png -resize 48x48 icons/icon48.png
    convert icons/icon128.png -resize 16x16 icons/icon16.png
    
    echo "Icons created successfully!"
else
    echo "ImageMagick not found. Please create icons manually or install ImageMagick."
    echo "Alternatively, you can use online tools to create icons."
fi
