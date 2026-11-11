let user = JSON.parse(localStorage.getItem('food_user'));
let cart = JSON.parse(localStorage.getItem('food_cart')) || [];

let params = new URLSearchParams(location.search);

if (user === null) {
    location.replace('index.html');
} else {
    let count = 0;
    for (let i = 0; i < cart.length; i++) {
        count = count + cart[i].quantity;
    }
    document.getElementById('cart-count').textContent = count;
    let configs = getStoreConfigs();
    let floorId = Number(params.get('floor'));
    let html = '';
    for (let i = 0; i < foodData.length; i++) {
        if (foodData[i].id === floorId) {
            document.getElementById('floor-name').textContent = foodData[i].name;
            let stores = foodData[i].stores;
            for (let j = 0; j < stores.length; j++) {
                let open = configs[stores[j].id].open;
                html += '<div class="box' + (open ? '' : ' is-closed') + '">';
                html += '<img src="' + esc(stores[j].image) + '" alt="ภาพตัวอย่างร้านอาหาร">';
                html += '<h3>' + esc(stores[j].name) + '</h3>';
                html += open ? '<span class="pill pill-open">เปิดอยู่</span> ' : '<span class="pill pill-closed">ร้านปิด</span> ';
                html += '<a href="menu.html?store=' + stores[j].id + '">ดูเมนู</a>';
                html += '</div>';
            }
        }
    }
    if (html === '') html = 'ไม่พบร้านอาหาร';
    document.getElementById('store-list').innerHTML = html;
}
