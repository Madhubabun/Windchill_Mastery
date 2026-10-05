# Deploying the website

`npm run build:web` produces a static site in `apps/web/out`. Upload that folder to any static
host. Pages use trailing-slash URLs (`/learn/fundamentals/`), which every static host serves as
`.../index.html`.

| Host | Settings |
| --- | --- |
| **Netlify** | Build command `npm run build:web`, publish directory `apps/web/out` |
| **Vercel** | Framework "Other", build command `npm run build:web`, output directory `apps/web/out` |
| **Cloudflare Pages** | Build command `npm run build:web`, output directory `apps/web/out` |
| **GitHub Pages** | Use an Action that runs `npm ci && npm run build:web` and uploads `apps/web/out`. Serving from a sub-path (`user.github.io/repo/`) needs `basePath` in `apps/web/next.config.ts`; a custom domain avoids that |
| **Any web server / S3** | Copy the folder; make sure 404s serve `404.html` |

Notes:

- Serve over HTTPS. The offline cache (service worker) and PWA install only work on HTTPS or
  localhost.
- `sw.js` should not be cached by the CDN for long (it changes every build). The other files under
  `_next/static` are content-hashed and can be cached forever.
- Cheat-sheet PDFs need Chromium at build time (`CHROMIUM_PATH`). Most CI images have it through
  Playwright; if not, the site still builds and the Download PDF link simply 404s until it's added.
- Learner progress is stored in each browser, so moving to a new domain starts learners fresh
  unless they export and import their data.
