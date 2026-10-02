import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { storeId, query, variables } = await req.json()

    const response = await fetch(
      `https://${storeId}/admin/api/2024-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN!,
        },
        body: JSON.stringify({ query, variables }),
      }
    )

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Shopify GraphQL error:", error)
    return NextResponse.json({ error: "GraphQL request failed" }, { status: 500 })
  }
}
