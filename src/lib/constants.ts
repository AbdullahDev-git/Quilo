export const SHOPIFY_SCOPES = [
  "read_products",
  "write_products",
  "read_orders",
  "write_orders",
  "read_customers",
  "write_customers",
  "read_inventory",
  "write_inventory",
  "read_fulfillments",
  "write_fulfillments",
  "read_locales",
  "read_returns",
  "write_returns",
]

export const STORE_STATUS = {
  ACTIVE: "active",
  DISCONNECTED: "disconnected",
  EXPIRED: "expired",
  ERROR: "error",
} as const

export const RULE_CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "in",
  "not_in",
  "between",
  "is_set",
  "is_not_set",
] as const

export const RULE_ACTIONS = [
  "send_email",
  "update_order_tags",
  "update_product",
  "create_discount",
  "send_webhook",
  "fulfill_order",
  "cancel_order",
  "refund_order",
  "notify_slack",
  "notify_email",
] as const

export const AUDIT_EVENT_TYPES = {
  STORE_CONNECTED: "store.connected",
  STORE_DISCONNECTED: "store.disconnected",
  RULE_CREATED: "rule.created",
  RULE_UPDATED: "rule.updated",
  RULE_DELETED: "rule.deleted",
  RULE_TRIGGERED: "rule.triggered",
  ORDER_SYNCED: "order.synced",
  PRODUCT_UPDATED: "product.updated",
  WEBHOOK_RECEIVED: "webhook.received",
  WEBHOOK_FAILED: "webhook.failed",
  PAYMENT_PROCESSED: "payment.processed",
  PAYMENT_FAILED: "payment.failed",
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
} as const
