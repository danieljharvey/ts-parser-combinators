type Failure<E> = { type: "Failure"; value: E };
type Success<A> = { type: "Success"; value: A };

export type Result<E, A> = Failure<E> | Success<A>;

export const failure = <E, A>(value: E): Result<E, A> => ({
  type: "Failure",
  value,
});

export const success = <E, A>(value: A): Result<E, A> => ({
  type: "Success",
  value,
});

export const isFailure = <E, A>(
  value: Result<E, A>,
): value is Failure<E> => value.type === "Failure";

export const isSuccess = <E, A>(
  value: Result<E, A>,
): value is Success<A> => value.type === "Success";

export const combineResults = <E, A, B>(
  value1: Result<E, A>,
  value2: Result<E, B>,
): Result<E, [A, B]> =>
  isFailure(value1)
    ? value1
    : isFailure(value2)
    ? value2
    : success([value1.value, value2.value]);

export const map = <E, A, B>(
  result: Result<E, A>,
  f: (a: A) => B,
): Result<E, B> => isFailure(result) ? result : success(f(result.value));

export const bind = <E, A, B>(
  result: Result<E, A>,
  f: (a: A) => Result<E, B>,
): Result<E, B> => isFailure(result) ? result : f(result.value);

export const mapError = <E, F, A>(
  result: Result<E, A>,
  f: (e: E) => F,
): Result<F, A> => isSuccess(result) ? result : failure(f(result.value));

const id = <A>(a: A): A => a;

export const matchResult = <E, A, B>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => B,
) =>
  (value: Result<E, A>): B =>
    value.type === "Failure" ? onFailure(value.value) : onSuccess(value.value);

export const flatten = <A>(result: Result<A, A>) =>
  matchResult<A, A, A>(id, id)(result);

// takes list of eithers, returns A[] if all successes or E if not
export const all = <E, A>(
  results: Result<E, A>[],
): Result<E, A[]> =>
  results.reduce((total, val) => {
    if (isFailure(total)) {
      return total;
    }
    return matchResult<E, A, Result<E, A[]>>(
      (e) => failure(e),
      (a: A) => success([...total.value, a]),
    )(val);
  }, success<E, A[]>([]));

export const any = <E, A>(
  results: Result<E, A>[],
): Result<E, A[]> => all(results.filter(isSuccess));

export const first = <E, A>(
  result: Result<E, A>,
  ...results: Result<E, A>[]
): Result<E, A> =>
  [result, ...results].reduce((total, current) => {
    if (isSuccess(total)) {
      return total;
    }
    return current;
  }, result);

export const split = <E, A>(
  results: Result<E, A>[],
): [E[], A[]] => {
  const failures = results
    .filter(isFailure)
    .map((a) => a.value);
  const successes = results
    .filter(isSuccess)
    .map((a) => a.value);
  return [failures, successes];
};
