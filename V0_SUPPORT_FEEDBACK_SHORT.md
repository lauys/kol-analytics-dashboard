# Short Version - V0 Support Feedback

**Subject:** Next.js 16.0.10 btoa Error Preventing V0 Preview

---

Hi V0 Support,

My Next.js project (v16.0.10) works perfectly locally but fails to load in V0 preview with this error:

```
Unhandled promise rejection: InvalidCharacterError: Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range.
```

**Impact:** Project completely fails to preview - no preview available at all.

**Environment:**
- Next.js 16.0.10, React 19.2.0
- Works fine: `npm run dev` locally
- Fails: V0 preview environment

**What I've tried:**
- Added btoa polyfills with `beforeInteractive` strategy
- Global error interception (error, unhandledrejection, onerror)
- Disabled Vercel Analytics
- Multiple polyfill strategies

None worked. The error seems to occur before client-side polyfills can execute, possibly in SSR or V0's monitoring system.

**Questions:**
1. Is this a known issue with Next.js 16.x in V0?
2. Is there a workaround or fix available?
3. Does this require a fix on V0's side?

Thanks for your help!

---

**Error timestamp format:** `23:XX:XX.XXXZ` (consistent occurrence)

