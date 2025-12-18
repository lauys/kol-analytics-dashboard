// Webpack polyfill for btoa - 用于在构建时全局替换
if (typeof window !== 'undefined' && window.btoa) {
  const originalBtoa = window.btoa
  window.btoa = function(str) {
    if (typeof str !== 'string') str = String(str)
    try {
      return originalBtoa(str)
    } catch (e) {
      try {
        return originalBtoa(unescape(encodeURIComponent(str)))
      } catch (e2) {
        try {
          if (typeof TextEncoder !== 'undefined') {
            const encoder = new TextEncoder()
            const bytes = encoder.encode(str)
            let binary = ''
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i])
            }
            return originalBtoa(binary)
          }
        } catch (e3) {}
        return ''
      }
    }
  }
}

module.exports = typeof window !== 'undefined' ? window.btoa : function() { return '' }

