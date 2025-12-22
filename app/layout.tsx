import type React from "react"
import type { Metadata } from "next"
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
        {/* 最优先执行：将 btoa polyfill 放在 body 的最最最前面，使用原生 script 标签 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 立即执行的 Polyfill，不依赖任何外部变量
                var originalBtoa = window.btoa;
                window.btoa = function(str) {
                  try {
                    return originalBtoa(str);
                  } catch (e) {
                    try {
                      // 核心修复：支持中文/Emoji
                      return originalBtoa(
                        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                          function(match, p1) {
                            return String.fromCharCode('0x' + p1);
                          }
                        )
                      );
                    } catch (e2) {
                      console.warn('btoa failed, returning empty string');
                      return "";
                    }
                  }
                };
                
                // 全局错误屏蔽 (最后的防线)
                // 如果上面的 Polyfill 依然没拦住，强制忽略这个特定的 Promise Rejection
                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason && (
                      event.reason.name === 'InvalidCharacterError' || 
                      (event.reason.message && event.reason.message.includes('btoa'))
                    )) {
                    event.preventDefault(); // 阻止报错导致页面崩溃
                    console.log('Ignored btoa error in v0 preview');
                  }
                });
              })();
            `,
          }}
        />
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
