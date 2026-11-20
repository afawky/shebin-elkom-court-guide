# دليل محكمة شبين الكوم الابتدائية

نسخة أولية static HTML/CSS/JavaScript تعمل مع Supabase.

## الملفات
- `index.html`: الدليل العام.
- `admin.html`: لوحة الإدارة.
- `config.js`: رابط Supabase والمفتاح العام.
- `app.js`, `admin.js`, `styles.css`: وظائف وتنسيقات الموقع.

## النشر على GitHub Pages
1. ارفع جميع الملفات الموجودة في هذا المجلد إلى جذر المستودع `afawky/shebin-elkom-court-guide`.
2. من Settings > Pages اختر Deploy from a branch، ثم `main` و`/(root)`.
3. انتظر رابط النشر.

## إعداد Supabase
- لا تضع أبدًا `sb_secret` أو `service_role` في ملفات الواجهة.
- المفتاح `sb_publishable` مخصص للاستخدام في المتصفح، مع تفعيل RLS.
- لوحة الإدارة تتحقق من `public.is_court_admin()` قبل إظهارها.
- أضف رابط GitHub Pages إلى Authentication > URL Configuration > Redirect URLs إذا لزم الأمر.

## ملاحظات النسخة الأولى
تدعم عرض الأدوار والمكاتب والخدمات، وتسجيل دخول المدير، وإضافة دور/مكتب/خدمة، وتعديل اسم المكتب، وإخفاء/تفعيل وحذف الأدوار والمكاتب. رفع الصور وإدارة تفاصيل الخدمات والتعديل الكامل ستكون في تطوير لاحق.
