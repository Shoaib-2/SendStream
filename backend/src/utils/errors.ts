// backend/src/utils/errors.ts

interface ErrorConstructor {
  captureStackTrace?: (targetObject: Object, constructorOpt?: Function) => void;
}
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
    (Error as ErrorConstructor).captureStackTrace?.(this, this.constructor);
  }
}