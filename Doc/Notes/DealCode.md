## Implementation Detail

### Flow Overview
1. Items in dealing (time, price, location) -> an random code generate to the buyer
2. The seller enter the buyer generated code -> the deal complete

### Technical Specifications

#### 1. Code Generation
- **Method**: Cryptographically secure random string
- **Format**: 6-character alphanumeric code (e.g., "A2B4C6")
- **Properties**:
  - Case-insensitive for user convenience
  - Excludes similar-looking characters (0/O, 1/I/l)
  - Time-bound (expires in 24 hours)

#### 2. Socket Events
- **Events**:
  ```typescript
  // When deal is initiated
  emit('deal:codeGenerated', { dealId: string, code: string })
  
  // When seller submits code
  emit('deal:codeSubmitted', { dealId: string, code: string })
  
  // When code is verified
  emit('deal:codeVerified', { dealId: string, status: 'success' | 'failed' })
  ```

#### 3. Database Schema Extension
```typescript
interface Deal {
  // Existing fields
  time: Date;
  price: number;
  location: string;
  
  // New fields for verification
  verificationCode: string;
  codeExpiry: Date;
  isVerified: boolean;
  verificationAttempts: number;
  lastAttemptTime: Date;
}
```

#### 4. Security Measures
- Rate limiting: 5 attempts per deal per hour
- Code expiration: 24 hours from generation
- One-time use codes
- Automatic invalidation after successful verification

#### 5. Error Handling
- Invalid code format
- Expired code
- Rate limit exceeded
- Already verified deal
- Network disconnection during verification

#### 6. UI States
- **Buyer View**:
  - Code display
  - Expiration countdown
  - Code sharing options
  
- **Seller View**:
  - Code input field
  - Verification status
  - Error messages
  - Attempt counter

#### 7. API Endpoints
```typescript
// Generate new code
POST /api/deals/:dealId/code

// Verify code
POST /api/deals/:dealId/verify

// Check verification status
GET /api/deals/:dealId/status

// Regenerate code (if expired)
PUT /api/deals/:dealId/code
```

#### 8. Cache Strategy
- Store active verification codes in memory cache
- Cache structure:
  ```typescript
  {
    [dealId: string]: {
      code: string,
      attempts: number,
      expiry: Date
    }
  }
  ```

#### 9. WebSocket Integration
- Real-time status updates
- Immediate verification feedback
- Connection state handling
- Automatic reconnection

## 10. Development Plan

### Phase 1: Backend Setup
1. **Extend Deal Model**
   ```typescript
   // src/lib/types/deal.ts
   export interface Deal {
     // Add verification fields to existing deal interface
     verificationCode?: string;
     codeExpiry?: Date;
     isVerified: boolean;
     verificationAttempts: number;
     lastAttemptTime?: Date;
   }
   ```

2. **Create Code Generation Service**
   ```typescript
   // src/lib/services/codeGenerationService.ts
   export class CodeGenerationService {
     generateCode(): string {
       // Implement secure code generation
     }
     
     validateCode(code: string): boolean {
       // Implement code validation
     }
   }
   ```

### Phase 2: Socket Integration
1. **Extend SocketEventManager**
   ```typescript
   // src/lib/managers/SocketEventManager.ts
   export class SocketEventManager {
     // Add new event handlers
     public initializeEventListeners(handlers: {
       // ... existing handlers ...
       onDealCodeGenerated: (data: { dealId: string, code: string }) => void;
       onDealCodeVerified: (data: { dealId: string, status: string }) => void;
     }) {
       // ... existing code ...
       socketService.onDealCodeGenerated(handlers.onDealCodeGenerated);
       socketService.onDealCodeVerified(handlers.onDealCodeVerified);
     }

     // Add new emitters
     public sendDealCode(dealId: string, code: string) {
       socketService.emit('deal:codeGenerated', { dealId, code });
     }

     public submitDealCode(dealId: string, code: string) {
       socketService.emit('deal:codeSubmitted', { dealId, code });
     }
   }
   ```

2. **Create DealCodeManager**
   ```typescript
   // src/lib/managers/DealCodeManager.ts
   export class DealCodeManager {
     private codeCache: Map<string, {
       code: string,
       attempts: number,
       expiry: Date
     }>;

     constructor(private queryClient: QueryClient) {
       this.codeCache = new Map();
     }

     // Cache management methods
     // Rate limiting logic
     // Verification attempts tracking
   }
   ```

### Phase 3: API Endpoints
1. **Create API Routes**
   ```typescript
   // src/app/api/deals/[dealId]/code/route.ts
   // Implement POST, PUT endpoints

   // src/app/api/deals/[dealId]/verify/route.ts
   // Implement POST endpoint

   // src/app/api/deals/[dealId]/status/route.ts
   // Implement GET endpoint
   ```

### Phase 4: Frontend Components
1. **Create Deal Code Context**
   ```typescript
   // src/lib/context/DealCodeContext.tsx
   export const DealCodeContext = createContext<{
     generateCode: (dealId: string) => Promise<void>;
     verifyCode: (dealId: string, code: string) => Promise<boolean>;
     // ... other methods
   }>(null!);
   ```

2. **Buyer Components**
   ```typescript
   // src/components/deal/BuyerCodeDisplay.tsx
   // Code display component with countdown

   // src/components/deal/CodeShareOptions.tsx
   // Code sharing functionality
   ```

3. **Seller Components**
   ```typescript
   // src/components/deal/SellerCodeInput.tsx
   // Code input with validation

   // src/components/deal/VerificationStatus.tsx
   // Status display and error handling
   ```

### Phase 5: Integration
1. **Update Deal Flow**
   ```typescript
   // src/components/deal/DealFlow.tsx
   // Integrate verification into deal process
   ```

2. **Add Error Handling**
   ```typescript
   // src/lib/errors/dealErrors.ts
   // Define custom error types
   ```

3. **Update Socket Provider**
   ```typescript
   // src/lib/context/SocketContext.tsx
   // Add deal code handlers to socket context
   ```

### Phase 6: Testing
1. Create unit tests for:
   - Code generation
   - Verification logic
   - Rate limiting
   - Socket events

2. Create integration tests for:
   - Complete deal flow
   - Error scenarios
   - Socket reconnection

##### Phase 7: Deployment
1. Update database schema
2. Configure rate limiting
3. Set up monitoring for verification attempts
4. Document API endpoints

**Development Order**:
1. Start with Phase 1 to set up the foundation
2. Move to Phase 2 to integrate with existing socket system
3. Implement Phase 3 for API endpoints
4. Develop Phase 4 components in parallel with Phase 3
5. Complete Phase 5 integration
6. Finish with Phase 6 testing and Phase 7 deployment
 