# Autobiogrāfiju krājums

Bilingual Astro website for the LFK Autobiogrāfiju krājums. Developed jointly by the Archives of Latvian Folklore, ILFA, University of Latvia, and the University of Latvia Digital Humanities Centre.

Repository: https://github.com/ul-dhc/autobiografijas-lv

## Local development

Node.js 22.12 or newer and npm are required.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 8765
```

Latvian: http://127.0.0.1:8765/ · English: http://127.0.0.1:8765/en/

```sh
npm run check
npm test
npm run build
npm run verify
```

To verify the GitHub project path locally:

```sh
SITE_URL=https://dhc.lu.lv BASE_PATH=/autobiografijas-lv/ npm run build
BASE_PATH=/autobiografijas-lv/ npm run verify
BASE_PATH=/autobiografijas-lv/ npm run preview
```

## GitHub Pages

In repository Settings → Pages, select **GitHub Actions**. The workflow builds/checks pull requests and deploys pushes to `main`. `actions/configure-pages` supplies the repository base path. The organization Pages domain is `dhc.lu.lv`; the public project URL is https://dhc.lu.lv/autobiografijas-lv/. HTTPS is enforced in Pages settings.

Optional Actions variables `SITE_URL` and `BASE_PATH` override the automatic values for a custom domain. For a custom domain, use `/` as the base and configure the domain in Pages settings. No server adapter, credentials or backend are needed.

The reviewed version is ready for publication to GitHub Pages.

## Content and assets

- `src/pages/`: Latvian `/` and English `/en/` routes.
- `src/components/`: native Astro sections, reusable image, diary and dataset components.
- `src/data/`: supporters, publications, dataset references, diary examples, process-photo captions and statistics.
- `src/styles/global.css`: approved palette and responsive design.
- `src/scripts/interactions.js`: A+, manual diary selection, citation copying, reduced-motion-aware counters.
- `src/assets/`: source photos optimized to WebP and responsive sizes by Astro during build.
- `public/assets/`: institutional SVG logos and complete process-photo originals linked from the gallery.
- `docs/`: image provenance, portrait-edit notes and icon licence.

Statistics are a dated source snapshot, not a live API feed. Counters animate the snapshot values. Dataset references use persistent Handle links; the CLARIN records do not list DOIs. Diary excerpts retain the original Latvian, including historical spelling, in both interfaces. Portrait backgrounds were processed with imagegen during design; original photographs remain in the local `concept/` archive.

The local `concept/` design exploration, original edits and previews are intentionally excluded from Git. Astro builds independently of that directory and does not require Python. A complete searchable collection catalogue is reserved for the next stage.
