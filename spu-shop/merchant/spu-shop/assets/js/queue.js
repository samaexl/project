let user = JSON.parse(localStorage.getItem('food_user'));
let cart = JSON.parse(localStorage.getItem('food_cart')) || [];

let knownStatus = {};   // จำสถานะล่าสุดไว้ เพื่อแจ้งเตือนเมื่อร้านเปลี่ยนสถานะ
let firstRender = true;

if (user === null) {
    location.replace('index.html');
} else {
    let count = 0;
    for (let i = 0; i < cart.length; i++) {
        count = count + cart[i].quantity;
    }
    document.getElementById('cart-count').textContent = count;
    if ('Notification' in window && Notification.permission === 'default') {
        document.getElementById('order-list').insertAdjacentHTML('beforebegin',
            '<p id="notify-ask"><button onclick="askNotify()">เปิดแจ้งเตือนเมื่ออาหารพร้อม</button></p>');
    }
    renderQueue();
    window.addEventListener('storage', function (e) {
        if (!e.key || e.key === 'food_orders') renderQueue();
    });
    setInterval(renderQueue, 3000);
}

function askNotify() {
    Notification.requestPermission().then(function () {
        let el = document.getElementById('notify-ask');
        if (el) el.remove();
    });
}

function renderQueue() {
    let orders = loadOrders();
    let mine = orders.filter(function (o) { return o.student === user.student; });
    mine.sort(function (a, b) { return b.createdAt - a.createdAt; });
    let html = '';
    for (let order of mine) {
        // แจ้งเตือนเมื่อสถานะเปลี่ยน หรือร้านกดเรียกคิวซ้ำ
        let sig = order.status + '|' + (order.recalledAt || '');
        if (!firstRender && knownStatus[order.id] && knownStatus[order.id] !== sig) {
            if (order.status === 'ready') {
                showToast('🔔 คิว <b>' + esc(order.queue) + '</b> อาหารพร้อมแล้ว ไปรับที่ ' + esc(order.store) + ' ชั้น ' + esc(order.floor), 'ok');
                beep(4);
                desktopNotify('อาหารพร้อมแล้ว คิว ' + order.queue, order.store + ' ชั้น ' + order.floor);
            } else if (order.status === 'cooking') {
                showToast('ร้านรับออเดอร์คิว <b>' + esc(order.queue) + '</b> แล้ว กำลังทำอาหาร');
            } else if (order.status === 'cancelled') {
                showToast('คิว <b>' + esc(order.queue) + '</b> ถูกยกเลิก', 'bad');
                beep(1);
            }
        }
        knownStatus[order.id] = sig;

        let ahead = 0;
        if (order.status === 'new' || order.status === 'cooking') {
            ahead = orders.filter(function (o) {
                return o.storeId === order.storeId && (o.status === 'new' || o.status === 'cooking') && o.createdAt < order.createdAt;
            }).length;
        }
        html += '<div class="box q-' + order.status + '"><h3>คิว ' + esc(order.queue) + '</h3>';
        html += '<p><span class="pill pill-' + order.status + '">' + STATUS_TEXT[order.status] + '</span></p>';
        if (order.status === 'new' || order.status === 'cooking') {
            html += '<p>' + (ahead === 0 ? 'คุณเป็นคิวถัดไป' : 'รออีก ' + ahead + ' คิว') + '</p>';
        }
        if (order.status === 'cancelled' && order.cancelReason) {
            html += '<p class="closed-note">เหตุผล: ' + esc(order.cancelReason) + '</p>';
        }
        html += '<p>' + esc(order.store) + ' ชั้น ' + esc(order.floor) + '<br>สั่งเมื่อ ' + timeText(order.createdAt) + '</p>';
        for (let item of order.items) {
            if (item.image) {
                html += '<img src="' + esc(item.image) + '" alt="ภาพตัวอย่างอาหาร">';
            }
            html += '<p>' + esc(item.name) + ' x ' + item.quantity + '<br>';
            html += 'หมายเหตุ: ' + esc(item.note) + '</p>';
        }
        html += '<b>รวม ' + order.total + ' บาท</b>';
        if (order.status === 'new') {
            html += '<p><button onclick="cancelMyOrder(\'' + order.id + '\')">ยกเลิกออเดอร์</button></p>';
        }
        html += '</div>';
    }
    firstRender = false;
    if (html === '') html = 'ยังไม่มีออเดอร์';
    let list = document.getElementById('order-list');
    if (list.innerHTML !== html) list.innerHTML = html;
}

// ลูกค้ายกเลิกได้เฉพาะตอนที่ร้านยังไม่รับออเดอร์
function cancelMyOrder(id) {
    if (!confirm('ยกเลิกออเดอร์นี้?')) return;
    let orders = loadOrders();
    let order = orders.find(function (o) { return o.id === id; });
    if (!order || order.student !== user.student) return;
    if (order.status !== 'new') { alert('ร้านรับออเดอร์ไปแล้ว ยกเลิกไม่ได้ กรุณาติดต่อร้าน'); renderQueue(); return; }
    order.status = 'cancelled';
    order.cancelledBy = 'customer';
    order.cancelReason = 'ลูกค้ายกเลิกเอง';
    order.cancelledAt = Date.now();
    order.updatedAt = Date.now();
    saveOrders(orders);
    renderQueue();
}
