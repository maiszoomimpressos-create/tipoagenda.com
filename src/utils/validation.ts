export const validateCnpj = (cnpj: string): boolean => {
  cnpj = cnpj.replace(/[^\d]+/g, ''); // Remove non-digits

  if (cnpj.length !== 14) return false;

  // Elimina CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Valida DVs
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
};

export const formatCnpjInput = (value: string) => {
  if (!value) return '';
  let cleaned = value.replace(/\D/g, ''); // Remove non-digits
  if (cleaned.length > 14) cleaned = cleaned.substring(0, 14);

  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 5) {
    return `${cleaned.substring(0, 2)}.${cleaned.substring(2)}`;
  } else if (cleaned.length <= 8) {
    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5)}`;
  } else if (cleaned.length <= 12) {
    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}/${cleaned.substring(8)}`;
  } else {
    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}/${cleaned.substring(8, 12)}-${cleaned.substring(12)}`;
  }
};

export const formatZipCodeInput = (value: string) => {
  if (!value) return '';
  let cleaned = value.replace(/\D/g, ''); // Remove non-digits
  if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);

  if (cleaned.length <= 5) {
    return cleaned;
  } else {
    return `${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
  }
};