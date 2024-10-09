import { Response } from "express";
import { ResponseStructure } from "../../interface/authorization_responseStructure";
import { ValidResponse } from "../../interface/validResponse";
type ResponseType = ResponseStructure | { error: string };
export function processResponse(
  response: ResponseType,
  res: Response,
  requiredRole: string
): ValidResponse {
  if ("valid" in response && response.valid && response.role === requiredRole) {
    return {
      valid: true,
      userId: response.userId,
      companyId: response.companyId,
    };
  } else {
    return { valid: false, userId: null, companyId: null };
  }
}
