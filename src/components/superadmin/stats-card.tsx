interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: string
  iconColor?: string
}

export function StatsCard({ title, value, change, changeType = "neutral", icon, iconColor = "bg-muted text-muted-foreground" }: StatsCardProps) {
  return (
    <div className="bg-card p-4 rounded-xl border border-border">
      <div className="flex items-center justify-between mb-3">
        <span className={`p-2 rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </span>
        {change && (
          <span className={`text-[11px] font-medium ${
            changeType === "positive" ? "text-green-600" :
            changeType === "negative" ? "text-red-600" :
            "text-muted-foreground"
          }`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-[20px] font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{title}</p>
    </div>
  )
}
