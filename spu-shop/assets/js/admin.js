/* ==========================================================
   admin.js — หน้าจัดการร้านค้า (admin.html)
   ต้องโหลดหลัง assets/js/main.js
   ใช้ข้อมูลชุดเดียวกับหน้าลูกค้า: food_orders / food_stores / food_data
   ล็อกอินด้วยรหัสร้าน (SHOP01…) + PIN (เริ่มต้น 1234)
========================================================== */

const ADMIN_STATUS = {
    new: 'ออเดอร์ใหม่',
    cooking: 'กำลังทำ',
    ready: 'พร้อมรับ',
    done: 'สำเร็จ',
    cancelled: 'ยกเลิก'
};
const VIEW_TITLES = {
    overview: 'ภาพรวมร้านค้า',
    orders: 'ออเดอร์',
    queue: 'จัดการคิว',
    menu: 'เมนูและสินค้า',
    settings: 'ตั้งค่าร้าน'
};

let adminStore = null;      // ร้านที่ล็อกอินอยู่
let currentView = 'overview';
let lastOrdersRaw = null;
let seenOrderIds = null;
let pollTimer = null;
let toastTimer = null;

function $(id) { return document.getElementById(id); }

/* ---------- ข้อความเด้ง ---------- */
function adminToast(text) {
    let box = $('toast');
    box.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.textContent = ''; }, 3500);
}

/* ---------- ข้อมูลร้าน ---------- */
function adminConfig() {
    return getStoreConfigs()[adminStore.id];
}

function updateAdminConfig(changes) {
    let configs = getStoreConfigs();
    Object.assign(configs[adminStore.id], changes);
    saveStoreConfigs(configs);
}

function adminOrders() {
    return loadOrders().filter(function (o) { return o.storeId === adminStore.id; });
}

function isTodayTs(ts) {
    return dateKey(ts) === dateKey(Date.now());
}

function badge(status) {
    return '<span class="badge ' + status + '">' + ADMIN_STATUS[status] + '</span>';
}

function itemsText(o) {
    return o.items.map(function (it) {
        return esc(it.name) + ' ×' + it.quantity + (it.note ? ' <small class="muted">(' + esc(it.note) + ')</small>' : '');
    }).join('<br>');
}

/* ---------- เข้าสู่ระบบ / ออกจากระบบ ---------- */
function findStoreIdByCode(code) {
    let configs = getStoreConfigs();
    return Object.keys(configs).find(function (id) {
        return String(configs[id].code).toUpperCase() === code && findStore(id);
    }) || null;
}

function adminLogin(event) {
    event.preventDefault();
    let code = $('store-code').value.trim().toUpperCase();
    let pin = $('store-pin').value.trim();
    let error = $('login-error');
    let storeId = findStoreIdByCode(code);
    if (!storeId) { error.textContent = 'ไม่พบรหัสร้านนี้ (ตัวอย่าง: SHOP01)'; return; }
    if (getStoreConfigs()[storeId].pin !== pin) { error.textContent = 'รหัสผ่านไม่ถูกต้อง'; return; }
    error.textContent = '';
    sessionStorage.setItem('food_merchant', JSON.stringify({ storeId: Number(storeId), at: Date.now() }));
    startApp(Number(storeId));
}

function adminLogout() {
    sessionStorage.removeItem('food_merchant');
    clearInterval(pollTimer);
    pollTimer = null;
    adminStore = null;
    $('app').classList.add('hidden');
    $('login-screen').classList.remove('hidden');
    $('login-form').reset();
    showAuth('login');
}

function startApp(storeId) {
    adminStore = findStore(storeId);
    if (!adminStore) { adminLogout(); return; }
    saveStoreConfigs(getStoreConfigs()); // บันทึกค่าเริ่มต้นของทุกร้าน
    $('login-screen').classList.add('hidden');
    $('app').classList.remove('hidden');
    seenOrderIds = adminOrders().map(function (o) { return o.id; });
    lastOrdersRaw = null;
    showView('overview');
    renderAll();
    if (!pollTimer) pollTimer = setInterval(checkChanges, 2000);
}

/* ---------- สลับหน้า ---------- */
function showView(name) {
    if (!VIEW_TITLES[name]) name = 'overview';
    currentView = name;
    document.querySelectorAll('.view').forEach(function (v) {
        v.classList.toggle('hidden', v.id !== 'view-' + name);
    });
    document.querySelectorAll('.nav-item').forEach(function (b) {
        b.classList.toggle('active', b.dataset.view === name);
    });
    $('page-title').textContent = VIEW_TITLES[name];
    if (name === 'settings') renderSettings();
}

/* ---------- วาดหน้าจอ ---------- */
function renderAll() {
    if (!adminStore) return;
    let cfg = adminConfig();
    let orders = adminOrders();
    lastOrdersRaw = localStorage.getItem('food_orders');

    $('side-store-name').textContent = adminStore.name;
    $('side-store-code').textContent = cfg.code + ' · ' + adminStore.floorName + (cfg.open ? '' : ' · ปิดร้าน');
    $('welcome-store').textContent = adminStore.name;
    $('avatar').textContent = adminStore.name.replace('ร้าน', '').charAt(0) || 'S';
    $('today-label').textContent = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('sound-toggle').textContent = cfg.sound ? '🔔' : '🔕';
    $('sound-toggle').classList.toggle('off', !cfg.sound);

    let count = function (st) { return orders.filter(function (o) { return o.status === st; }).length; };
    $('nav-order-count').textContent = count('new');
    $('nav-order-count').style.display = count('new') > 0 ? '' : 'none';

    renderOverview(orders, count);
    renderOrders(orders);
    renderQueue(orders, count);
    renderMenu();
}

function renderOverview(orders, count) {
    let today = orders.filter(function (o) { return isTodayTs(o.createdAt); });
    let sales = today.filter(function (o) { return o.status === 'done'; })
        .reduce(function (s, o) { return s + o.total; }, 0);
    $('stat-new').textContent = count('new');
    $('stat-cooking').textContent = count('cooking');
    $('stat-ready').textContent = count('ready');
    $('stat-sales').textContent = '฿' + sales.toLocaleString();

    let recent = orders.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 5);
    $('recent-orders').innerHTML = recent.map(function (o) {
        return '<div><b>' + esc(o.queue) + '</b> · ' + esc(o.name || o.student) + ' · ' + o.total + ' บาท ' + badge(o.status) +
            '<br><small class="muted">' + timeText(o.createdAt) + ' · ' + agoText(o.createdAt) + '</small></div>';
    }).join('');

    let active = orders.filter(function (o) { return o.status === 'new' || o.status === 'cooking' || o.status === 'ready'; })
        .sort(function (a, b) { return a.createdAt - b.createdAt; });
    $('queue-summary').innerHTML = active.length
        ? '<div class="order-list">' + active.map(function (o) {
            return '<div><b>' + esc(o.queue) + '</b> ' + badge(o.status) + '</div>';
        }).join('') + '</div>'
        : '';
}

function actionButtons(o) {
    let b = function (act, label, cls) {
        return '<button class="btn ' + cls + '" data-act="' + act + '" data-id="' + o.id + '">' + label + '</button> ';
    };
    if (o.status === 'new') return b('accept', 'รับออเดอร์', 'primary') + b('cancel', 'ยกเลิก', 'ghost');
    if (o.status === 'cooking') return b('ready', 'ทำเสร็จ · เรียกคิว', 'primary') + b('cancel', 'ยกเลิก', 'ghost');
    if (o.status === 'ready') return b('done', 'ลูกค้ารับแล้ว', 'primary') + b('recall', 'เรียกซ้ำ', 'ghost');
    return '';
}

function renderOrders(orders) {
    let q = $('order-search').value.trim().toLowerCase();
    let st = $('status-filter').value;
    let list = orders.filter(function (o) {
        if (st !== 'all' && o.status !== st) return false;
        if (!q) return true;
        return [o.queue, o.name, o.student].join(' ').toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { return b.createdAt - a.createdAt; });

    if (list.length === 0) { $('orders-container').innerHTML = ''; return; }
    let h = '<table><thead><tr><th>คิว</th><th>ลูกค้า</th><th>รายการ</th><th>รวม</th><th>เวลา</th><th>สถานะ</th><th></th></tr></thead><tbody>';
    list.forEach(function (o) {
        h += '<tr><td><b>' + esc(o.queue) + '</b></td>' +
            '<td>' + esc(o.name || '-') + '<br><small class="muted">' + esc(o.student) + '</small></td>' +
            '<td>' + itemsText(o) + '</td>' +
            '<td>' + o.total + ' ฿</td>' +
            '<td>' + timeText(o.createdAt) + '</td>' +
            '<td>' + badge(o.status) + (o.cancelReason ? '<br><small class="muted">' + esc(o.cancelReason) + '</small>' : '') + '</td>' +
            '<td class="nowrap">' + actionButtons(o) + '</td></tr>';
    });
    $('orders-container').innerHTML = h + '</tbody></table>';
}

function renderQueue(orders, count) {
    let doneToday = orders.filter(function (o) { return o.status === 'done' && isTodayTs(o.doneAt || o.updatedAt); }).length;
    $('queue-cooking-count').textContent = count('new') + count('cooking');
    $('queue-ready-count').textContent = count('ready');
    $('queue-done-count').textContent = doneToday;

    let active = orders.filter(function (o) { return o.status === 'new' || o.status === 'cooking' || o.status === 'ready'; })
        .sort(function (a, b) { return a.createdAt - b.createdAt; });
    if (active.length === 0) { $('queue-container').innerHTML = ''; return; }
    let h = '<table><thead><tr><th>คิว</th><th>ลูกค้า</th><th>รายการ</th><th>สถานะ</th><th></th></tr></thead><tbody>';
    active.forEach(function (o) {
        h += '<tr><td><b style="font-size:20px">' + esc(o.queue) + '</b></td><td>' + esc(o.name || o.student) + '</td>' +
            '<td>' + itemsText(o) + '</td><td>' + badge(o.status) + '</td><td class="nowrap">' + actionButtons(o) + '</td></tr>';
    });
    $('queue-container').innerHTML = h + '</tbody></table>';
}

function renderMenu() {
    let menus = adminStore.menus;
    if (menus.length === 0) { $('menu-container').innerHTML = ''; return; }
    let h = '<table><thead><tr><th>เมนู</th><th>ราคา</th><th>สถานะ</th><th></th></tr></thead><tbody>';
    menus.forEach(function (m) {
        let on = m.available !== false;
        let thumb = m.image
            ? '<img class="menu-thumb" src="' + esc(m.image) + '" alt="">'
            : '<span class="menu-thumb none">ไม่มีรูป</span>';
        h += '<tr><td>' + thumb + esc(m.name) + '</td><td>' + m.price + ' ฿</td>' +
            '<td><span class="badge ' + (on ? 'ready' : 'cancelled') + '">' + (on ? 'พร้อมขาย' : 'หมด') + '</span></td>' +
            '<td class="nowrap"><button class="btn ghost" data-menu="toggle" data-id="' + m.id + '">' + (on ? 'ตั้งเป็นหมด' : 'เปิดขาย') + '</button> ' +
            '<button class="btn ghost" data-menu="edit" data-id="' + m.id + '">แก้ไข</button> ' +
            '<button class="btn ghost" data-menu="delete" data-id="' + m.id + '">ลบ</button></td></tr>';
    });
    $('menu-container').innerHTML = h + '</tbody></table>';
}

function renderSettings() {
    let cfg = adminConfig();
    $('setting-name').value = adminStore.name;
    $('setting-code').value = cfg.code;
    $('setting-phone').value = cfg.phone || '';
    $('setting-open').value = cfg.open ? 'open' : 'closed';
    storeImage.set(adminStore.image || '');
}

/* ---------- ตรวจออเดอร์ใหม่ (จากแท็บลูกค้า) ---------- */
function checkChanges() {
    if (!adminStore) return;
    let raw = localStorage.getItem('food_orders');
    if (raw === lastOrdersRaw) return;
    let fresh = adminOrders().filter(function (o) { return o.status === 'new' && seenOrderIds.indexOf(o.id) === -1; });
    adminOrders().forEach(function (o) { if (seenOrderIds.indexOf(o.id) === -1) seenOrderIds.push(o.id); });
    if (fresh.length > 0) {
        adminToast('🔔 ออเดอร์ใหม่ ' + fresh.length + ' รายการ: ' + fresh.map(function (o) { return o.queue; }).join(', '));
        if (adminConfig().sound) beep(3);
        desktopNotify('ออเดอร์ใหม่', adminStore.name + ' · คิว ' + fresh.map(function (o) { return o.queue; }).join(', '));
    }
    renderAll();
}

/* ---------- จัดการออเดอร์ ---------- */
function orderAct(act, id) {
    let orders = loadOrders();
    let o = orders.find(function (x) { return x.id === id; });
    if (!o || o.storeId !== adminStore.id) return;
    let now = Date.now();
    let allowed = {
        accept: ['new'], ready: ['new', 'cooking'], done: ['ready'],
        cancel: ['new', 'cooking'], recall: ['ready']
    };
    if (!allowed[act] || allowed[act].indexOf(o.status) === -1) {
        adminToast('สถานะออเดอร์เปลี่ยนไปแล้ว');
        renderAll();
        return;
    }
    if (act === 'accept') { o.status = 'cooking'; o.acceptedAt = now; }
    if (act === 'ready') { o.status = 'ready'; o.readyAt = now; if (!o.acceptedAt) o.acceptedAt = now; }
    if (act === 'done') { o.status = 'done'; o.doneAt = now; }
    if (act === 'recall') { o.recalledAt = now; }
    if (act === 'cancel') {
        let reason = prompt('เหตุผลที่ยกเลิก (ลูกค้าจะเห็นข้อความนี้)', 'วัตถุดิบหมด');
        if (reason === null) return;
        o.status = 'cancelled';
        o.cancelledBy = 'store';
        o.cancelReason = reason.trim() || 'ร้านยกเลิก';
        o.cancelledAt = now;
    }
    o.updatedAt = now;
    saveOrders(orders);
    if (act === 'ready' || act === 'recall') adminToast('📢 เรียกคิว ' + o.queue + ' แล้ว');
    renderAll();
}

// เรียกคิวถัดไป: คิวที่กำลังทำเก่าสุด (ถ้าไม่มี ใช้คิวใหม่เก่าสุด) -> พร้อมรับ
function callNextQueue() {
    let orders = adminOrders().sort(function (a, b) { return a.createdAt - b.createdAt; });
    let next = orders.find(function (o) { return o.status === 'cooking'; }) ||
               orders.find(function (o) { return o.status === 'new'; });
    if (!next) { adminToast('ไม่มีคิวที่รออยู่'); return; }
    orderAct('ready', next.id);
}

/* ---------- จัดการเมนู ---------- */
function storeInData() {
    for (let f of foodData) {
        for (let s of f.stores) if (s.id === adminStore.id) return s;
    }
    return null;
}

function saveMenus() {
    trySaveFoodData();
    adminStore = findStore(adminStore.id);
    renderAll();
}

function menuAct(act, id) {
    let store = storeInData();
    let menu = store.menus.find(function (m) { return m.id === Number(id); });
    if (!menu) return;
    if (act === 'toggle') {
        menu.available = menu.available === false;
        saveMenus();
    }
    if (act === 'edit') openMenuForm(menu);
    if (act === 'delete') {
        if (!confirm('ลบเมนู "' + menu.name + '"?')) return;
        store.menus.splice(store.menus.indexOf(menu), 1);
        saveMenus();
        adminToast('ลบเมนูแล้ว');
    }
}

/* ---------- รูปภาพ: อ่านไฟล์ + ย่อขนาดก่อนเก็บ (localStorage มีพื้นที่จำกัด) ---------- */
function readImageFile(file, done) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { adminToast('กรุณาเลือกไฟล์รูปภาพ'); return; }
    let reader = new FileReader();
    reader.onload = function () {
        let img = new Image();
        img.onload = function () {
            let max = 640;
            let scale = Math.min(1, max / Math.max(img.width, img.height));
            let canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            let ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            done(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = function () { adminToast('เปิดไฟล์รูปนี้ไม่ได้'); };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

// ผูกช่องเลือกรูป / ลิงก์รูป / ปุ่มลบรูป เข้ากับตัวแสดงตัวอย่าง
function imagePicker(prefix) {
    let picker = {
        value: '',
        set: function (src) {
            picker.value = src || '';
            $(prefix + '-image-preview').src = picker.value;
            $(prefix + '-image-url').value = /^data:/.test(picker.value) ? '' : picker.value;
            $(prefix + '-image-file').value = '';
        }
    };
    $(prefix + '-image-file').addEventListener('change', function () {
        readImageFile(this.files[0], function (data) { picker.set(data); });
    });
    $(prefix + '-image-url').addEventListener('change', function () {
        let url = this.value.trim();
        if (url && !/^https?:\/\//i.test(url)) { adminToast('ลิงก์รูปต้องขึ้นต้นด้วย http:// หรือ https://'); return; }
        picker.set(url);
    });
    $(prefix + '-image-clear').addEventListener('click', function () { picker.set(''); });
    return picker;
}

let menuImage = imagePicker('menu');
let storeImage = imagePicker('store');

// บันทึก foodData แบบจับกรณีพื้นที่เต็ม
function trySaveFoodData() {
    try {
        saveFoodData();
        return true;
    } catch (e) {
        adminToast('พื้นที่เก็บข้อมูลเต็ม กรุณาใช้รูปที่เล็กลงหรือใช้ลิงก์รูปแทน');
        loadFoodData();
        adminStore = findStore(adminStore.id);
        return false;
    }
}

function openMenuForm(menu) {
    $('menu-form').classList.remove('hidden');
    $('menu-form-title').textContent = menu ? 'แก้ไขเมนู' : 'เพิ่มเมนู';
    $('menu-id').value = menu ? menu.id : '';
    $('menu-name').value = menu ? menu.name : '';
    $('menu-price').value = menu ? menu.price : '';
    menuImage.set(menu ? menu.image : '');
    $('menu-name').focus();
}

function saveMenuForm(event) {
    event.preventDefault();
    let name = $('menu-name').value.trim();
    let price = Number($('menu-price').value);
    if (!name || !(price >= 0)) { adminToast('กรุณากรอกชื่อและราคาให้ถูกต้อง'); return; }
    let store = storeInData();
    let id = $('menu-id').value;
    if (id) {
        let menu = store.menus.find(function (m) { return m.id === Number(id); });
        if (menu) { menu.name = name; menu.price = price; menu.image = menuImage.value; }
    } else {
        let maxId = store.menus.reduce(function (mx, m) { return Math.max(mx, m.id || 0); }, store.id * 100);
        store.menus.push({ id: maxId + 1, name: name, price: price, available: true, image: menuImage.value });
    }
    if (!trySaveFoodData()) { renderAll(); return; }
    $('menu-form').classList.add('hidden');
    adminStore = findStore(adminStore.id);
    renderAll();
    adminToast('บันทึกเมนูแล้ว');
}

/* ---------- ตั้งค่า ---------- */
function saveSettings(event) {
    event.preventDefault();
    let name = $('setting-name').value.trim();
    if (!name) { adminToast('กรุณากรอกชื่อร้าน'); return; }
    let store = storeInData();
    let oldName = store.name;
    store.name = name;
    store.image = storeImage.value;
    if (!trySaveFoodData()) { renderAll(); return; }
    adminStore = findStore(adminStore.id);
    // เปลี่ยนชื่อร้านในออเดอร์เดิมด้วย ลูกค้าจะได้เห็นชื่อใหม่ในหน้าคิว
    if (oldName !== name) {
        let orders = loadOrders();
        orders.forEach(function (o) {
            if (o.storeId === adminStore.id) {
                o.store = name;
                o.items.forEach(function (it) { it.store = name; });
            }
        });
        saveOrders(orders);
    }
    updateAdminConfig({ phone: $('setting-phone').value.trim(), open: $('setting-open').value === 'open' });
    renderAll();
    adminToast(oldName !== name ? 'บันทึกแล้ว เปลี่ยนชื่อร้านเป็น "' + name + '"' : 'บันทึกการตั้งค่าแล้ว');
}

/* ---------- ผูกปุ่มต่างๆ ---------- */
$('login-form').addEventListener('submit', adminLogin);
$('logout-btn').addEventListener('click', adminLogout);
$('order-search').addEventListener('input', renderAll);
$('status-filter').addEventListener('change', renderAll);
$('next-queue').addEventListener('click', callNextQueue);
$('add-menu').addEventListener('click', function () { openMenuForm(null); });
$('cancel-menu').addEventListener('click', function () { $('menu-form').classList.add('hidden'); });
$('menu-form').addEventListener('submit', saveMenuForm);
$('settings-form').addEventListener('submit', saveSettings);
$('sound-toggle').addEventListener('click', function () {
    updateAdminConfig({ sound: !adminConfig().sound });
    renderAll();
    adminToast(adminConfig().sound ? 'เปิดเสียงแจ้งเตือนแล้ว' : 'ปิดเสียงแจ้งเตือนแล้ว');
});
$('toast').addEventListener('click', function () { $('toast').textContent = ''; });

document.addEventListener('click', function (e) {
    let nav = e.target.closest('[data-view]');
    if (nav) { showView(nav.dataset.view); return; }
    let go = e.target.closest('[data-goto]');
    if (go) { showView(go.dataset.goto); return; }
    let act = e.target.closest('[data-act]');
    if (act) { orderAct(act.dataset.act, act.dataset.id); return; }
    let m = e.target.closest('[data-menu]');
    if (m) menuAct(m.dataset.menu, m.dataset.id);
});

window.addEventListener('storage', function (e) {
    if (!adminStore || (e.key && e.key.indexOf('food_') !== 0)) return;
    if (e.key === 'food_data' || !e.key) { loadFoodData(); adminStore = findStore(adminStore.id); }
    lastOrdersRaw = null;
    checkChanges();
    if (lastOrdersRaw === null) renderAll();
});

/* ---------- สมัครร้านค้าใหม่ ---------- */
function showAuth(which) {
    $('login-form').classList.toggle('hidden', which !== 'login');
    $('register-form').classList.toggle('hidden', which !== 'register');
    $('register-done').classList.toggle('hidden', which !== 'done');
    if (which === 'register') {
        $('reg-shop-floor').innerHTML = foodData.map(function (f) {
            return '<option value="' + f.id + '">' + esc(f.name) + '</option>';
        }).join('');
        $('reg-shop-name').focus();
    }
    if (which === 'login') $('store-code').focus();
    history.replaceState(null, '', which === 'register' ? '#register' : location.pathname);
}

function regError(id, text) {
    let field = $(id).closest('.field');
    field.classList.toggle('invalid', !!text);
    field.querySelector('.field-error').textContent = text || '';
    return !text;
}

function registerShop(event) {
    event.preventDefault();
    let name = $('reg-shop-name').value.trim().replace(/\s+/g, ' ');
    let floorId = Number($('reg-shop-floor').value);
    let owner = $('reg-owner').value.trim();
    let phone = $('reg-shop-phone').value.trim();
    let pin = $('reg-shop-pin').value;
    let pin2 = $('reg-shop-pin2').value;

    let taken = allStores().some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); });
    let ok = true;
    ok = regError('reg-shop-name', name.length < 2 ? 'กรุณากรอกชื่อร้าน' : taken ? 'มีร้านชื่อนี้ในระบบแล้ว' : '') && ok;
    ok = regError('reg-shop-floor', !foodData.some(function (f) { return f.id === floorId; }) ? 'กรุณาเลือกชั้น' : '') && ok;
    ok = regError('reg-owner', owner.length < 2 ? 'กรุณากรอกชื่อเจ้าของร้าน' : '') && ok;
    ok = regError('reg-shop-phone', !/^0[0-9]{8,9}$/.test(phone) ? 'กรอกเบอร์โทร 9–10 หลัก เช่น 0812345678' : '') && ok;
    ok = regError('reg-shop-pin', pin.length < 4 ? 'รหัสผ่านอย่างน้อย 4 ตัว' : '') && ok;
    ok = regError('reg-shop-pin2', pin2 !== pin ? 'รหัสผ่านไม่ตรงกัน' : '') && ok;
    if (!ok) {
        let first = $('register-form').querySelector('.field.invalid input, .field.invalid select');
        if (first) first.focus();
        return;
    }

    // สร้างร้านใหม่ในข้อมูลกลาง
    let newId = allStores().reduce(function (mx, s) { return Math.max(mx, s.id); }, 0) + 1;
    let floor = foodData.find(function (f) { return f.id === floorId; });
    floor.stores.push({ id: newId, name: name, image: '', menus: [] });
    try { saveFoodData(); } catch (e) {
        floor.stores.pop();
        adminToast('พื้นที่เก็บข้อมูลเต็ม สมัครไม่สำเร็จ');
        return;
    }

    let configs = getStoreConfigs();
    let codes = Object.keys(configs).filter(function (id) { return Number(id) !== newId; })
        .map(function (id) { return String(configs[id].code).toUpperCase(); });
    let code = 'SHOP' + String(newId).padStart(2, '0');
    let n = newId;
    while (codes.indexOf(code) !== -1) { n++; code = 'SHOP' + String(n).padStart(2, '0'); }
    Object.assign(configs[newId], { code: code, pin: pin, owner: owner, phone: phone, open: true, createdAt: Date.now() });
    saveStoreConfigs(configs);

    $('register-form').reset();
    $('done-shop-name').textContent = name;
    $('done-shop-code').textContent = code;
    showAuth('done');
}

$('register-form').addEventListener('submit', registerShop);
$('register-form').addEventListener('input', function (e) {
    let field = e.target.closest('.field');
    if (field && field.classList.contains('invalid')) regError(e.target.id, '');
});
$('reg-shop-phone').addEventListener('input', function () { this.value = this.value.replace(/[^0-9]/g, ''); });
$('done-login').addEventListener('click', function () {
    let code = $('done-shop-code').textContent;
    showAuth('login');
    $('store-code').value = code;
    $('store-pin').focus();
});
document.addEventListener('click', function (e) {
    let a = e.target.closest('[data-auth]');
    if (a) { e.preventDefault(); showAuth(a.dataset.auth); }
});

/* ---------- เริ่มต้น: ถ้าล็อกอินอยู่แล้วในแท็บนี้ เข้าแอปเลย ---------- */
(function init() {
    let s = null;
    try { s = JSON.parse(sessionStorage.getItem('food_merchant')); } catch (e) { s = null; }
    if (s && findStore(s.storeId)) startApp(s.storeId);
    else if (location.hash === '#register') showAuth('register');
})();
