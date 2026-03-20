import 'server-only';

type NumericSeries = number[];
type NumericValue = number | NumericSeries;

type TokenType =
  | 'identifier'
  | 'number'
  | 'operator'
  | 'paren'
  | 'comma'
  | 'semicolon'
  | 'eof';

type Token = {
  type: TokenType;
  value: string;
};

type ExprNode =
  | { type: 'number'; value: number }
  | { type: 'identifier'; name: string }
  | { type: 'unary'; operator: string; argument: ExprNode }
  | { type: 'binary'; operator: string; left: ExprNode; right: ExprNode }
  | { type: 'call'; callee: string; args: ExprNode[] };

type StatementNode =
  | { type: 'expression'; expression: ExprNode }
  | { type: 'assignment'; name: string; expression: ExprNode };

export type FormulaSeriesContext = {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  dailyK: number[];
  dailyD: number[];
  dailyJ: number[];
  bbi: Array<number | null>;
  price: number;
  changePercent: number;
  volumeRatio: number;
  aboveBBIConsecutiveDaysCount: number;
  belowBBIConsecutiveDaysCount: number;
  weeklyJ: number;
};

export const SUPPORTED_TDX_VARIABLES = [
  'C/CLOSE/P',
  'O/OPEN',
  'H/HIGH',
  'L/LOW',
  'V/VOL/VOLUME',
  'K/D/J',
  'BBI',
  'WJ/WEEKLYJ',
  'VOLRATIO',
  'ABOVEBBIDAYS',
  'BELOWBBIDAYS',
  'CHANGEPCT',
] as const;

export const SUPPORTED_TDX_FUNCTIONS = [
  'REF',
  'MA',
  'SMA',
  'EMA',
  'HHV',
  'LLV',
  'ABS',
  'MAX',
  'MIN',
  'IF',
  'COUNT',
  'EVERY',
  'EXIST',
  'CROSS',
] as const;

function isIdentifierStart(char: string): boolean {
  return /[\p{L}_]/u.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[\p{L}\p{N}_]/u.test(char);
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    // 处理 {} 注释
    if (char === '{') {
      while (index < input.length && input[index] !== '}') {
        index += 1;
      }
      if (index < input.length) {
        index += 1; // 跳过 }
      }
      continue;
    }

    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }

    const nextTwo = input.slice(index, index + 2);
    if ([':=', '>=', '<=', '<>', '!='].includes(nextTwo)) {
      tokens.push({ type: 'operator', value: nextTwo });
      index += 2;
      continue;
    }

    if (['+', '-', '*', '/', '>', '<', '=', ':'].includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    if (['(', ')'].includes(char)) {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: char });
      index += 1;
      continue;
    }

    if (char === ';') {
      tokens.push({ type: 'semicolon', value: char });
      index += 1;
      continue;
    }

    if (/\d/.test(char) || (char === '.' && /\d/.test(input[index + 1] ?? ''))) {
      let end = index + 1;
      while (end < input.length && /[\d.]/.test(input[end])) {
        end += 1;
      }
      tokens.push({ type: 'number', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      let end = index + 1;
      while (end < input.length && isIdentifierPart(input[end])) {
        end += 1;
      }
      tokens.push({ type: 'identifier', value: input.slice(index, end) });
      index = end;
      continue;
    }

    throw new Error(`不支持的公式字符: ${char}`);
  }

  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): StatementNode[] {
    const statements: StatementNode[] = [];

    while (!this.is('eof')) {
      if (this.is('semicolon')) {
        this.index += 1;
        continue;
      }

      statements.push(this.parseStatement());

      while (this.is('semicolon')) {
        this.index += 1;
      }
    }

    return statements;
  }

  private parseStatement(): StatementNode {
    if (
      this.is('identifier') &&
      this.peek(1)?.type === 'operator' &&
      [':=', ':'].includes(this.peek(1)?.value ?? '')
    ) {
      const name = this.consume('identifier').value;
      this.index += 1;
      const expression = this.parseExpression();
      return {
        type: 'assignment',
        name: normalizeIdentifier(name),
        expression,
      };
    }

    return {
      type: 'expression',
      expression: this.parseExpression(),
    };
  }

  private parseExpression(): ExprNode {
    return this.parseOr();
  }

  private parseOr(): ExprNode {
    let node = this.parseAnd();

    while (this.matchKeyword('OR')) {
      node = {
        type: 'binary',
        operator: 'OR',
        left: node,
        right: this.parseAnd(),
      };
    }

    return node;
  }

  private parseAnd(): ExprNode {
    let node = this.parseComparison();

    while (this.matchKeyword('AND')) {
      node = {
        type: 'binary',
        operator: 'AND',
        left: node,
        right: this.parseComparison(),
      };
    }

    return node;
  }

  private parseComparison(): ExprNode {
    let node = this.parseAdditive();

    while (
      this.is('operator') &&
      ['>', '<', '>=', '<=', '=', '!=', '<>'].includes(this.current().value)
    ) {
      const operator = this.current().value;
      this.index += 1;
      node = {
        type: 'binary',
        operator,
        left: node,
        right: this.parseAdditive(),
      };
    }

    return node;
  }

  private parseAdditive(): ExprNode {
    let node = this.parseMultiplicative();

    while (this.is('operator') && ['+', '-'].includes(this.current().value)) {
      const operator = this.current().value;
      this.index += 1;
      node = {
        type: 'binary',
        operator,
        left: node,
        right: this.parseMultiplicative(),
      };
    }

    return node;
  }

  private parseMultiplicative(): ExprNode {
    let node = this.parseUnary();

    while (this.is('operator') && ['*', '/'].includes(this.current().value)) {
      const operator = this.current().value;
      this.index += 1;
      node = {
        type: 'binary',
        operator,
        left: node,
        right: this.parseUnary(),
      };
    }

    return node;
  }

  private parseUnary(): ExprNode {
    if (
      (this.is('operator') && ['+', '-'].includes(this.current().value)) ||
      this.isKeyword('NOT')
    ) {
      const operator = this.isKeyword('NOT')
        ? this.consume('identifier').value.toUpperCase()
        : this.consume('operator').value;
      return {
        type: 'unary',
        operator,
        argument: this.parseUnary(),
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    if (this.is('number')) {
      return {
        type: 'number',
        value: Number(this.consume('number').value),
      };
    }

    if (this.is('identifier')) {
      const name = this.consume('identifier').value;

      if (this.is('paren', '(')) {
        this.index += 1;
        const args: ExprNode[] = [];
        while (!this.is('paren', ')')) {
          args.push(this.parseExpression());
          if (this.is('comma')) {
            this.index += 1;
          } else {
            break;
          }
        }
        this.expect('paren', ')');
        return {
          type: 'call',
          callee: normalizeIdentifier(name),
          args,
        };
      }

      return {
        type: 'identifier',
        name: normalizeIdentifier(name),
      };
    }

    if (this.is('paren', '(')) {
      this.index += 1;
      const expression = this.parseExpression();
      this.expect('paren', ')');
      return expression;
    }

    throw new Error(`公式语法错误，位置附近: ${this.current().value || 'EOF'}`);
  }

  private matchKeyword(keyword: string): boolean {
    if (this.isKeyword(keyword)) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private isKeyword(keyword: string): boolean {
    return this.is('identifier') && this.current().value.toUpperCase() === keyword;
  }

  private expect(type: TokenType, value?: string): Token {
    if (!this.is(type, value)) {
      throw new Error(`公式语法错误，期望 ${value ?? type}`);
    }
    const token = this.current();
    this.index += 1;
    return token;
  }

  private consume(type: TokenType): Token {
    return this.expect(type);
  }

  private current(): Token {
    return this.tokens[this.index];
  }

  private peek(offset: number): Token | undefined {
    return this.tokens[this.index + offset];
  }

  private is(type: TokenType, value?: string): boolean {
    const token = this.tokens[this.index];
    if (!token) {
      return false;
    }
    if (token.type !== type) {
      return false;
    }
    if (value !== undefined && token.value !== value) {
      return false;
    }
    return true;
  }
}

function normalizeIdentifier(name: string): string {
  return name.trim().toUpperCase();
}

function isSeries(value: NumericValue): value is NumericSeries {
  return Array.isArray(value);
}

function toNumber(value: NumericValue): number {
  if (Array.isArray(value)) {
    return value[value.length - 1] ?? 0;
  }
  return value;
}

function toBooleanNumber(value: number): number {
  return value !== 0 ? 1 : 0;
}

function normalizeNumber(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function buildVariableMap(context: FormulaSeriesContext): Record<string, NumericValue> {
  const close = context.close.map(normalizeNumber);
  const open = context.open.map(normalizeNumber);
  const high = context.high.map(normalizeNumber);
  const low = context.low.map(normalizeNumber);
  const volume = context.volume.map(normalizeNumber);
  const dailyK = context.dailyK.map(normalizeNumber);
  const dailyD = context.dailyD.map(normalizeNumber);
  const dailyJ = context.dailyJ.map(normalizeNumber);
  const bbi = context.bbi.map((value) => normalizeNumber(value));

  return {
    C: close,
    CLOSE: close,
    P: close,
    PRICE: context.price,
    O: open,
    OPEN: open,
    H: high,
    HIGH: high,
    L: low,
    LOW: low,
    V: volume,
    VOL: volume,
    VOLUME: volume,
    K: dailyK,
    D: dailyD,
    J: dailyJ,
    BBI: bbi,
    WJ: context.weeklyJ,
    WEEKLYJ: context.weeklyJ,
    CHANGEPCT: context.changePercent,
    VOLRATIO: context.volumeRatio,
    ABOVEBBIDAYS: context.aboveBBIConsecutiveDaysCount,
    BELOWBBIDAYS: context.belowBBIConsecutiveDaysCount,
  };
}

function getSeriesLength(variables: Record<string, NumericValue>): number {
  const close = variables.C;
  return Array.isArray(close) ? close.length : 0;
}

function ensureSeries(value: NumericValue, length: number): NumericSeries {
  if (Array.isArray(value)) {
    if (value.length === length) {
      return value;
    }
    if (value.length > length) {
      return value.slice(value.length - length);
    }

    if (value.length === 0) {
      return Array.from({ length }, () => 0);
    }

    return Array.from({ length }, (_, index) => value[Math.min(index, value.length - 1)] ?? 0);
  }

  return Array.from({ length }, () => value);
}

function latest(value: NumericValue): number {
  return Array.isArray(value) ? value[value.length - 1] ?? 0 : value;
}

function binaryOp(
  left: NumericValue,
  right: NumericValue,
  length: number,
  mapper: (a: number, b: number) => number,
): NumericValue {
  if (!isSeries(left) && !isSeries(right)) {
    return mapper(left, right);
  }

  const leftSeries = ensureSeries(left, length);
  const rightSeries = ensureSeries(right, length);
  return leftSeries.map((value, index) => mapper(value, rightSeries[index] ?? 0));
}

function unaryOp(
  value: NumericValue,
  length: number,
  mapper: (current: number) => number,
): NumericValue {
  if (!isSeries(value)) {
    return mapper(value);
  }

  const series = ensureSeries(value, length);
  return series.map(mapper);
}

function movingAverage(series: number[], period: number): number[] {
  const safePeriod = Math.max(1, Math.trunc(period));
  const result: number[] = [];
  let sum = 0;

  for (let index = 0; index < series.length; index += 1) {
    sum += series[index];
    if (index >= safePeriod) {
      sum -= series[index - safePeriod];
    }
    const divisor = index >= safePeriod ? safePeriod : index + 1;
    result.push(sum / divisor);
  }

  return result;
}

function weightedSma(series: number[], period: number, weight: number): number[] {
  if (series.length === 0) {
    return [];
  }

  const safePeriod = Math.max(1, Math.trunc(period));
  const safeWeight = Math.max(1, Math.trunc(weight));
  const result: number[] = [];
  let current = series[0] ?? 0;
  result.push(current);

  for (let index = 1; index < series.length; index += 1) {
    current = (current * (safePeriod - safeWeight) + series[index] * safeWeight) / safePeriod;
    result.push(current);
  }

  return result;
}

function exponentialMovingAverage(series: number[], period: number): number[] {
  if (series.length === 0) {
    return [];
  }

  const safePeriod = Math.max(1, Math.trunc(period));
  const multiplier = 2 / (safePeriod + 1);
  const result: number[] = [series[0]];

  for (let index = 1; index < series.length; index += 1) {
    const previous = result[index - 1] ?? series[index - 1] ?? 0;
    result.push(previous + (series[index] - previous) * multiplier);
  }

  return result;
}

function rollingWindow(
  series: number[],
  period: number,
  selector: (windowValues: number[]) => number,
): number[] {
  const safePeriod = Math.max(1, Math.trunc(period));
  return series.map((_, index) => {
    const start = Math.max(0, index - safePeriod + 1);
    return selector(series.slice(start, index + 1));
  });
}

function refSeries(series: number[], offset: number): number[] {
  const safeOffset = Math.max(0, Math.trunc(offset));
  return series.map((_, index) => {
    const targetIndex = index - safeOffset;
    return targetIndex >= 0 ? series[targetIndex] ?? 0 : 0;
  });
}

function countSeries(series: number[], period: number): number[] {
  const safePeriod = Math.max(1, Math.trunc(period));
  return series.map((_, index) => {
    const start = Math.max(0, index - safePeriod + 1);
    let count = 0;
    for (let cursor = start; cursor <= index; cursor += 1) {
      if ((series[cursor] ?? 0) !== 0) {
        count += 1;
      }
    }
    return count;
  });
}

function crossSeries(left: number[], right: number[]): number[] {
  return left.map((value, index) => {
    if (index === 0) {
      return 0;
    }
    const previousLeft = left[index - 1] ?? 0;
    const previousRight = right[index - 1] ?? 0;
    return previousLeft <= previousRight && value > (right[index] ?? 0) ? 1 : 0;
  });
}

function executeFunction(
  name: string,
  args: NumericValue[],
  length: number,
): NumericValue {
  const normalizedName = normalizeIdentifier(name);

  switch (normalizedName) {
    case 'REF': {
      if (args.length < 2) {
        throw new Error('REF 需要两个参数');
      }
      return refSeries(ensureSeries(args[0], length), toNumber(args[1]));
    }
    case 'MA': {
      if (args.length < 2) {
        throw new Error('MA 需要两个参数');
      }
      return movingAverage(ensureSeries(args[0], length), toNumber(args[1]));
    }
    case 'EMA': {
      if (args.length < 2) {
        throw new Error('EMA 需要两个参数');
      }
      return exponentialMovingAverage(ensureSeries(args[0], length), toNumber(args[1]));
    }
    case 'SMA': {
      if (args.length < 3) {
        throw new Error('SMA 需要三个参数');
      }
      return weightedSma(
        ensureSeries(args[0], length),
        toNumber(args[1]),
        toNumber(args[2]),
      );
    }
    case 'HHV': {
      if (args.length < 2) {
        throw new Error('HHV 需要两个参数');
      }
      return rollingWindow(ensureSeries(args[0], length), toNumber(args[1]), (values) =>
        Math.max(...values),
      );
    }
    case 'LLV': {
      if (args.length < 2) {
        throw new Error('LLV 需要两个参数');
      }
      return rollingWindow(ensureSeries(args[0], length), toNumber(args[1]), (values) =>
        Math.min(...values),
      );
    }
    case 'ABS': {
      if (args.length < 1) {
        throw new Error('ABS 需要一个参数');
      }
      return unaryOp(args[0], length, (value) => Math.abs(value));
    }
    case 'MAX': {
      if (args.length < 2) {
        throw new Error('MAX 需要两个参数');
      }
      return binaryOp(args[0], args[1], length, (a, b) => Math.max(a, b));
    }
    case 'MIN': {
      if (args.length < 2) {
        throw new Error('MIN 需要两个参数');
      }
      return binaryOp(args[0], args[1], length, (a, b) => Math.min(a, b));
    }
    case 'IF': {
      if (args.length < 3) {
        throw new Error('IF 需要三个参数');
      }
      const condition = ensureSeries(args[0], length);
      const truthy = ensureSeries(args[1], length);
      const falsy = ensureSeries(args[2], length);
      return condition.map((value, index) => (value !== 0 ? truthy[index] ?? 0 : falsy[index] ?? 0));
    }
    case 'COUNT': {
      if (args.length < 2) {
        throw new Error('COUNT 需要两个参数');
      }
      return countSeries(ensureSeries(args[0], length), toNumber(args[1]));
    }
    case 'EVERY': {
      if (args.length < 2) {
        throw new Error('EVERY 需要两个参数');
      }
      const counts = countSeries(ensureSeries(args[0], length), toNumber(args[1]));
      const period = Math.max(1, Math.trunc(toNumber(args[1])));
      return counts.map((value) => (value >= period ? 1 : 0));
    }
    case 'EXIST': {
      if (args.length < 2) {
        throw new Error('EXIST 需要两个参数');
      }
      const counts = countSeries(ensureSeries(args[0], length), toNumber(args[1]));
      return counts.map((value) => (value > 0 ? 1 : 0));
    }
    case 'CROSS': {
      if (args.length < 2) {
        throw new Error('CROSS 需要两个参数');
      }
      return crossSeries(ensureSeries(args[0], length), ensureSeries(args[1], length));
    }
    default:
      throw new Error(`暂不支持的通达信函数: ${normalizedName}`);
  }
}

function evaluateExpression(
  node: ExprNode,
  variables: Record<string, NumericValue>,
  length: number,
): NumericValue {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'identifier': {
      const value = variables[node.name];
      if (value === undefined) {
        throw new Error(`未识别的通达信变量: ${node.name}`);
      }
      return value;
    }
    case 'unary': {
      const value = evaluateExpression(node.argument, variables, length);
      if (node.operator === '-') {
        return unaryOp(value, length, (current) => -current);
      }
      if (node.operator === '+') {
        return value;
      }
      if (node.operator === 'NOT') {
        return unaryOp(value, length, (current) => (current === 0 ? 1 : 0));
      }
      throw new Error(`不支持的一元操作符: ${node.operator}`);
    }
    case 'binary': {
      const left = evaluateExpression(node.left, variables, length);
      const right = evaluateExpression(node.right, variables, length);

      switch (node.operator) {
        case '+':
          return binaryOp(left, right, length, (a, b) => a + b);
        case '-':
          return binaryOp(left, right, length, (a, b) => a - b);
        case '*':
          return binaryOp(left, right, length, (a, b) => a * b);
        case '/':
          return binaryOp(left, right, length, (a, b) => (b === 0 ? 0 : a / b));
        case '>':
          return binaryOp(left, right, length, (a, b) => (a > b ? 1 : 0));
        case '<':
          return binaryOp(left, right, length, (a, b) => (a < b ? 1 : 0));
        case '>=':
          return binaryOp(left, right, length, (a, b) => (a >= b ? 1 : 0));
        case '<=':
          return binaryOp(left, right, length, (a, b) => (a <= b ? 1 : 0));
        case '=':
          return binaryOp(left, right, length, (a, b) => (a === b ? 1 : 0));
        case '!=':
        case '<>':
          return binaryOp(left, right, length, (a, b) => (a !== b ? 1 : 0));
        case 'AND':
          return binaryOp(left, right, length, (a, b) => (a !== 0 && b !== 0 ? 1 : 0));
        case 'OR':
          return binaryOp(left, right, length, (a, b) => (a !== 0 || b !== 0 ? 1 : 0));
        default:
          throw new Error(`不支持的二元操作符: ${node.operator}`);
      }
    }
    case 'call': {
      const args = node.args.map((arg) => evaluateExpression(arg, variables, length));
      return executeFunction(node.callee, args, length);
    }
    default:
      throw new Error('未知公式节点');
  }
}

function parseFormulaStatements(formula: string): StatementNode[] {
  const trimmed = formula.trim();
  if (!trimmed) {
    return [];
  }

  const parser = new Parser(tokenize(trimmed));
  return parser.parseProgram();
}

export function validateTdxFormula(formula: string): void {
  const statements = parseFormulaStatements(formula);
  if (statements.length === 0) {
    throw new Error('通达信公式不能为空');
  }

  const demoSeries = [10, 10.2, 10.5, 10.8, 11, 11.2, 11.5, 11.3, 11.7, 12];
  evaluateTdxFormula(formula, {
    open: demoSeries,
    high: demoSeries.map((value) => value + 0.3),
    low: demoSeries.map((value) => value - 0.3),
    close: demoSeries,
    volume: demoSeries.map((value, index) => 1000 + index * 100 + value * 10),
    dailyK: demoSeries.map((value) => value * 5),
    dailyD: demoSeries.map((value) => value * 4.8),
    dailyJ: demoSeries.map((value) => value * 5.4),
    bbi: demoSeries.map((value) => value),
    price: 12,
    changePercent: 1.8,
    volumeRatio: 1.5,
    aboveBBIConsecutiveDaysCount: 3,
    belowBBIConsecutiveDaysCount: 0,
    weeklyJ: 28,
  });
}

export function evaluateTdxFormula(
  formula: string,
  context: FormulaSeriesContext,
): { matched: boolean; reason: string } {
  const statements = parseFormulaStatements(formula);
  if (statements.length === 0) {
    return { matched: false, reason: '' };
  }

  const variables = buildVariableMap(context);
  const length = getSeriesLength(variables);
  let lastValue: NumericValue = 0;

  for (const statement of statements) {
    if (statement.type === 'assignment') {
      const evaluated = evaluateExpression(statement.expression, variables, length);
      variables[statement.name] = evaluated;
      lastValue = evaluated;
      continue;
    }

    lastValue = evaluateExpression(statement.expression, variables, length);
  }

  const matched = toBooleanNumber(latest(lastValue)) === 1;
  const reason = `公式命中: ${formula.trim().replace(/\s+/g, ' ').slice(0, 120)}`;
  return { matched, reason };
}
