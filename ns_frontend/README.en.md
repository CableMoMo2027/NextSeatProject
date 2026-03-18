# NextSeat Frontend

[เวอร์ชันภาษาไทย](./README.md)

This is the frontend for the `NextSeat` movie ticket booking platform. It is built with React + Vite and integrates with Firebase Authentication, the main backend, the cinema microservice, and the payment microservice to support the full flow from movie browsing to seat selection and payment.

## Features

- Browse movies in `Now Playing`, `Trending`, `Upcoming`, and genre-based sections
- In-app `TH/EN` language toggle with cached home data
- Sign in and sign up with Firebase Auth
- Email verification, password reset, and user sync with the backend
- Cinema selection, showtime selection, seat map, and automatic seat hold/release
- Checkout flow with order creation, PromptPay QR generation, and slip upload verification
- Member profile and ticket history pages with `upcoming/history` views

## Tech Stack

- React 19
- Vite 8
- React Router 7
- Firebase Web SDK
- Axios
- Framer Motion / GSAP

## Services Used by the Frontend

| Service | Default URL | Responsibility |
| --- | --- | --- |
| Frontend | `http://localhost:5173` | User-facing UI |
| Main backend (`ns_backend`) | `http://localhost:3000` | movies, users, screenings, bookings, uploads |
| Cinema service (`ns_cinema_service`) | `http://localhost:3001` | cinema catalog and showtimes |
| Payment service (`ns_payment_service`) | `http://localhost:3002` | order, QR payment, slip verification |

Notes:

- For full local development, set `VITE_API_BASE=http://localhost:3000`
- Payment-related flows also require `VITE_PAYMENT_API_BASE` to point to the payment service

## Getting Started

### 1. Install dependencies

```bash
cd ns_frontend
npm install
```

### 2. Create the env file

Copy `.env.example` to `.env.local`

```bash
Copy-Item .env.example .env.local
```

If you are using macOS/Linux, you can use `cp .env.example .env.local` instead.

Recommended values for local development:

```env
VITE_API_BASE=http://localhost:3000

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

VITE_PAYMENT_API_BASE=http://localhost:3002
VITE_AUTH_ACTION_URL=http://localhost:5173/login
```

### 3. Run the frontend

```bash
npm run dev
```

Open `http://localhost:5173`

## Important Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE` | Recommended | Main backend base URL |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Auth / Analytics |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase app config |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app config |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional | Analytics |
| `VITE_PAYMENT_API_BASE` | Needed for payment testing | Payment service base URL |
| `VITE_AUTH_ACTION_URL` | Recommended | Redirect URL for verification/reset flows |

## Running the Full Stack Locally

To make the main flows work end-to-end, run the following services as well.

### Main backend

```bash
cd ns_backend
npm install
npm run start:dev
```

Minimum recommended `ns_backend/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/NextSeat
TMDB_API=your_tmdb_api_key
GEMINI_API=your_gemini_api_key
CINEMA_SERVICE_URL=http://localhost:3001
PAYMENT_SERVICE_URL=http://localhost:3002
```

Notes:

- `TMDB_API` is required for movie data

### Cinema service

```bash
cd ns_cinema_service
npm install
npm run dev
```

If you need to seed cinema and showtime data:

```bash
npm run seed
```

Common env values:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/NextSeatCinemas
BACKEND_MONGODB_URI=mongodb://localhost:27017/NextSeat
TMDB_API=your_tmdb_api_key
```

### Payment service

```bash
cd ns_payment_service
npm install
npm run dev
```

Common env values:

```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/NextSeatPayments
PROMPTPAY_ID=xxxxxxxxxx
MERCHANT_BANK_ACCOUNT=xxxxxxxxxx
MERCHANT_BANK_CODE=011
MERCHANT_ACCOUNT_NAME=Merchant
SLIP_REQUIRE_AMOUNT_MATCH=false
```

## Common Commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Main Folder Structure

```text
src/
  components/
    auth/
    booking/
    layout/
    navigation/
    ui/
  config/
  hooks/
  pages/
    account/
    auth/
    booking/
    browse/
  services/
  firebase.js
  App.jsx
```

## High-Level Integration Flow

1. The user authenticates with Firebase
2. The frontend syncs the user to `ns_backend`
3. Browse pages fetch movie data from `VITE_API_BASE`
4. Booking pages fetch cinemas, showtimes, and seat maps, then call seat hold/release endpoints
5. Payment pages call `ns_payment_service` to create orders, generate QR codes, and verify slips

## Common Issues

### Auth pages fail immediately

Check that all Firebase env values are present, especially `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID`

### Browse pages cannot load data

Check that `VITE_API_BASE` points to a running backend and that the backend has a valid `TMDB_API`

### Cinema or showtime selection does not work

Check that `ns_cinema_service` is running on port `3001` and that the backend is configured with the correct `CINEMA_SERVICE_URL`

### QR generation or slip upload fails

Check that `VITE_PAYMENT_API_BASE` points to `ns_payment_service` and that the service is running on port `3002`

## Team Notes

- Home page caching and language state live in `src/services/homeCache.js`
- Runtime config lives in `src/config/runtime.js`
- Current auth providers are email/password, Google, and Facebook
- Profile images are served by the backend under `/uploads/...`
