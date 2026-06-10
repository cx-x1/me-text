require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const helmet = require('helmet');

// تهيئة Firebase Admin (المفاتيح من .env فقط)
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

// أمان أساسي
app.use(helmet());
app.use(express.json());
app.use(express.static('public'));

// ==========================================
// API: إنشاء صفحة جديدة (يتحقق من التوكن)
// ==========================================
app.post('/api/pages', async (req, res) => {
  try {
    // التحقق من جلسة المستخدم الحقيقية
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).json({ error: 'Unauthorized' });
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    const { slug, content } = req.body;
    
    // التحقق من slug
    if (!slug || !/^[a-zA-Z0-9_-]{3,50}$/.test(slug)) {
      return res.status(400).json({ error: 'Invalid slug' });
    }
    
    // التحقق من عدم وجود slug مسبقاً
    const existing = await db.collection('pages').doc(slug).get();
    if (existing.exists) {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    
    await db.collection('pages').doc(slug).set({
      slug,
      content,
      ownerId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, slug });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API: جلب صفحة عامة (بدون كشف بيانات المالك)
// ==========================================
app.get('/api/pages/:slug', async (req, res) => {
  try {
    const doc = await db.collection('pages').doc(req.params.slug).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    
    const data = doc.data();
    // إرجاع المحتوى العام فقط (بدون ownerId، editToken...)
    res.json({
      slug: data.slug,
      content: data.content,
      createdAt: data.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API: لوحة التحكم (تتطلب مصادقة)
// ==========================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).json({ error: 'Unauthorized' });
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    const snapshot = await db.collection('pages')
      .where('ownerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const pages = [];
    snapshot.forEach(doc => pages.push({
      slug: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API: تسجيل الدخول (يتحقق الخادم من صحة التوكن)
// ==========================================
app.post('/api/auth/verify', async (req, res) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).json({ error: 'No token' });
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    res.json({ uid: decodedToken.uid, email: decodedToken.email });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// أي مسار غير موجود ← index.html (لتطبيق SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Secure server running on port ${PORT}`);
});
