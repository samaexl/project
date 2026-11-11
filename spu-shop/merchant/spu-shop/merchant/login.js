// ถ้าล็อกอินอยู่แล้วในแท็บนี้ ไปหน้าภาพรวมเลย
try {
    let s = JSON.parse(sessionStorage.getItem('food_merchant'));
    if (s && findStore(s.storeId)) location.replace('dashboard.html');
} catch (e) { /* ไม่มี session */ }

let configs = getStoreConfigs();
saveStoreConfigs(configs); // บันทึกค่าเริ่มต้นของทุกร้าน

let rows = '';
allStores().forEach(function (store) {
    let cfg = configs[store.id];
    rows += '<tr><td><b>' + esc(cfg.code) + '</b></td><td>' + esc(store.name) + '</td><td>' + esc(store.floorName) +
        '</td><td>' + esc(cfg.prefix) + '001…</td><td><button type="button" class="btn btn-ghost" onclick="fillCode(\'' +
        esc(cfg.code) + '\')">เลือก</button></td></tr>';
});
document.querySelector('#account-table tbody').innerHTML = rows;

function fillCode(code) {
    let form = document.getElementById('login-form');
    form.elements.code.value = code;
    form.elements.pin.value = '';
    form.elements.pin.focus();
}

function merchantLogin(event, form) {
    event.preventDefault();
    let code = form.elements.code.value.trim().toUpperCase();
    let pin = form.elements.pin.value.trim();
    let configs = getStoreConfigs();
    let storeId = Object.keys(configs).find(function (id) {
        return configs[id].code.toUpperCase() === code;
    });
    let error = document.getElementById('login-error');
    if (!storeId || !findStore(storeId)) {
        error.textContent = 'ไม่พบรหัสร้านนี้';
        return;
    }
    if (configs[storeId].pin !== pin) {
        error.textContent = 'PIN ไม่ถูกต้อง';
        return;
    }
    sessionStorage.setItem('food_merchant', JSON.stringify({ storeId: Number(storeId), at: Date.now() }));
    location.href = 'dashboard.html';
}
