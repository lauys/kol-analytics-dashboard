import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 更健壮的数字格式化：兼容 undefined / null / 字符串
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "0"
  }

  const num = typeof value === "number" ? value : Number(value)

  if (Number.isNaN(num)) {
    return "0"
  }

  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + "B"
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M"
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K"
  }
  return num.toString()
}

/**
 * 安全地将字符串编码为 Base64，支持 Unicode 字符（包括中文）
 * 兼容服务端和客户端环境
 */
export function safeBtoa(str: string): string {
  if (typeof window === "undefined") {
    // 服务端 (Node.js) 环境
    try {
      return Buffer.from(str, "utf-8").toString("base64")
    } catch {
      return ""
    }
  } else {
    // 客户端环境 (使用上面的 Polyfill 或手动转换)
    try {
      // 使用 polyfill 后的 window.btoa
      return window.btoa(str)
    } catch (e) {
      // 手动 Unicode 转换 fallback
      try {
        return window.btoa(
          encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
            String.fromCharCode(parseInt(p1, 16))
          )
        )
      } catch (e2) {
        return ""
      }
    }
  }
}

/**
 * 安全地将 Base64 字符串解码，支持 Unicode 字符（包括中文）
 * 完全不依赖 window.atob，浏览器端使用纯 JS 实现
 */
export function safeAtob(base64: string): string {
  // Node.js 环境
  if (typeof window === "undefined") {
    try {
      return Buffer.from(base64, "base64").toString("utf8")
    } catch {
      return ""
    }
  }

  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, "")

  try {
    const bytes: number[] = []
    let i = 0

    while (i < clean.length) {
      const c1 = base64Chars.indexOf(clean.charAt(i++))
      const c2 = base64Chars.indexOf(clean.charAt(i++))
      const c3 = base64Chars.indexOf(clean.charAt(i++))
      const c4 = base64Chars.indexOf(clean.charAt(i++))

      const n = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63)

      bytes.push((n >> 16) & 0xff)
      if (c3 !== 64 && clean.charAt(i - 2) !== "=") {
        bytes.push((n >> 8) & 0xff)
      }
      if (c4 !== 64 && clean.charAt(i - 1) !== "=") {
        bytes.push(n & 0xff)
      }
    }

    if (typeof TextDecoder !== "undefined") {
      const decoder = new TextDecoder("utf-8")
      return decoder.decode(new Uint8Array(bytes))
    }

    // 降级：按 UTF-16 拼接
    return String.fromCharCode(...bytes)
  } catch {
    return ""
  }
}
