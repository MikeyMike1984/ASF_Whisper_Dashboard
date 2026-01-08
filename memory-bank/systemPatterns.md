# System Patterns & Architecture

## Architecture Style

### Pattern
**[e.g., Hexagonal Architecture / Clean Architecture / Microservices]**

### Justification
[Why this pattern was chosen over alternatives]

---

## Core Components

### Frontend
- **Framework**: [e.g., React 18 + TypeScript]
- **State Management**: [e.g., Redux Toolkit]
- **Routing**: [e.g., React Router v6]
- **Styling**: [e.g., Tailwind CSS]

### Backend
- **Runtime**: [e.g., Node.js 20 LTS]
- **Framework**: [e.g., Express.js / Fastify]
- **Language**: [e.g., TypeScript with strict mode]
- **API Style**: [e.g., REST / GraphQL / tRPC]

### Data
- **Primary Database**: [e.g., PostgreSQL 16]
- **Caching**: [e.g., Redis 7]
- **Search**: [e.g., Elasticsearch / Typesense]
- **Message Queue**: [e.g., RabbitMQ / AWS SQS]

### Infrastructure
- **Hosting**: [e.g., AWS / GCP / Azure]
- **CI/CD**: [e.g., GitHub Actions]
- **Monitoring**: [e.g., Datadog / Prometheus + Grafana]

---

## Code Conventions

### Naming Conventions
- **Variables**: `camelCase`
- **Functions**: `camelCase`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.ts`

### File Structure
```
src/
├── domain/          # Business logic (framework-agnostic)
├── application/     # Use cases
├── infrastructure/  # External integrations (DB, APIs)
└── presentation/    # Controllers, UI components
```

### Error Handling
- **Backend**: All errors thrown as custom Error classes with codes
- **Frontend**: ErrorBoundary catches React errors
- **API**: Consistent error response format:
  ```json
  {
    "error": {
      "code": "AUTH_INVALID_TOKEN",
      "message": "The provided token is invalid or expired",
      "statusCode": 401
    }
  }
  ```

### Testing Strategy
- **Unit Tests**: Co-located with source files (`component.test.ts`)
- **Integration Tests**: `tests/integration/`
- **E2E Tests**: `tests/e2e/`
- **Coverage Target**: 80% line coverage minimum

---

## Design Patterns

### Preferred Patterns
1. **Dependency Injection**: Use constructor injection for testability
2. **Repository Pattern**: Abstraction layer over data access
3. **Factory Pattern**: For complex object creation
4. **Observer Pattern**: For event-driven logic

### Anti-Patterns to Avoid
- ❌ **God Objects**: No classes with >500 lines
- ❌ **Circular Dependencies**: Enforce with linting
- ❌ **Magic Numbers**: Use named constants
- ❌ **Callback Hell**: Use async/await

---

## API Design Principles

### RESTful Conventions
- **GET** `/api/users` - List users
- **GET** `/api/users/:id` - Get single user
- **POST** `/api/users` - Create user
- **PUT** `/api/users/:id` - Full update
- **PATCH** `/api/users/:id` - Partial update
- **DELETE** `/api/users/:id` - Delete user

### Versioning
Use URL versioning: `/api/v1/users`

### Authentication
- **Method**: JWT with refresh tokens
- **Header**: `Authorization: Bearer <token>`
- **Token Expiry**: Access=15min, Refresh=7days

---

## Security Standards

### Input Validation
- All user input validated with Zod schemas
- SQL injection prevention via parameterized queries
- XSS prevention via escaping in templates

### Secrets Management
- Use environment variables (never hardcode)
- `.env` files excluded from git
- Production secrets in vault (AWS Secrets Manager / Vault)

### Dependencies
- Run `npm audit` weekly
- Auto-update patch versions via Dependabot

---

## Performance Guidelines

### Frontend
- Code splitting for routes
- Lazy load images with `loading="lazy"`
- Debounce user input (300ms for search)

### Backend
- Database indexes on all foreign keys
- Connection pooling (min=10, max=50)
- Caching strategy: Cache-Aside pattern

### Monitoring
- Alert if p99 latency >500ms
- Alert if error rate >1%

---

## Deployment Process

### Branching Strategy
- **main**: Production
- **develop**: Staging
- **feature/***: Feature branches (use worktrees!)

### CI/CD Pipeline
1. Run linters (ESLint, Prettier)
2. Run tests (unit + integration)
3. Build artifacts
4. Deploy to staging
5. Run E2E tests
6. Manual approval for production
7. Deploy to production
8. Run smoke tests

---

## Revision History
- **[DATE]**: Initial architecture definition

**Last Updated**: [DATE]
