export interface NotificationMessage {
  title: string;
  body: string;
  type?: 'text' | 'markdown' | 'html';
}

export interface NotificationProvider {
  name: string;
  send(message: NotificationMessage, config: NotificationConfig): Promise<boolean>;
  isAvailable(): Promise<boolean>;
}

export interface NotificationConfig {
  pushDeerKey?: string;
  telegramToken?: string;
  telegramChatId?: string;
  emailSmtp?: string;
  emailUser?: string;
  emailPassword?: string;
  webhookUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  provider: string;
  error?: string;
}
