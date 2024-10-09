import { Request, Response, NextFunction } from "express";
import AppError from "../appError";

const errorHandler = (
  error: AppError | Error, // Tipagem do parâmetro de erro
  req: Request, // Tipagem do objeto de requisição
  res: Response, // Tipagem do objeto de resposta
  next: NextFunction // Tipagem da função `next`
): Response => {
  // Retorna um objeto `Response`
  console.log(error);

  if (error instanceof AppError) {
    return res.status(error.getStatusCode()).json({
      errorCode: error.getErrorCode(),
      message: error.message,
    });
  }

  return res.status(500).json("Something went wrong");
};

export default errorHandler;
