import prisma from '../prisma/client.js';

export const settingsService = {
  async getSettings() {
    let settings = await prisma.reminderSettings.findFirst();
    if (!settings) {
      settings = await prisma.reminderSettings.create({
        data: {
          emailReminders: "24", // Default 24 horas antes
          whatsappReminders: "2,0.5", // Default 2 horas y 30 min antes
          n8nWebhookUrl: 'http://localhost:3001/api/webhook/n8n',
          n8nApiKey: 'secret-token'
        }
      });
    }
    return settings;
  },

  async updateSettings(data: { emailReminders?: string; whatsappReminders?: string; n8nWebhookUrl?: string; n8nApiKey?: string }) {
    const current = await this.getSettings();
    return await prisma.reminderSettings.update({
      where: { id: current.id },
      data
    });
  }
};