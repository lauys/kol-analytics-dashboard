"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    // 自动重定向到登录页面
    const timer = setTimeout(() => {
      router.push("/auth/login")
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">注册暂不对外开放</CardTitle>
            <CardDescription>
              注册功能目前暂不对外开放，请使用现有账号登录。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/auth/login")} className="w-full">
              前往登录页面
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              3秒后自动跳转到登录页面
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
