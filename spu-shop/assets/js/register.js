// สมัครสมาชิกนักศึกษา
let regForm = document.getElementById('register-form');

['reg-student', 'reg-phone'].forEach(function (id) {
    let input = document.getElementById(id);
    input.addEventListener('input', function () { input.value = input.value.replace(/[^0-9]/g, ''); });
});

let presetStudent = new URLSearchParams(location.search).get('student');
if (presetStudent && /^[0-9]{8}$/.test(presetStudent)) document.getElementById('reg-student').value = presetStudent;

document.querySelectorAll('[data-toggle-pass]').forEach(function (btn) {
    btn.addEventListener('click', function () {
        let input = document.getElementById(btn.dataset.togglePass);
        let show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? 'ซ่อน' : 'แสดง';
    });
});

// แสดงข้อผิดพลาดใต้ช่องที่กรอกผิด
function fieldError(id, text) {
    let input = document.getElementById(id);
    let field = input.closest('.field');
    let msg = field.querySelector('.field-error');
    field.classList.toggle('invalid', !!text);
    msg.innerHTML = text || '';
    return !text;
}

regForm.querySelectorAll('input').forEach(function (input) {
    input.addEventListener('input', function () {
        let field = input.closest('.field');
        if (field && field.classList.contains('invalid')) fieldError(input.id, '');
    });
});

regForm.addEventListener('submit', function (event) {
    event.preventDefault();
    let name = document.getElementById('reg-name').value.trim().replace(/\s+/g, ' ');
    let student = document.getElementById('reg-student').value.trim();
    let phone = document.getElementById('reg-phone').value.trim();
    let pass = document.getElementById('reg-pass').value;
    let pass2 = document.getElementById('reg-pass2').value;
    let students = loadStudents();

    let ok = true;
    ok = fieldError('reg-name', name.length < 2 ? 'กรุณากรอกชื่อ-นามสกุล' : '') && ok;
    let studentMsg = '';
    if (!/^[0-9]{8}$/.test(student)) studentMsg = 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก';
    else if (students[student]) studentMsg = 'รหัสนี้สมัครไว้แล้ว <a href="index.html?student=' + student + '">เข้าสู่ระบบ</a>';
    ok = fieldError('reg-student', studentMsg) && ok;
    ok = fieldError('reg-phone', phone && !/^0[0-9]{8,9}$/.test(phone) ? 'เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)' : '') && ok;
    ok = fieldError('reg-pass', pass.length < 6 ? 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' : '') && ok;
    ok = fieldError('reg-pass2', pass2 !== pass ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : '') && ok;
    if (!ok) {
        let first = regForm.querySelector('.field.invalid input');
        if (first) first.focus();
        return;
    }

    students[student] = { name: name, phone: phone, pass: passwordHash(student, pass), createdAt: Date.now() };
    saveStudents(students);

    // สมัครเสร็จ เข้าสู่ระบบให้เลย
    let current = null;
    try { current = JSON.parse(localStorage.getItem('food_user')); } catch (e) { current = null; }
    if (!current || current.student !== student) localStorage.removeItem('food_cart');
    localStorage.setItem('food_user', JSON.stringify({ name: name, student: student }));
    location.href = 'floors.html?welcome=1';
});
