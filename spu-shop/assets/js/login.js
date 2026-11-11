let user = null;
try { user = JSON.parse(localStorage.getItem('food_user')); } catch (e) { user = null; }

let loginForm = document.getElementById('login-form');
let studentInput = document.getElementById('student');
studentInput.oninput = function () {
    studentInput.value = studentInput.value.replace(/[^0-9]/g, '');
};

// มาจากหน้าสมัครสมาชิก: ใส่รหัสนักศึกษาให้
let preset = new URLSearchParams(location.search).get('student');
if (preset && /^[0-9]{8}$/.test(preset)) studentInput.value = preset;

function showLoginError(html) {
    let box = document.getElementById('login-error');
    if (box) box.innerHTML = html;
    else if (html) alert(html.replace(/<[^>]+>/g, ''));
}

// ปุ่มแสดง/ซ่อนรหัสผ่าน
document.querySelectorAll('[data-toggle-pass]').forEach(function (btn) {
    btn.addEventListener('click', function () {
        let input = document.getElementById(btn.dataset.togglePass);
        let show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? 'ซ่อน' : 'แสดง';
    });
});

function login(event, form) {
    event.preventDefault();
    let student = form.elements.student.value.trim();
    let passInput = form.elements.password;
    if (!/^[0-9]{8}$/.test(student)) { showLoginError('รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก'); return; }

    // หน้าเก่าที่ไม่มีช่องรหัสผ่าน (เช่นในโฟลเดอร์ merchant) ใช้ชื่ออย่างเดียวเหมือนเดิม
    let name;
    if (!passInput) {
        name = form.elements.nickname ? form.elements.nickname.value.trim() : '';
        if (name === '') { showLoginError('กรุณากรอกชื่อ'); return; }
    } else {
        let account = loadStudents()[student];
        if (!account) {
            showLoginError('ไม่พบบัญชีรหัสนี้ <a href="register.html?student=' + student + '">สมัครสมาชิก</a>');
            return;
        }
        if (account.pass !== passwordHash(student, passInput.value)) {
            showLoginError('รหัสผ่านไม่ถูกต้อง');
            return;
        }
        name = account.name;
    }
    showLoginError('');
    if (user === null || user.student !== student) localStorage.removeItem('food_cart');
    localStorage.setItem('food_user', JSON.stringify({ name: name, student: student }));
    location.href = 'floors.html';
}

if (loginForm && !loginForm.getAttribute('onsubmit')) {
    loginForm.addEventListener('submit', function (event) { login(event, loginForm); });
}
