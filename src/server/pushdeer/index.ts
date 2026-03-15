// https://pushdeer.ftqq.com/message/push?pushkey=PDU325TwP28oGHHoy5yf20sByEeKxqHvJPMsAhC&text=%E6%83%B3%E8%A6%81%E6%8E%A8%E9%80%81%E7%9A%84%E6%96%87%E5%AD%97
import axios from 'axios';

enum EPushDeerType {
  MARKDOWN = 'markdown',
  TEXT = 'text',
  IMAGE = 'image',
}

export async function sendMessageByPushDeer(
  text: string,
  desp: string = '',
  type: string = EPushDeerType.MARKDOWN,
  pushDeerKey: string,
) {
  return axios.post(`http://api2.pushdeer.com/message/push`, {
    pushkey: pushDeerKey,
    text,
    type,
    desp,
  });
}

export async function sendCanBuyMessageByPushDeer(
  symbol: string,
  name: string,
  j: number,
  pushDeerKey: string,
) {
  const title = `✅ 监控到符合条件的股票: ${name}`;
  const message = [
    `### 股票代码: **${symbol}**`,
    `### 股票名称: **${name}**`,
    // `### 当前价格: **${price}**`,
    `### 当前J值: **${j}**`,
  ];
  await sendMessageByPushDeer(title, message.join(' \n\n'), EPushDeerType.MARKDOWN, pushDeerKey);
}

export async function sendB1SignalListByPushDeer(
  stocks: Array<{
    symbol: string;
    name: string;
    price: number;
    j: number;
    whiteLine: number;
    yellowLine: number;
  }>,
  jThreshold: number,
  pushDeerKey: string,
) {
  const title = `✅ B1信号汇总（${stocks.length}）`;
  const message = [
    `阈值 J < ${jThreshold.toFixed(2)}`,
    '',
    ...stocks.map(
      (stock, index) =>
        `${index + 1}. **${stock.symbol} ${stock.name}** 现价 ${stock.price.toFixed(2)} ｜ J ${stock.j.toFixed(2)} ｜ WL ${stock.whiteLine.toFixed(2)} ｜ YL ${stock.yellowLine.toFixed(2)}`,
    ),
  ];

  await sendMessageByPushDeer(
    title,
    message.join(' \n\n'),
    EPushDeerType.MARKDOWN,
    pushDeerKey,
  );
}

export async function sendClosingScreenerListByPushDeer(
  stocks: Array<{
    symbol: string;
    name: string;
    price: number;
    dailyJ: number;
    weeklyJ: number;
    bbi: number;
    volumeRatio: number;
  }>,
  pushDeerKey: string,
) {
  const title = `收盘选股结果（${stocks.length}）`;
  const message = [
    '以下为最新一轮 A 股收盘选股命中结果：',
    '',
    ...stocks.map(
      (stock, index) =>
        `${index + 1}. **${stock.symbol} ${stock.name}** 现价 ${stock.price.toFixed(2)} ｜ 日J ${stock.dailyJ.toFixed(2)} ｜ 周J ${stock.weeklyJ.toFixed(2)} ｜ BBI ${stock.bbi.toFixed(2)} ｜ 量比 ${stock.volumeRatio.toFixed(2)}`,
    ),
  ];

  await sendMessageByPushDeer(
    title,
    message.join(' \n\n'),
    EPushDeerType.MARKDOWN,
    pushDeerKey,
  );
}
