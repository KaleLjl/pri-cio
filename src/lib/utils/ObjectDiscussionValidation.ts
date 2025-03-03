// Create a new file for shared validation logic
export const priceValidation = {
    isValidFormat: (price: string): boolean => {
      // Check if price is a valid number with at most 2 decimal places
      return /^\d+(\.\d{0,2})?$/.test(price);
    },
  
    isPositive: (price: string): boolean => {
      const numericPrice = parseFloat(price);
      return numericPrice > 0;
    },
  
    validate: (price: string): { isValid: boolean; error?: string } => {
      if (!price) {
        return { isValid: false, error: 'Price is required' };
      }
      if (!priceValidation.isValidFormat(price)) {
        return { isValid: false, error: 'Invalid price format. Price must be a number with at most 2 decimal places.' };
      }
      if (!priceValidation.isPositive(price)) {
        return { isValid: false, error: 'Price must be greater than 0' };
      }
      return { isValid: true };
    }
  };
  
  export const meetingValidation = {
    isValidTime: (time: string): boolean => {
      if (!time) return false;
      const meetingDate = new Date(time);
      const now = new Date();
      return meetingDate > now;
    },
  
    isValidLocation: (location: string): boolean => {
      return Boolean(location && location.trim().length > 0);
    },
  
    validate: (data: { meetingTime: string; location: string }): { isValid: boolean; error?: string } => {
      if (!data.meetingTime) {
        return { isValid: false, error: 'Meeting time is required' };
      }
      if (!meetingValidation.isValidTime(data.meetingTime)) {
        return { isValid: false, error: 'Meeting time must be in the future' };
      }
      if (!meetingValidation.isValidLocation(data.location)) {
        return { isValid: false, error: 'Location is required' };
      }
      return { isValid: true };
    }
  };
  
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const dealingValidation = (content: any): ValidationResult => {
  // Check if price is set
  if (!content?.price) {
    return {
      isValid: false,
      errorMessage: 'Please set a price before completing the deal'
    };
  }

  // Check if meeting details are set
  if (!content?.meetingTime || !content?.meetingLocation) {
    return {
      isValid: false,
      errorMessage: 'Please set meeting time and location before completing the deal'
    };
  }

  // All validations passed
  return {
    isValid: true
  };
};
  