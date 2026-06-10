<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تطبيق الرقم الآمن - GitHub Pages</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>🔐 نظام حفظ الرقم بكود أمان</h1>

        <div class="card">
            <h2>📥 إدخال أو تحديث الرقم</h2>
            <input type="text" id="inputCode" placeholder="كود الأمان" autocomplete="off">
            <input type="text" id="inputNumber" placeholder="الرقم المراد حفظه">
            <button id="saveBtn">💾 حفظ / تحديث</button>
            <div id="saveMessage" class="message"></div>
        </div>

        <div class="card">
            <h2>✏️ تعديل الرقم فقط (يتطلب كود الأمان)</h2>
            <input type="text" id="updateCode" placeholder="كود الأمان">
            <input type="text" id="newNumber" placeholder="الرقم الجديد">
            <button id="updateBtn">🔄 تعديل الرقم</button>
            <div id="updateMessage" class="message"></div>
        </div>

        <div class="card">
            <h2>🔍 قراءة الرقم (API تجريبي)</h2>
            <input type="text" id="readCode" placeholder="كود الأمان">
            <button id="readBtn">📖 قراءة الرقم</button>
            <div id="readResult" class="result"></div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
