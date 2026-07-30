# 🧸 Funkybunky — Full-Stack E-Commerce for Baby & Kids Products

A complete e-commerce store for children's products, with a customer storefront **and** an admin panel.

- **Frontend:** Angular 17 (standalone components + signals), fully responsive / mobile-friendly
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Auth:** JWT with two roles — **admin** and **client**

---

## ✨ Features

### Customer (client) side
- Browse products with search, category / age-group / price filters, sorting & pagination
- Product detail pages with image gallery, stock and discounts
- Cart (saved in the browser) and checkout with multiple payment options
- Account with **order history** and live **order tracking timeline**
- Cancel an order while it's still pending

### Admin side
- **Dashboard** — revenue, orders, customers, product counts, low-stock & pending alerts
- **Products** — full add / edit / delete, stock & featured control
- **Orders** — view every order, update status (updates the customer's tracking instantly)
- **Analytics** — sales trend chart, best sellers, revenue by category, and **smart product suggestions** (what to restock, promote, or discount) so you can plan next month

---

## 🗂️ Project structure

```
funkybunky/
├── vercel.json      # build + routing config for the Vercel deployment
├── api/index.js     # serverless entry point — mounts the Express app at /api
├── server/          # Node.js + Express + MongoDB API
│   ├── models/      # User, Product, Category, Order
│   ├── controllers/ # auth, product, category, order, analytics
│   ├── routes/      # API routes
│   ├── middleware/  # JWT auth + role guard, error handling
│   ├── config/      # db.js (local dev) + serverlessDb.js (Vercel)
│   ├── seed.js      # sample data + admin/customer accounts
│   └── server.js    # local dev entry point (connect + listen)
└── client/          # Angular 17 storefront + admin
    └── src/app/
        ├── core/    # services, guards, interceptor, models
        ├── shared/  # navbar, footer, product card
        └── pages/   # home, shop, product, cart, checkout, auth, account, admin
```

---

## 🚀 Getting started

You need **Node.js 18+** and **MongoDB** (local install or a free MongoDB Atlas cluster).

### 1) Backend

```bash
cd server
npm install
cp .env.example .env        # then edit .env (set MONGO_URI and a JWT_SECRET)
npm run seed                # creates sample products + accounts
npm run dev                 # starts API on http://localhost:5000
```

The seed creates two logins:

| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Admin    | admin@funkybunky.pk      | admin12345  |
| Customer | customer@funkybunky.pk   | customer123 |

### 2) Frontend

```bash
cd client
npm install
npm start                   # starts Angular on http://localhost:4200
```

Open **http://localhost:4200**. Log in as the admin to reach the admin panel (top-right → **Admin**), or as the customer to shop and track orders.

> If your API runs on a different URL, edit `client/src/environments/environment.ts`.

---

## ▲ Deploying to Vercel

Client and API deploy together from this one repo. `vercel.json` builds the
Angular app to static files and serves `server/` as a serverless function
mounted at `/api`, so the frontend talks to the API on its own origin — no CORS
setup and no API host to hardcode.

**1. Use MongoDB Atlas, not a local Mongo.** A serverless function can't reach
`127.0.0.1`. Create a free Atlas cluster and, under **Network Access**, allow
`0.0.0.0/0` (Vercel's function IPs aren't fixed).

**2. Set these in Vercel → Settings → Environment Variables:**

| Variable         | Value                                                        |
|------------------|--------------------------------------------------------------|
| `MONGO_URI`      | your Atlas connection string, ending in `/funkybunky`         |
| `JWT_SECRET`     | a long random string (**not** the one from `.env.example`)    |
| `JWT_EXPIRES_IN` | `7d`                                                          |

`CLIENT_ORIGIN` isn't needed — same origin. Leave **Root Directory** blank in
the Vercel project settings so it builds from the repo root.

**3. Seed the production database** by pointing `MONGO_URI` at Atlas locally and
running `npm run seed` once, from your machine.

> Deploying only the frontend instead? Set `apiUrl` in
> `client/src/environments/environment.prod.ts` to your API's absolute URL and
> set `CLIENT_ORIGIN` on the API to your Vercel domain.

---

## 💳 Going live — what to change

1. **Payments.** Card / JazzCash / Easypaisa are UI placeholders. Integrate a real gateway:
   - International: **Stripe** (`stripe` npm package + Stripe Elements)
   - Pakistan: **JazzCash** / **Easypaisa** merchant APIs, or an aggregator like **Safepay**
   Add the payment step in `server/controllers/orderController.js` before creating the order.
2. **Currency.** Prices are in **PKR (Rs)**. Search the client for `Rs ` to change the label.
3. **Images.** Products use image URLs. For real uploads, add a service like Cloudinary/S3 and store the returned URL (a `multer` dependency is already included to help).
4. **Secrets.** Set a long random `JWT_SECRET` and never commit `.env`.
5. **CORS.** Set `CLIENT_ORIGIN` in `.env` to your deployed frontend URL.

---

## 🛠️ Tech notes

- Order prices are **recalculated on the server** from the database — the client can never send its own prices.
- Placing an order **decrements stock** and increments a `unitsSold` counter, which powers the analytics & suggestions.
- Order status changes append to a **tracking timeline** the customer sees in real time.
- Admin routes are protected by both a JWT check and a **role guard** on the server, plus route guards on the client.

Built with care for little ones. 💛
