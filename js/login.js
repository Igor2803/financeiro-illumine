const formLogin = document.getElementById('form-login');
const erroLogin = document.getElementById('erro-login');

// Se já estiver logado, vai direto para o app
auth.onAuthStateChanged((usuario) => {
  if (usuario) {
    window.location.href = 'app.html';
  }
});

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroLogin.textContent = '';

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  try {
    await auth.signInWithEmailAndPassword(email, senha);
    window.location.href = 'app.html';
  } catch (err) {
    erroLogin.textContent = 'E-mail ou senha inválidos.';
  }
});
