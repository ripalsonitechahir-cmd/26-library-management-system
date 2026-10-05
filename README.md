# Library Management System

Catalog and lending tracker: books, members, issue/return, overdue fines.

**Stack:** React (Vite, Bootstrap) · Node.js/Express · Prisma ORM · SQLite · Nginx · Docker · Kubernetes

```
Browser -> Nginx (web) -> /api -> Express (api) -> SQLite file on a volume
```

## Business rules
- Loan period 14 days (`LOAN_DAYS`); fine = every started overdue day x 1 (`FINE_PER_DAY`), computed on return and shown live for open loans.
- A book cannot be issued when no copies are available; copies cannot be reduced below the number currently issued.
- Books/members with active loans cannot be deleted (409). Deleting an unused book/member also removes their returned-loan history.
- ISBN and member email are unique.

## Run locally (no Docker)
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate deploy
npm run seed          # optional demo data
npm start             # http://localhost:3000

cd ../frontend
npm install
npm run dev           # http://localhost:5173 (proxies /api to :3000)
```
Tests: `cd backend && npm test`

## Docker Compose
```bash
docker compose up --build        # http://localhost:8080
docker compose down              # stop (data kept in volume library-data)
docker compose down -v           # stop and delete data
```
Optional overrides: copy `.env.example` to `.env`. Demo data is loaded only when the database is empty.

## Kubernetes (minikube / kind / Docker Desktop)
```bash
docker build -t library-api:1.0 backend
docker build -t library-web:1.0 frontend
# minikube: minikube image load library-api:1.0 library-web:1.0
# kind:     kind create cluster --name library --config kind-config.yaml
#           kind load docker-image library-api:1.0 library-web:1.0 --name library

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
kubectl get all -n library-management-system
# open http://localhost:30080  (minikube: minikube service web -n library-management-system)
# or: kubectl port-forward svc/web 8080:80 -n library-management-system

kubectl delete ns library-management-system   # teardown
```
Verified on a kind cluster: all pods Running/Ready, site at http://localhost:30080, data survives an API pod restart.

Design note: SQLite is a single-file database, so the API runs **1 replica** on a ReadWriteOnce PVC (`Recreate` strategy). The stateless web tier runs **2 replicas**, so killing a web pod does not take the site down. Killing the API pod causes a brief outage until it restarts, with data preserved on the PVC. Running multiple API replicas would require a client/server database such as PostgreSQL.

## API
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/books` | `?q=` searches title, author, ISBN |
| GET/PUT/DELETE | `/api/books/:id` | |
| GET/POST | `/api/members` | `?q=` searches name, email |
| GET/PUT/DELETE | `/api/members/:id` | |
| GET | `/api/loans` | `?status=active\|returned` |
| POST | `/api/loans/issue` | `{ bookId, memberId }` |
| POST | `/api/loans/:id/return` | calculates fine |
| GET | `/api/loans/overdue` | |
| GET | `/api/dashboard` | |
| GET | `/health` | 200 when DB reachable, else 503 |

Errors are JSON `{ "error": "..." }` with 400 (validation), 404, or 409 (conflict).
