# PortsApp UI Modernization - Implementation Plan

## Context

The `ui-modernization` branch has 11 commits from an initial modernization pass, but introduced several issues (369 inline styles, inline DOM handlers, method calls in templates) alongside leaving original issues unresolved. There are 22 open GitHub issues under [epic #9](https://github.com/shapedthought/portsApp/issues/9) spanning quick wins to large architectural refactors.

This plan organizes all work into 7 phases with clear dependency ordering, so each phase builds on the last without rework.

---

## Dependency Graph

```
Phase 1 (Quick Wins)
  #10, #11, #13, #33, #34 ──────────────────────────┐
                                                      │
Phase 2 (Performance Fixes)                           │
  #15, #31, #32 ────────────────────────────────────┐ │
                                                     │ │
Phase 3 (Code Quality)                               │ │
  #16, #17, #35 ────────────────────────────────────┐│ │
                                                     ││ │
Phase 4 (Inline Styles)                              ││ │
  #30 ──── depends on #32 (handlers removed first) ─┤│ │
                                                     ││ │
Phase 5 (PrimeNG Adoption)                           ││ │
  #19, #20, #18 ── depends on #30 (styles clean) ───┤│ │
  #27 (SweetAlert2 removal) ── depends on #19, #20  ││ │
                                                     ││ │
Phase 6 (Architecture)                               ││ │
  #21 ── depends on #20 (PrimeNG Dialog)            ─┤│ │
  #24 ── standalone                                  ││ │
  #26 ── depends on #15, #31 (properties first)     ─┤│ │
  #28 ── depends on #21 (guard pairs with forms)     ││ │
  #25 ── depends on #27 (needs PrimeNG stepper)      ││ │
                                                     ││ │
Phase 7 (Cleanup & Testing)                          ││ │
  #29 ── depends on #27 (after PrimeNG migration)   ─┘│ │
  #36 ── can start after Phase 3, finish last ────────┘ │
```

---

## Phase 1: Quick Wins (Zero Risk)

**Goal:** Clean up dead code, fix typos, and correct minor bugs. No behavioral changes.

| Issue | Task | Files | Complexity |
|-------|------|-------|------------|
| [#10](https://github.com/shapedthought/portsApp/issues/10) | Remove dead code | `services.ts:28-36` (commented interface), `home.component.ts:123-132` (commented method), `home.component.ts` (unused `showTable` bool), `mapping.component.ts:125` (console.log), `diagram.component.ts:371,384,460,522,559` (console.logs) | Trivial |
| [#11](https://github.com/shapedthought/portsApp/issues/11) | Remove `this.` from templates | `home.component.html:197,427,480`, `mapping.component.html:70,598` | Trivial |
| [#13](https://github.com/shapedthought/portsApp/issues/13) | Rename "Save Config" to "Export JSON" | `home.component.html` (button text + icon) | Trivial |
| [#33](https://github.com/shapedthought/portsApp/issues/33) | Fix method typos | `home.component.ts:107` + `.html:92` (`cleaAllMappedPorts` -> `clearAllMappedPorts`), `mapping.component.ts:133,173` (`splitAndAddComman` -> `splitAndAddComma`) | Trivial |
| [#34](https://github.com/shapedthought/portsApp/issues/34) | Fix file input accept | `home.component.html:58` (`accept="json"` -> `accept=".json"`) | Trivial |

**Parallelism:** All 5 issues can be done in parallel (no overlap).

**Verification:**
- `ng build` succeeds with no errors
- Manual smoke test: home page loads, mapping page loads, file upload picker filters to .json
- Search codebase for `console.log` (only error handlers should remain in http.service.ts)

**Estimated effort:** ~30 minutes

---

## Phase 2: Performance Fixes (Critical)

**Goal:** Eliminate change-detection performance issues across home and report pages.

| Issue | Task | Files | Complexity |
|-------|------|-------|------------|
| [#15](https://github.com/shapedthought/portsApp/issues/15) | Replace `checkMappedPortLength()` with `hasMappedPorts` property | `home.component.ts` (add property, update in ngOnInit/deleteServer/clearAllMappedPorts/uploadPortMappings), `home.component.html:19,31,42` (bind to property) | Low |
| [#31](https://github.com/shapedthought/portsApp/issues/31) | Replace all report template method calls with pre-computed properties | `report.component.ts` (add `totalMappings`, `filteredMappings`, `uniqueServers`, `uniqueProtocols`, `protocolCounts`, `serverMappingCounts` as properties; add `recomputeStats()` called on init and filter change), `report.component.html` (replace all method calls) | Medium |
| [#32](https://github.com/shapedthought/portsApp/issues/32) | Replace inline DOM handlers with CSS `:hover` | `home.component.html:143-144,395-396,490-491,509-510,419-420`, `report.component.html:261-262`, `mapping.component.html:527-528,943-944,960-961,63-64`, `app.component.html:33-34,47-48,57-58` + add CSS classes to respective `.component.css` files | Medium |

**Approach for #31:**
```typescript
// report.component.ts - add properties
totalMappings = 0;
filteredMappings: FlatMapping[] = [];
uniqueServers: string[] = [];
uniqueProtocols: string[] = [];
protocolCounts: Map<string, number> = new Map();
serverMappingCounts: Map<string, number> = new Map();

// Call recomputeStats() in ngOnInit and after any filter change
private recomputeStats(): void {
  this.filteredMappings = /* current getFilteredMappings() logic */;
  this.totalMappings = this.filteredMappings.length;
  this.uniqueServers = [...new Set(this.filteredMappings.map(m => m.sourceServer))];
  // etc.
}
```

**Approach for #32:**
Replace all `onmouseover`/`onmouseout` with CSS classes:
```css
/* Each component's .css file */
tr:hover { background-color: var(--gray-50); }
.btn-hover:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
.input-focus:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
```

**Parallelism:** #15 and #31 can be done in parallel. #32 is independent of both.

**Verification:**
- `ng build` succeeds
- Report page: filters work, stats update correctly, no method calls in template (grep for `()}}` in report.component.html)
- Home page: buttons enable/disable correctly based on mapped ports
- All pages: hover effects still work visually

**Estimated effort:** ~2 hours

---

## Phase 3: Code Quality Improvements

**Goal:** Reduce duplication, add validation, and prevent race conditions.

| Issue | Task | Files | Complexity |
|-------|------|-------|------------|
| [#16](https://github.com/shapedthought/portsApp/issues/16) | Add `createDefaultPortMapping()` factory | `data.service.ts` (extract from lines 8-37, 59-91, 113-131), `mapping.component.ts` (lines 40-53) | Low |
| [#17](https://github.com/shapedthought/portsApp/issues/17) | Add JSON upload schema validation | `home.component.ts` (`uploadPortMappings` method) - add try/catch, array check, field validation, user feedback via alert (toast comes in Phase 5) | Low |
| [#35](https://github.com/shapedthought/portsApp/issues/35) | Debounce Excel download button | `home.component.ts` (`getExcelData` method) - add `isDownloading` flag, disable button during request. `home.component.html` - bind `[disabled]` | Low |

**Approach for #16:**
```typescript
// services.ts or data.service.ts
export function createDefaultPortMapping(id: number, name: string): PortMapping {
  return {
    id, sourceServer: name,
    totalMappedPorts: 0, totalMappedInboundPorts: 0, totalMappedServers: 0,
    mappedPorts: [],
    allInboundPortsTcp: [], allInboundPortsUdp: [],
    allOutboundPortsTcp: [], allOutboundPortsUdp: [],
    mappedPortsByProtocol: [], mappedPortsByProtocolInbound: [],
  };
}
```

**Approach for #17:**
```typescript
uploadPortMappings(event: Event): void {
  // ... existing FileReader setup ...
  try {
    const parsed = JSON.parse(result);
    if (!Array.isArray(parsed)) throw new Error('Expected array');
    for (const item of parsed) {
      if (!item.sourceServer || !Array.isArray(item.mappedPorts)) {
        throw new Error('Invalid PortMapping structure');
      }
    }
    this.portsMapped = parsed;
    this.dataService.uploadPortMapping(this.portsMapped);
  } catch (e) {
    alert('Invalid JSON file: ' + e.message); // Replace with toast in Phase 5
  }
}
```

**Parallelism:** All 3 are independent.

**Verification:**
- Upload a malformed JSON file -> error shown
- Upload a valid JSON file -> works as before
- Click Excel download rapidly -> only one request fires
- Check that `createDefaultPortMapping` is used in all 4 locations

**Estimated effort:** ~1 hour

---

## Phase 4: Extract Inline Styles ([#30](https://github.com/shapedthought/portsApp/issues/30))

**Goal:** Move 369 inline `style=""` attributes to component CSS files.

**This is the largest single task by volume.** Do it component by component.

| Sub-task | File | Inline Count | Approach |
|----------|------|-------------|----------|
| 4a | `app.component.html` + `.css` | 9 | Navbar styles -> CSS classes |
| 4b | `diagram.component.html` + `.css` | 26 | Control panel + container styles |
| 4c | `report.component.html` + `.css` | 78 | Stats cards, filters, table styles |
| 4d | `home.component.html` + `.css` | 127 | Server cards, table, modal, buttons |
| 4e | `mapping.component.html` + `.css` | 129 | Form fields, tables, filter panel, buttons |

**Strategy per component:**
1. Identify repeated inline style patterns (e.g., `font-weight: 600; color: var(--text-primary)`)
2. Create semantic CSS classes (e.g., `.section-title`, `.stat-card`, `.data-table`)
3. Reference existing CSS variables from `styles.css` (already defined)
4. Replace `style="..."` with `class="..."` in template
5. Keep existing Bulma classes alongside new ones

**Parallelism:** Each sub-task is independent. Start with app (smallest) to establish patterns, then do the rest in any order.

**Verification per sub-task:**
- Visual comparison before/after (screenshot)
- `ng build` succeeds
- No remaining `style="` in the processed template (grep check)
- Responsive behavior still works at 480/768/1024px breakpoints

**Estimated effort:** ~4-6 hours (largest phase)

---

## Phase 5: PrimeNG Adoption

**Goal:** Start using PrimeNG components that are already installed but unused.

**Dependency:** Phase 4 should be complete so inline styles don't conflict with PrimeNG styling.

| Issue | Task | Files | Complexity |
|-------|------|-------|------------|
| [#19](https://github.com/shapedthought/portsApp/issues/19) | Add Toast notifications + loading states | `app.config.ts` (add MessageService), `app.component.html` (add `<p-toast>`), `home.component.ts` (inject MessageService, replace console.error + alert), `http.service.ts` (optionally add interceptor) | Medium |
| [#20](https://github.com/shapedthought/portsApp/issues/20) | Replace Bulma modal with PrimeNG Dialog | `home.component.html:201-244` (replace `.modal` markup with `<p-dialog>`), `home.component.ts` (replace `isModalActive` toggle with `visible` binding) | Medium |
| [#18](https://github.com/shapedthought/portsApp/issues/18) | Adopt p-table for report page | `report.component.html` (replace `<table>` with `<p-table>` + sorting/filtering/search), `report.component.ts` (simplify - p-table handles much of the filtering) | High |
| [#27](https://github.com/shapedthought/portsApp/issues/27) | Remove SweetAlert2, begin Bulma removal | `home.component.ts` (replace `Swal.fire` with PrimeNG `ConfirmDialog`), `package.json` (remove sweetalert2). Start replacing Bulma classes with PrimeNG equivalents incrementally. | High |

**Order within phase:** #19 -> #20 -> #18 -> #27 (each builds on the previous)

**Approach for #19:**
```typescript
// app.component.html - add at top
<p-toast />

// home.component.ts
constructor(private messageService: MessageService) {}

// Replace console.error with:
this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate Excel' });
```

**Approach for #20:**
```html
<!-- Replace Bulma modal with: -->
<p-dialog header="Add New Server" [(visible)]="isModalActive" [modal]="true" [style]="{width: '450px'}">
  <!-- existing form content -->
</p-dialog>
```

**Verification:**
- #19: Trigger an API error -> toast appears. Loading spinner shows during HTTP calls.
- #20: Add Server modal opens/closes, validates, submits correctly. ESC key closes it.
- #18: Report table sorts by clicking headers, global search works, column filters work.
- #27: Confirmation dialogs still work. SweetAlert2 removed from package.json. `ng build` produces smaller bundle.

**Estimated effort:** ~6-8 hours

---

## Phase 6: Architectural Refactors

**Goal:** Address structural issues for long-term maintainability.

| Issue | Task | Dependencies | Complexity |
|-------|------|-------------|------------|
| [#21](https://github.com/shapedthought/portsApp/issues/21) | Add CanDeactivate guard | #20 (PrimeNG Dialog for confirm prompt) | Medium |
| [#24](https://github.com/shapedthought/portsApp/issues/24) | UUID-based routing | None (standalone) | Medium |
| [#26](https://github.com/shapedthought/portsApp/issues/26) | Migrate DataService to signals | #15, #31 (properties must exist first) | High |
| [#28](https://github.com/shapedthought/portsApp/issues/28) | Reactive forms on mapping page | #21 (dirty tracking pairs with guard) | High |
| [#25](https://github.com/shapedthought/portsApp/issues/25) | Stepper/accordion on mapping page | #27 (needs PrimeNG components) | High |

**Order:** #21 and #24 can be done in parallel. Then #26. Then #28. Finally #25.

**Approach for #21:**
```typescript
// unsaved-changes.guard.ts
export const canDeactivateMapping: CanDeactivateFn<MappingComponent> = (component) => {
  if (!component.hasUnsavedChanges) return true;
  // Use PrimeNG ConfirmDialog or return window.confirm('...')
};

// app.routes.ts
{ path: 'mapping/:id', component: MappingComponent, canDeactivate: [canDeactivateMapping] }
```

**Approach for #24:**
```typescript
// data.service.ts
addNewServer(serverName: string): void {
  const id = uuidv4(); // uuid already installed
  const newServer = createDefaultPortMapping(id, serverName);
  // ...
}

// loadPortMapping() - migration
const data = JSON.parse(stored);
for (const item of data) {
  if (typeof item.id === 'number') item.id = uuidv4(); // auto-migrate
}
```

**Approach for #26:**
```typescript
// data.service.ts
mappedPorts = signal<PortMapping[]>([...defaults]);
hasMappedPorts = computed(() => this.mappedPorts().some(pm => pm.mappedPorts.length > 0));

// Components consume via:
portsMapped = this.dataService.mappedPorts; // signal reference
// Template: {{ portsMapped().length }}
```

**Verification:**
- #21: Navigate away from mapping page with unsaved changes -> confirmation dialog
- #24: Add server -> URL uses UUID. Bookmark works. Delete server -> other bookmarks still work. Old integer IDs auto-migrate.
- #26: All components reactively update when data changes. No manual re-fetch needed.
- #28: Form validation shows errors inline. Dirty tracking works.
- #25: Mapping page guides user through steps. Existing functionality preserved.

**Estimated effort:** ~10-14 hours total

---

## Phase 7: Cleanup & Testing

**Goal:** Remove unused dependencies, optimize bundle, add test coverage.

| Issue | Task | Files | Complexity |
|-------|------|-------|------------|
| [#29](https://github.com/shapedthought/portsApp/issues/29) | Dependency audit | `package.json`, `index.html` (remove FA CDN), `angular.json` (remove Bulma if fully replaced) | Low |
| [#36](https://github.com/shapedthought/portsApp/issues/36) | Unit tests | All `.spec.ts` files | High (volume) |

**Testing priorities for #36:**
1. `data.service.spec.ts` - CRUD, localStorage, port calculations, factory function
2. `http.service.spec.ts` - API calls with HttpClientTestingModule
3. `home.component.spec.ts` - server management, JSON upload validation, Excel download debounce
4. `mapping.component.spec.ts` - service selection, port add/remove, filter logic
5. `report.component.spec.ts` - stat computation, filtering, CSV export

**Verification:**
- `ng test` passes
- `ng build --configuration=production` - check bundle size (target: under 1MB initial)
- No Bulma/SweetAlert2/FontAwesome references remain (grep check)

**Estimated effort:** ~6-8 hours

---

## Summary Timeline

| Phase | Issues | Can Parallel? | Est. Effort |
|-------|--------|--------------|-------------|
| 1. Quick Wins | #10, #11, #13, #33, #34 | All parallel | 30 min |
| 2. Performance | #15, #31, #32 | #15+#31 parallel, #32 independent | 2 hrs |
| 3. Code Quality | #16, #17, #35 | All parallel | 1 hr |
| 4. Inline Styles | #30 (5 sub-tasks) | Sub-tasks parallel | 4-6 hrs |
| 5. PrimeNG | #19, #20, #18, #27 | Sequential | 6-8 hrs |
| 6. Architecture | #21, #24, #26, #28, #25 | Partial (#21+#24) | 10-14 hrs |
| 7. Cleanup/Tests | #29, #36 | Parallel | 6-8 hrs |
| **Total** | **22 issues** | | **~30-40 hrs** |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| PrimeNG visual mismatch with current design | Medium | Phase 4 (style extraction) establishes CSS classes that can be adapted to PrimeNG theming |
| UUID migration breaks existing bookmarks/localStorage | High | Auto-migration in `loadPortMapping()` converts integer IDs on first load |
| Signals refactor (#26) touches every component | High | Do after #15 and #31 so property-based bindings are already in place |
| Removing Bulma (#27) breaks layout | High | Incremental replacement - one component at a time, not big-bang |
| Large inline style extraction (#30) introduces visual regressions | Medium | Screenshot comparison before/after each component. Do smallest first (app.component) to establish patterns |
