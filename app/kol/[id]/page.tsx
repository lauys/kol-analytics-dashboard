import { Suspense } from "react"
import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { KOLDetailPage } from "@/components/kol-detail-page"

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createServerClient()

  const { data: kol, error } = await supabase.from("leaderboard_24h").select("*").eq("id", params.id).maybeSingle()

  if (error || !kol) {
    notFound()
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <KOLDetailPage kol={kol} />
    </Suspense>
  )
}
