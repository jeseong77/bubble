import { ProfileFormData } from '@/types/profile';

export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};

export const isStepValid = (step: number, data: ProfileFormData): boolean => {
  switch (step) {
    case 0:
      return !!data.firstName;
    case 1:
      return !!data.username;
    case 2:
      const dayNum = parseInt(data.birthDay, 10);
      const monthNum = parseInt(data.birthMonth, 10);
      const yearNum = parseInt(data.birthYear, 10);
      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return false;
      if (
        data.birthDay.length !== 2 ||
        data.birthMonth.length !== 2 ||
        data.birthYear.length !== 4
      )
        return false;
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31)
        return false;
      const date = new Date(yearNum, monthNum - 1, dayNum);
      const today = new Date();

      // Check if date is valid and not in the future
      if (
        date.getFullYear() !== yearNum ||
        date.getMonth() !== monthNum - 1 ||
        date.getDate() !== dayNum ||
        date > today
      ) {
        return false;
      }

      // Calculate age and check maximum (99 years old)
      const age = calculateAge(date);
      return age <= 99;
    case 3:
      return true; // Height is optional, always valid
    case 4:
      return true; // Location is optional, always valid
    case 5:
      return (
        data.mbti === null ||
        (typeof data.mbti === "string" && data.mbti.length === 4)
      );
    case 6:
      return !!data.gender;
    case 7:
      return !!data.preferredGender;
    case 8:
      return true; // About me is optional, always valid
    case 9:
      return (
        data.images &&
        data.images.length >= 2 &&
        data.images[0] !== null &&
        data.images[1] !== null
      );
    default:
      return false;
  }
};
