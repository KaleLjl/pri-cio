import { ObjectDiscussionData } from "@/lib/types/chat"; // Assuming this type path is correct

// Price Validation Logic
export const priceValidation = {
  isValidFormat: (price: string): boolean => {
    // Allows numbers and optional decimal part with up to 2 digits
    return /^\d+(\.\d{0,2})?$/.test(price);
  },

  isPositive: (price: string): boolean => {
    const numericPrice = parseFloat(price);
    // Ensure it's a number and greater than 0
    return !isNaN(numericPrice) && numericPrice > 0;
  },

  validate: (price: string): { isValid: boolean; error?: string } => {
    if (!price) {
      return { isValid: false, error: "Price is required" };
    }
    if (!priceValidation.isValidFormat(price)) {
      return {
        isValid: false,
        error:
          "Invalid price format. Price must be a number with at most 2 decimal places.",
      };
    }
    if (!priceValidation.isPositive(price)) {
      return { isValid: false, error: "Price must be greater than 0" };
    }
    return { isValid: true };
  },
};

// Meeting Validation Logic
export const meetingValidation = {
  isValidTime: (time: string): boolean => {
    if (!time) return false;
    try {
      const meetingDate = new Date(time);
      const now = new Date();
      // Check if the date is valid and in the future
      return !isNaN(meetingDate.getTime()) && meetingDate > now;
    } catch (e) {
      return false; // Invalid date format
    }
  },

  isValidLocation: (location: string): boolean => {
    // Check if location is non-empty after trimming whitespace
    return Boolean(location && location.trim().length > 0);
  },

  validate: (data: {
    meetingTime: string;
    location: string;
  }): { isValid: boolean; error?: string } => {
    if (!meetingValidation.isValidLocation(data.location)) {
      return { isValid: false, error: "Location is required" };
    }
    if (!data.meetingTime) {
      return { isValid: false, error: "Meeting time is required" };
    }
    if (!meetingValidation.isValidTime(data.meetingTime)) {
      return { isValid: false, error: "Meeting time must be in the future" };
    }
    return { isValid: true };
  },
};

// Dealing Validation Logic (for completing a deal)
export const dealingValidation = (
  content: ObjectDiscussionData | null | undefined
): { isValid: boolean; errorMessage?: string } => {
  if (!content) {
    return {
      isValid: false,
      errorMessage: "Discussion content is missing.",
    };
  }
  if (!content.suggestedPrice) {
    return {
      isValid: false,
      errorMessage: "Please set a price before completing the deal.",
    };
  }
  // Use the refined meeting validation
  const meetingDetails = {
    meetingTime: content.meetingTime || "",
    location: content.location || "",
  };
  const meetingVal = meetingValidation.validate(meetingDetails);
  if (!meetingVal.isValid) {
    return {
      isValid: false,
      errorMessage:
        meetingVal.error ||
        "Please set a valid future meeting time and location before completing the deal.",
    };
  }

  return {
    isValid: true,
  };
};
