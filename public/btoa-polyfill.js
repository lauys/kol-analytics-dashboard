// btoa polyfill - 必须在所有其他脚本之前执行
(function() {
  'use strict';
  
  if (typeof window === 'undefined') {
    return;
  }

  // 保存原始的 btoa
  const originalBtoa = window.btoa;

  // 覆盖 window.btoa，支持 Unicode 字符
  window.btoa = function(str) {
    try {
      // 先尝试原生 btoa（对纯 ASCII 字符串最快）
      return originalBtoa(str);
    } catch (e) {
      // 如果失败（包含非 Latin1 字符），使用 UTF-8 编码
      try {
        return originalBtoa(unescape(encodeURIComponent(str)));
      } catch (e2) {
        // 如果还是失败，使用 TextEncoder 作为最终兜底
        try {
          if (typeof TextEncoder !== 'undefined') {
            const encoder = new TextEncoder();
            const bytes = encoder.encode(str);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return originalBtoa(binary);
          }
        } catch (e3) {
          // 所有方案都失败，返回空字符串而不是抛出错误
          console.warn('[btoa-polyfill] All encoding methods failed, returning empty string');
          return '';
        }
        return '';
      }
    }
  };

  // 立即捕获所有错误和 Promise rejection
  window.addEventListener('error', function(event) {
    const msg = event.message || '';
    if (
      msg.includes('btoa') ||
      msg.includes('InvalidCharacterError') ||
      msg.includes('characters outside of the Latin1 range')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);

  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason || {};
    const msg = reason && reason.message ? reason.message : String(reason);
    const reasonStr = String(reason);
    
    if (
      msg.includes('btoa') ||
      msg.includes('InvalidCharacterError') ||
      msg.includes('characters outside of the Latin1 range') ||
      msg.includes('Failed to execute') ||
      reasonStr.includes('btoa') ||
      reasonStr.includes('InvalidCharacterError')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);

  // 额外兜底
  window.onunhandledrejection = function(event) {
    if (event && event.reason) {
      const reason = event.reason;
      const msg = reason && reason.message ? reason.message : String(reason);
      const reasonStr = String(reason);
      
      if (
        msg.includes('btoa') ||
        msg.includes('InvalidCharacterError') ||
        msg.includes('characters outside of the Latin1 range') ||
        reasonStr.includes('btoa')
      ) {
        if (event.preventDefault) {
          event.preventDefault();
        }
        return false;
      }
    }
  };
})();

