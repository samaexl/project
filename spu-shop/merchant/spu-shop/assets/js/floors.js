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
    document.getElementById('user-name').textContent = user.name + ' (' + user.student + ')';

    let configs = getStoreConfigs();
    let html = '';
    for (let i = 0; i < foodData.length; i++) {
        let floor = foodData[i];
        let openCount = floor.stores.filter(function (s) { return configs[s.id].open; }).length;
        html += '<li><a href="stores.html?floor=' + floor.id + '">' + esc(floor.name) + '</a>';
        html += '<span class="pill">' + openCount + '/' + floor.stores.length + ' ร้านเปิด</span></li>';
    }
    document.getElementById('floor-list').innerHTML = html;
}
