const BEIJING_TIME_ZONE = 'Asia/Shanghai';

type DateInput = Date | string | number;

type BeijingDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function normalizeDate(input: DateInput = new Date()): Date {
  return input instanceof Date ? input : new Date(input);
}

export function getBeijingDateParts(input: DateInput = new Date()): BeijingDateParts {
  const date = normalizeDate(input);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;
    return value ? Number(value) : 0;
  };

  return {
    year: getValue('year'),
    month: getValue('month'),
    day: getValue('day'),
    hour: getValue('hour'),
    minute: getValue('minute'),
    second: getValue('second'),
  };
}

export function getBeijingNow(input: DateInput = new Date()): Date {
  const parts = getBeijingDateParts(input);
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );
}

export function getBeijingTimeValue(input: DateInput = new Date()): number {
  const parts = getBeijingDateParts(input);
  return parts.hour * 100 + parts.minute;
}

export function getBeijingWeekday(input: DateInput = new Date()): number {
  return getBeijingNow(input).getUTCDay();
}

export function getBeijingDayStart(input: DateInput = new Date()): Date {
  const parts = getBeijingDateParts(input);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
}

export function getBeijingDateAtTime(
  input: DateInput = new Date(),
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const parts = getBeijingDateParts(input);
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second, 0),
  );
}

export function formatBeijingDateTime(
  input: DateInput,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: BEIJING_TIME_ZONE,
    ...options,
  }).format(normalizeDate(input));
}

export { BEIJING_TIME_ZONE };
