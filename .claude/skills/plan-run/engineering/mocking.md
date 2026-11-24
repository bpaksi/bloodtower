# When to Mock

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Supabase / database calls (sometimes — prefer a test database or Supabase's local dev setup)
- Time/randomness
- File system (sometimes)

Don't mock:

- Your own modules/functions
- Internal collaborators
- Anything you control

## Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```javascript
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. Prefer SDK-style interfaces over generic fetchers**

Create specific functions for each external operation instead of one generic function with conditional logic:

```javascript
// GOOD: Each function is independently mockable
const api = {
  getUser: (id) => fetch(`/api/users/${id}`),
  getOrders: (userId) => fetch(`/api/users/${userId}/orders`),
  createOrder: (data) => fetch("/api/orders", { method: "POST", body: JSON.stringify(data) }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  request: (endpoint, options) => fetch(endpoint, options),
};
```

The SDK approach means:

- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
