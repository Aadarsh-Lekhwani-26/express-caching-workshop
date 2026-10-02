# Express Product Catalog with In-Memory Caching

A layered Express application demonstrating in-memory caching middleware, Time-to-Live (TTL) expiration, and automated cache invalidation upon data mutations.

> **Note on AI Usage & Attribution**: The application architecture, layered request flow (`Route → Middleware → Controller → Service → Database`), and core business logic were designed and implemented independently. Gemini was utilized for authoring the project documentation (`README.md`), generating the automated test suite (`tests/`), and providing minor code polishing.

## Architecture

The application strictly follows a layered architectural pattern:

```
Client Request
      │
      ▼
    Route
      │
      ▼
 Middleware  (Cache Lookup / Invalidation Interceptor)
      │
      ▼
 Controller  (Request parsing & HTTP response formatting)
      │
      ▼
   Service   (Business logic)
      │
      ▼
  Database   (JSON File Persistence)
```

## Project Structure

```
├── controllers/
│   ├── index.js
│   └── productController.js  # Handles incoming HTTP requests and responses
├── database/
│   ├── db.js                 # Low-level file I/O for JSON persistence
│   ├── db.json               # Seed database storage file
│   └── index.js
├── middleware/
│   ├── cache.js              # Caching, TTL enforcement, and cache invalidation
│   └── index.js
├── routes/
│   ├── index.js
│   └── productRoutes.js      # Endpoint route definitions and middleware bindings
├── services/
│   ├── index.js
│   └── productService.js     # Core product business logic
├── tests/
│   ├── api.test.js           # End-to-end HTTP integration tests
│   ├── database.test.js      # Unit tests for database operations
│   ├── middleware.test.js    # Unit tests for cache logic and TTL
│   └── services.test.js      # Unit tests for product service logic
├── db.json                   # Root persistent database file
├── package.json
└── server.js                 # Application entrypoint
```

## Caching Behavior

### 1. In-Memory Storage
Cache entries are stored in-memory using a Map keyed by the request URL (`/products`, `/products/:id`).

### 2. Time-to-Live (TTL)
- Every cached entry records a `createdAt` timestamp.
- The default TTL is **1 minute** (60,000 ms).
- When a cached endpoint is requested, the middleware verifies whether the entry is older than 1 minute:
  - If expired, the stale entry is discarded, fresh data is fetched from the database, and the new value is stored with an updated timestamp.
  - If valid, the cached data is returned immediately without invoking downstream controllers or database calls.

### 3. Headers
Each `GET` response includes an `X-Cache` header:
- `X-Cache: MISS` — Data was read from the database and cached.
- `X-Cache: HIT` — Data was served directly from memory.

### 4. Invalidation
Whenever a `POST`, `PUT`, `PATCH`, or `DELETE` request successfully modifies stored data (HTTP status `200`–`299`), all cached entries are cleared immediately to prevent stale reads. If a modifying request fails (e.g., `400 Bad Request` or `404 Not Found`), the cache remains intact.

## API Endpoints

| Method | Endpoint | Description | Cache Behavior |
|---|---|---|---|
| `GET` | `/products` | Retrieve all products | Cached (1m TTL) |
| `GET` | `/products/:id` | Retrieve product by ID | Cached (1m TTL) |
| `POST` | `/products` | Create a new product | Invalidates Cache |
| `PUT` | `/products/:id` | Replace an existing product | Invalidates Cache |
| `PATCH` | `/products/:id` | Update product fields | Invalidates Cache |
| `DELETE` | `/products/:id` | Delete a product | Invalidates Cache |

### Sample Payloads

#### Create Product (`POST /products`)
```json
{
  "name": "Mechanical Keyboard",
  "price": 89.99
}
```

#### Update Product (`PUT /products/:id`)
```json
{
  "name": "Ergonomic Mechanical Keyboard",
  "price": 109.99
}
```

#### Patch Product (`PATCH /products/:id`)
```json
{
  "price": 79.99
}
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
```bash
npm install
```

### Running the Server
```bash
npm run server
```
The server will start on port `3000` (http://localhost:3000).

### Running Tests
The project includes a comprehensive test suite using Node's built-in test runner:
```bash
npm test
```
