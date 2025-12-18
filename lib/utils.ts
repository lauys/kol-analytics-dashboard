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
 * 完全不依赖 window.btoa，浏览器端使用 TextEncoder + 纯 JS 实现
 */
export function safeBtoa(str: string): string {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

  // Node.js 环境：直接用 Buffer，天然支持 UTF-8
  if (typeof window === "undefined") {
    try {
      return Buffer.from(str, "utf8").toString("base64")
    } catch {
      return ""
    }
  }

  try {
    let bytes: Uint8Array

    if (typeof TextEncoder !== "undefined") {
      const encoder = new TextEncoder()
      bytes = encoder.encode(str)
    } else {
      // 极端旧环境降级：按 UTF-16 编码拆分低 8 位
      const tmp: number[] = []
      for (let i = 0; i < str.length; i++) {
        tmp.push(str.charCodeAt(i) & 0xff)
      }
      bytes = new Uint8Array(tmp)
    }

    let result = ""
    let i: number

    for (i = 0; i + 2 < bytes.length; i += 3) {
      const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!
      result +=
        base64Chars[(n >> 18) & 63] +
        base64Chars[(n >> 12) & 63] +
        base64Chars[(n >> 6) & 63] +
        base64Chars[n & 63]
    }

    if (i < bytes.length) {
      let n = bytes[i]! << 16
      let padding = "=="

      if (i + 1 < bytes.length) {
        n |= bytes[i + 1]! << 8
        padding = "="
      }

      result +=
        base64Chars[(n >> 18) & 63] +
        base64Chars[(n >> 12) & 63] +
        (padding === "=" ? base64Chars[(n >> 6) & 63] : "=") +
        padding
    }

    return result
  } catch {
    return ""
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
