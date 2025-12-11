# Assets Documentation

## Overview

The assets folder contains static files and resources used by the Part Management System, primarily focusing on favicon and icon assets for web browsers and mobile devices.

## Favicon Assets

### Icon Files

**Standard Favicons:**
- `favicon.ico`: Traditional favicon format (multiple sizes embedded)
- `favicon-16x16.png`: Small favicon for browser tabs
- `favicon-32x32.png`: Standard favicon size

**Apple Touch Icon:**
- `apple-touch-icon.png`: Icon for iOS home screen (180x180px)

**Android Chrome Icons:**
- `android-chrome-192x192.png`: Small Android home screen icon
- `android-chrome-512x512.png`: Large Android splash screen icon

### Web App Manifest

**`site.webmanifest`**: Progressive Web App configuration
```json
{
  "name": "tools.w3cub.com",
  "short_name": "",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

### HTML Link Tags

**`index.html`**: Standard favicon link tags for web browsers
```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" href="/favicon.ico">
<link rel="manifest" href="/site.webmanifest">
```

## Usage

### Integration
Include the favicon HTML links in the main HTML document:
```html
<head>
  <!-- Include favicon links from favicon/index.html -->
</head>
```

### Deployment
- Copy favicon files to web server root directory
- Ensure correct paths in HTML and manifest
- Configure web server to serve favicon files with appropriate MIME types

## File Specifications

| File | Size | Purpose |
|------|------|---------|
| `favicon.ico` | ~1KB | Multi-size ICO file |
| `favicon-16x16.png` | ~0.5KB | Browser tab icon |
| `favicon-32x32.png` | ~1KB | Browser tab icon (high DPI) |
| `apple-touch-icon.png` | ~5KB | iOS home screen |
| `android-chrome-192x192.png` | ~8KB | Android home screen |
| `android-chrome-512x512.png` | ~20KB | Android splash screen |

## Maintenance

### Updating Favicons
1. Generate new favicon files in required sizes
2. Replace existing PNG files
3. Update ICO file with multiple sizes
4. Test in various browsers and devices
5. Update manifest if icon paths change

### Browser Testing
- Chrome DevTools Application tab (PWA features)
- Safari Web Inspector (iOS simulation)
- Firefox Page Info dialog
- Real device testing on iOS/Android

## Notes

- The web manifest references "tools.w3cub.com" which may need updating for production deployment
- All icons use PNG format for optimal quality
- Favicons are optimized for both light and dark browser themes
- Progressive Web App (PWA) ready configuration included