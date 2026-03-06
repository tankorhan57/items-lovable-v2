

# Add Dark Mode Toggle

## Overview
Add a dark mode toggle to the app using `next-themes` (already installed). The dark palette is already defined in `index.css` -- we just need to wire up the theme provider and add a toggle in Settings.

## Changes

### 1. `index.html`
- Add `class="light"` to `<html>` tag to set the default theme and prevent flash of unstyled content.

### 2. `src/App.tsx`
- Wrap the app with `ThemeProvider` from `next-themes` with `attribute="class"`, `defaultTheme="light"`, and `storageKey="app-theme"`.

### 3. `src/pages/SettingsPage.tsx`
- Add a "Dark mode" toggle row (using `useTheme` from `next-themes`) between the "Private account" toggle and the Save button.
- Uses a Switch component, toggling between `"light"` and `"dark"`.
- Icon: `Moon` from lucide-react.

## Technical Details

- `next-themes` is already a dependency and `useTheme` is already used in `sonner.tsx`.
- The `.dark` class variables are fully defined in `index.css` with the refined high-contrast palette.
- `ThemeProvider` with `attribute="class"` will toggle the `dark` class on `<html>`, which Tailwind's `darkMode: ["class"]` config already supports.
- Theme preference persists in localStorage automatically via `next-themes`.

No database changes needed. No new dependencies needed.

