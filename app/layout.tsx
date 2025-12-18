import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
// 暂时禁用 Analytics，避免可能的 btoa 错误
// import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/lib/language-context"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "KOL Analytics Dashboard",
  description: "Track and analyze Twitter influencer metrics for your DAO",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 最优先执行：使用 beforeInteractive 策略，确保在所有代码之前 */}
        <Script
          id="btoa-polyfill-inline"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                'use strict';
                try {
                  if (typeof window === 'undefined') return;
                  
                  var originalBtoa = window.btoa;
                  if (!originalBtoa) return;
                  
                  window.btoa = function(str) {
                    if (typeof str !== 'string') str = String(str);
                    try {
                      return originalBtoa(str);
                    } catch (e) {
                      try {
                        return originalBtoa(unescape(encodeURIComponent(str)));
                      } catch (e2) {
                        try {
                          if (typeof TextEncoder !== 'undefined') {
                            var encoder = new TextEncoder();
                            var bytes = encoder.encode(str);
                            var binary = '';
                            for (var i = 0; i < bytes.length; i++) {
                              binary += String.fromCharCode(bytes[i]);
                            }
                            return originalBtoa(binary);
                          }
                        } catch (e3) {}
                        return '';
                      }
                    }
                  };
                  
                  var suppress = function(e) {
                    try {
                      var msg = (e && e.message) ? String(e.message) : String(e || '');
                      var reason = (e && e.reason) ? e.reason : null;
                      var reasonMsg = reason && reason.message ? String(reason.message) : String(reason || '');
                      var reasonStr = String(reason || '');
                      
                      if (msg.indexOf('btoa') >= 0 || msg.indexOf('InvalidCharacterError') >= 0 || 
                          msg.indexOf('characters outside of the Latin1 range') >= 0 ||
                          msg.indexOf('Failed to execute') >= 0 ||
                          reasonMsg.indexOf('btoa') >= 0 || reasonMsg.indexOf('InvalidCharacterError') >= 0 ||
                          reasonStr.indexOf('btoa') >= 0 || reasonStr.indexOf('InvalidCharacterError') >= 0) {
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        return false;
                      }
                    } catch (err) {}
                  };
                  
                  if (window.addEventListener) {
                    try {
                      window.addEventListener('error', suppress, true);
                      window.addEventListener('unhandledrejection', suppress, true);
                    } catch (e) {}
                  }
                  
                  try {
                    window.onunhandledrejection = suppress;
                    var origOnError = window.onerror;
                    window.onerror = function(msg, source, lineno, colno, error) {
                      if (msg && (String(msg).indexOf('btoa') >= 0 || String(msg).indexOf('InvalidCharacterError') >= 0)) {
                        return true;
                      }
                      if (origOnError) return origOnError.apply(window, arguments);
                      return false;
                    };
                  } catch (e) {}
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* 使用 beforeInteractive 策略加载外部 polyfill 作为双重保险 */}
        <Script
          id="btoa-polyfill"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                'use strict';
                if (typeof window === 'undefined') return;
                var originalBtoa = window.btoa;
                if (!originalBtoa) return;
                window.btoa = function(str) {
                  if (typeof str !== 'string') str = String(str);
                  try {
                    return originalBtoa(str);
                  } catch (e) {
                    try {
                      return originalBtoa(unescape(encodeURIComponent(str)));
                    } catch (e2) {
                      try {
                        if (typeof TextEncoder !== 'undefined') {
                          var encoder = new TextEncoder();
                          var bytes = encoder.encode(str);
                          var binary = '';
                          for (var i = 0; i < bytes.length; i++) {
                            binary += String.fromCharCode(bytes[i]);
                          }
                          return originalBtoa(binary);
                        }
                      } catch (e3) {}
                      return '';
                    }
                  }
                };
                var suppress = function(e) {
                  var msg = (e && e.message) ? e.message : String(e || '');
                  var reason = (e && e.reason) ? e.reason : null;
                  var reasonMsg = reason && reason.message ? reason.message : String(reason || '');
                  if (msg.indexOf('btoa') !== -1 || msg.indexOf('InvalidCharacterError') !== -1 || 
                      reasonMsg.indexOf('btoa') !== -1 || reasonMsg.indexOf('InvalidCharacterError') !== -1) {
                    if (e && e.preventDefault) e.preventDefault();
                    if (e && e.stopPropagation) e.stopPropagation();
                    return false;
                  }
                };
                if (window.addEventListener) {
                  window.addEventListener('error', suppress, true);
                  window.addEventListener('unhandledrejection', suppress, true);
                }
                window.onunhandledrejection = suppress;
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 捕获浏览器插件 / 钱包相关噪音（保留原有功能）
                window.addEventListener('error', function(event) {
                  const msg = event.message || '';
                  
                  if (
                    msg.includes('Cannot redefine property: ethereum') ||
                    msg.includes('ethereum') ||
                    msg.includes('Could not establish connection') ||
                    msg.includes('Receiving end does not exist') ||
                    msg.includes('MetaMask') ||
                    msg.includes('Failed to connect')
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(event) {
                  const reason = event.reason || {};
                  const msg = reason && reason.message ? reason.message : String(reason);

                  if (
                    msg.includes('MetaMask') ||
                    msg.includes('ethereum') ||
                    msg.includes('Could not establish connection') ||
                    msg.includes('Receiving end does not exist')
                  ) {
                    event.preventDefault();
                    return false;
                  }
                });

                const originalError = console.error;
                console.error = function(...args) {
                  const msg = args[0] && typeof args[0] === 'string' ? args[0] : '';
                  const allArgs = args.join(' ');
                  
                  if (
                    msg.includes('Cannot redefine property: ethereum') ||
                    msg.includes('Could not establish connection') ||
                    msg.includes('Receiving end does not exist') ||
                    msg.includes('MetaMask') ||
                    msg.includes('Failed to connect') ||
                    allArgs.includes('MetaMask')
                  ) {
                    return;
                  }
                  
                  originalError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider>
            <div className="min-h-screen bg-app grid-pattern">
              {children}
              {/* 暂时禁用 Analytics，避免可能的 btoa 错误 */}
              {/* <Analytics /> */}
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
