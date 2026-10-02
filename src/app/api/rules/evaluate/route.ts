import { NextResponse } from "next/server"

interface Condition {
  field: string
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in"
  value: string | number | string[]
}

interface Rule {
  id: string
  name: string
  conditions: Condition[]
  logic: "all" | "any"
  actions: any[]
}

function evaluateCondition(condition: Condition, data: Record<string, any>): boolean {
  const actualValue = data[condition.field]
  const expectedValue = condition.value

  switch (condition.operator) {
    case "equals":
      return actualValue === expectedValue
    case "not_equals":
      return actualValue !== expectedValue
    case "greater_than":
      return Number(actualValue) > Number(expectedValue)
    case "less_than":
      return Number(actualValue) < Number(expectedValue)
    case "contains":
      return String(actualValue).includes(String(expectedValue))
    case "in":
      return Array.isArray(expectedValue) && expectedValue.includes(actualValue)
    default:
      return false
  }
}

export async function POST(req: Request) {
  try {
    const { rule, data }: { rule: Rule; data: Record<string, any> } = await req.json()

    const results = rule.conditions.map((condition) => ({
      condition,
      passed: evaluateCondition(condition, data),
    }))

    const triggered = rule.logic === "all"
      ? results.every((r) => r.passed)
      : results.some((r) => r.passed)

    return NextResponse.json({
      triggered,
      results,
      ruleId: rule.id,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Rule evaluation error:", error)
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 })
  }
}
