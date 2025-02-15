import axios from 'axios';

export class WeChatNotifier {
  private readonly corpId: string;
  private readonly corpSecret: string;
  private readonly agentId: string;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(corpId: string, corpSecret: string, agentId: string) {
    this.corpId = corpId;
    this.corpSecret = corpSecret;
    this.agentId = agentId;
  }

  private async getAccessToken() {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.get(
        `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.corpId}&corpsecret=${this.corpSecret}`
      );

      if (response.data.errcode === 0) {
        this.accessToken = response.data.access_token;
        this.tokenExpireTime = now + (response.data.expires_in - 300) * 1000; // 提前5分钟过期
        return this.accessToken;
      } else {
        throw new Error(`Failed to get access token: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  async sendMessage(message: string, toUser: string = '@all') {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
        {
          touser: toUser,
          msgtype: 'text',
          agentid: this.agentId,
          text: {
            content: message
          }
        }
      );

      if (response.data.errcode !== 0) {
        throw new Error(`Failed to send message: ${response.data.errmsg}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}

export const createWeChatNotifier = (corpId: string, corpSecret: string, agentId: string) => {
  return new WeChatNotifier(corpId, corpSecret, agentId);
};
