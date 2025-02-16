// backend/src/utils/errors.ts

interface ErrorConstructor {
  captureStackTrace?: (targetObject: Object, constructorOpt?: Function) => void;
}
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
    (Error as ErrorConstructor).captureStackTrace?.(this, this.constructor);
  }
}

export class IntegrationError extends Error {
  constructor(
    public service: 'mailchimp' | 'substack',
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}