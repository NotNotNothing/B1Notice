// https://pushdeer.ftqq.com/message/push?pushkey=PDU325TwP28oGHHoy5yf20sByEeKxqHvJPMsAhC&text=%E6%83%B3%E8%A6%81%E6%8E%A8%E9%80%81%E7%9A%84%E6%96%87%E5%AD%97
import axios from 'axios';

const KEY = 'PDU73T4ktgkHAbtcZbJHXqhUJkXIzoIzW7xk8l';

enum EPushDeerType {
  MARKDOWN = 'markdown',
  TEXT = 'text',
  IMAGE = 'image',
}

export async function sendMessageByPushDeer(
  text: string,
  desp: string = '',
  type: string = EPushDeerType.MARKDOWN,
) {
  return axios.post(`http://api2.pushdeer.com/message/push`, {
    pushkey: KEY,
    text,
    type,
    desp,
  });
}

export async function sendCanBuyMessageByPushDeer(
  symbol: string,
  name: string,
  j: number,
) {
  const title = `✅ 已到B1买点的股票: ${name}`;
  const message = [
    `### 股票代码: **${symbol}**`,
    `### 股票名称: **${name}**`,
    // `### 当前价格: **${price}**`,
    `### 当前J值: **${j}**`,
  ];
  await sendMessageByPushDeer(title, message.join(' \n\n'));
}
