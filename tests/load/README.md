# Load smoke

`load-smoke.mjs` is a bounded HTTP smoke test for CI and local verification. It uses Node's built-in `fetch`, a fixed worker pool, and does not print response bodies, cookies, or authorization headers.

```bash
LOAD_URL=http://127.0.0.1:3000/account/login \
LOAD_DURATION_MS=5000 \
LOAD_CONCURRENCY=4 \
LOAD_MAX_ERROR_RATE=0 \
pnpm test:load
```

Environment variables:

- `LOAD_URL`: target URL; defaults to `http://127.0.0.1:3000/account/login`.
- `LOAD_DURATION_MS`: positive test duration in milliseconds; defaults to `10000`.
- `LOAD_CONCURRENCY`: positive worker count; defaults to `4`.
- `LOAD_MAX_ERROR_RATE`: allowed error fraction from `0` to `1`; defaults to `0`.

The command prints one JSON summary containing request count, successes, errors, error rate, p50 latency, and p95 latency. It exits nonzero when the error-rate budget is exceeded.
