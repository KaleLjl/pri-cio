import { randomBytes } from 'crypto';

export class CodeGenerationService {
  // Characters allowed in the verification code (excluding similar looking ones)
  private static readonly ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  private static readonly CODE_LENGTH = 6;

  /**
   * Generates a cryptographically secure random verification code
   * @returns A 6-character alphanumeric code
   */
  public generateCode(): string {
    let code = '';
    const totalChars = CodeGenerationService.ALLOWED_CHARS.length;
    
    while (code.length < CodeGenerationService.CODE_LENGTH) {
      const randomByte = randomBytes(1)[0];
      // Ensure unbiased selection by rejecting bytes that would cause modulo bias
      if (randomByte >= 256 - (256 % totalChars)) {
        continue;
      }
      const randomIndex = randomByte % totalChars;
      code += CodeGenerationService.ALLOWED_CHARS[randomIndex];
    }
    
    return code;
  }

  /**
   * Validates if a given code matches the required format
   * @param code The code to validate
   * @returns boolean indicating if the code is valid
   */
  public validateCode(code: string): boolean {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Convert to uppercase since codes are case-insensitive
    const normalizedCode = code.toUpperCase();

    // Check length
    if (normalizedCode.length !== CodeGenerationService.CODE_LENGTH) {
      return false;
    }

    // Check if code only contains allowed characters
    const validCharsRegex = new RegExp(`^[${CodeGenerationService.ALLOWED_CHARS}]+$`);
    return validCharsRegex.test(normalizedCode);
  }

  /**
   * Creates an expiration date for a verification code
   * @returns Date 24 hours from now
   */
  public generateExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    return expiryDate;
  }
}
