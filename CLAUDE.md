@AGENTS.md

## Development Server & Expo Go
- The app runs on Expo Go (port 8081).
- Whenever starting work or before UI changes, ensure the dev server is active by running `node scripts/ensure-expo.mjs`.
- Never start duplicate web servers (`--web --port ...`) unless explicitly requested by the user.
