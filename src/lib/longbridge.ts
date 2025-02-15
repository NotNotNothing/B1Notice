import axios from 'axios';

export class LongBridgeClient {
  private readonly apiKey: string;
  private readonly baseURL: string = 'https://open.longbridgeapp.com';
  private readonly client: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getQuote(symbol: string) {
    try {
      const response = await this.client.get(`/v1/quote/realtime`, {
        params: { symbols: symbol }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching quote:', error);
      throw error;
    }
  }

  async getIndicators(symbol: string) {
    try {
      const response = await this.client.get(`/v1/trading/indicators`, {
        params: { symbol }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching indicators:', error);
      throw error;
    }
  }
}

export const createLongBridgeClient = (apiKey: string) => {
  return new LongBridgeClient(apiKey);
};
