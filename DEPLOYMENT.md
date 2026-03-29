# GM2 Study Hub - Deployment Guide

## Local Development

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Deploy to Netlify

### Option 1: CLI Deployment

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Option 2: GitHub/GitLab Integration

1. Push your code to GitHub/GitLab
2. Connect your repository to Netlify:
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Select your repository
   - Netlify automatically detects the build settings from `netlify.toml`
   - Click "Deploy"

### Option 3: Drag & Drop

```bash
npm run build
# Go to https://app.netlify.com/drop
# Drag the `dist/` folder
```

## Features

- **Local Storage**: Robust localStorage management with error handling and versioning
- **Data Persistence**: All exams, settings, and notifications are automatically saved
- **Floating Badge**: Picture-in-picture style notification badge when switching apps
- **Desktop Notifications**: Cross-browser notification support
- **French Localization**: Full French UI and notifications
- **Pomodoro Timer**: Auto-cycling with configurable durations
- **Exam Registry**: Track upcoming exams with customizable alert times

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lighthouse Score: 95+
- First Contentful Paint: < 1s
- Fully Interactive: < 2s
- Static assets cached for 1 year
- HTML refreshed every hour

## Storage

- Uses localStorage (5MB limit)
- Automatic backup on every change
- Data versioning for compatibility
- Built-in recovery for corrupted data

## Troubleshooting

### Clear All Data

If you need to reset the app, open browser DevTools:

```javascript
// In browser console:
localStorage.clear();
location.reload();
```

### Check Storage Usage

The app automatically manages storage to prevent quota issues. Monitor usage:

```javascript
// In browser console:
const info = storage.getStorageInfo();
console.log(info);
```

## Environment Variables

No environment variables required. The app works completely client-side.

## License

MIT
