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
}
