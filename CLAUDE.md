# CLAUDE.md

Angular 21 frontend for the Veeam Ports App (hosted on https://www.veeambp.com/). Users build a list of servers, map Veeam service ports between them, then view the result as a report, table, or Mermaid diagram.

## Commands

```bash
npm install
npm start            # ng serve, http://localhost:4200
npm run build        # production build -> dist/ports-app/browser
npm test             # ng test (Vitest + jsdom via @angular/build:unit-test)
```

CI installs with `npm ci` on Node 22 / npm 10. A lockfile written by npm 11 can be rejected there, so after any dependency change run `npx -y npm@10 install --package-lock-only` (or check with `npx -y npm@10 ci`). Angular packages must stay on matching versions; upgrade them with `ng update`.

The backend API is a separate service. `src/environments/environment.ts` points at `http://localhost:8001` for dev; production (`environment.prod.ts`) uses `/ports_server`, proxied by nginx.

## Architecture

- **Standalone components** only (no NgModules). Routes live in [src/app/app.routes.ts](src/app/app.routes.ts):
  - `''` and `map` → `HomeComponent` in Dashboard or Map mode (`data.mode`). It holds the page header, stat strip, add/rename/delete dialogs, upload/export, and either the server table or `NetworkMapComponent`, next to `ServerDetailComponent`
  - `mapping/:id` → `MappingComponent` (map ports for one server; guarded by `unsavedChangesGuard`)
  - `report` → `ReportComponent` (table + diagram views, delete mappings, CSV/Excel export)
  - `mcp` → `McpHowtoComponent` (how to install the `veeam-ports-mcp` MCP server)
- `DiagramComponent` renders Mermaid diagrams and is embedded in the report. The Map mode does not use it; `network-map/` draws its own SVG with a dagre layout (`map-layout.ts`).
- [topology.ts](src/app/topology.ts) holds pure functions that derive per-server counts, source→target edges, peer groups and stats from the port mappings. Ports are counted as entries (a range like `2500-3300` counts once).
- [workspace.service.ts](src/app/workspace.service.ts) holds UI state shared by Dashboard and Map (selection, direction, protocol filter), so the selection survives switching modes. Servers and selections are keyed by **name**, because `MappedPorts` refer to targets by name.
- [theme.service.ts](src/app/theme.service.ts) sets `data-theme` (`ops` | `sheet` | `blueprint`) on `<html>` and saves it in `localStorage['portsapp-redesign-theme']`.
- [data.service.ts](src/app/data.service.ts) holds app state as Angular **signals** (`mappedPorts`, computed `servers`, `hasMappedPorts`). State persists to `localStorage` under `portMapping`. After mutating mappings, call `recalculateServerMappedPorts()` then `recalculateMappedPorts()` so derived totals stay in sync. Servers are keyed by UUID (legacy integer IDs are migrated on load).
- [http.service.ts](src/app/http.service.ts) wraps all backend calls. Shared types live in [services.ts](src/app/services.ts).
- [app.component.ts](src/app/app.component.ts) owns the nav shell, global PrimeNG `Toast`/`ConfirmDialog`, and the MCP promo modal (shown from the second visit on, unless dismissed; localStorage keys `portsapp-mcp-promo-seen` / `portsapp-mcp-promo-dismissed`).

## UI conventions

- A redesign is in progress (design handoff: three themes, Dashboard/Map modes). The shell, Dashboard, Map and detail panel are done; Report, Mapping and MCP still use the old Bulma/Font Awesome styling and will be restyled next, after which Bulma and Font Awesome are removed.
- Design tokens and shared primitives live in [src/theme.css](src/theme.css): colours and fonts as CSS variables per `[data-theme]`, and `pa-` classes (`pa-btn`, `pa-seg`, `pa-panel`, `pa-caption`, `pa-chip`, `pa-tag`, `pa-input`…). Use the variables, never hard-coded colours. No shadows.
- Bulma is still loaded globally, so don't name component classes after Bulma ones (`title`, `label`, `grid`, `footer`, `button`, `box`, `tag`, `table`…); they pick up Bulma styles.
- Use **PrimeNG 21** components (Dialog, Toast, ConfirmDialog, etc.). User feedback goes through `MessageService` and confirmations through `ConfirmationService`. Dialogs and toasts are restyled in `theme.css` with `html`-prefixed selectors (PrimeNG injects its CSS after ours). PrimeNG's own `--p-*` tokens are deliberately not overridden globally, because that breaks the not-yet-restyled Report table.
- New UI uses Lucide icons (`lucide-angular`: import `LucideAngularModule` and pass icons with `[img]`).
- Component stylesheets fail the production build above 4 kB (warning at 2 kB); put shared styles in `theme.css`.
- Keep styles in component `.css` files, not inline `style=""` attributes. Avoid calling methods in templates; use signals, computed values, or properties instead.

## Testing

- Specs sit next to their components (`*.spec.ts`). Use the helpers `createTestPortMapping` and `createTestMappedPort` from [src/app/testing/test-utils.ts](src/app/testing/test-utils.ts).
- The MCP how-to component has no spec yet.
- `NetworkMapComponent` guards `ResizeObserver`, which jsdom lacks.

## Deployment

- [Dockerfile](Dockerfile): a multi-stage build (node:22-alpine, then nginx:alpine) serving `dist/ports-app/browser` with SPA fallback ([nginx.conf](nginx.conf)).
- `src/index.html` currently uses `<base href="/">`. The README describes a `/magic-ports/` base href for the NGINX deployment; check which one applies before changing it.
- GitHub Actions ([.github/workflows/](.github/workflows/)):
  - `ci.yml`: runs on PRs to `main`. It does `npm ci` and a production build. Unit tests run with `continue-on-error: true`, so they don't block the PR.
  - `build-deploy.yml`: builds a `linux/amd64` image and pushes it to `txtxx56/portsapp`.
    - A push to `main` only pushes a `sha-<short>` tag.
    - A `v*` git tag or a manual `workflow_dispatch` with `deploy: true` also deploys: it SSHes to the VPS and runs `kubectl set image` on `ports-frontend-deployment`.
    - Pass only the image **tag** between jobs, never the full `user/repo:tag` ref. Actions redacts outputs that contain secrets, which leaves the deploy job with an empty ref.
  - The cluster uses `imagePullPolicy: IfNotPresent`, so every deploy needs a new tag.
- Version is in `package.json` (currently 0.6.1).

## Project docs

- [PLAN.md](PLAN.md) and [RECOMMENDATIONS.md](RECOMMENDATIONS.md) cover the UI modernization roadmap (GitHub epic #9). Some items are already done.
- The README covers CI/CD secrets and the first-deploy steps.
