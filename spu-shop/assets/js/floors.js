let user = null;
let cart = [];
try { user = JSON.parse(localStorage.getItem('food_user')); } catch (e) { user = null; }
try { cart = JSON.parse(localStorage.getItem('food_cart')) || []; } catch (e) { cart = []; }

if (user === null) {
    location.replace('index.html');
} else {
    let count = 0;
    for (let i = 0; i < cart.length; i++) {
        count = count + cart[i].quantity;
    }
    document.getElementById('cart-count').textContent = count;
    document.getElementById('user-name').textContent = user.name;
    if (new URLSearchParams(location.search).get('welcome')) {
        document.querySelector('.page-head').insertAdjacentHTML('beforebegin',
            '<p class="welcome-note">สมัครสมาชิกเรียบร้อยแล้ว ยินดีต้อนรับ ' + esc(user.name) + ' เลือกชั้นเพื่อเริ่มสั่งอาหารได้เลย</p>');
        history.replaceState(null, '', 'floors.html');
    }

    let configs = getStoreConfigs();
    let html = '';
    for (let i = 0; i < foodData.length; i++) {
        let floor = foodData[i];
        let openCount = floor.stores.filter(function (s) { return configs[s.id].open; }).length;
        let names = floor.stores.map(function (s) { return s.name; }).join(' · ');
        html += '<li><a href="stores.html?floor=' + floor.id + '">';
        html += '<span class="floor-num">' + floor.id + '</span>';
        html += '<span class="floor-title">' + esc(floor.name) + '</span>';
        html += '<span class="floor-stores">' + esc(names || 'ยังไม่มีร้าน') + '</span>';
        html += '<span class="floor-go">ดูร้านอาหาร →</span></a>';
        html += '<span class="pill ' + (openCount > 0 ? 'pill-open' : 'pill-closed') + '">เปิด ' + openCount + '/' + floor.stores.length + ' ร้าน</span></li>';
    }
    document.getElementById('floor-list').innerHTML = html;
}
