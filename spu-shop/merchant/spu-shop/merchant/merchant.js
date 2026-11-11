/* ==========================================================
   merchant.js — ใช้ร่วมกันทุกหน้าของหลังร้าน
   ต้องโหลดหลัง ../assets/js/main.js

   - ตรวจว่าเข้าสู่ระบบร้านแล้ว (เก็บใน sessionStorage: แต่ละแท็บล็อกอินคนละร้านได้)
   - สร้างหัวเว็บ + เมนูนำทาง
   - ตรวจออเดอร์ใหม่ทุก 2 วินาที + ทันทีเมื่อแท็บลูกค้าสั่ง (storage event)
     แล้วแจ้งเตือนด้วย เสียง / ข้อความเด้ง / ชื่อแท็บกระพริบ / แจ้งเตือนเดสก์ท็อป
   - ปุ่มจัดการออเดอร์ (data-action) ใช้ได้ทุกหน้า
========================================================== */

let merchantSession = null;
try { merchantSession = JSON.parse(sessionStorage.getItem('food_merchant')); } catch (e) { merchantSession = null; }
let myStore = merchantSession ? findStore(merchantSession.storeId) : null;
if (!myStore) location.replace('login.html');

let pageRender = function () {};
let lastSnap = { orders: null, data: null, stores: null };
let baseTitle = document.title;
let blinkTimer = null;
let reminderTimer = null;

function myConfig() {
    return getStoreConfigs()[myStore.id];
}

function updateMyConfig(changes) {
    let configs = getStoreConfigs();
    Object.assign(configs[myStore.id], changes);
    saveStoreConfigs(configs);
    refreshAll();
}

function myOrders() {
    return loadOrders().filter(function (o) { return o.storeId === myStore.id; });
}

function merchantLogout() {
    sessionStorage.removeItem('food_merchant');
    location.href = 'login.html';
}

/* ---------- เริ่มหน้า ---------- */
function startMerchantPage(active, render) {
    if (!myStore) return;
    pageRender = render || function () {};
    baseTitle = document.title + ' — ' + myStore.name;
    document.title = baseTitle;
    buildLayout(active);
    refreshAll(true);
    window.addEventListener('storage', function (e) {
        if (!e.key || e.key.indexOf('food_') === 0) refreshAll();
    });
    setInterval(refreshAll, 2000);
    setInterval(updateAgoLabels, 20000);
    // เตือนซ้ำทุก 45 วินาที ถ้ายังมีออเดอร์ที่ยังไม่กดรับ
    reminderTimer = setInterval(function () {
        let waiting = myOrders().filter(function (o) { return o.status === 'new'; });
        if (waiting.length > 0 && myConfig().sound) beep(2);
    }, 45000);
}

function buildLayout(active) {
    let links = [
        ['dashboard', 'dashboard.html', 'ภาพรวม'],
        ['orders', 'orders.html', 'ออเดอร์ <span class="nav-badge" id="badge-new"></span>'],
        ['queue', 'queue.html', 'คิว'],
        ['products', 'products.html', 'เมนู/สินค้า'],
        ['sales', 'sajes.html', 'ยอดขาย'],
        ['settings', 'settings.html', 'ตั้งค่าร้าน']
    ];
    let nav = '';
    links.forEach(function (l) {
        nav += '<a href="' + l[1] + '"' + (l[0] === active ? ' class="active"' : '') + '>' + l[2] + '</a>';
    });
    let html =
        '<div class="header m-header">' +
        '  <h1>SPU หลังร้าน</h1>' +
        '  <div class="m-store"><b id="m-store-name"></b> · <span id="m-store-floor"></span> · รหัสร้าน <b id="m-store-code"></b>' +
        '  <button id="m-open-chip" class="m-chip" onclick="toggleOpen()" title="คลิกเพื่อเปิด/ปิดร้าน"></button></div>' +
        '</div>' +
        '<div class="nav m-nav">' + nav + '<button onclick="merchantLogout()">ออกจากระบบ</button></div>' +
        '<div id="sound-hint" class="sound-hint">🔈 คลิกที่ใดก็ได้ในหน้านี้ 1 ครั้งเพื่อเปิดเสียงแจ้งเตือนออเดอร์ใหม่</div>';
    document.body.insertAdjacentHTML('afterbegin', html);
    document.addEventListener('click', function () {
        let hint = document.getElementById('sound-hint');
        if (hint) hint.remove();
    }, { once: true });
}

function updateHeader() {
    let cfg = myConfig();
    document.getElementById('m-store-name').textContent = myStore.name;
    document.getElementById('m-store-floor').textContent = myStore.floorName;
    document.getElementById('m-store-code').textContent = cfg.code;
    let chip = document.getElementById('m-open-chip');
    chip.textContent = cfg.open ? '● เปิดรับออเดอร์' : '● ปิดร้านอยู่';
    chip.className = 'm-chip ' + (cfg.open ? 'is-open' : 'is-closed');

    let newCount = myOrders().filter(function (o) { return o.status === 'new'; }).length;
    let badge = document.getElementById('badge-new');
    badge.textContent = newCount > 0 ? newCount : '';
    badge.style.display = newCount > 0 ? 'inline-block' : 'none';

    // ชื่อแท็บกระพริบเมื่อมีออเดอร์รอรับ
    if (newCount > 0 && !blinkTimer) {
        let on = false;
        blinkTimer = setInterval(function () {
            let n = myOrders().filter(function (o) { return o.status === 'new'; }).length;
            on = !on;
            document.title = on ? '🔔 (' + n + ') ออเดอร์ใหม่!' : baseTitle;
        }, 1000);
    } else if (newCount === 0 && blinkTimer) {
        clearInterval(blinkTimer);
        blinkTimer = null;
        document.title = baseTitle;
    }
}

function toggleOpen() {
    let cfg = myConfig();
    if (cfg.open && !confirm('ปิดร้านชั่วคราว? ลูกค้าจะสั่งร้านนี้ไม่ได้จนกว่าจะเปิดใหม่')) return;
    updateMyConfig({ open: !cfg.open });
    showToast(cfg.open ? 'ปิดร้านแล้ว' : 'เปิดรับออเดอร์แล้ว', cfg.open ? 'bad' : 'ok');
}

/* ---------- ตรวจข้อมูลเปลี่ยน + แจ้งเตือน ---------- */
function refreshAll(force) {
    let snap = {
        orders: localStorage.getItem('food_orders'),
        data: localStorage.getItem('food_data'),
        stores: localStorage.getItem('food_stores')
    };
    let changed = {
        orders: snap.orders !== lastSnap.orders,
        data: snap.data !== lastSnap.data,
        stores: snap.stores !== lastSnap.stores
    };
    if (!force && !changed.orders && !changed.data && !changed.stores) return;
    lastSnap = snap;
    if (changed.data) {
        loadFoodData();
        myStore = findStore(myStore.id);
    }
    checkNotifications();
    updateHeader();
    pageRender(force ? { orders: true, data: true, stores: true, first: true } : changed);
    updateAgoLabels();
}

function checkNotifications() {
    let key = 'food_seen_' + myStore.id;
    let seen = null;
    try { seen = JSON.parse(localStorage.getItem(key)); } catch (e) { seen = null; }
    let firstTime = !Array.isArray(seen);
    if (firstTime) seen = [];
    let orders = myOrders();
    let fresh = orders.filter(function (o) { return o.status === 'new' && seen.indexOf(o.id) === -1; });
    let cancelled = orders.filter(function (o) {
        return o.status === 'cancelled' && o.cancelledBy === 'customer' && seen.indexOf('c:' + o.id) === -1;
    });
    if (fresh.length === 0 && cancelled.length === 0) return;

    let sound = myConfig().sound;
    fresh.forEach(function (o) {
        let qty = o.items.reduce(function (s, it) { return s + it.quantity; }, 0);
        showToast('🔔 <b>ออเดอร์ใหม่ คิว ' + esc(o.queue) + '</b><br>' + esc(o.name || o.student) + ' · ' + qty + ' รายการ · ' + o.total +
            ' บาท<br><a href="orders.html?status=new">ไปที่ออเดอร์ →</a>', 'ok');
        seen.push(o.id);
    });
    if (fresh.length > 0) {
        if (sound) beep(3);
        desktopNotify('ออเดอร์ใหม่ ' + fresh.length + ' รายการ', myStore.name + ' · คิว ' + fresh.map(function (o) { return o.queue; }).join(', '));
    }
    cancelled.forEach(function (o) {
        if (!firstTime) {
            showToast('ลูกค้ายกเลิกคิว <b>' + esc(o.queue) + '</b>', 'bad');
            if (sound) beep(1);
        }
        seen.push('c:' + o.id);
    });
    if (seen.length > 800) seen = seen.slice(-800);
    localStorage.setItem(key, JSON.stringify(seen));
}

/* ---------- จัดการออเดอร์ ---------- */
const MERCHANT_STATUS = {
    new: 'ออเดอร์ใหม่',
    cooking: 'กำลังทำ',
    ready: 'พร้อมรับ',
    done: 'รับแล้ว',
    cancelled: 'ยกเลิก'
};

// action: [สถานะที่ทำได้, สถานะใหม่, field เวลา]
const ACTIONS = {
    accept: [['new'], 'cooking', 'acceptedAt'],
    ready:  [['new', 'cooking'], 'ready', 'readyAt'],
    done:   [['ready'], 'done', 'doneAt'],
    cancel: [['new', 'cooking', 'ready'], 'cancelled', 'cancelledAt'],
    back:   [['cooking', 'ready', 'done'], null, null],
    recall: [['ready'], 'ready', 'recalledAt']
};
const BACK_TO = { cooking: 'new', ready: 'cooking', done: 'ready' };

function orderAction(action, id) {
    let rule = ACTIONS[action];
    if (!rule) return;
    let orders = loadOrders();
    let order = orders.find(function (o) { return o.id === id; });
    if (!order || order.storeId !== myStore.id) return;
    if (rule[0].indexOf(order.status) === -1) {
        alert('สถานะออเดอร์เปลี่ยนไปแล้ว (' + MERCHANT_STATUS[order.status] + ')');
        refreshAll(true);
        return;
    }
    let now = Date.now();
    if (action === 'cancel') {
        let reason = prompt('เหตุผลที่ยกเลิก (ลูกค้าจะเห็นข้อความนี้)', 'วัตถุดิบหมด');
        if (reason === null) return;
        order.cancelReason = reason.trim() || 'ร้านยกเลิก';
        order.cancelledBy = 'store';
    }
    if (action === 'back') {
        order.status = BACK_TO[order.status];
    } else {
        if (action === 'ready' && !order.acceptedAt) order.acceptedAt = now;
        order.status = rule[1];
        order[rule[2]] = now;
    }
    order.updatedAt = now;
    saveOrders(orders);
    if (action === 'ready' || action === 'recall') {
        showToast('📢 เรียกคิว <b>' + esc(order.queue) + '</b> แล้ว ลูกค้าจะได้รับแจ้งเตือน', 'ok');
    }
    refreshAll();
}

document.addEventListener('click', function (e) {
    let btn = e.target.closest('[data-action]');
    if (btn) orderAction(btn.dataset.action, btn.dataset.id);
});

function orderButtons(o) {
    let b = function (action, label, cls) {
        return '<button class="btn ' + (cls || '') + '" data-action="' + action + '" data-id="' + o.id + '">' + label + '</button>';
    };
    if (o.status === 'new') return b('accept', 'รับออเดอร์', 'btn-main') + b('cancel', 'ยกเลิก', 'btn-ghost');
    if (o.status === 'cooking') return b('ready', 'ทำเสร็จ · เรียกคิว', 'btn-main') + b('back', 'ย้อนกลับ', 'btn-ghost') + b('cancel', 'ยกเลิก', 'btn-ghost');
    if (o.status === 'ready') return b('done', 'ลูกค้ารับแล้ว · รับเงิน', 'btn-main') + b('recall', 'เรียกซ้ำ', 'btn-ghost') + b('back', 'ย้อนกลับ', 'btn-ghost');
    if (o.status === 'done') return b('back', 'ย้อนกลับ', 'btn-ghost');
    return '';
}

function orderCard(o) {
    let qty = o.items.reduce(function (s, it) { return s + it.quantity; }, 0);
    let h = '<div class="order-card st-' + o.status + '">';
    h += '<div class="oc-head"><span class="oc-queue">' + esc(o.queue) + '</span>';
    h += '<span class="pill pill-' + o.status + '">' + MERCHANT_STATUS[o.status] + '</span></div>';
    h += '<div class="oc-meta">สั่ง ' + timeText(o.createdAt) + ' · <span data-ago="' + o.createdAt + '">' + agoText(o.createdAt) + '</span>';
    h += '<br>ลูกค้า: <b>' + esc(o.name || '-') + '</b> (' + esc(o.student) + ')</div>';
    h += '<ul class="oc-items">';
    o.items.forEach(function (it) {
        h += '<li><span><b>' + it.quantity + '×</b> ' + esc(it.name) + '</span><span>' + (it.price * it.quantity) + '</span>';
        if (it.note) h += '<div class="oc-note">📝 ' + esc(it.note) + '</div>';
        h += '</li>';
    });
    h += '</ul>';
    h += '<div class="oc-total">' + qty + ' รายการ · รวม <b>' + o.total + '</b> บาท</div>';
    if (o.status === 'cancelled') {
        h += '<div class="oc-cancel">' + (o.cancelledBy === 'customer' ? 'ลูกค้ายกเลิก' : 'ร้านยกเลิก') +
            (o.cancelReason ? ': ' + esc(o.cancelReason) : '') + '</div>';
    }
    let actions = orderButtons(o);
    if (actions) h += '<div class="oc-actions">' + actions + '</div>';
    h += '</div>';
    return h;
}

/* ---------- ออเดอร์ทดสอบ (จำลองลูกค้าสั่ง) ---------- */
function createTestOrder() {
    let menus = myStore.menus.filter(function (m) { return m.available !== false; });
    if (menus.length === 0) { alert('ไม่มีเมนูที่พร้อมขาย'); return; }
    let names = ['มายด์', 'ต้น', 'ฟ้า', 'บอส', 'แพรว', 'กัปตัน', 'น้ำหวาน', 'เจ'];
    let notes = ['', '', 'ไม่ใส่ผัก', 'เผ็ดน้อย', 'ใส่กล่อง', 'หวานน้อย'];
    let items = [];
    let count = 1 + Math.floor(Math.random() * Math.min(3, menus.length));
    let pool = menus.slice().sort(function () { return Math.random() - 0.5; });
    for (let i = 0; i < count; i++) {
        let m = pool[i];
        items.push({
            menuId: m.id, name: m.name, price: m.price, image: m.image,
            store: myStore.name, floor: myStore.floorId,
            note: notes[Math.floor(Math.random() * notes.length)],
            quantity: 1 + Math.floor(Math.random() * 2)
        });
    }
    let orders = loadOrders();
    orders.push({
        id: makeId(),
        queue: nextQueue(myStore.id),
        storeId: myStore.id,
        store: myStore.name,
        floor: myStore.floorId,
        student: '69' + String(Math.floor(Math.random() * 1000000)).padStart(6, '0'),
        name: names[Math.floor(Math.random() * names.length)] + ' (ทดสอบ)',
        items: items,
        total: items.reduce(function (s, it) { return s + it.price * it.quantity; }, 0),
        status: 'new',
        test: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
    saveOrders(orders);
    refreshAll();
}

function isToday(ts) {
    return dateKey(ts) === dateKey(Date.now());
}
