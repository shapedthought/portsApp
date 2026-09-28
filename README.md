# PortsApp

This is the front-end project for the Ports App which is hosted on the Veeam Architects Site https://www.veeambp.com/

This is an Angular project so you will need to set up the environment:

https://angular.dev/installation

Then install the dependencies:

```
npm install
```

You can then serve the project via:

```
ng serve --open
```

NOTE: This has been modified to work behind NGNIX so you will need to modify the index.html for it to work locally.

FROM:

```
<head>
  <meta charset="utf-8">
  <title>PortsApp</title>
  <base href="/magic-ports/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
```

TO:

```
<head>
  <meta charset="utf-8">
  <title>PortsApp</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
```

## Dockerfile

To create a container with the code use the supplied Dockerfile, then the usual build command.

```
docker build yourrepo/portsApp:0.1 .
```

Then run:

```
docker run --rm -d -p 80:80 pportsApp:0.1
```

## To Do

- Add alert on successful upload or if there is an error.
- Look at adding mermaid diagram output, this will require the in and out bound port remapping (see above) to be stored in the data service.


## CI/CD (GitHub Actions)

Workflows live under `.github/workflows/`. ArgoCD is intentionally not used.

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` (**PR CI**) | `pull_request` → `main` | `npm ci` + production `ng build`. Unit tests run with `continue-on-error: true` so flaky tests do not block the PR. |
| `build-deploy.yml` (**Build and Deploy**) | `push` to `main`, tags `v*`, and `workflow_dispatch` | Buildx `linux/amd64` image → `txtxx56/portsapp`. Deploy job is **gated** (see below). |

### Image tags

- **`workflow_dispatch`**: uses input `image_tag` (default `1.2`), and also pushes immutable `sha-<shortsha>`.
- **`push` to `main`**: pushes `sha-<shortsha>` only (no automatic cluster deploy).
- **git tag `v1.2.0`**: strips the leading `v` → Docker tag `1.2.0`, then deploys.

Do not rely on overwriting one mutable tag alone for rollouts — the cluster uses `imagePullPolicy: IfNotPresent`. Prefer a new tag (`1.2`, `1.2.0`, or `sha-…`) each deploy.

### Deploy (approval-friendly)

Deploy is a **separate job** that only runs when:

1. You run **Actions → Build and Deploy → Run workflow** with `deploy: true`, or
2. You push a git tag matching `v*`.

It does **not** run on every push to `main`.

**Primary path (implemented):** SSH to the VPS, then `kubectl`:

```bash
kubectl set image deployment/ports-frontend-deployment \
  ports-frontend=txtxx56/portsapp:<tag> -n default
kubectl rollout status deployment/ports-frontend-deployment -n default
```

Defaults: host `89.116.228.135`, user `ed` (override with secrets `SSH_HOST` / `SSH_USER`).

Deploy requires a readable kubeconfig at `~/.kube/config` on the VPS for the SSH user (e.g. `/home/ed/.kube/config`). Do not rely on the root-only k3s default (`/etc/rancher/k3s/k3s.yaml`); the workflow sets `KUBECONFIG` to `$HOME/.kube/config` before calling `kubectl`.

**Alternative (documented, not primary):** store a kubeconfig as a secret and run `kubectl` directly on the runner. Prefer SSH to match how the VPS is operated day-to-day.

### Required secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Required | Purpose |
|--------|----------|---------|
| `DOCKERHUB_USERNAME` | yes (for push) | Docker Hub username |
| `DOCKERHUB_TOKEN` | yes (for push) | Docker Hub access token |
| `SSH_PRIVATE_KEY` | yes (for deploy) | Private key for SSH as `ed@` VPS |
| `SSH_HOST` | optional | Default `89.116.228.135` |
| `SSH_USER` | optional | Default `ed` |

If Hub secrets are missing, the build/push job fails immediately with a clear error (this workflow does not run on pull_request, so PR forks never attempt a Hub push).

**Job outputs:** pass only the image **tag** (`image_tag`, e.g. `1.2` or `sha-abcdef`) between jobs. Do **not** put the Docker Hub username (or a full `user/repo:tag` ref built from it) into job outputs — Actions treats secret-matching values as sensitive and skips those outputs (`Skip output '…' since it may contain secret`), which leaves deploy with an empty `IMAGE_REF`. The deploy job builds `IMAGE_REF` as `${IMAGE_NAME}:${image_tag}` using the workflow `env` constant `IMAGE_NAME`.

### First deploy of tag `1.2`

1. Set the secrets above.
2. Open **Actions → Build and Deploy → Run workflow**.
3. Set `image_tag` to `1.2`, keep `deploy` checked/`true`.
4. Confirm Hub has `txtxx56/portsapp:1.2` (and `sha-…`), then that the deploy job completed the rollout.

See issue #51 for the full pipeline design and acceptance checklist.
