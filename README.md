# Messenger — چت دایرکت با NestJS و Next.js

اپلیکیشن چت دایرکت (Direct Messenger) با بک‌اند **NestJS** و فرانت‌اند **Next.js**. ارتباط لحظه‌ای پیام‌ها با **Socket.io** انجام می‌شود و متن پیام‌ها و فایل‌های آپلودی برای امنیت بیشتر رمزنگاری می‌گردند. احراز هویت با **JWT Access/Refresh Token** پیاده‌سازی شده است.

## قابلیت‌های اصلی

- ثبت‌نام و ورود کاربر با Access Token و Refresh Token
- رفرش خودکار توکن 
- ساخت مکالمه دایرکت (دو نفره) بین کاربران
- ارسال پیام متنی و پیام همراه با فایل (عکس/ویدیو)
- دریافت پیام‌های جدید به‌صورت لحظه‌ای با Socket.io
- رمزنگاری متن پیام‌ها و فایل‌های آپلودی پیش از ذخیره‌سازی
- محدودسازی دسترسی به فایل‌ها فقط برای اعضای همان مکالمه

## معماری پروژه

```
messenger/
├─ src/                  بک‌اند NestJS
└─ web/                  فرانت‌اند Next.js
```

## تکنولوژی‌ها

### بک‌اند (NestJS / TypeScript)
- `@nestjs/core`, `@nestjs/common`, `@nestjs/config`
- `@nestjs/typeorm` + `typeorm` + `mysql2` (دیتابیس MySQL)
- احراز هویت: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`
- Realtime: `@nestjs/websockets`, `socket.io`
- آپلود فایل: `@nestjs/platform-express` (FileInterceptor) + `multer`
- رمزنگاری: ماژول `crypto` با الگوریتم AES-256-GCM

### فرانت‌اند (Next.js 15 / React)
- `next`, `react`, `react-dom`
- `socket.io-client` برای realtime
- معماری App Router (`next/navigation`)
- ذخیره توکن‌ها در `localStorage` با کلید `messenger-auth`

## متغیرهای محیطی بک‌اند

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_db_password
DB_NAME=messenger
DB_SYNC=false

PORT=3000

# HTTPS (اختیاری)
HTTPS_KEY_PATH=
HTTPS_CERT_PATH=

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d

# رمزنگاری
APP_ENCRYPTION_KEY=your_encryption_key

# آپلود
UPLOAD_DIR=uploads
```

فایل‌های آپلودی از طریق مسیر استاتیک `/uploads/...` سرویس‌دهی می‌شوند.

## متغیر محیطی فرانت‌اند

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## نصب و اجرا

### بک‌اند
```bash
npm install
npm run start:dev
```

### فرانت‌اند
```bash
cd web
npm install
npm run dev
```

## فلوی احراز هویت

1. کاربر در `/login` یا `/register` وارد می‌شود؛ پاسخ شامل `accessToken`، `refreshToken` و اطلاعات `user` است.
2. این اطلاعات در `localStorage` ذخیره شده و کاربر به `/chat` هدایت می‌شود.
3. در هر درخواست، اگر پاسخ سرور `401` باشد، فرانت‌اند به‌صورت خودکار با `refreshToken` توکن جدید می‌گیرد و درخواست را دوباره اجرا می‌کند.
4. هنگام خروج (`/auth/logout`)، `refreshTokenHash` کاربر در دیتابیس پاک و توکن‌ها از `localStorage` حذف می‌شوند.

Access Token شامل `sub` (شناسه کاربر) و `username` است. Refresh Token جداگانه امضا شده و پیش از ذخیره در دیتابیس با bcrypt هش می‌شود.

## فلوی چت

1. پس از ورود، لیست مکالمات کاربر (`getConversations`) دریافت می‌شود.
2. با انتخاب یک مکالمه، پیام‌های قبلی از API گرفته شده و کاربر با رویداد `chat:join` به room مربوطه در Socket.io ملحق می‌شود.
3. ارسال پیام متنی یا همراه با فایل، پیام را در دیتابیس ذخیره و با رویداد `message:new` برای تمام اعضای room ارسال می‌کند.
4. فرانت‌اند با دریافت `message:new` پیام جدید را به لیست پیام‌ها اضافه می‌کند.

## API ها

### Auth
| Method | Endpoint | توضیح |
|---|---|---|
| POST | `/auth/register` | ثبت‌نام (`username`, `password`) |
| POST | `/auth/login` | ورود |
| POST | `/auth/refresh` | دریافت توکن جدید با `refreshToken` |
| GET | `/auth/me` | دریافت اطلاعات کاربر جاری |
| POST | `/auth/logout` | خروج |
| POST | `/auth/change-password` | تغییر رمز عبور |

### Conversations
| Method | Endpoint | توضیح |
|---|---|---|
| POST | `/conversations` | ساخت یا بازیابی مکالمه دایرکت با یک کاربر |
| GET | `/conversations` | لیست مکالمات کاربر جاری |

### Messages
| Method | Endpoint | توضیح |
|---|---|---|
| POST | `/messages` | ارسال پیام متنی (`conversationId`, `text`) |
| GET | `/messages?conversationId=...` | دریافت پیام‌های یک مکالمه |

### Uploads
| Method | Endpoint | توضیح |
|---|---|---|
| POST | `/uploads/media` | آپلود فایل (عکس/ویدیو، حداکثر ۲۵ مگابایت) |
| GET | `/uploads/media/:fileName` | دریافت فایل رمزگشایی‌شده |

تمام endpointهای بالا به‌جز register/login به JWT نیاز دارند.

## مدل داده (Entities)

- **User**
- **Conversation**
- **ConversationMember**
- **Message**
- **Attachment** (فایل‌های ضمیمه)

یک مکالمه دایرکت زمانی بازیابی می‌شود که دقیقاً دو عضو مشخص در آن حضور داشته باشند؛ در غیر این صورت مکالمه جدید ساخته می‌شود.

## Realtime (Socket.io)

- اتصال با توکن JWT از طریق `handshake.auth.token` یا هدر `Authorization`
- رویداد `chat:join` — عضویت در room مربوط به یک مکالمه (`conversation:{id}`) پس از بررسی عضویت کاربر
- رویداد `message:new` — ارسال پیام جدید به تمام اعضای room

## رمزنگاری

- **متن پیام‌ها:** با AES-256-GCM رمزنگاری و پیش از نمایش رمزگشایی می‌شوند (پیشوند `enc:v1:` برای تشخیص متن رمزشده)
- **فایل‌ها:** پیش از ذخیره روی دیسک رمزنگاری و هنگام دانلود رمزگشایی می‌شوند
- **کنترل دسترسی فایل:** پیش از رمزگشایی فایل، عضویت کاربر در مکالمه مربوطه بررسی می‌شود؛ در غیر این صورت خطای «فایل یافت نشد» بازگردانده می‌شود

## ساختار پوشه‌ها

```
src/
├─ auth/            کنترلر، سرویس، گارد و DTOهای احراز هویت
├─ users/            مدیریت کاربران
├─ conversations/     مدیریت مکالمات
├─ messages/           مدیریت پیام‌ها
├─ uploads/             آپلود و مدیریت فایل‌ها
├─ security/             encryption.service.ts
├─ realtime/              chat.gateway.ts
└─ main.ts                تنظیمات HTTPS، CORS، فایل استاتیک، ValidationPipe

web/
├─ app/              صفحات login، register، chat
├─ components/        auth-screen، chat-screen، media-attachment
└─ lib/
   ├─ api.ts           wrapper برای fetch به همراه منطق رفرش توکن
   ├─ storage.ts         مدیریت localStorage
   └─ types.ts            تایپ‌های داده
```
