/**
 * Utilitário para gerenciar alertas de onboarding/primeira vez
 * Armazena no localStorage se o usuário já viu determinados alertas
 */

const STORAGE_PREFIX = 'onboarding_alert_';

/**
 * Chaves dos alertas disponíveis
 */
export const ALERT_KEYS = {
  COMPANY_REGISTRATION: 'company_registration_permissions',
  COLLABORATORS_MENU: 'collaborators_menu_permissions',
} as const;

/**
 * Verifica se o alerta já foi exibido para o usuário/empresa
 * @param alertKey Chave do alerta (de ALERT_KEYS)
 * @param userId ID do usuário (opcional, para alertas por usuário)
 * @param companyId ID da empresa (opcional, para alertas por empresa)
 * @returns true se já foi exibido, false caso contrário
 */
export function hasSeenAlert(
  alertKey: string,
  userId?: string,
  companyId?: string
): boolean {
  try {
    const storageKey = buildStorageKey(alertKey, userId, companyId);
    const value = localStorage.getItem(storageKey);
    return value === 'true';
  } catch (error) {
    console.error('[onboardingAlerts] Erro ao verificar alerta:', error);
    return false;
  }
}

/**
 * Marca um alerta como visualizado
 * @param alertKey Chave do alerta (de ALERT_KEYS)
 * @param userId ID do usuário (opcional, para alertas por usuário)
 * @param companyId ID da empresa (opcional, para alertas por empresa)
 * @param dontShowAgain Se true, marca para não mostrar novamente
 */
export function markAlertAsSeen(
  alertKey: string,
  userId?: string,
  companyId?: string,
  dontShowAgain: boolean = true
): void {
  try {
    const storageKey = buildStorageKey(alertKey, userId, companyId);
    localStorage.setItem(storageKey, dontShowAgain ? 'true' : 'false');
  } catch (error) {
    console.error('[onboardingAlerts] Erro ao marcar alerta como visualizado:', error);
  }
}

/**
 * Remove o registro de um alerta (útil para testes ou reset)
 * @param alertKey Chave do alerta (de ALERT_KEYS)
 * @param userId ID do usuário (opcional)
 * @param companyId ID da empresa (opcional)
 */
export function clearAlert(
  alertKey: string,
  userId?: string,
  companyId?: string
): void {
  try {
    const storageKey = buildStorageKey(alertKey, userId, companyId);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('[onboardingAlerts] Erro ao limpar alerta:', error);
  }
}

/**
 * Constrói a chave de armazenamento baseada nos parâmetros
 */
function buildStorageKey(
  alertKey: string,
  userId?: string,
  companyId?: string
): string {
  let key = `${STORAGE_PREFIX}${alertKey}`;
  
  if (userId) {
    key += `_user_${userId}`;
  }
  
  if (companyId) {
    key += `_company_${companyId}`;
  }
  
  return key;
}

