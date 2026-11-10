# SpilMiniERP MCP Tools Reference for Tauri Frontend

This document outlines all MCP tools provided by the `SpilMcpServer` backend. It serves as the specification for building the Tauri client and integrating AI agents.

---

## 1. Authentication & Session Architecture

- **Session Token**: All tools (except `login`) require a `sessionToken` string argument.
- **Expiry**: Sessions expire after **7,200 seconds (2 hours)**.
- **Standard Response Envelope**: Every tool returns a serialized JSON string containing at least:
  ```json
  {
    "success": true, // or false on error
    "message": "Descriptive message" // always present on failure, optional on success
  }
  ```

---

## 2. Role-Based Access Control (RBAC) Matrix

| Tool | Admin | Store Keeper (`Store`) | Sales (`Sales`) | Public |
| :--- | :---: | :---: | :---: | :---: |
| `login` |  |  |  |  |
| `get_current_user` |  |  |  | ❌ |
| `get_inventory` |  |  |  | ❌ |
| `create_inventory` |  |  | ❌ | ❌ |
| `update_inventory` |  |  | ❌ | ❌ |
| `deactivate_inventory` |  |  | ❌ | ❌ |
| `get_orders` |  *(All orders)* | ❌ |  *(Own orders)* | ❌ |
| `create_order` |  | ❌ |  | ❌ |
| `get_users` |  | ❌ | ❌ | ❌ |
| `create_user` |  | ❌ | ❌ | ❌ |

---

## 3. Tool Specifications

### 3.1 Authentication

#### `login`
Authenticates a user and starts an active session.

- **Role Required**: None (Public)
- **Arguments**:
  | Argument | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `username` | `string` | Yes | User's username. |
  | `password` | `string` | Yes | User's password. |

- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "sessionToken": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "username": "store_user",
    "role": "Store",
    "expiresInSeconds": 7200
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "message": "Invalid username or password."
  }
  ```

---

#### `get_current_user`
Retrieves account information and expiry for the current session token.

- **Role Required**: Any authenticated user (`Admin`, `Store`, `Sales`)
- **Arguments**:
  | Argument | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Token received from `login`. |

- **Success Response**:
  ```json
  {
    "success": true,
    "user": {
      "username": "store_user",
      "role": "Store",
      "isActive": true
    },
    "expiresAtUtc": "2026-11-09T17:30:00Z"
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "message": "Session is invalid or expired."
  }
  ```

---

### 3.2 Inventory Management (Admin & Store Keeper)

#### `get_inventory`
Retrieves all active inventory products.

- **Role Required**: `Admin`, `Store`, `Sales`
- **Arguments**:
  | Argument | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Active session token. |

- **Success Response**:
  ```json
  {
    "success": true,
    "count": 2,
    "inventory": [
      {
        "id": 1,
        "sku": "SKU-1001",
        "name": "Steel Bolt 10mm",
        "description": "High tensile steel bolt",
        "quantityAvailable": 500,
        "unitPrice": 1.50
      }
    ]
  }
  ```

---

#### `create_inventory`
Creates a new inventory product.

- **Role Required**: `Admin`, `Store`
- **Arguments**:
  | Argument | Type | Required | Constraints |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Must belong to Admin or Store. |
  | `sku` | `string` | Yes | 1-50 chars, must be unique. |
  | `name` | `string` | Yes | 1-150 chars. |
  | `quantityAvailable` | `integer` | Yes | `>= 0` |
  | `unitPrice` | `number` | Yes | `>= 0.0` |
  | `description` | `string` | No | Optional, max 2000 chars (default: `""`). |

- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Inventory item created successfully.",
    "inventory": {
      "id": 1,
      "sku": "SKU-1001",
      "name": "Steel Bolt 10mm",
      "quantityAvailable": 500,
      "unitPrice": 1.50,
      "isActive": true
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "message": "SKU already exists."
  }
  ```

---

#### `update_inventory`
Updates an existing inventory product and adjusts stock quantities.

- **Role Required**: `Admin`, `Store`
- **Arguments**:
  | Argument | Type | Required | Constraints |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Must belong to Admin or Store. |
  | `inventoryId` | `integer` | Yes | Existing product ID. |
  | `sku` | `string` | Yes | 1-50 chars, unique. |
  | `name` | `string` | Yes | 1-150 chars. |
  | `quantityAvailable` | `integer` | Yes | `>= 0` |
  | `unitPrice` | `number` | Yes | `>= 0.0` |
  | `isActive` | `boolean` | Yes | `true` or `false` |
  | `description` | `string` | No | Optional, max 2000 chars (default: `""`). |

- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Inventory item updated successfully.",
    "inventory": {
      "id": 1,
      "sku": "SKU-1001",
      "name": "Steel Bolt 10mm (Zinc)",
      "quantityAvailable": 650,
      "unitPrice": 1.75,
      "isActive": true
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "message": "Inventory item not found."
  }
  ```

---

#### `deactivate_inventory`
Deactivates an inventory product without removing historic orders.

- **Role Required**: `Admin`, `Store`
- **Arguments**:
  | Argument | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Must belong to Admin or Store. |
  | `inventoryId` | `integer` | Yes | ID of item to deactivate. |

- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Inventory item deactivated successfully."
  }
  ```

---

### 3.3 Orders (Sales & Admin)

#### `get_orders`
Fetches orders. Returns all system orders for Admin; returns only own orders for Sales.

- **Role Required**: `Admin`, `Sales`
- **Arguments**:
  | Argument | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Active session token. |

- **Success Response**:
  ```json
  {
    "success": true,
    "count": 1,
    "orders": [
      {
        "id": 101,
        "orderNumber": "ORD-E3891AC7201D",
        "totalAmount": 150.00,
        "createdAtUtc": "2026-11-09T14:15:00Z",
        "username": "sales_rep1",
        "items": [
          {
            "inventoryId": 1,
            "productName": "Steel Bolt 10mm",
            "quantity": 100,
            "unitPrice": 1.50,
            "totalPrice": 150.00
          }
        ]
      }
    ]
  }
  ```

---

#### `create_order`
Creates an order with items and deducts available stock inside an atomic database transaction.

- **Role Required**: `Admin`, `Sales`
- **Arguments**:
  | Argument | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Active session token. |
  | `itemsJson` | `string` | Yes | Serialized JSON string array of order items (1 to 50 items). |

- **`itemsJson` Schema**:
  ```json
  [
    { "inventoryId": 1, "quantity": 10 },
    { "inventoryId": 2, "quantity": 5 }
  ]
  ```

- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Order created successfully.",
    "orderId": 102,
    "orderNumber": "ORD-5481B2DA018C",
    "totalAmount": 75.00,
    "items": 2
  }
  ```
- **Error Response (Insufficient Stock)**:
  ```json
  {
    "success": false,
    "message": "Insufficient stock for Steel Bolt 10mm.",
    "available": 5,
    "requested": 10
  }
  ```

---

### 3.4 User Management (Admin Only)

#### `get_users`
Lists all user accounts in the ERP system.

- **Role Required**: `Admin` only
- **Arguments**:
  | Argument | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Admin session token. |

- **Success Response**:
  ```json
  {
    "success": true,
    "count": 2,
    "users": [
      {
        "id": 1,
        "username": "admin",
        "role": "Admin",
        "isActive": true,
        "createdAtUtc": "2026-11-09T04:05:11Z"
      },
      {
        "id": 2,
        "username": "store_keeper",
        "role": "Store",
        "isActive": true,
        "createdAtUtc": "2026-11-09T08:10:00Z"
      }
    ]
  }
  ```

---

#### `create_user`
Creates a new `Sales` or `Store` user account.

- **Role Required**: `Admin` only
- **Arguments**:
  | Argument | Type | Required | Constraints |
  | :--- | :--- | :--- | :--- |
  | `sessionToken` | `string` | Yes | Admin session token. |
  | `username` | `string` | Yes | 1-100 characters, unique. |
  | `password` | `string` | Yes | Minimum 8 characters. |
  | `role` | `string` | Yes | Must be `"Sales"` or `"Store"`. |

- **Success Response**:
  ```json
  {
    "success": true,
    "message": "User created successfully.",
    "user": {
      "id": 3,
      "username": "john_sales",
      "role": "Sales",
      "isActive": true,
      "createdAtUtc": "2026-11-09T15:30:00Z"
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "message": "Role must be Sales or Store."
  }
  ```

---

## 4. Tauri Integration Recommendations

1. **State Management**:
   - Store `sessionToken`, `username`, and `role` in the Tauri application frontend state (e.g., Zustand, Pinia, Redux, or Svelte store).
   - If a tool returns `{"success": false, "message": "Invalid or expired session."}`, automatically clear the stored token and redirect to the login screen.
2. **Role-Based UI Rendering**:
   - **`Admin`**: Show Navigation tabs for `[Inventory]`, `[Orders]`, and `[User Management]`.
   - **`Store`**: Show Navigation tab for `[Inventory]` with `Create Product` and `Edit Stock` buttons. Hide Orders and User Management.
   - **`Sales`**: Show Navigation tabs for `[Catalog / Stock]` (read-only inventory) and `[Orders / Place Order]`. Hide User Management and Inventory creation/edit buttons.
