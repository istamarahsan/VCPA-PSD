export interface Ok<T> {
    ok: true;
    value: T;
}

export interface Err<E> {
    ok: false;
    value: E;
}

export type Result<T, E = undefined> = Ok<T> | Err<E>;

export function error<E, T = undefined>(value: E): Result<T, E> {
    return {
        ok: false,
        value: value
    }
}

export function ok<T, E = undefined>(value: T): Result<T, E> {
    return {
        ok: true,
        value: value
    }
}