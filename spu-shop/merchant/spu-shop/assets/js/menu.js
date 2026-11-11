let user = JSON.parse(localStorage.getItem('food_user'));
let cart = JSON.parse(localStorage.getItem('food_cart')) || [];

let params = new URLSearchParams(location.search);
let selectedStore = null;
let selectedFloor = null;

if (user === null) {
    location.replace('index.html');
} else {
    let count = 0;
    for (let i = 0; i < cart.length; i++) {
        count = count + cart[i].quantity;
    }
    document.getElementById('cart-count').textContent = count;
    let storeId = Number(params.get('store'));
    for (let i = 0; i < foodData.length; i++) {
        for (let j = 0; j < foodData[i].stores.length; j++) {
            if (foodData[i].stores[j].id === storeId) {
                selectedStore = foodData[i].stores[j];
                selectedFloor = foodData[i];
            }
        }
    }
    let html = '';
    if (selectedStore !== null) {
        let open = getStoreConfigs()[selectedStore.id].open;
        document.getElementById('store-name').textContent = selectedStore.name;
        document.getElementById('back-link').href = 'stores.html?floor=' + selectedFloor.id;
        if (!open) {
            document.getElementById('store-name').insertAdjacentHTML('afterend',
                '<p class="closed-note">ร้านปิดรับออเดอร์ชั่วคราว ดูเมนูได้แต่ยังสั่งไม่ได้</p>');
        }
        for (let i = 0; i < selectedStore.menus.length; i++) {
            let menu = selectedStore.menus[i];
            let canOrder = open && menu.available !== false;
            html += '<form class="box' + (menu.available === false ? ' is-soldout' : '') + '" onsubmit="addToCart(event, this, ' + i + ')">';
            if (menu.image) html += '<img src="' + esc(menu.image) + '" alt="ภาพตัวอย่างอาหาร">';
            html += '<h3>' + esc(menu.name) + '</h3><p>' + menu.price + ' บาท';
            if (menu.available === false) html += ' <span class="pill pill-closed">หมดแล้ว</span>';
            html += '</p>';
            html += '<label>หมายเหตุ</label>';
            html += '<textarea name="note" maxlength="200" placeholder="เช่น ไม่ใส่ผัก"' + (canOrder ? '' : ' disabled') + '></textarea>';
            html += '<p><button type="submit"' + (canOrder ? '' : ' disabled') + '>' + (canOrder ? 'เพิ่มลงตะกร้า' : 'สั่งไม่ได้ตอนนี้') + '</button></p></form>';
        }
    }
    if (html === '') html = 'ไม่พบร้านอาหาร';
    document.getElementById('menu-list').innerHTML = html;
}

function addToCart(event, form, index) {
    event.preventDefault();
    let menu = selectedStore.menus[index];
    if (!getStoreConfigs()[selectedStore.id].open || menu.available === false) {
        alert('ขออภัย ตอนนี้สั่งเมนูนี้ไม่ได้');
        location.reload();
        return;
    }
    cart.push({
        menuId: menu.id,
        storeId: selectedStore.id,
        name: menu.name,
        price: menu.price,
        image: menu.image,
        store: selectedStore.name,
        floor: selectedFloor.id,
        note: form.elements.note.value.trim(),
        quantity: 1
    });
    localStorage.setItem('food_cart', JSON.stringify(cart));
    alert('เพิ่มลงตะกร้าแล้ว');
    location.reload();
}
