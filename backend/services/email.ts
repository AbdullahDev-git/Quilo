import nodemailer from "nodemailer"
import { config } from "../config"

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host || "smtp.gmail.com",
      port: config.smtp.port || 587,
      secure: config.smtp.secure || false,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  }
  return transporter
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    if (!config.smtp.user) {
      console.log(`[email disabled] Would send to ${options.to}: ${options.subject}`)
      return false
    }

    const transport = getTransporter()
    await transport.sendMail({
      from: config.smtp.from || config.smtp.user,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    console.log(`Email sent to ${options.to}: ${options.subject}`)
    return true
  } catch (error) {
    console.error(`Failed to send email to ${options.to}:`, error)
    return false
  }
}

export function buildOrderNotificationEmail(data: {
  orderId: string
  action: string
  details: string
}): { subject: string; html: string } {
  return {
    subject: `[Quilo] Order ${data.orderId} — ${data.action}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order ${data.action}</h2>
        <p><strong>Order ID:</strong> ${data.orderId}</p>
        <p><strong>Action:</strong> ${data.action}</p>
        <p><strong>Details:</strong> ${data.details}</p>
        <hr style="border: 1px solid #eee;">
        <p style="color: #888; font-size: 12px;">This is an automated notification from Quilo.</p>
      </div>
    `,
  }
}

export function buildTeamInviteEmail(inviterName: string, inviteLink: string): { subject: string; html: string } {
  return {
    subject: "[Quilo] You've been invited to join a team",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Team Invitation</h2>
        <p><strong>${inviterName}</strong> has invited you to join their team on Quilo.</p>
        <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Accept Invitation</a>
        <hr style="border: 1px solid #eee;">
        <p style="color: #888; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
  }
}

export function buildWelcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: "[Quilo] Welcome!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Quilo, ${name}!</h2>
        <p>Your account has been created. You can now connect your Shopify store and start automating returns and refunds.</p>
        <a href="${config.frontendUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Go to Dashboard</a>
        <hr style="border: 1px solid #eee;">
        <p style="color: #888; font-size: 12px;">Questions? Reply to this email or visit our docs.</p>
      </div>
    `,
  }
}
