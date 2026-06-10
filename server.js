// تحميل البيانات المخزنة محليًا
let storedData = JSON.parse(localStorage.getItem('userData')) || [];

function renderTable() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    storedData.forEach((item, index) => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = item.key;
        row.insertCell(1).innerText = item.value;
        const delCell = row.insertCell(2);
        const delBtn = document.createElement('button');
        delBtn.innerText = '✖️ حذف';
        delBtn.onclick = () => {
            storedData.splice(index, 1);
            localStorage.setItem('userData', JSON.stringify(storedData));
            renderTable();
            document.getElementById('jsonLinkBox').style.display = 'none';
        };
        delCell.appendChild(delBtn);
    });
}

document.getElementById('addBtn').onclick = () => {
    const key = document.getElementById('keyInput').value.trim();
    const value = document.getElementById('valueInput').value.trim();
    if (key === '' || value === '') {
        alert('الرجاء إدخال المفتاح والقيمة');
        return;
    }
    storedData.push({ key, value });
    localStorage.setItem('userData', JSON.stringify(storedData));
    renderTable();
    document.getElementById('keyInput').value = '';
    document.getElementById('valueInput').value = '';
    document.getElementById('jsonLinkBox').style.display = 'none';
};

document.getElementById('clearAllBtn').onclick = () => {
    if (confirm('هل أنت متأكد من مسح كل البيانات؟')) {
        storedData = [];
        localStorage.setItem('userData', JSON.stringify(storedData));
        renderTable();
        document.getElementById('jsonLinkBox').style.display = 'none';
    }
};

// تحويل البيانات إلى JSON وإنشاء رابط blob://
document.getElementById('exportJsonBtn').onclick = () => {
    if (storedData.length === 0) {
        alert('لا توجد بيانات لتصديرها');
        return;
    }
    const jsonOutput = JSON.stringify(storedData, null, 2);
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const linkInput = document.getElementById('jsonLink');
    linkInput.value = url;
    document.getElementById('jsonLinkBox').style.display = 'block';
};

document.getElementById('copyLinkBtn').onclick = () => {
    const linkInput = document.getElementById('jsonLink');
    linkInput.select();
    document.execCommand('copy');
    alert('تم نسخ الرابط! يمكنك استخدامه في مشروعك الخارجي لقراءة JSON');
};

renderTable();
