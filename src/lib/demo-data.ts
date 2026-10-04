// Demo data for prototype presentation
export const demoDashboardData = {
  stats: {
    refundsProcessed: "1,247",
    moneySaved: "PKR 8,45,000",
    hoursSaved: "312",
    pendingApprovals: "23",
    flaggedCount: "7",
    totalOrders: "5,832",
  },
  recentActivity: [
    { id: "1", action: "Auto-exchange approved", store: "Lahore Fashion House", time: "2 min ago", icon: "swap_horiz" },
    { id: "2", action: "Refund processed", store: "Karachi Electronics", time: "8 min ago", icon: "payments" },
    { id: "3", action: "Fraud alert triggered", store: "Islamabad Sports", time: "15 min ago", icon: "warning" },
    { id: "4", action: "Chatbot answered query", store: "Lahore Fashion House", time: "22 min ago", icon: "smart_toy" },
    { id: "5", action: "Return request approved", store: "Faisalabad Textiles", time: "45 min ago", icon: "check_circle" },
    { id: "6", action: "Exchange label generated", store: "Karachi Electronics", time: "1 hr ago", icon: "local_shipping" },
    { id: "7", action: "Customer emailed", store: "Islamabad Sports", time: "2 hr ago", icon: "email" },
  ],
  connectedStores: [
    { id: "1", name: "Lahore Fashion House", domain: "lahorefashion.pk", status: "Active" },
    { id: "2", name: "Karachi Electronics", domain: "karachielectronics.pk", status: "Active" },
    { id: "3", name: "Islamabad Sports", domain: "islamabadsports.pk", status: "Active" },
    { id: "4", name: "Faisalabad Textiles", domain: "faisalabadtextiles.pk", status: "Active" },
  ],
  quickStats: [
    { label: "Avg. Exchange Time", value: "12 min" },
    { label: "Automation Rate", value: "94.2%", highlight: false },
    { label: "Customer Satisfaction", value: "96%" },
    { label: "Cost per Return", value: "PKR 210" },
  ],
  activeRules: 18,
}

export const demoOrders = [
  { id: "#QL-10001", customer: "Ahmed Khan", email: "ahmed.khan@gmail.com", store: "Lahore Fashion House", status: "Exchange", amount: 4500, items: 2, date: "2026-03-28", reason: "Wrong size" },
  { id: "#QL-10002", customer: "Fatima Ali", email: "fatima.ali@yahoo.com", store: "Karachi Electronics", status: "Refunded", amount: 12500, items: 1, date: "2026-03-28", reason: "Defective item" },
  { id: "#QL-10003", customer: "Hassan Raza", email: "hassan.raza@gmail.com", store: "Islamabad Sports", status: "Pending", amount: 3200, items: 1, date: "2026-03-27", reason: "Changed mind" },
  { id: "#QL-10004", customer: "Ayesha Malik", email: "ayesha.malik@hotmail.com", store: "Lahore Fashion House", status: "Approved", amount: 6800, items: 3, date: "2026-03-27", reason: "Wrong size" },
  { id: "#QL-10005", customer: "Usman Tariq", email: "usman.tariq@gmail.com", store: "Faisalabad Textiles", status: "Flagged", amount: 28900, items: 5, date: "2026-03-26", reason: "Suspected fraud" },
  { id: "#QL-10006", customer: "Zainab Hassan", email: "zainab.hassan@gmail.com", store: "Karachi Electronics", status: "Completed", amount: 8900, items: 1, date: "2026-03-26", reason: "Not as described" },
  { id: "#QL-10007", customer: "Ali Ahmed", email: "ali.ahmed@gmail.com", store: "Islamabad Sports", status: "Exchange", amount: 2400, items: 2, date: "2026-03-25", reason: "Wrong color" },
  { id: "#QL-10008", customer: "Mariam Nawaz", email: "mariam.nawaz@gmail.com", store: "Lahore Fashion House", status: "Refunded", amount: 15600, items: 2, date: "2026-03-25", reason: "Damaged in transit" },
  { id: "#QL-10009", customer: "Bilal Qureshi", email: "bilal.qureshi@gmail.com", store: "Karachi Electronics", status: "Pending", amount: 42000, items: 3, date: "2026-03-24", reason: "Wrong item sent" },
  { id: "#QL-10010", customer: "Sana Javed", email: "sana.javed@gmail.com", store: "Faisalabad Textiles", status: "Approved", amount: 5100, items: 1, date: "2026-03-24", reason: "Size exchange" },
  { id: "#QL-10011", customer: "Omar Farooq", email: "omar.farooq@gmail.com", store: "Islamabad Sports", status: "Flagged", amount: 19999, items: 1, date: "2026-03-23", reason: "High-value fraud risk" },
  { id: "#QL-10012", customer: "Hira Yousaf", email: "hira.yousaf@gmail.com", store: "Lahore Fashion House", status: "Completed", amount: 7200, items: 2, date: "2026-03-23", reason: "Quality issue" },
]

export const demoAnalytics = {
  refundsProcessed: 248,
  exchangesProcessed: 412,
  automationRate: 94.2,
  savings: 285000,
  dailyChart: [
    { date: "Mar 1", refunds: 12, exchanges: 22, savings: 8500 },
    { date: "Mar 2", refunds: 8, exchanges: 18, savings: 6200 },
    { date: "Mar 3", refunds: 15, exchanges: 28, savings: 11200 },
    { date: "Mar 4", refunds: 10, exchanges: 25, savings: 9400 },
    { date: "Mar 5", refunds: 22, exchanges: 35, savings: 14500 },
    { date: "Mar 6", refunds: 18, exchanges: 30, savings: 12800 },
    { date: "Mar 7", refunds: 25, exchanges: 42, savings: 18200 },
    { date: "Mar 8", refunds: 14, exchanges: 26, savings: 10500 },
    { date: "Mar 9", refunds: 20, exchanges: 38, savings: 13900 },
    { date: "Mar 10", refunds: 16, exchanges: 32, savings: 11800 },
    { date: "Mar 11", refunds: 28, exchanges: 45, savings: 21400 },
    { date: "Mar 12", refunds: 22, exchanges: 40, savings: 16700 },
    { date: "Mar 13", refunds: 19, exchanges: 34, savings: 13200 },
    { date: "Mar 14", refunds: 30, exchanges: 48, savings: 23100 },
    { date: "Mar 15", refunds: 24, exchanges: 41, savings: 17800 },
    { date: "Mar 16", refunds: 26, exchanges: 44, savings: 19200 },
    { date: "Mar 17", refunds: 21, exchanges: 37, savings: 15600 },
    { date: "Mar 18", refunds: 27, exchanges: 46, savings: 20800 },
    { date: "Mar 19", refunds: 23, exchanges: 39, savings: 16400 },
    { date: "Mar 20", refunds: 29, exchanges: 47, savings: 22300 },
    { date: "Mar 21", refunds: 25, exchanges: 43, savings: 18900 },
    { date: "Mar 22", refunds: 32, exchanges: 51, savings: 25600 },
    { date: "Mar 23", refunds: 28, exchanges: 45, savings: 21400 },
    { date: "Mar 24", refunds: 31, exchanges: 49, savings: 24200 },
    { date: "Mar 25", refunds: 27, exchanges: 44, savings: 19800 },
    { date: "Mar 26", refunds: 34, exchanges: 53, savings: 27100 },
    { date: "Mar 27", refunds: 30, exchanges: 48, savings: 23400 },
    { date: "Mar 28", refunds: 36, exchanges: 56, savings: 28900 },
    { date: "Mar 29", refunds: 33, exchanges: 52, savings: 26400 },
    { date: "Mar 30", refunds: 29, exchanges: 47, savings: 22800 },
  ],
  topProducts: [
    { name: "Lehenga Choli", returns: 42, exchanges: 38, savings: 42000 },
    { name: "Wireless Earbuds Pro", returns: 35, exchanges: 28, savings: 35000 },
    { name: "Cotton Kurti Set", returns: 28, exchanges: 32, savings: 28000 },
    { name: "Running Shoes", returns: 24, exchanges: 30, savings: 24000 },
    { name: "Smart Watch", returns: 22, exchanges: 18, savings: 44000 },
    { name: "Denim Jeans", returns: 20, exchanges: 25, savings: 15000 },
    { name: "Cotton Bedsheet", returns: 18, exchanges: 22, savings: 12000 },
  ],
  actions: [
    { type: "Auto Exchange", count: 412, successRate: 98.2, avgTime: "8 min" },
    { type: "Auto Refund", count: 248, successRate: 96.5, avgTime: "5 min" },
    { type: "Fraud Detection", count: 87, successRate: 91.3, avgTime: "12 min" },
    { type: "Return Approval", count: 156, successRate: 94.1, avgTime: "10 min" },
    { type: "Email Notification", count: 523, successRate: 99.1, avgTime: "1 min" },
  ],
}

export const demoApprovalQueue = [
  { id: "1", order: "#QL-10005", customer: "Usman Tariq", store: "Faisalabad Textiles", amount: 28900, riskScore: 87, reason: "High-value order with multiple returns", flaggedAt: "2026-03-26 14:30", status: "pending" },
  { id: "2", order: "#QL-10011", customer: "Omar Farooq", store: "Islamabad Sports", amount: 19999, riskScore: 78, reason: "Suspicious return pattern detected", flaggedAt: "2026-03-23 09:15", status: "pending" },
  { id: "3", order: "#QL-10015", customer: "Rashid Mehmood", store: "Karachi Electronics", amount: 15500, riskScore: 72, reason: "Device tampering suspected", flaggedAt: "2026-03-22 11:45", status: "pending" },
  { id: "4", order: "#QL-10018", customer: "Nadia Aslam", store: "Lahore Fashion House", amount: 8900, riskScore: 65, reason: "Return address mismatch", flaggedAt: "2026-03-21 16:20", status: "pending" },
  { id: "5", order: "#QL-10021", customer: "Kamran Butt", store: "Islamabad Sports", amount: 22000, riskScore: 81, reason: "Multiple orders from same IP", flaggedAt: "2026-03-20 13:50", status: "pending" },
  { id: "6", order: "#QL-10024", customer: "Sara Bibi", store: "Faisalabad Textiles", amount: 5200, riskScore: 58, reason: "Unusual return window", flaggedAt: "2026-03-19 10:10", status: "pending" },
  { id: "7", order: "#QL-10027", customer: "Faisal Iqbal", store: "Karachi Electronics", amount: 35000, riskScore: 92, reason: "Serial number mismatch", flaggedAt: "2026-03-18 08:30", status: "pending" },
]

export const demoActivityLog = [
  { id: "1", user: "System", action: "Auto-exchange approved", target: "QL-10001", timestamp: "2026-03-28 14:32", ip: "192.168.1.5" },
  { id: "2", user: "Ahmed Khan", action: "Exchange request submitted", target: "QL-10001", timestamp: "2026-03-28 14:30", ip: "203.45.67.89" },
  { id: "3", user: "System", action: "Refund processed", target: "QL-10002", timestamp: "2026-03-28 14:25", ip: "192.168.1.5" },
  { id: "4", user: "Fatima Ali", action: "Return request submitted", target: "QL-10002", timestamp: "2026-03-28 14:20", ip: "203.45.67.90" },
  { id: "5", user: "System", action: "Fraud alert triggered", target: "QL-10005", timestamp: "2026-03-28 14:15", ip: "192.168.1.5" },
  { id: "6", user: "Hassan Raza", action: "Return request submitted", target: "QL-10003", timestamp: "2026-03-27 16:40", ip: "203.45.67.91" },
  { id: "7", user: "Admin", action: "Rule updated", target: "Auto Exchange Rule", timestamp: "2026-03-27 15:00", ip: "192.168.1.2" },
  { id: "8", user: "System", action: "Exchange label generated", target: "QL-10004", timestamp: "2026-03-27 14:55", ip: "192.168.1.5" },
  { id: "9", user: "Ayesha Malik", action: "Exchange request submitted", target: "QL-10004", timestamp: "2026-03-27 14:50", ip: "203.45.67.92" },
  { id: "10", user: "System", action: "Chatbot responded", target: "Customer query #8821", timestamp: "2026-03-27 14:45", ip: "192.168.1.5" },
]

export const demoChatSessions = [
  { id: "1", customer: "Ahmed Khan", status: "active", lastMessage: "When will my exchange be delivered?", timestamp: "2026-03-28 14:30", store: "Lahore Fashion House" },
  { id: "2", customer: "Fatima Ali", status: "resolved", lastMessage: "Thanks for the refund!", timestamp: "2026-03-28 13:20", store: "Karachi Electronics" },
  { id: "3", customer: "Hassan Raza", status: "active", lastMessage: "I want to return this item", timestamp: "2026-03-28 12:15", store: "Islamabad Sports" },
  { id: "4", customer: "Ayesha Malik", status: "resolved", lastMessage: "Exchange approved!", timestamp: "2026-03-28 11:30", store: "Lahore Fashion House" },
  { id: "5", customer: "Usman Tariq", status: "flagged", lastMessage: "Suspicious activity detected", timestamp: "2026-03-28 10:45", store: "Faisalabad Textiles" },
]

export const demoSuperadmin = {
  stats: {
    totalUsers: 1247,
    totalStores: 3892,
    totalOrders: 156830,
    totalRules: 2485,
    newUsersMonth: 47,
    activeStores: 3654,
    ordersMonth: 12458,
  },
  recentActivity: [
    { id: "1", event: "user.registered", description: "New merchant registered: Ahmed Fashion House", ipAddress: "203.45.67.89", createdAt: "2026-03-28 14:30" },
    { id: "2", event: "store.connected", description: "Store connected: Lahore Electronics.pk", ipAddress: "203.45.67.90", createdAt: "2026-03-28 14:25" },
    { id: "3", event: "rule.triggered", description: "Auto-exchange rule triggered for #QL-10001", ipAddress: "192.168.1.5", createdAt: "2026-03-28 14:20" },
    { id: "4", event: "fraud.alert", description: "High-value fraud alert for order #QL-10005", ipAddress: "192.168.1.5", createdAt: "2026-03-28 14:15" },
    { id: "5", event: "payment.processed", description: "Refund processed: PKR 12,500", ipAddress: "192.168.1.5", createdAt: "2026-03-28 14:10" },
    { id: "6", event: "user.registered", description: "New merchant registered: Karachi Sports", ipAddress: "203.45.67.91", createdAt: "2026-03-28 14:05" },
    { id: "7", event: "store.connected", description: "Store connected: Islamabad Fashion.pk", ipAddress: "203.45.67.92", createdAt: "2026-03-28 14:00" },
  ],
  ordersByStatus: [
    { status: "Completed", count: 1245 },
    { status: "Exchange", count: 892 },
    { status: "Refunded", count: 534 },
    { status: "Pending", count: 287 },
    { status: "Flagged", count: 42 },
  ],
}

export const demoSuperadminUsers = [
  { id: "1", name: "Ahmed Khan", email: "ahmed.khan@gmail.com", stores: 3, orders: 2450, plan: "Pro", status: "Active", joined: "2026-01-15" },
  { id: "2", name: "Fatima Ali", email: "fatima.ali@yahoo.com", stores: 2, orders: 1890, plan: "Starter", status: "Active", joined: "2026-02-20" },
  { id: "3", name: "Hassan Raza", email: "hassan.raza@gmail.com", stores: 1, orders: 567, plan: "Free", status: "Active", joined: "2026-03-10" },
  { id: "4", name: "Ayesha Malik", email: "ayesha.malik@hotmail.com", stores: 4, orders: 3210, plan: "Enterprise", status: "Active", joined: "2025-12-01" },
  { id: "5", name: "Usman Tariq", email: "usman.tariq@gmail.com", stores: 2, orders: 1456, plan: "Pro", status: "Suspended", joined: "2026-01-25" },
  { id: "6", name: "Zainab Hassan", email: "zainab.hassan@gmail.com", stores: 1, orders: 890, plan: "Starter", status: "Active", joined: "2026-02-14" },
  { id: "7", name: "Ali Ahmed", email: "ali.ahmed@gmail.com", stores: 3, orders: 2100, plan: "Pro", status: "Active", joined: "2026-01-30" },
  { id: "8", name: "Mariam Nawaz", email: "mariam.nawaz@gmail.com", stores: 2, orders: 1678, plan: "Starter", status: "Active", joined: "2026-02-28" },
  { id: "9", name: "Bilal Qureshi", email: "bilal.qureshi@gmail.com", stores: 5, orders: 4567, plan: "Enterprise", status: "Active", joined: "2025-11-15" },
  { id: "10", name: "Sana Javed", email: "sana.javed@gmail.com", stores: 1, orders: 456, plan: "Free", status: "Active", joined: "2026-03-20" },
]

export const demoSuperadminStores = [
  { id: "1", name: "Lahore Fashion House", domain: "lahorefashion.pk", owner: "Ahmed Khan", platform: "Shopify", orders: 2450, status: "Active" },
  { id: "2", name: "Karachi Electronics", domain: "karachielectronics.pk", owner: "Fatima Ali", platform: "WooCommerce", orders: 1890, status: "Active" },
  { id: "3", name: "Islamabad Sports", domain: "islamabadsports.pk", owner: "Hassan Raza", platform: "Shopify", orders: 567, status: "Active" },
  { id: "4", name: "Faisalabad Textiles", domain: "faisalabadtextiles.pk", owner: "Ayesha Malik", platform: "Shopify", orders: 3210, status: "Active" },
  { id: "5", name: "Rawalpindi Books", domain: "rawalpindibooks.pk", owner: "Usman Tariq", platform: "WooCommerce", orders: 1456, status: "Suspended" },
  { id: "6", name: "Multan Handicrafts", domain: "multanhandicrafts.pk", owner: "Zainab Hassan", platform: "Shopify", orders: 890, status: "Active" },
  { id: "7", name: "Peshawar Spice Shop", domain: "peshawarspices.pk", owner: "Ali Ahmed", platform: "WooCommerce", orders: 2100, status: "Active" },
  { id: "8", name: "Quetta Leather Co", domain: "quettaleather.pk", owner: "Mariam Nawaz", platform: "Shopify", orders: 1678, status: "Active" },
]

export const demoSuperadminAuditLog = [
  { id: "1", action: "USER_LOGIN", user: "superadmin@quilo.app", details: "Successful login", ip: "192.168.1.2", timestamp: "2026-03-28 14:30" },
  { id: "2", action: "USER_SUSPENDED", user: "superadmin@quilo.app", details: "Suspended user: Usman Tariq", ip: "192.168.1.2", timestamp: "2026-03-28 14:00" },
  { id: "3", action: "STORE_SUSPENDED", user: "superadmin@quilo.app", details: "Suspended store: Rawalpindi Books", ip: "192.168.1.2", timestamp: "2026-03-27 16:45" },
  { id: "4", action: "CONFIG_UPDATED", user: "superadmin@quilo.app", details: "Updated global automation rate", ip: "192.168.1.2", timestamp: "2026-03-27 15:30" },
  { id: "5", action: "USER_LOGIN", user: "superadmin@quilo.app", details: "Successful login", ip: "192.168.1.2", timestamp: "2026-03-27 14:00" },
  { id: "6", action: "PLAN_CHANGED", user: "superadmin@quilo.app", details: "Changed plan: Ahmed Khan → Pro", ip: "192.168.1.2", timestamp: "2026-03-26 11:20" },
  { id: "7", action: "RULE_CREATED", user: "superadmin@quilo.app", details: "Created global fraud detection rule", ip: "192.168.1.2", timestamp: "2026-03-25 10:15" },
]

export const demoSuperadminSupport = [
  { id: "1", ticket: "TKT-001", subject: "Exchange not processed", customer: "Ahmed Khan", priority: "High", status: "Open", created: "2026-03-28 14:00" },
  { id: "2", ticket: "TKT-002", subject: "Refund amount incorrect", customer: "Fatima Ali", priority: "Medium", status: "In Progress", created: "2026-03-28 13:30" },
  { id: "3", ticket: "TKT-003", subject: "Store connection issue", customer: "Hassan Raza", priority: "High", status: "Open", created: "2026-03-28 12:45" },
  { id: "4", ticket: "TKT-004", subject: "Billing question", customer: "Ayesha Malik", priority: "Low", status: "Resolved", created: "2026-03-27 16:20" },
  { id: "5", ticket: "TKT-005", subject: "Feature request: WhatsApp integration", customer: "Usman Tariq", priority: "Medium", status: "Open", created: "2026-03-27 15:10" },
  { id: "6", ticket: "TKT-006", subject: "Chatbot not responding", customer: "Zainab Hassan", priority: "High", status: "In Progress", created: "2026-03-27 14:30" },
  { id: "7", ticket: "TKT-007", subject: "API key rotation", customer: "Ali Ahmed", priority: "Low", status: "Resolved", created: "2026-03-26 11:45" },
]

export const demoSuperadminBilling = [
  { id: "1", merchant: "Ahmed Khan", plan: "Pro", amount: 99, currency: "USD", status: "Paid", date: "2026-03-28" },
  { id: "2", merchant: "Ayesha Malik", plan: "Enterprise", amount: 299, currency: "USD", status: "Paid", date: "2026-03-28" },
  { id: "3", merchant: "Fatima Ali", plan: "Starter", amount: 29, currency: "USD", status: "Paid", date: "2026-03-27" },
  { id: "4", merchant: "Usman Tariq", plan: "Pro", amount: 99, currency: "USD", status: "Failed", date: "2026-03-27" },
  { id: "5", merchant: "Ali Ahmed", plan: "Pro", amount: 99, currency: "USD", status: "Paid", date: "2026-03-26" },
  { id: "6", merchant: "Bilal Qureshi", plan: "Enterprise", amount: 299, currency: "USD", status: "Paid", date: "2026-03-26" },
  { id: "7", merchant: "Mariam Nawaz", plan: "Starter", amount: 29, currency: "USD", status: "Paid", date: "2026-03-25" },
  { id: "8", merchant: "Sana Javed", plan: "Free", amount: 0, currency: "USD", status: "N/A", date: "2026-03-25" },
]

export const demoSuperadminRulesMonitor = [
  { id: "1", rule: "Auto Exchange", triggerCount: 412, successRate: 98.2, avgExecution: "2.1s", status: "Active" },
  { id: "2", rule: "Auto Refund", triggerCount: 248, successRate: 96.5, avgExecution: "1.8s", status: "Active" },
  { id: "3", rule: "Fraud Detection", triggerCount: 87, successRate: 91.3, avgExecution: "3.4s", status: "Active" },
  { id: "4", rule: "Return Approval", triggerCount: 156, successRate: 94.1, avgExecution: "2.5s", status: "Active" },
  { id: "5", rule: "Email Notification", triggerCount: 523, successRate: 99.1, avgExecution: "0.9s", status: "Active" },
  { id: "6", rule: "Chatbot Auto-Reply", triggerCount: 234, successRate: 88.7, avgExecution: "4.2s", status: "Active" },
  { id: "7", rule: "Label Generation", triggerCount: 389, successRate: 97.8, avgExecution: "1.5s", status: "Active" },
]

export const demoSuperadminAnalytics = {
  dailySignups: [
    { date: "Mar 1", signups: 12, orders: 456 },
    { date: "Mar 2", signups: 8, orders: 389 },
    { date: "Mar 3", signups: 15, orders: 512 },
    { date: "Mar 4", signups: 10, orders: 478 },
    { date: "Mar 5", signups: 22, orders: 634 },
    { date: "Mar 6", signups: 18, orders: 567 },
    { date: "Mar 7", signups: 25, orders: 712 },
    { date: "Mar 8", signups: 14, orders: 534 },
    { date: "Mar 9", signups: 20, orders: 645 },
    { date: "Mar 10", signups: 16, orders: 589 },
    { date: "Mar 11", signups: 28, orders: 756 },
    { date: "Mar 12", signups: 22, orders: 678 },
    { date: "Mar 13", signups: 19, orders: 612 },
    { date: "Mar 14", signups: 30, orders: 834 },
    { date: "Mar 15", signups: 24, orders: 701 },
    { date: "Mar 16", signups: 26, orders: 745 },
    { date: "Mar 17", signups: 21, orders: 667 },
    { date: "Mar 18", signups: 27, orders: 778 },
    { date: "Mar 19", signups: 23, orders: 723 },
    { date: "Mar 20", signups: 29, orders: 812 },
    { date: "Mar 21", signups: 25, orders: 756 },
    { date: "Mar 22", signups: 32, orders: 867 },
    { date: "Mar 23", signups: 28, orders: 789 },
    { date: "Mar 24", signups: 31, orders: 834 },
    { date: "Mar 25", signups: 27, orders: 778 },
    { date: "Mar 26", signups: 34, orders: 901 },
    { date: "Mar 27", signups: 30, orders: 845 },
    { date: "Mar 28", signups: 36, orders: 923 },
    { date: "Mar 29", signups: 33, orders: 878 },
    { date: "Mar 30", signups: 29, orders: 812 },
  ],
  revenueByPlan: [
    { plan: "Enterprise", merchants: 45, revenue: 13455 },
    { plan: "Pro", merchants: 234, revenue: 23166 },
    { plan: "Starter", merchants: 456, revenue: 13224 },
    { plan: "Free", merchants: 512, revenue: 0 },
  ],
}
