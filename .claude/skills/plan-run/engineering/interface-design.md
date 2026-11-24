# Interface Design for Testability

These patterns are framework-agnostic — adapt them to whatever's in the codebase.

Good interfaces make testing natural:

1. **Accept dependencies, don't create them**

   ```javascript
   // Testable
   function processOrder(order, paymentGateway) {}

   // Hard to test
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Return results, don't produce side effects**

   ```javascript
   // Testable
   function calculateDiscount(cart) {
     return { amount: cart.total * 0.1, reason: "loyalty" };
   }

   // Hard to test
   function applyDiscount(cart) {
     cart.total -= discount;
   }
   ```

3. **Small surface area**
   - Fewer methods = fewer tests needed
   - Fewer params = simpler test setup
