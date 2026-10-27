export const errorMessages = {
  invalidInput: "Revisa los campos indicados.",
  invalidDate: "Revisa la fecha y hora del evento.",
  eventUnavailable: "Este evento ya no está disponible para registro.",
  ticketUnavailable: "Esta entrada se agotó o ya no está disponible. Elige otra opción.",
  duplicateRegistration: "Este email ya tiene un registro para este evento.",
  unauthenticated: "Inicia sesión para continuar.",
  forbidden: "No tienes acceso a este recurso.",
  eventCapacityExceeded: "La suma de los aforos de entrada no puede superar el aforo del evento.",
  ticketTypesRequired: "Añade al menos un tipo de entrada antes de publicar.",
  registeredCapacity: "El aforo no puede ser menor que sus registros confirmados.",
  registeredResource: "No puedes eliminar un evento o tipo de entrada con registros confirmados.",
  duplicateTicketType: "Ya existe un tipo de entrada con ese nombre en el evento.",
  invalidCredentials: "El correo o la contraseña no son correctos.",
  emailNotConfirmed: "Confirma tu correo antes de iniciar sesión.",
  accountExists: "Ya existe una cuenta con ese correo.",
  signupUnavailable: "No se pudo crear la cuenta. Intenta más tarde.",
  rateLimited: "Has realizado demasiadas solicitudes. Intenta más tarde.",
  unsupportedMediaType: "Envía los datos en formato JSON.",
  methodNotAllowed: "Esta operación no está disponible.",
  requestFailed: "No pudimos completar la solicitud. Intenta de nuevo.",
  networkError: "Revisa tu conexión e intenta de nuevo.",
} as const;
export type ErrorCode = keyof typeof errorMessages;

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  constructor(code: ErrorCode, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export function errorMessage(code: unknown) {
  return typeof code === "string" && Object.hasOwn(errorMessages, code)
    ? errorMessages[code as ErrorCode] : errorMessages.requestFailed;
}

export function databaseError(error: { code?: string; message?: string }): never {
  if (error.code === "23503") throw new ApiError("registeredResource", 409);
  if (error.code === "23505") throw new ApiError("duplicateTicketType", 409);
  if (error.code === "42501") throw new ApiError("forbidden", 403);
  // Match only known application constraints; never forward provider messages.
  if (error.message === "El aforo de la entrada no puede ser menor que sus registros."
    || error.message === "El aforo del evento no puede ser menor que sus registros.") {
    throw new ApiError("registeredCapacity", 409);
  }
  if (error.message === "The combined ticket capacity cannot exceed the event capacity") {
    throw new ApiError("eventCapacityExceeded", 409);
  }
  if (error.message === "A published event must have at least one ticket type") {
    throw new ApiError("ticketTypesRequired", 409);
  }
  throw new ApiError("requestFailed", 500);
}
