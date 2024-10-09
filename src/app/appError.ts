class AppError extends Error {
  private errorCode: number;
  private statusCode: number;

  constructor(errorCode: number, message: string, statusCode: number) {
    super(message);
    this.errorCode = errorCode;
    this.statusCode = statusCode;

    // Necessário para manter a compatibilidade com o stack trace correto
    Object.setPrototypeOf(this, new.target.prototype);
  }

  getErrorCode() {
    return this.errorCode;
  }

  getStatusCode() {
    return this.statusCode;
  }
}

export default AppError;
