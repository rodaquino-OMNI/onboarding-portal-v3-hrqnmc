/**
 * Local data masking hook to replace @austa/data-masking
 */
import { useCallback } from 'react';

export const useMaskData = () => {
  const maskCPF = useCallback((cpf: string): string => {
    if (!cpf) return '';
    // Mask CPF: XXX.XXX.XXX-XX -> ***.***.XXX-XX
    return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.***.$3-$4');
  }, []);

  const maskEmail = useCallback((email: string): string => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    const maskedUsername = username.charAt(0) + '***' + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }, []);

  const maskPhone = useCallback((phone: string): string => {
    if (!phone) return '';
    // Mask phone: +55 (XX) XXXXX-XXXX -> +55 (XX) *****-XXXX
    return phone.replace(/(\+\d{2}\s\(\d{2}\)\s)(\d{5})-(\d{4})/, '$1*****-$3');
  }, []);

  const mask = useCallback((value: string, type: 'cpf' | 'email' | 'phone'): string => {
    switch (type) {
      case 'cpf':
        return maskCPF(value);
      case 'email':
        return maskEmail(value);
      case 'phone':
        return maskPhone(value);
      default:
        return value;
    }
  }, [maskCPF, maskEmail, maskPhone]);

  return {
    mask,
    maskCPF,
    maskEmail,
    maskPhone,
  };
};
