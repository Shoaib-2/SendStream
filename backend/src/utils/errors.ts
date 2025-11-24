// backend/src/utils/errors.ts

interface ErrorConstructor {
  captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
}

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
    (Error as ErrorConstructor).captureStackTrace?.(this, this.constructor);
  }
}

export class IntegrationError extends Error {
  constructor(
    public service: 'mailchimp',
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}