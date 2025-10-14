# lectureVideoPlayer

An easy-to-use player for recorded lectures that brings video together with slide thumbnails and searchable page text. It focuses on smooth navigation, quick lookup, and a comfortable viewing experience—whether you’re studying, reviewing, or sharing the recording offline.

## Features
- Synchronized video and page thumbnails
- Search within extracted page text with next/prev navigation
- Rich media controls: play/pause, seek, volume, mute, speed control (0.25–2x)
- Keyboard shortcuts and fullscreen support
- Theme and layout options (via UI controls)

## Keyboard Shortcuts
- **Play/Pause:** Space or K
- **Previous/Next page:** Left/Right Arrow
- **First/Last page:** Home/End
- **Volume up/down:** Up/Down Arrow
- **Mute/Unmute:** M
- **Toggle fullscreen:** F
- **Playback speed:** `>` (faster), `<` (slower), `0` or `=` (reset to 1x)
- **Show help dialog:** ?

## Tech Stack
- **Language:** TypeScript
- **Framework:** Vue 3 (Composition API)
- **Build tool:** Vite 7
- **State management:** Pinia
- **Styling:** Tailwind CSS v4 + DaisyUI
- **Virtualization:** vue-virtual-scroller
- **Icons:** @fluentui/svg-icons
- **Testing:** Vitest + Vue Test Utils
- **Linting/formatting:** ESLint + dprint

## Project Structure
- **HTML entry:** `index.html` (mounts the app and includes the module script)
- **App bootstrap:** `src/main.ts` (creates Vue app, registers global components, mounts `#app`)
- **Vite config:** `vite.config.ts` (plugins, aliases, single-file build settings)
- **Components:** `src/components/` (Vue components for UI)
- **Composables:** `src/composables/` (Vue 3 composition functions)
- **Stores:** `src/stores/` (Pinia state management)
- **Utils:** `src/utils/` (utility functions)
- **Schemas:** `src/schemas/` (Zod validation schemas)

## Requirements
- **Node.js:** 18.18+ (recommended: latest LTS 20+ or 22)
- **npm:** Comes with Node.js
- **Browser:** Modern evergreen browser. Dev server and features target ES2018+ (Vite 7). Tested with Chrome/Edge ≥ 100, Firefox ≥ 100, Safari ≥ 15.

## Getting Started

### Development
1. Install dependencies:
   ```bash
   npm install
   ```

2. Put sample content in place (optional but recommended for local testing):
   - Place a video file named `dev.mp4` at the project root (or `public/`).
   - Place a data file named `dev.data` at the project root (or `public/`). The file should be JSON text containing an array of objects with shape:
     ```json
     [
       { "time": 0, "text": "<base64 text>", "thumb": "data:image/png;base64,..." }
     ]
     ```
     where `time` is the timestamp (miliseconds), `text` is base64-encoded extracted text for that page, and `thumb` is a PNG data URL (base64-encoded) for the page thumbnail.

3. Start the development server:
   ```bash
   npm run dev
   ```
   Vite will display the local and network URLs in the terminal.

4. Open the app in your browser (typically `http://localhost:5173`).

Notes:
- In development, the app loads `/dev.mp4` and `/dev.data` automatically if present (see `src/stores/contentStore.ts`).

### Production Build (single-file)
This project is configured to inline all built JS and CSS into the final `dist/index.html` using `vite-plugin-singlefile`.

Build:
```bash
npm run build
```

Result:
- `dist/index.html` contains all inlined JS and CSS (no external files)
- The app can run completely offline from the single HTML file **requiring a video file to be present in the same directory**.

How it gets its data in production:
- The build expects your pipeline to inject two placeholders used by the app at runtime:
  - `#{videoSourcePath}`: Path/URL to the video file to play
  - `#{pageModelData}`: A JSON string (not base64) matching the `dev.data` structure above
- See `src/stores/contentStore.ts` for where these placeholders are referenced.

Tip: Because everything is bundled into one HTML, you can open `dist/index.html` directly from the file system. If your environment imposes restrictions on `file://` URLs, serve it via a simple static server instead (`npm run preview`).

## Available Scripts
All scripts are defined in `package.json`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (with `--host` for network access) |
| `npm run build` | Type-check with `vue-tsc -b` and build with Vite (single-file output) |
| `npm run preview` | Preview the built app locally |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npm run format` | Format files with dprint |
| `npm run format:check` | Check formatting with dprint |
| `npm run test` | Run the test suite once with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests and generate coverage report |

## Contributing
1. Before committing, run linting and formatting:
   ```bash
   npm run lint
   npm run format
   ```
2. Submit changes via pull request with a clear description of proposed changes.
3. Report issues using the GitHub issue tracker.

## License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full text.

**Copyright (c) 2025 lectureStudio.**

### Third‑party Licenses
Third-party packages are subject to their respective licenses:

Runtime dependencies:
- **Vue and related tooling** (MIT): [vuejs](https://github.com/vuejs/)
- **Tailwind CSS** (MIT): [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss)
- **DaisyUI** (MIT): [saadeghi/daisyui](https://github.com/saadeghi/daisyui)
- **Pinia** (MIT): [vuejs/pinia](https://github.com/vuejs/pinia)
- **Fluent UI System Icons** (MIT): [microsoft/fluentui-system-icons](https://github.com/microsoft/fluentui-system-icons)
- **Vue Virtual Scroller** (MIT): [akryum/vue-virtual-scroller](https://github.com/Akryum/vue-virtual-scroller)

Note: Third-party packages are subject to their own licenses; see their repositories for full texts.
