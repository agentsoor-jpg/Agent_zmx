export class APIStandard {
  static success(data: any, metadata: any = {}) {
    return {
      status: 'success',
      data,
      error: null,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static error(message: string, code: number = 500, metadata: any = {}) {
    return {
      status: 'error',
      data: null,
      error: {
        message,
        code
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }
}
