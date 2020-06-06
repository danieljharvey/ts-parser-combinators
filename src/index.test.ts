import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as R from "./result.ts";
import * as P from "./index.ts";

const theLetterA = P.matchLiteral("a");

Deno.test("The letter A fails", () => {
  const result = P.runParser(theLetterA, "poo");
  assertEquals(result, R.failure("poo"));
});

Deno.test("The letter A succeeds", () => {
  const result = P.runParser(theLetterA, "apoo");
  assertEquals(result, R.success(["poo", "a"]));
});

const andA = P.right(P.matchLiteral("&"), theLetterA);

Deno.test("andA fails", () => {
  const result = P.runParser(andA, "&b");
  assertEquals(result, R.failure("b"));
});

Deno.test("andA succeeds", () => {
  const result = P.runParser(andA, "&ayeah");
  assertEquals(result, R.success(["yeah", "a"]));
});

const dddd = P.oneOrMore(P.matchLiteral("d"));

Deno.test("dddd fails", () => {
  const result = P.runParser(dddd, "&b");
  assertEquals(result, R.failure("&b"));
});

Deno.test("dddd succeeds", () => {
  const result = P.runParser(dddd, "ddddog");
  assertEquals(result, R.success(["og", ["d", "d", "d", "d"]]));
});

const spaces = P.zeroOrMore(P.matchLiteral(" "));

Deno.test("spaces succeeds with zero", () => {
  const result = P.runParser(spaces, "dog");
  assertEquals(result, R.success(["dog", []]));
});

Deno.test("spaces succeeds with some", () => {
  const result = P.runParser(spaces, "  dog");
  assertEquals(result, R.success(["dog", [" ", " "]]));
});

const twoLetters = P.pair(P.anyChar, P.anyChar);

Deno.test("anyChar finds nothing", () => {
  const result = P.runParser(twoLetters, "o");
  assertEquals(result, R.failure(""));
});

Deno.test("anyChar finds two things", () => {
  const result = P.runParser(twoLetters, "ok");
  assertEquals(result, R.success(["", ["o", "k"]]));
});

const someWhitespace = P.pred(P.anyChar, (a) => a.trim() === "");

Deno.test("Finds not-whitespace", () => {
  const result = P.runParser(someWhitespace, "dog");
  assertEquals(result, R.failure("dog"));
});

Deno.test("Finds whitespace", () => {
  const result = P.runParser(someWhitespace, " dog");
  assertEquals(result, R.success(["dog", " "]));
});

Deno.test("Zero or more whitespace", () => {
  const result = P.runParser(P.space0, "anythingwhatsoever");
  assertEquals(result, R.success(["anythingwhatsoever", []]));
});

Deno.test("One or more whitespace fails", () => {
  const result = P.runParser(P.space1, "nope");
  assertEquals(result, R.failure("nope"));
});

Deno.test("One or more whitespace succeeds", () => {
  const result = P.runParser(P.space1, "  nope");
  assertEquals(result, R.success(["nope", [" ", " "]]));
});

Deno.test("Quoted string succeeds", () => {
  const result = P.runParser(P.quotedString, '"dog"');
  assertEquals(result, R.success(["", "dog"]));
});

const htmlTag = P.stringBetween("<", ">");

Deno.test("Does not parse an html tag", () => {
  const result = P.runParser(htmlTag, "<<what>");
  assertEquals(result, R.failure("<what>"));
});

Deno.test("Parses an html tag", () => {
  const result = P.runParser(htmlTag, "<what>");
  assertEquals(result, R.success(["", "what"]));
});

Deno.test("identifier fail", () => {
  assertEquals(P.runParser(P.identifier, "----"), R.failure("----"));
});

Deno.test("identifier success", () => {
  assertEquals(P.runParser(P.identifier, "horse"), R.success(["", "horse"]));
});

Deno.test("single attribute parses", () => {
  assertEquals(
    P.runParser(P.attributePair, 'dog="poo"'),
    R.success(["", ["dog", "poo"]]),
  );
});

Deno.test("Parses attributes", () => {
  const result = P.runParser(P.attributes, ' dog="yes" cat="no"');
  assertEquals(result, R.success(["", [["dog", "yes"], ["cat", "no"]]]));
});

Deno.test("Parses element", () => {
  const result = P.runParser(P.element(), '<div class=\"float\"/>');
  assertEquals(
    result,
    R.success(
      ["", { name: "div", attributes: [["class", "float"]], children: [] }],
    ),
  );
});

Deno.test("Parses element with children", () => {
  const result = P.runParser(
    P.element(),
    '<div class=\"float\"><img src=\"hello.jpg\"/></div>',
  );
  const expected = {
    name: "div",
    attributes: [["class", "float"]],
    children: [
      { name: "img", attributes: [["src", "hello.jpg"]], children: [] },
    ],
  };
  assertEquals(result, R.success(["", expected]));
});
