let user = null;
try { user = JSON.parse(localStorage.getItem('food_user')); } catch (e) { user = null; }

let studentInput = document.getElementById('student');
studentInput.oninput = function() {
    studentInput.value = studentInput.value.replace(/[^0-9]/g, '');
};

function showLoginError(text) {
    let box = document.getElementById('login-error');
    if (box) box.textContent = text;
    else if (text) alert(text);
}

function login(event, form) {
    event.preventDefault();
    let name = form.elements.nickname.value.trim();
    let student = form.elements.student.value.trim();
    if (name === '') { showLoginError('กรุณากรอกชื่อ'); return; }
    if (!/^[0-9]{8}$/.test(student)) { showLoginError('รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก'); return; }
    showLoginError('');
    if (user === null || user.student !== student) localStorage.removeItem('food_cart');
    localStorage.setItem('food_user', JSON.stringify({name: name, student: student}));
    location.href = 'floors.html';
}

// ผูกฟอร์มกับฟังก์ชัน login (กรณีที่หน้า HTML ไม่ได้ใส่ onsubmit ไว้)
let loginForm = document.getElementById('login-form');
if (loginForm && !loginForm.getAttribute('onsubmit')) {
    loginForm.addEventListener('submit', function (event) { login(event, loginForm); });
}
