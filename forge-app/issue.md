### Description
After upgrading to Next.js 16.1.6 (with Turbopack), the application is logging several warnings and errors in the console.

### Errors Logged
1. **Middleware Deprecation Warning:**
    ```
    ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
    ```
2. **Missing API Endpoints (404 Not Found):**
    ```
    GET /api/sessions 404
    GET /api/arxiv 404
    ```

### Proposed Next Steps
- Rename `middleware.ts` (or `.js`) to `proxy.ts` as required by the new Next.js conventions.
- Implement or fix the missing API endpoints (`/api/sessions` and `/api/arxiv`) which are currently returning 404s.
