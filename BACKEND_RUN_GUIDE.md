# Cat City Backend Run Guide (Local)

This repository currently ships a **mock backend** for local development.

## Prerequisites

- Node.js 18+

## Start backend with direct command

```bash
PORT=8787 node backend/mock-backend.js
```

## Start backend with one-click script

```bash
./scripts/run-backend.sh
```

Use a custom port:

```bash
./scripts/run-backend.sh 9000
```

## Verify backend is running

```bash
curl http://localhost:8787/health
curl http://localhost:8787/api/config
```

Expected health response:

```json
{"ok":true,"service":"catcity-mock-backend"}
```

## Available endpoints

- `GET /health`
- `GET /api/config`
