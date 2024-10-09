import { ValidResponse } from "../../interface/validResponse";
import { Request, Response } from "express";
import { RabbitMQService } from "../rabbitMQ";
import { v4 as uuidv4 } from "uuid";
import { createTimeoutPromise } from "../createTimeoutPromise";
import { processResponse } from "../processResponse";
import { ResponseStructure } from "../../interface/authorization_responseStructure";
const rabbitMQService = new RabbitMQService();
export async function validateAndAuthorize(
  req: Request,
  res: Response
): Promise<ValidResponse | Response<any>> {
  const authorizationHeader = req.headers.authorization;
  const correlationId = uuidv4();
  type ResponseType = ResponseStructure | { error: string };

  try {
    await rabbitMQService.publishToExchange(
      "authorization.ex",
      "",
      "authorization.service_order",
      {
        token: authorizationHeader,
      },
      correlationId,
      "authorization.response_ex"
    );

    const timeout = 10000;
    const timeoutPromise = createTimeoutPromise<ResponseType>(timeout);
    const isListening = { value: true };

    const response: ResponseType = await Promise.race([
      rabbitMQService
        .listenForResponse(
          "authorization.response_service_order",
          correlationId,
          isListening
        )
        .then((result) => {
          isListening.value = false;
          return result;
        }),
      timeoutPromise.then(() => {
        isListening.value = false;
        throw new Error("Timeout: Nenhuma resposta recebida a tempo.");
      }),
    ]);

    const access: ValidResponse = processResponse(
      response,
      res,
      "ROLE_TECHNICIAN"
    );

    if (!access.valid) {
      return res.status(403).json({ error: "acesso negado" });
    }

    return access;
  } catch (error) {
    console.error("Erro na validação e autorização:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao validar e autorizar o usuário." });
  }
}

export async function sendMessageAndWaitForResponse(
  req: Request,
  res: Response,
  exchange: string,
  routingKey: string,
  message: Record<string, any>,
  responseRoutingKey: string,
  responseExchange: string,
  responseQueue: string
): Promise<any> {
  const correlationId = uuidv4(); // Gera um correlationId único para a resposta esperada
  type ResponseType = Record<string, any> | { error: string };

  console.log("Enviando mensagem com ID de correlação:", correlationId);
  console.log("Mensagem enviada:", message);

  try {
    // Publica a mensagem no exchange especificado
    await rabbitMQService.publishToExchange(
      exchange,
      routingKey,
      responseRoutingKey,
      message,
      correlationId,
      responseExchange
    );

    // Define a escuta para a resposta com base nas tentativas
    const isListening = { value: true };

    // Escuta a resposta com o mecanismo de tentativas
    const response: ResponseType = await rabbitMQService.listenForResponse(
      responseQueue,
      correlationId,
      isListening
    );

    console.log("Resposta recebida:", response);

    return response; // Retorna a resposta recebida com sucesso
  } catch (error) {
    console.error("Erro ao enviar mensagem e aguardar resposta:", error);

    // Retorna erro genérico para o cliente
    return res
      .status(500)
      .json({ error: "Erro interno ao processar a solicitação." });
  }
}

export function isValidResponse(access: any): access is ValidResponse {
  return (access as ValidResponse).valid !== undefined;
}
