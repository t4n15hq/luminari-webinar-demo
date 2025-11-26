# Luminari Webinar Demo

This is a **demo-only version** of the Luminari frontend for webinar presentations.

## Features

### Interactive Elements
- ✅ **Side Navigation Bar** - Fully functional navigation between pages
- ✅ **Login Feature** - Real authentication with backend

### Disabled Elements (Demo Mode)
- ❌ All text input fields
- ❌ All buttons (except navigation and login)
- ❌ All forms (except login form)
- ❌ File upload areas
- ❌ Dropdowns and interactive cards
- ❌ Modal triggers

All disabled elements appear dimmed (60% opacity) and show a "not-allowed" cursor.

## Setup & Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Backend API**

   Update the proxy in `package.json` to point to your backend:
   ```json
   "proxy": "http://localhost:4000"
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

## Demo Credentials

Use these credentials to login during the webinar:

- **Admin:** admin@luminari.com / admin123
- **Query Only:** user.query@luminari.com / query123
- **Full Access:** user.full@luminari.com / full123
- **Custom:** user.custom@luminari.com / custom123

## Demo Mode Indicator

A yellow "DEMO MODE" badge appears in the bottom-right corner of all pages (except login) to clearly indicate this is a demo version.

## Technical Details

- **Framework:** React 18.2.0
- **Routing:** React Router DOM v6
- **Styling:** Custom CSS with LumiPath Design System
- **Authentication:** JWT-based authentication via backend API

## Demo Restrictions

The demo restrictions are implemented via `src/demo-disable.css`, which:
- Uses CSS `pointer-events: none` to disable interactions
- Applies visual indicators (reduced opacity, cursor changes)
- Preserves full functionality for sidebar navigation and login

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Notes

- This is a **presentation-only version** for webinar demonstrations
- The UI is fully visible but most interactive features are disabled
- Navigation and authentication remain fully functional
- For the full functional version, refer to the main repository
