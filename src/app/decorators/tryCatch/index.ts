import AppError from "../../appError";
import { INVALID_FIELDS } from "../../constants/errorCodes";
function tryCatch(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        await originalMethod.apply(this, args);
      } catch (error) {
        if (error.name === "SequelizeValidationError") {
          error = new AppError(
            INVALID_FIELDS,
            "Invalid fields in the request",
            400
          );
        }
        const next = args[2]; // 'next' é o terceiro argumento
        next(error);
      }
    };

    return descriptor;
  };
}
export default tryCatch;
