let user = JSON.parse(localStorage.getItem('food_user'));
let cart = JSON.parse(localStorage.getItem('food_cart')) || [];

// หาเมนูปัจจุบันของสินค้าในตะกร้า (ร้านอาจเปลี่ยนราคา/ปิดเมนู)
function lookupItem(item) {
    let store = item.storeId ? findStore(item.storeId) : findStoreByName(item.store);
    if (!store) return { store: null, menu: null };
    let menu = store.menus.find(function (m) { return m.id === item.menuId; }) ||
               store.menus.find(function (m) { return m.name === item.name; }) || null;
    return { store: store, menu: menu };
}

if (user === null) {
    location.replace('index.html');
} else {
    let configs = getStoreConfigs();
    let count = 0;
    for (let i = 0; i < cart.length; i++) {
        count = count + cart[i].quantity;
    }
    document.getElementById('cart-count').textContent = count;
    let html = '';
    let total = 0;
    let problem = false;
    for (let i = 0; i < cart.length; i++) {
        let item = cart[i];
        let found = lookupItem(item);
        if (found.store) { item.storeId = found.store.id; }
        if (found.menu) { item.menuId = found.menu.id; item.price = found.menu.price; }
        let warn = '';
        if (!found.store || !found.menu) warn = 'ไม่มีเมนูนี้แล้ว';
        else if (!configs[found.store.id].open) warn = 'ร้านปิดอยู่';
        else if (found.menu.available === false) warn = 'เมนูนี้หมดแล้ว';
        if (warn) problem = true;

        html += '<div class="box' + (warn ? ' is-soldout' : '') + '">';
        if (item.image) {
            html += '<img src="' + esc(item.image) + '" alt="ภาพตัวอย่างอาหาร">';
        }
        html += '<h3>' + esc(item.name) + '</h3>';
        if (warn) html += '<p class="closed-note">' + warn + ' กรุณาลบออก</p>';
        html += '<p>' + esc(item.store) + ' ชั้น ' + esc(item.floor) + '</p>';
        html += '<p>หมายเหตุ: ' + esc(item.note) + '</p>';
        html += '<p>' + item.price + ' บาท / จาน</p>';
        html += '<button onclick="changeQuantity(' + i + ', -1)">-</button> ';
        html += item.quantity;
        html += ' <button onclick="changeQuantity(' + i + ', 1)">+</button> ';
        html += '<button onclick="changeQuantity(' + i + ', ' + (-item.quantity) + ')">ลบ</button>';
        html += '</div>';
        total += item.price * item.quantity;
    }
    localStorage.setItem('food_cart', JSON.stringify(cart));
    if (cart.length === 0) html = 'ตะกร้าว่าง';
    document.getElementById('cart-list').innerHTML = html;
    document.getElementById('total').textContent = total;
    document.getElementById('order-button').disabled = cart.length === 0 || problem;
}

function changeQuantity(index, amount) {
    cart[index].quantity += amount;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    localStorage.setItem('food_cart', JSON.stringify(cart));
    location.reload();
}

// ยืนยันสั่ง: แยกตะกร้าเป็นออเดอร์ละร้าน แต่ละร้านออกเลขคิวของตัวเอง
function placeOrder() {
    if (cart.length === 0 || !confirm('ยืนยันสั่งอาหาร?')) return;
    let configs = getStoreConfigs();
    let groups = {};
    for (let item of cart) {
        let found = lookupItem(item);
        if (!found.store || !found.menu) { alert('ไม่พบเมนู ' + item.name + ' แล้ว'); location.reload(); return; }
        if (!configs[found.store.id].open) { alert('ร้าน ' + found.store.name + ' ปิดอยู่ตอนนี้'); location.reload(); return; }
        if (found.menu.available === false) { alert(item.name + ' หมดแล้ว'); location.reload(); return; }
        let sid = found.store.id;
        if (!groups[sid]) groups[sid] = { store: found.store, items: [] };
        groups[sid].items.push({
            menuId: found.menu.id, name: found.menu.name, price: found.menu.price,
            image: item.image, store: found.store.name, floor: found.store.floorId,
            note: item.note, quantity: item.quantity
        });
    }
    let orders = loadOrders();
    let queues = [];
    for (let sid in groups) {
        let g = groups[sid];
        let total = 0;
        for (let it of g.items) total += it.price * it.quantity;
        let order = {
            id: makeId(),
            queue: nextQueue(g.store.id),
            storeId: g.store.id,
            store: g.store.name,
            floor: g.store.floorId,
            student: user.student,
            name: user.name,
            items: g.items,
            total: total,
            status: 'new',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        orders.push(order);
        queues.push(order.queue + ' (' + g.store.name + ')');
    }
    saveOrders(orders);
    localStorage.removeItem('food_cart');
    alert('สั่งอาหารสำเร็จ\nคิวของคุณ: ' + queues.join(', '));
    location.href = 'queue.html';
}
