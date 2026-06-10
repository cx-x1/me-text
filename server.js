const express = require('express');
const shortid = require('shortid');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// تخزين البيانات (في الذاكرة - استخدم قاعدة بيانات للإنتاج)
const notes = new Map();

// واجهات API
app.post('/api/create', (req, res) => {
    const { content, password } = req.body;
    const id = shortid.generate();
    const createdAt = Date.now();
    
    notes.set(id, {
        content,
        password: password || null,
        createdAt,
        views: 0
    });
    
    res.json({ 
        url: `${req.protocol}://${req.get('host')}/${id}`,
        jsonUrl: `${req.protocol}://${req.get('host')}/api/json/${id}`,
        id 
    });
});

// الحصول على JSON للمشاركة الخارجية
app.get('/api/json/:id', (req, res) => {
    const note = notes.get(req.params.id);
    if (!note) {
        return res.status(404).json({ error: 'الملاحظة غير موجودة' });
    }
    
    note.views++;
    res.json({
        id: req.params.id,
        content: note.content,
        createdAt: note.createdAt,
        views: note.views,
        // ميزة إضافية: إحصائيات إضافية
        metadata: {
            size: note.content.length,
            lines: note.content.split('\n').length,
            lastAccessed: Date.now()
        }
    });
});

// تحديث المحتوى عبر API
app.put('/api/update/:id', (req, res) => {
    const note = notes.get(req.params.id);
    if (!note) {
        return res.status(404).json({ error: 'الملاحظة غير موجودة' });
    }
    
    const { content, password } = req.body;
    if (note.password && note.password !== password) {
        return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
    
    note.content = content;
    note.updatedAt = Date.now();
    notes.set(req.params.id, note);
    
    res.json({ success: true, id: req.params.id });
});

// حذف الملاحظة عبر API
app.delete('/api/delete/:id', (req, res) => {
    const { password } = req.body;
    const note = notes.get(req.params.id);
    
    if (!note) return res.status(404).json({ error: 'غير موجود' });
    if (note.password && note.password !== password) {
        return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
    
    notes.delete(req.params.id);
    res.json({ success: true });
});

// عرض الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// عرض الملاحظة
app.get('/:id', (req, res) => {
    const note = notes.get(req.params.id);
    if (!note) {
        return res.status(404).send('الملاحظة غير موجودة');
    }
    note.views++;
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// API للبحث
app.get('/api/search/:term', (req, res) => {
    const term = req.params.term.toLowerCase();
    const results = [];
    
    for (const [id, note] of notes.entries()) {
        if (note.content.toLowerCase().includes(term)) {
            results.push({ id, preview: note.content.substring(0, 100), createdAt: note.createdAt });
        }
    }
    
    res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`الخادم يعمل على http://localhost:${PORT}`);
});
