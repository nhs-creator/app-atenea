<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

Before starting work, read `docs/LESSONS_LEARNED.md` — technical gotchas from past sessions (iOS Web Bluetooth limitations, Convex dev/prod deployment sync, NIIMBOT printer protocol quirks, etc.) that aren't obvious from the code alone.

Before any commit that changes code or functionality, update `CHANGELOG.md`'s `[Unreleased]` section per `docs/VERSIONING.md`.

## Deploy

- **Backend (Convex, prod)**: se dispara solo — `.github/workflows/convex-deploy.yml` corre `npx convex deploy` en cada push a `main` (secret `CONVEX_DEPLOY_KEY` en GitHub Actions). No hace falta correrlo a mano, salvo que quieras confirmarlo antes de que corra el workflow.
- **Backend (Convex, dev)**: separado del anterior — el servidor local (`npm run dev`, usado por el preview) habla con un deployment de dev distinto. Después de cualquier cambio en `convex/`, correr `npx convex dev --once` para sincronizarlo (si no, el preview tira `ArgumentValidationError` por validators desactualizados aunque prod ya esté al día).
- **Frontend (Vercel, prod)**: **NO se dispara solo con el push a `main`** — no hay integración automática configurada. Después de cada release hay que correr `vercel --prod --yes` a mano. Confirmar con `vercel ls` si el último deploy es más viejo que el último commit, antes de asumir que ya está publicado.
- **Tag de versión** (opcional, solo para referencia en GitHub): `git tag vX.Y.Z <hash>` + `git push origin vX.Y.Z`.
