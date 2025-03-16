import { CodeGenerationService } from '../codeGenerationService';

describe('CodeGenerationService', () => {
  let service: CodeGenerationService;

  beforeEach(() => {
    service = new CodeGenerationService();
  });

  describe('generateCode', () => {
    it('should generate a 6-character code', () => {
      const code = service.generateCode();
      expect(code.length).toBe(6);
    });

    it('should generate different codes on subsequent calls', () => {
      const code1 = service.generateCode();
      const code2 = service.generateCode();
      expect(code1).not.toBe(code2);
    });

    it('should only contain allowed characters', () => {
      const code = service.generateCode();
      // Test against the same character set defined in the service
      const validCharsRegex = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
      expect(validCharsRegex.test(code)).toBe(true);
    });

    it('should not contain similar-looking characters (0, O, 1, I, l)', () => {
      const code = service.generateCode();
      const forbiddenChars = /[0O1Il]/;
      expect(forbiddenChars.test(code)).toBe(false);
    });

    it('should generate 100 valid codes (statistical test)', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        const code = service.generateCode();
        expect(code.length).toBe(6);
        expect(service.validateCode(code)).toBe(true);
        codes.add(code);
      }
      // Check that we got unique codes (extremely unlikely to get duplicates)
      expect(codes.size).toBe(100);
    });
  });

  describe('validateCode', () => {
    it('should validate a correct code', () => {
      const code = service.generateCode();
      expect(service.validateCode(code)).toBe(true);
    });

    it('should be case-insensitive', () => {
      const code = service.generateCode();
      expect(service.validateCode(code.toLowerCase())).toBe(true);
    });

    it('should reject codes with invalid length', () => {
      expect(service.validateCode('ABC12')).toBe(false);  // Too short
      expect(service.validateCode('ABC123X')).toBe(false); // Too long
    });

    it('should reject codes with invalid characters', () => {
      expect(service.validateCode('ABC0DE')).toBe(false); // Contains '0'
      expect(service.validateCode('ABCDEF!')).toBe(false); // Contains '!'
      expect(service.validateCode('ABC DEF')).toBe(false); // Contains space
    });

    it('should reject null or undefined input', () => {
      expect(service.validateCode(null as any)).toBe(false);
      expect(service.validateCode(undefined as any)).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(service.validateCode(123456 as any)).toBe(false);
      expect(service.validateCode({} as any)).toBe(false);
    });
  });

  describe('generateExpiryDate', () => {
    it('should generate date 24 hours in the future', () => {
      const now = new Date();
      const expiryDate = service.generateExpiryDate();
      
      // Calculate difference in hours
      const diffHours = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Should be approximately 24 hours (allow for a small execution time difference)
      expect(diffHours).toBeGreaterThan(23.99);
      expect(diffHours).toBeLessThan(24.01);
    });

    it('should generate different timestamps on subsequent calls', async () => {
      const expiry1 = service.generateExpiryDate();
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const expiry2 = service.generateExpiryDate();
      expect(expiry1.getTime()).not.toBe(expiry2.getTime());
    });
  });
}); 