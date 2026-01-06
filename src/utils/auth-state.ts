// Módulo singleton para controlar estado de logout explícito
let explicitLogoutRequested = false;

export const markExplicitLogout = () => {
  explicitLogoutRequested = true;
};

export const checkAndClearExplicitLogout = (): boolean => {
  const wasExplicit = explicitLogoutRequested;
  explicitLogoutRequested = false; // Reset após verificação
  return wasExplicit;
};

