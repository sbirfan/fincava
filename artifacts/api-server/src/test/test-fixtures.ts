/**
 * TEST FIXTURES & MOCK DATABASE
 * 
 * Provides reusable test data, mocking utilities, and database mock setup
 * for Phase 1 tests (auth, email queue, password reset, multi-tenant auth)
 */

import { vi } from "vitest";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK DATA FIXTURES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const mockUsers = {
  admin: {
    id: 1,
    email: "admin@fincava.com",
    passwordHash: "bcrypt_mock:correct_horse_battery",
    role: "ADMIN",
    emailVerifiedAt: new Date(),
    mustResetPassword: false,
    tokenVersion: 1,
    createdAt: new Date("2026-01-01"),
  },

  buyer: {
    id: 2,
    email: "buyer@acme.com",
    passwordHash: "bcrypt_mock:buyer_password_123",
    role: "BUYER",
    emailVerifiedAt: new Date(),
    mustResetPassword: false,
    tokenVersion: 1,
    createdAt: new Date("2026-01-15"),
  },

  supplierA: {
    id: 3,
    email: "supplier_a@farm.com",
    passwordHash: "bcrypt_mock:supplier_a_pass",
    role: "SUPPLIER",
    emailVerifiedAt: new Date(),
    mustResetPassword: false,
    tokenVersion: 1,
    createdAt: new Date("2026-01-20"),
  },

  supplierB: {
    id: 4,
    email: "supplier_b@farm.com",
    passwordHash: "bcrypt_mock:supplier_b_pass",
    role: "SUPPLIER",
    emailVerifiedAt: new Date(),
    mustResetPassword: false,
    tokenVersion: 1,
    createdAt: new Date("2026-01-25"),
  },

  newUser: {
    id: 5,
    email: "newuser@test.com",
    passwordHash: "bcrypt_mock:new_password",
    role: "BUYER",
    emailVerifiedAt: null, // Not verified
    mustResetPassword: true, // Must reset
    tokenVersion: 1,
    createdAt: new Date(),
  },
};

export const mockProfiles = {
  admin: {
    id: 1,
    userId: 1,
    firstName: "Admin",
    lastName: "User",
    phone: null,
    country: "Colombia",
    language: "en",
    avatarUrl: null,
  },

  buyer: {
    id: 2,
    userId: 2,
    firstName: "Buyer",
    lastName: "Name",
    phone: "+1-555-0100",
    country: "USA",
    language: "en",
    avatarUrl: "https://example.com/buyer.jpg",
  },

  supplierA: {
    id: 3,
    userId: 3,
    firstName: "Supplier",
    lastName: "A",
    phone: "+57-123-456-7890",
    country: "Colombia",
    language: "es",
    avatarUrl: null,
  },

  supplierB: {
    id: 4,
    userId: 4,
    firstName: "Supplier",
    lastName: "B",
    phone: "+57-987-654-3210",
    country: "Colombia",
    language: "es",
    avatarUrl: null,
  },
};

export const mockCompanies = {
  supplierA: {
    id: 1,
    userId: 3,
    name: "Supplier A Coffee Farm",
    type: "EXPORTER",
    country: "Colombia",
    region: "Huila",
    description: "Premium specialty coffee",
    logoUrl: null,
    website: "https://suppliera.com",
    verified: true,
    originStory: "Family coffee farm",
    farmerName: "Juan",
    trustScore: 4.5,
    subscriptionTier: "PRO",
    responseTimeHours: 2,
    exportDestinations: ["USA", "EU"],
    createdAt: new Date("2026-01-20"),
  },

  supplierB: {
    id: 2,
    userId: 4,
    name: "Supplier B Cooperative",
    type: "COOPERATIVE",
    country: "Colombia",
    region: "Nariño",
    description: "Fair-trade cooperative",
    logoUrl: null,
    website: "https://supplierb.com",
    verified: false,
    originStory: "Community cooperative",
    farmerName: "Maria",
    trustScore: 3.2,
    subscriptionTier: "FREE",
    responseTimeHours: 8,
    exportDestinations: ["EU"],
    createdAt: new Date("2026-01-25"),
  },
};

export const mockOrders = {
  buyerToSupplierA: {
    id: 1,
    buyerId: 2, // buyer
    supplierId: 3, // supplier A
    status: "CONFIRMED",
    totalUSD: 5000,
    incoterm: "FOB",
    destinationPort: "Los Angeles",
    shippingMethod: "Ocean",
    notes: "Urgent delivery",
    feePercentage: 4,
    feeAmountUSD: 200,
    feeStatus: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  buyerToSupplierB: {
    id: 2,
    buyerId: 2, // buyer
    supplierId: 4, // supplier B
    status: "INQUIRY",
    totalUSD: 3000,
    incoterm: "CIF",
    destinationPort: "Rotterdam",
    shippingMethod: "Ocean",
    notes: null,
    feePercentage: 4,
    feeAmountUSD: 120,
    feeStatus: "WAIVED", // Waived (< 10 orders)
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

export const mockOrderItems = {
  order1Item1: {
    id: 1,
    orderId: 1,
    productId: 1, // Product from supplier A
    quantityKg: 500,
    pricePerKg: 10,
    totalUSD: 5000,
    supplierId: 3,
  },

  order2Item1: {
    id: 2,
    orderId: 2,
    productId: 2, // Product from supplier B
    quantityKg: 300,
    pricePerKg: 10,
    totalUSD: 3000,
    supplierId: 4,
  },
};

export const mockShipments = {
  order1: {
    id: 1,
    orderId: 1,
    status: "IN_TRANSIT",
    originPort: "Buenaventura",
    destinationPort: "Los Angeles",
    carrier: "Maersk",
    trackingNumber: "MAE123456789",
    containerNumber: "MAEU1234567",
    eta: new Date("2026-05-20"),
    departedAt: new Date("2026-05-01"),
    arrivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

export const mockPaymentMilestones = {
  order1Milestone1: {
    id: 1,
    orderId: 1,
    name: "Advance Payment",
    description: "50% advance before production",
    amountUSD: 2500,
    percentage: 50,
    status: "RELEASED",
    dueDate: new Date("2026-05-01"),
    releasedAt: new Date("2026-04-28"),
  },

  order1Milestone2: {
    id: 2,
    orderId: 1,
    name: "Final Payment",
    description: "50% on delivery",
    amountUSD: 2500,
    percentage: 50,
    status: "PENDING",
    dueDate: new Date("2026-05-20"),
    releasedAt: null,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK DATABASE QUERIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Mock database for users table
 * Simulates common query patterns: findFirst, insert, update
 */
export const createMockUserDb = () => {
  const users = new Map<number, any>();
  mockUsers.admin.id && users.set(mockUsers.admin.id, mockUsers.admin);
  mockUsers.buyer.id && users.set(mockUsers.buyer.id, mockUsers.buyer);
  mockUsers.supplierA.id && users.set(mockUsers.supplierA.id, mockUsers.supplierA);
  mockUsers.supplierB.id && users.set(mockUsers.supplierB.id, mockUsers.supplierB);

  return {
    findByEmail: (email: string) => {
      return Array.from(users.values()).find(u => u.email === email) || null;
    },

    findById: (id: number) => {
      return users.get(id) || null;
    },

    create: (userData: any) => {
      const id = Math.max(...users.keys(), 0) + 1;
      const user = { ...userData, id, createdAt: new Date() };
      users.set(id, user);
      return user;
    },

    update: (id: number, updates: any) => {
      const user = users.get(id);
      if (!user) return null;
      const updated = { ...user, ...updates, updatedAt: new Date() };
      users.set(id, updated);
      return updated;
    },

    getAll: () => Array.from(users.values()),
  };
};

/**
 * Mock database for orders & multi-tenant authorization
 */
export const createMockOrderDb = () => {
  const orders = new Map<number, any>();
  orders.set(mockOrders.buyerToSupplierA.id, mockOrders.buyerToSupplierA);
  orders.set(mockOrders.buyerToSupplierB.id, mockOrders.buyerToSupplierB);

  const orderItems = new Map<number, any>();
  orderItems.set(mockOrderItems.order1Item1.id, mockOrderItems.order1Item1);
  orderItems.set(mockOrderItems.order2Item1.id, mockOrderItems.order2Item1);

  const companies = new Map<number, any>();
  companies.set(mockCompanies.supplierA.userId, mockCompanies.supplierA);
  companies.set(mockCompanies.supplierB.userId, mockCompanies.supplierB);

  return {
    findOrderById: (id: number) => orders.get(id) || null,

    findOrdersByBuyer: (buyerId: number) => {
      return Array.from(orders.values()).filter(o => o.buyerId === buyerId);
    },

    findOrderItemsByOrder: (orderId: number) => {
      return Array.from(orderItems.values()).filter(i => i.orderId === orderId);
    },

    findCompanyByUserId: (userId: number) => {
      return companies.get(userId) || null;
    },

    getOrderItemsBySupplier: (supplierId: number) => {
      return Array.from(orderItems.values()).filter(i => i.supplierId === supplierId);
    },

    updateOrder: (id: number, updates: any) => {
      const order = orders.get(id);
      if (!order) return null;
      const updated = { ...order, ...updates, updatedAt: new Date() };
      orders.set(id, updated);
      return updated;
    },
  };
};

/**
 * Mock database for shipments & payment milestones
 */
export const createMockShipmentDb = () => {
  const shipments = new Map<number, any>();
  shipments.set(mockShipments.order1.id, mockShipments.order1);

  const milestones = new Map<number, any>();
  milestones.set(mockPaymentMilestones.order1Milestone1.id, mockPaymentMilestones.order1Milestone1);
  milestones.set(mockPaymentMilestones.order1Milestone2.id, mockPaymentMilestones.order1Milestone2);

  return {
    findShipmentByOrder: (orderId: number) => {
      return Array.from(shipments.values()).find(s => s.orderId === orderId) || null;
    },

    findMilestonesByOrder: (orderId: number) => {
      return Array.from(milestones.values()).filter(m => m.orderId === orderId);
    },

    findMilestoneById: (id: number) => {
      return milestones.get(id) || null;
    },

    createShipment: (data: any) => {
      const id = Math.max(...shipments.keys(), 0) + 1;
      const shipment = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
      shipments.set(id, shipment);
      return shipment;
    },

    createMilestone: (data: any) => {
      const id = Math.max(...milestones.keys(), 0) + 1;
      const milestone = { ...data, id };
      milestones.set(id, milestone);
      return milestone;
    },

    updateMilestone: (id: number, updates: any) => {
      const milestone = milestones.get(id);
      if (!milestone) return null;
      const updated = { ...milestone, ...updates };
      milestones.set(id, updated);
      return updated;
    },
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL QUEUE MOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Mock email queue for testing duplicate prevention and retry logic
 */
export const createMockEmailQueue = () => {
  const queue: any[] = [];
  const sent = new Set<string>();
  const failed = new Set<string>();

  return {
    enqueue: (email: any) => {
      // Simulate duplicate prevention
      const key = `${email.to}:${email.subject}`;
      if (sent.has(key)) {
        throw new Error("DUPLICATE_EMAIL");
      }
      queue.push({ ...email, id: queue.length, retries: 0, enqueuedAt: new Date() });
    },

    process: async (count = queue.length) => {
      const processed = [];
      for (let i = 0; i < count && queue.length > 0; i++) {
        const email = queue.shift();
        if (email) {
          sent.add(`${email.to}:${email.subject}`);
          processed.push(email);
        }
      }
      return processed;
    },

    fail: (email: any, reason: string) => {
      failed.add(`${email.to}:${reason}`);
      queue.push({ ...email, retries: (email.retries || 0) + 1, lastError: reason });
    },

    getSent: () => Array.from(sent),

    getFailed: () => Array.from(failed),

    getQueue: () => [...queue],

    clear: () => {
      queue.length = 0;
      sent.clear();
      failed.clear();
    },
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create a mock Express request
 */
export const createMockRequest = (overrides: any = {}) => {
  return {
    userId: null,
    userRole: "BUYER",
    params: {},
    query: {},
    body: {},
    headers: {
      authorization: undefined,
    },
    ip: "127.0.0.1",
    ...overrides,
  };
};

/**
 * Create a mock Express response
 */
export const createMockResponse = () => {
  const response: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getStatusCode: () => response.status.mock.calls[0]?.[0],
    getJsonResponse: () => response.json.mock.calls[0]?.[0],
  };
  return response;
};

/**
 * Verify that a response returned an error with a specific status
 */
export const assertErrorResponse = (response: any, expectedStatus: number, expectedMessage?: string) => {
  const status = response.getStatusCode();
  const data = response.getJsonResponse();

  if (status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus} but got ${status}`);
  }

  if (expectedMessage && data?.message !== expectedMessage && data?.error !== expectedMessage) {
    throw new Error(`Expected message containing "${expectedMessage}" but got ${JSON.stringify(data)}`);
  }
};

/**
 * Verify that a response succeeded with a specific status
 */
export const assertSuccessResponse = (response: any, expectedStatus = 200) => {
  const status = response.getStatusCode();
  const data = response.getJsonResponse();

  if (status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus} but got ${status}`);
  }

  return data;
};
