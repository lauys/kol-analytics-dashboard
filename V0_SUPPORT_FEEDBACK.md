# Feedback to V0 Support - btoa Error Issue

**Subject:** Critical Issue: Unhandled Promise Rejection with btoa InvalidCharacterError Preventing Project Preview

---

Dear V0 Support Team,

I'm experiencing a critical issue that prevents my Next.js project from loading in the V0 preview environment. The project works perfectly fine locally but fails to load on V0.

## Issue Description

The project consistently throws an unhandled promise rejection error related to `btoa` function when trying to preview in V0:

```
Unhandled promise rejection: InvalidCharacterError: Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range.
```

## Environment Details

- **Next.js Version:** 16.0.10
- **React Version:** 19.2.0
- **React DOM Version:** 19.2.0
- **Node.js:** (as configured by V0)
- **Local Environment:** Works perfectly with `npm run dev`
- **V0 Environment:** Project fails to load/preview

## Error Details

- **Error Type:** `InvalidCharacterError`
- **Error Message:** "Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range"
- **Impact:** Project completely fails to load in V0 preview - no preview available
- **Frequency:** 100% reproducible - occurs every time the project is loaded in V0

## What I've Tried

I've attempted multiple solutions to fix this issue:

1. **Created comprehensive btoa polyfill** - Added multiple layers of polyfills using `beforeInteractive` strategy in Next.js Script component
2. **Global error interception** - Implemented error handlers for `error`, `unhandledrejection`, and `onerror` events
3. **Disabled Vercel Analytics** - Temporarily removed `@vercel/analytics` to rule out conflicts
4. **Multiple polyfill strategies** - Tried inline scripts, external scripts, and Script components with various strategies

None of these solutions have resolved the issue, suggesting the problem may be:
- Occurring in the server-side rendering phase (before client-side polyfills can execute)
- Related to V0's monitoring/logging system capturing errors before our interceptors run
- A compatibility issue specific to V0's runtime environment

## Request

Could you please:

1. **Investigate** why Next.js 16.0.10 projects are experiencing btoa errors in V0's preview environment
2. **Check** if this is a known issue with Next.js 16.x in V0's runtime
3. **Provide guidance** on how to resolve this, or if there's a workaround
4. **Consider** if this requires a fix on V0's side for Next.js 16 compatibility

## Additional Context

- The error appears to be coming from Next.js internal code or V0's monitoring system
- All client-side polyfills and error handlers are in place but seem to execute too late
- The project structure is standard Next.js App Router with no custom server configurations
- No edge runtime configurations that might cause this

Thank you for your time and assistance. I'm happy to provide additional information or test any solutions you might suggest.

Best regards,
[Your Name]

---

## Technical Details (for reference)

**Key files modified:**
- `app/layout.tsx` - Added btoa polyfill with `beforeInteractive` strategy
- `lib/utils.ts` - Created `safeBtoa()` function (not using `window.btoa`)
- `public/btoa-polyfill.js` - External polyfill file

**Error occurs:**
- Immediately when V0 tries to load/preview the project
- Before any user interaction
- Consistently with timestamp format: `23:XX:XX.XXXZ`

