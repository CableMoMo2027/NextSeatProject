# NextSeat Frontend

[English version](./README.en.md)

Frontend ของระบบจองตั๋วหนัง `NextSeat` พัฒนาด้วย React + Vite โดยเชื่อมกับ Firebase Authentication, backend หลักของระบบ, cinema microservice และ payment microservice เพื่อรองรับ flow ตั้งแต่ browse หนัง ไปจนถึงเลือกที่นั่งและชำระเงิน

## สิ่งที่มีในแอป

- Browse หนังแบบ `Now Playing`, `Trending`, `Upcoming` และหมวดหมู่ตาม genre
- สลับภาษา `TH/EN` ได้จากในแอป พร้อม cache ข้อมูลหน้า Home
- ระบบล็อกอิน/สมัครสมาชิกด้วย Firebase Auth
- Email verification, forgot password, sync profile ไปที่ backend
- เลือกโรง, รอบฉาย, ที่นั่ง, hold/release ที่นั่งอัตโนมัติ
- Checkout, สร้าง order, สร้าง PromptPay QR และอัปโหลดสลิปเพื่อตรวจสอบ
- หน้า member profile และรายการตั๋ว `upcoming/history`

## Tech Stack

- React 19
- Vite 8
- React Router 7
- Firebase Web SDK
- Axios
- Framer Motion / GSAP

## Service ที่ frontend ใช้งาน

| Service | Default URL | หน้าที่ |
| --- | --- | --- |
| Frontend | `http://localhost:5173` | UI ของผู้ใช้งาน |
| Main backend (`ns_backend`) | `http://localhost:3000` | movies, users, screenings, bookings, uploads |
| Cinema service (`ns_cinema_service`) | `http://localhost:3001` | cinema catalog และ showtimes |
| Payment service (`ns_payment_service`) | `http://localhost:3002` | order, QR payment, slip verification |

หมายเหตุ:

- ถ้าจะทำงานแบบ local ทั้งชุด แนะนำให้ตั้ง `VITE_API_BASE=http://localhost:3000`
- flow ชำระเงินต้องมี `VITE_PAYMENT_API_BASE` ชี้ไปที่ payment service ด้วย

## เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies

```bash
cd ns_frontend
npm install
```

### 2. สร้างไฟล์ env

คัดลอกจาก `.env.example` ไปเป็น `.env.local`

```bash
Copy-Item .env.example .env.local
```

ถ้าใช้ macOS/Linux สามารถใช้ `cp .env.example .env.local` ได้เช่นกัน

ตัวอย่างค่าที่แนะนำสำหรับ local development:

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

### 3. รัน frontend

```bash
npm run dev
```

เปิดที่ `http://localhost:5173`

## ค่าตัวแปรสำคัญ

| Variable | จำเป็น | ใช้ทำอะไร |
| --- | --- | --- |
| `VITE_API_BASE` | แนะนำ | URL ของ backend หลัก |
| `VITE_FIREBASE_API_KEY` | ใช่ | Firebase Auth / Analytics |
| `VITE_FIREBASE_AUTH_DOMAIN` | ใช่ | Firebase Auth |
| `VITE_FIREBASE_PROJECT_ID` | ใช่ | Firebase project |
| `VITE_FIREBASE_STORAGE_BUCKET` | ใช่ | Firebase storage config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ใช่ | Firebase app config |
| `VITE_FIREBASE_APP_ID` | ใช่ | Firebase app config |
| `VITE_FIREBASE_MEASUREMENT_ID` | ไม่บังคับ | Analytics |
| `VITE_PAYMENT_API_BASE` | ถ้าทดสอบจ่ายเงิน | URL ของ payment service |
| `VITE_AUTH_ACTION_URL` | แนะนำ | redirect URL สำหรับ verify/reset password |

## รันระบบแบบ local ทั้งชุด

ถ้าต้องการให้ทุก flow ทำงานครบ ควรรัน service ตามนี้

### Main backend

```bash
cd ns_backend
npm install
npm run start:dev
```

env ขั้นต่ำที่ควรมีใน `ns_backend/.env`

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/NextSeat
TMDB_API=your_tmdb_api_key
GEMINI_API=your_gemini_api_key
CINEMA_SERVICE_URL=http://localhost:3001
PAYMENT_SERVICE_URL=http://localhost:3002
```

หมายเหตุ:

- `TMDB_API` จำเป็นสำหรับข้อมูลหนัง

### Cinema service

```bash
cd ns_cinema_service
npm install
npm run dev
```

ถ้าต้อง seed ข้อมูลโรงและรอบ:

```bash
npm run seed
```

env ที่ใช้บ่อย:

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

env ที่ใช้บ่อย:

```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/NextSeatPayments
PROMPTPAY_ID=xxxxxxxxxx
MERCHANT_BANK_ACCOUNT=xxxxxxxxxx
MERCHANT_BANK_CODE=011
MERCHANT_ACCOUNT_NAME=Merchant
SLIP_REQUIRE_AMOUNT_MATCH=false
```

## คำสั่งที่ใช้บ่อย

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## โครงสร้างโฟลเดอร์หลัก

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

## Flow การเชื่อมต่อโดยย่อ

1. ผู้ใช้ล็อกอินผ่าน Firebase
2. frontend sync user ไปที่ `ns_backend`
3. หน้า browse ดึงข้อมูลหนังจาก `VITE_API_BASE`
4. หน้า booking ดึงโรง/รอบ/seat map และเรียก hold/release seats
5. ตอนชำระเงิน frontend เรียก `ns_payment_service` เพื่อสร้าง order, QR และตรวจสอบสลิป

## ปัญหาที่เจอบ่อย

### เปิดหน้า auth แล้ว error ทันที

เช็กค่า Firebase env ว่าครบทุกตัว โดยเฉพาะ `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

### หน้า browse โหลดไม่ได้

เช็กว่า `VITE_API_BASE` ชี้ไป backend ที่รันอยู่จริง และ backend มี `TMDB_API` ถูกต้อง

### เลือกโรงหรือรอบไม่ได้

เช็กว่า `ns_cinema_service` รันอยู่ที่พอร์ต `3001` และ backend ตั้ง `CINEMA_SERVICE_URL` ถูกต้อง

### สร้าง QR หรืออัปโหลดสลิปไม่ได้

เช็กว่า `VITE_PAYMENT_API_BASE` ชี้ไป `ns_payment_service` และ service นี้รันที่พอร์ต `3002`

## หมายเหตุสำหรับทีม

- หน้า Home มีการ cache ข้อมูลและสถานะภาษาไว้ใน `src/services/homeCache.js`
- runtime config รวมอยู่ที่ `src/config/runtime.js`
- auth provider ที่ใช้ตอนนี้มี email/password, Google และ Facebook
- อัปโหลดรูปโปรไฟล์ถูกเสิร์ฟจาก backend ผ่าน path `/uploads/...`
