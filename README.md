# Luminari Webinar Demo

This is a **demo-only version** of the Luminari frontend for webinar presentations.

## Features

### Interactive Elements
- ✅ **Side Navigation Bar** - Fully functional navigation between pages
- ✅ **Auto-start** - No login required, starts directly from the landing page

### Disabled Elements (Demo Mode)
- ❌ All text input fields
- ❌ All buttons (except navigation)
- ❌ All forms
- ❌ File upload areas
- ❌ Dropdowns and interactive cards
- ❌ Modal triggers

All disabled elements appear dimmed (60% opacity) and show a "not-allowed" cursor.

### Interactive Engagement
- 💬 **Smart Popup** - After 3 clicks on disabled elements, users see a contact popup encouraging them to reach out to the Luminari team

## Setup & Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000` and automatically display the landing page.

## Demo Mode Indicator

A yellow "DEMO MODE" badge appears in the bottom-right corner of all pages to clearly indicate this is a demo version.

## Technical Details

- **Framework:** React 18.2.0
- **Routing:** React Router DOM v6
- **Styling:** Custom CSS with LumiPath Design System
- **No Authentication Required:** Direct access to all pages via sidebar navigation

## Demo Restrictions

The demo restrictions are implemented via:
- **`src/demo-disable.css`** - Uses CSS `pointer-events: none` to disable interactions and applies visual indicators
- **`src/components/DemoClickHandler.js`** - Tracks clicks on disabled elements and shows engagement popup after 3 attempts
- Preserves full functionality for sidebar navigation

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Notes

- This is a **presentation-only version** for webinar demonstrations
- The UI is fully visible but most interactive features are disabled
- Navigation between pages is fully functional
- When users click on disabled elements 3 times, they'll see a popup encouraging them to contact the Luminari team
- For the full functional version, refer to the main repository
