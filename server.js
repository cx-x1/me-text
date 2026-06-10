const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

// ========== إعدادات الملفات ==========
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PAGES_FILE = path.join(__dirname, 'data', 'pages.json');

// إنشاء مجلد البيانات إذا لم يكن موجوداً
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// تهيئة الملفات إذا لم تكن موجودة
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(PAGES_FILE)) {
    fs.writeFileSync(PAGES_FILE, JSON.stringify([]));
}

// ========== دوال مساعدة ==========
function readJSON(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

function generateEditToken() {
    return crypto.randomBytes(32).toString('hex');
}

// ========== Middleware ==========
app.use(helmet({
    contentSecurityPolicy: false // معطل للبساطة، يمكنك تعديله لاحقاً
}));

app.use(express.json());
app.use(express.static('public'));

// Session (يتم تخزينها في الذاكرة - للسيرفرات الحقيقية استخدم Redis أو قاعدة بيانات)
app.use(session({
    secret: crypto.randomBytes(32).toString('hex'), // يتغير كل مرة يشغل السيرفر
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true إذا كنت تستخدم HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
    }
}));

// محدد المعدل (Rate Limiting)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 10, // 10 محاولات كحد أقصى
    message: { error: 'Too many attempts, please try again later' }
});

// ========== Middleware للتحقق من تسجيل الدخول ==========
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    }
    next();
}

// ========== API Routes ==========

// 1. تسجيل مستخدم جديد
app.post('/api/register', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // التحقق من المدخلات
        if (!email || !password) {
            return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
        }

        const users = readJSON(USERS_FILE);

        // التحقق من عدم وجود المستخدم مسبقاً
        if (users.find(u => u.email === email)) {
            return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 12);

        // إنشاء المستخدم
        const newUser = {
            id: generateId(),
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        writeJSON(USERS_FILE, users);

        // تسجيل الدخول مباشرة
        req.session.userId = newUser.id;
        req.session.userEmail = newUser.email;

        res.json({
            success: true,
            user: { id: newUser.id, email: newUser.email }
        });

    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// 2. تسجيل الدخول
app.post('/api/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
        }

        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // إنشاء جلسة
        req.session.userId = user.id;
        req.session.userEmail = user.email;

        res.json({
            success: true,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// 3. تسجيل الخروج
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 4. التحقق من حالة تسجيل الدخول
app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'غير مسجل الدخول' });
    }

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === req.session.userId);

    if (!user) {
        return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

    res.json({
        user: { id: user.id, email: user.email }
    });
});

// 5. إنشاء صفحة جديدة
app.post('/api/pages', requireAuth, (req, res) => {
    try {
        const { slug, content } = req.body;

        // التحقق من slug
        if (!slug || !/^[a-zA-Z0-9_-]{3,50}$/.test(slug)) {
            return res.status(400).json({ error: 'معرف الصفحة غير صالح (3-50 حرف، أحرف إنجليزية وأرقام وشرطات فقط)' });
        }
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'المحتوى مطلوب' });
        }

        const pages = readJSON(PAGES_FILE);

        // التحقق من عدم وجود slug مسبقاً
        if (pages.find(p => p.slug === slug)) {
            return res.status(409).json({ error: 'هذا المعرف مستخدم بالفعل' });
        }

        // إنشاء الصفحة
        const newPage = {
            id: generateId(),
            slug,
            content,
            ownerId: req.session.userId,
            editToken: generateEditToken(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        pages.push(newPage);
        writeJSON(PAGES_FILE, pages);

        res.json({
            success: true,
            page: {
                slug: newPage.slug,
                content: newPage.content,
                createdAt: newPage.createdAt,
                editToken: newPage.editToken
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// 6. عرض صفحة عامة
app.get('/api/pages/:slug', (req, res) => {
    try {
        const pages = readJSON(PAGES_FILE);
        const page = pages.find(p => p.slug === req.params.slug);

        if (!page) {
            return res.status(404).json({ error: 'الصفحة غير موجودة' });
        }

        // إرجاع المحتوى العام فقط (بدون editToken و ownerId)
        res.json({
            slug: page.slug,
            content: page.content,
            createdAt: page.createdAt
        });

    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// 7. تعديل صفحة (يتطلب تسجيل الدخول وملكية الصفحة)
app.put('/api/pages/:slug', requireAuth, (req, res) => {
    try {
        const { content, editToken } = req.body;
        const pages = readJSON(PAGES_FILE);
        const pageIndex = pages.findIndex(p => p.slug === req.params.slug);

        if (pageIndex === -1) {
            return res.status(404).json({ error: 'الصفحة غير موجودة' });
        }

        const page = pages[pageIndex];

        // التحقق من الملكية
        if (page.ownerId !== req.session.userId && page.editToken !== editToken) {
            return res.status(403).json({ error: 'غير مصرح لك بتعديل هذه الصفحة' });
        }

        // تحديث المحتوى
        pages[pageIndex].content = content;
        pages[pageIndex].updatedAt = new Date().toISOString();
        writeJSON(PAGES_FILE, pages);

        res.json({
            success: true,
            page: {
                slug: pages[pageIndex].slug,
                content: pages[pageIndex].content,
                updatedAt: pages[pageIndex].updatedAt
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// 8. حذف صفحة
app.delete('/api/pages/:slug', requireAuth, (req, res) => {
    try {
        const pages = readJSON(PAGES_FILE);
        const pageIndex = pages.findIndex(p => p.slug === req.params.slug);

        if (pageIndex === -1) {
            return res.status(404).json({ error: 'الصفحة غير موجودة' });
        }

        if (pages[pageIndex].ownerId !== req.session.userId) {
            return res.status(403).json({ error: 'غير مصرح لك بحذف هذه الصفحة' });
        }

        pages.splice(pageIndex, 1);
        writeJSON(PAGES_FILE, pages);

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// 9. لوحة التحكم - عرض صفحات المستخدم
app.get('/api/dashboard', requireAuth, (req, res) => {
    try {
        const pages = readJSON(PAGES_FILE);
        const userPages = pages
            .filter(p => p.ownerId === req.session.userId)
            .map(p => ({
                slug: p.slug,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(userPages);

    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// 10. رابط JSON (عام)
app.get('/api/json/:slug', (req, res) => {
    try {
        const pages = readJSON(PAGES_FILE);
        const page = pages.find(p => p.slug === req.params.slug);

        if (!page) {
            return res.status(404).json({ error: 'Not found' });
        }

        res.json({
            slug: page.slug,
            content: page.content,
            created_at: page.createdAt,
            updated_at: page.updatedAt
        });

    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== تشغيل الخادم ==========
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('⚠️  ملاحظة: هذا السيرفر للتطوير فقط. استخدم HTTPS في الإنتاج!');
});
