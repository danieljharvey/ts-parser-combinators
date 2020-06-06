import * as R from "./result.ts";

type Error = string;

type ParserResult<A> = R.Result<Error, [string, A]>;
type ParserFunc<A> = (input: string) => ParserResult<A>;

export type Parser<A> = {
  type: "Parser";
  parse: ParserFunc<A>;
};

export const makeParser = <A>(parse: ParserFunc<A>): Parser<A> => ({
  type: "Parser",
  parse,
});

export const map = <A, B>(parser: Parser<A>, f: (a: A) => B): Parser<B> =>
  makeParser(
    (input) => R.map(parser.parse(input), ([rest, a]) => [rest, f(a)]),
  );

export const pair = <A, B>(
  parserA: Parser<A>,
  parserB: Parser<B>,
): Parser<[A, B]> =>
  makeParser((input) => {
    const resultA = parserA.parse(input);
    if (R.isFailure(resultA)) {
      return resultA;
    }
    const [rest, a] = resultA.value;
    const resultB = parserB.parse(rest);
    if (R.isFailure(resultB)) {
      return resultB;
    }
    const [restB, b] = resultB.value;

    return R.success([restB, [a, b]]);
  });

export const left = <A, B>(parserA: Parser<A>, parserB: Parser<B>): Parser<A> =>
  map(pair(parserA, parserB), ([a, _]) => a);

export const right = <A, B>(
  parserA: Parser<A>,
  parserB: Parser<B>,
): Parser<B> => map(pair(parserA, parserB), ([_, b]) => b);

export const oneOrMore = <A>(parserA: Parser<A>): Parser<A[]> =>
  makeParser((input) => {
    const res = parserA.parse(input);
    if (R.isFailure(res)) {
      return res;
    }
    let [next, result] = res.value;
    let results = [result];
    while (true) {
      const parsed = parserA.parse(next);
      if (R.isSuccess(parsed)) {
        next = parsed.value[0];
        results.push(parsed.value[1]);
      } else {
        break;
      }
    }
    return R.success([next, results]);
  });

export const zeroOrMore = <A>(parserA: Parser<A>): Parser<A[]> =>
  makeParser((input) => {
    let next = input;
    let results = [];
    while (true) {
      const parsed = parserA.parse(next);
      if (R.isSuccess(parsed)) {
        next = parsed.value[0];
        results.push(parsed.value[1]);
      } else {
        break;
      }
    }
    return R.success([next, results]);
  });

export const anyChar = makeParser((input) => {
  const [match, rest] = splitString(input, 1);
  return match !== null ? R.success([rest, match]) : R.failure(input);
});

export const pred = <A>(
  parser: Parser<A>,
  predicate: (a: A) => boolean,
): Parser<A> =>
  makeParser((input) => {
    const result = parser.parse(input);
    if (R.isFailure(result)) {
      return result;
    }
    const [rest, a] = result.value;
    return predicate(a) ? R.success([rest, a]) : R.failure(input);
  });

export const matchLiteral = <Lit extends string>(lit: Lit): Parser<Lit> =>
  makeParser((input) => {
    const [match, rest] = splitString(input, lit.length);
    return match === lit ? R.success([rest, lit]) : R.failure(input);
  });

function isAlphaNumeric(char: string) {
  const code = char.charCodeAt(0);
  return ((code > 47 && code < 58) || // numeric (0-9)
    (code > 64 && code < 91) || // upper alpha (A-Z)
    (code > 96 && code < 123)); // lower alpha (a-z)
}

const alphaNumeric = pred(anyChar, isAlphaNumeric);

export const identifier = map(oneOrMore(alphaNumeric), (as) => as.join(""));

export const whitespace = pred(anyChar, (a) => a.trim() === "");

export const space0 = zeroOrMore(whitespace);

export const space1 = oneOrMore(whitespace);

// this messes up if startChar is a string
export const stringBetween = (
  startChar: string,
  endChar: string,
): Parser<string> =>
  map(
    right(
      matchLiteral(startChar),
      left(
        zeroOrMore(pred(anyChar, (c) => c !== startChar && c !== endChar)),
        matchLiteral(endChar),
      ),
    ),
    (as) => as.join(""),
  );

const either = <A>(parser1: Parser<A>, parser2: Parser<A>): Parser<A> =>
  makeParser((input) => {
    const resultA = parser1.parse(input);
    if (R.isSuccess(resultA)) {
      return resultA;
    }
    return parser2.parse(input);
  });

const andThen = <A, B>(
  parserA: Parser<A>,
  thenParserB: (a: A) => Parser<B>,
): Parser<B> =>
  makeParser((input) => {
    const result = parserA.parse(input);
    if (R.isFailure(result)) {
      return result;
    }
    const [next, a] = result.value;
    return thenParserB(a).parse(next);
  });

interface Element {
  name: string;
  attributes: [string, string][];
  children: Element[];
}

export const quotedString: Parser<string> = stringBetween('"', '"');

export const attributePair = pair(
  identifier,
  right(matchLiteral("="), quotedString),
);

export const attributes = zeroOrMore(right(space1, attributePair));

const elementStart: Parser<[string, [string, string][]]> = right(
  matchLiteral("<"),
  pair(identifier, attributes),
);

export const singleElement: Parser<Element> = map(
  left(elementStart, matchLiteral("/>")),
  ([name, attributes]) => ({
    name,
    attributes,
    children: [],
  }),
);

const openElement = map(
  left(elementStart, matchLiteral(">")),
  ([name, attributes]) => ({
    name,
    attributes,
    children: [],
  }),
);

const closeElement = (expectedName: string) =>
  pred(
    right(matchLiteral("</"), left(identifier, matchLiteral(">"))),
    (name) => name === expectedName,
  );

const parentElement = andThen(
  openElement,
  (el) =>
    map(left(zeroOrMore(element()), closeElement(el.name)), (children) => ({
      ...el,
      children,
    })),
);

export const element = (): Parser<Element> =>
  either(singleElement, parentElement);

export const runParser = <A>(
  parser: Parser<A>,
  input: string,
): R.Result<Error, [string, A]> => parser.parse(input);

const splitString = (
  input: string,
  length: number,
): [string | null, string] => {
  const match = input.slice(0, length);
  const actualMatch = match.length >= length ? match : null;
  const rest = input.slice(length);
  return [actualMatch, rest];
};
