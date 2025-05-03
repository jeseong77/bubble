export const generateVerificationCode = (): string => {
  const code = Math.floor(Math.random() * 90000) + 10000;
  return code.toString();
};