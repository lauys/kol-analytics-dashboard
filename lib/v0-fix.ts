"use client"

// V0 特定修复：在客户端最早执行 btoa polyfill
if (typeof window !== "undefined") {
  const originalBtoa = window.btoa
  window.btoa = (str: string) => {
    try {
      return originalBtoa(str)
    } catch (e) {
      try {
        // 使用 encodeURIComponent 将 Unicode 转为 UTF-8 字节序列
        return originalBtoa(
          encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
            return String.fromCharCode(parseInt(p1, 16))
          }),
        )
      } catch (e2) {
        console.warn("[v0-fix] btoa polyfill failed:", e2)
        return ""
      }
    }
  }
}






