import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class MailService {
  constructor(private mailer: MailerService) {}

  async sendWelcome(to: string, name: string) {
    await this.mailer.sendMail({
      to,
      subject: "Welcome to ArafatCRM",
      template: undefined,
      html: `<h2>Welcome${name ? `, ${name}` : ""}!</h2><p>Your ArafatCRM account has been created.</p>`,
    });
  }

  async sendDealNotification(to: string, subject: string, html: string) {
    await this.mailer.sendMail({ to, subject, html });
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    await this.mailer.sendMail({
      to,
      subject: "Reset your ArafatCRM password",
      html: `
        <div style="font-family: Outfit, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #101828;">
          <h2 style="margin-bottom: 16px;">Reset your password</h2>
          <p style="margin-bottom: 24px; color: #475467;">You requested a password reset for your ArafatCRM account. Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #465fff; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
          <p style="margin-top: 24px; font-size: 12px; color: #98a2b3;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  }
}
