export const translateError = (errorMessage: string): string => {
  if (!errorMessage) return "Ha ocurrido un error desconocido.";

  const lowerCaseError = errorMessage.toLowerCase();

  if (lowerCaseError.includes("invalid login credentials")) {
    return "Credenciales de inicio de sesión inválidas.";
  }
  if (lowerCaseError.includes("user already registered")) {
    return "El usuario ya está registrado.";
  }
  if (lowerCaseError.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (lowerCaseError.includes("email not confirmed")) {
    return "Correo electrónico no confirmado. Por favor verifica tu bandeja de entrada.";
  }
  if (lowerCaseError.includes("rate limit exceeded")) {
    return "Has excedido el límite de intentos. Por favor intenta más tarde.";
  }
  if (lowerCaseError.includes("user not found")) {
    return "Usuario no encontrado.";
  }
  if (lowerCaseError.includes("invalid email")) {
    return "Correo electrónico inválido.";
  }
  if (lowerCaseError.includes("auth session missing")) {
    return "Sesión de autenticación perdida. Inicia sesión nuevamente.";
  }

  return errorMessage; // Retorna el mensaje original si no hay coincidencia
};
