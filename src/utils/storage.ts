const TARGET_COMPANY_KEY = 'target_company_id';

export const setTargetCompanyId = (companyId: string) => {
  try {
    localStorage.setItem(TARGET_COMPANY_KEY, companyId);
  } catch (e) {
    console.error('Error setting target company ID in localStorage', e);
  }
};

export const getTargetCompanyId = (): string | null => {
  try {
    return localStorage.getItem(TARGET_COMPANY_KEY);
  } catch (e) {
    console.error('Error getting target company ID from localStorage', e);
    return null;
  }
};

export const clearTargetCompanyId = () => {
  try {
    localStorage.removeItem(TARGET_COMPANY_KEY);
  } catch (e) {
    console.error('Error clearing target company ID from localStorage', e);
  }
};