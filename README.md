# Cursor Balance Monitor

A Chrome extension for monitoring your Cursor.com API usage balance with real-time badge notifications.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Badge Notifications** — See your API usage percentage directly on the extension icon
  - 🟢 Green (0-49%) — Low usage
  - 🟡 Yellow (50-79%) — Moderate usage
  - 🔴 Red (80-100%) — High usage

- **Popup Dashboard** — Click the extension icon to view:
  - Current API usage with progress bar
  - User email and membership type
  - Trial period status (if applicable)
  - Detailed cost breakdown (Total, Paid Models, Auto)

- **Dashboard Enhancement** — Adds a visual usage summary block on the Cursor.com dashboard page

- **Auto Refresh** — Automatically updates usage data every 5 minutes

- **Quick Actions** — Open Cursor dashboard or logout directly from the extension

## Screenshots

<details>

  ![2026-02-01 17 51 48](https://github.com/user-attachments/assets/fdf8fc04-dec7-4e70-a92f-fc32c8164662)

<summary>Click to view screenshots</summary>

### Extension Popup
The popup shows your current usage, membership type, and detailed cost breakdown.

### Dashboard Block
On the Cursor dashboard, the extension adds a summary block showing Total, Paid Models, and Auto costs.

</details>

## Installation

### From Source (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/yourusername/cursor-balance-monitor.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **Load unpacked**

5. Select the `cursor-balance-extension` folder from the cloned repository

6. The extension icon should appear in your Chrome toolbar

## Usage

1. **Login to Cursor** — Make sure you're logged in at [cursor.com](https://cursor.com)

2. **View Usage** — Click the extension icon to see your current API usage

3. **Detailed Stats** — Visit the [Cursor Dashboard](https://cursor.com/dashboard?tab=usage) to populate detailed usage breakdown (Total, Paid Models, Auto costs)

4. **Refresh** — Click the refresh button in the popup to manually update data

## How It Works

The extension works by:

1. **Background Service Worker** (`background.js`)
   - Fetches data from Cursor API endpoints every 5 minutes
   - Updates the badge with current usage percentage
   - Stores data in Chrome's local storage

2. **Content Script** (`content.js`)
   - Runs on the Cursor dashboard page
   - Parses detailed usage data from the page
   - Displays a summary block with costs breakdown
   - Sends detailed data to the extension

3. **Popup** (`popup.html/js/css`)
   - Displays all collected data in a user-friendly interface
   - Provides quick actions (refresh, open dashboard, logout)

## Permissions

The extension requires the following permissions:

| Permission | Purpose |
|------------|---------|
| `cookies` | Access Cursor.com authentication cookies |
| `storage` | Store usage data locally |
| `browsingData` | Clear data on logout |
| `alarms` | Schedule periodic data fetching |
| `host_permissions` | Access cursor.com for API requests |

## API Endpoints Used

- `https://cursor.com/api/auth/me` — User information
- `https://cursor.com/api/usage-summary` — Usage statistics
- `https://cursor.com/api/auth/stripe` — Subscription/trial information

## Project Structure

```
cursor-balance-extension/
├── manifest.json      # Extension configuration
├── background.js      # Service worker for API calls
├── content.js         # Dashboard page enhancement
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── popup.css          # Popup styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

### Requirements

- Google Chrome (or Chromium-based browser)
- Basic knowledge of Chrome Extensions

### Local Development

1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Building for Production

The extension is ready to use as-is. For Chrome Web Store submission:

1. Zip the `cursor-balance-extension` folder
2. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)

## Troubleshooting

**Badge shows "?"**
- You're not logged in to Cursor.com
- Try clicking "Log In to Cursor" in the popup

**No detailed usage data**
- Visit the [Cursor Dashboard](https://cursor.com/dashboard?tab=usage) to populate detailed stats

**Extension not updating**
- Click the refresh button in the popup
- Check if you're still logged in to Cursor.com

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License — feel free to use and modify as needed.

## Disclaimer

This extension is not affiliated with, endorsed by, or connected to Cursor or Anysphere Inc. It's an independent tool created for personal use to monitor API usage.
