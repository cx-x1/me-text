// مفتاح التخزين في localStorage
const STORAGE_KEY = 'secure_number_app';

// تهيئة التخزين إذا كان فارغاً
function initStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    }
}

// حفظ جميع البيانات (object: { code: { number, updatedAt } })
function getData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 1. حفظ رقم جديد أو تحديثه (بكود + رقم)
document.getElementById('saveBtn').addEventListener('click', () => {
    const code = document.getElementById('inputCode').value.trim();
    const number = document.getElementById('inputNumber').value.trim();
    const msgDiv = document.getElementById('saveMessage');

    if (!code || !number) {
        msgDiv.innerText = '❌ كود الأمان والرقم مطلوبان';
        return;
    }

    const data = getData();
    data[code] = { number, updatedAt: new Date().toISOString() };
    saveData(data);

    msgDiv.innerText = `✅ تم حفظ الرقم "${number}" لكود ${code}`;
    document.getElementById('inputCode').value = '';
    document.getElementById('inputNumber').value = '';
    setTimeout(() => msgDiv.innerText = '', 3000);
});

// 2. تحديث الرقم فقط (يتطلب كود أمان صحيح)
document.getElementById('updateBtn').addEventListener('click', () => {
    const code = document.getElementById('updateCode').value.trim();
    const newNumber = document.getElementById('newNumber').value.trim();
    const msgDiv = document.getElementById('updateMessage');

    if (!code || !newNumber) {
        msgDiv.innerText = '⚠️ كود الأمان والرقم الجديد مطلوبان';
        return;
    }

    const data = getData();
    if (!data[code]) {
        msgDiv.innerText = '🔒 كود الأمان غير صحيح! لا يمكن تعديل الرقم.';
        return;
    }

    // تحديث الرقم فقط
    data[code].number = newNumber;
    data[code].updatedAt = new Date().toISOString();
    saveData(data);

    msgDiv.innerText = `🔄 تم تحديث الرقم إلى "${newNumber}"`;
    document.getElementById('updateCode').value = '';
    document.getElementById('newNumber').value = '';
    setTimeout(() => msgDiv.innerText = '', 3000);
});

// 3. API القراءة (يعمل كـ API محاكى في المتصفح)
function readNumberByCode(code) {
    const data = getData();
    if (!data[code]) return null;
    return data[code].number;
}

// ربط زر القراءة
document.getElementById('readBtn').addEventListener('click', () => {
    const code = document.getElementById('readCode').value.trim();
    const resultDiv = document.getElementById('readResult');

    if (!code) {
        resultDiv.innerText = '⚠️ يرجى إدخال كود الأمان';
        return;
    }

    const number = readNumberByCode(code);
    if (number === null) {
        resultDiv.innerText = `❌ لم يتم العثور على رقم لكود ${code}`;
    } else {
        resultDiv.innerText = `📞 الرقم الخاص بالكود ${code} هو: ${number}`;
    }
});

// تصدير دالة القراءة بشكل عام لتكون API متاحة للمطورين (في console)
window.API = {
    getNumber: (code) => {
        const data = getData();
        return data[code] ? data[code].number : null;
    },
    getAllCodes: () => Object.keys(getData())
};

initStorage();
console.log('✅ التطبيق جاهز. يمكنك استخدام window.API.getNumber("code") من أدوات المطور');
