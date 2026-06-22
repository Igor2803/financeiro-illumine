auth.onAuthStateChanged((usuario) => {
  if (!usuario) {
    window.location.href = 'index.html';
  }
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await auth.signOut();
  window.location.href = 'index.html';
});

const links = document.querySelectorAll('.sidebar nav a');
const paginas = document.querySelectorAll('.pagina');

links.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const destino = link.dataset.pagina;

    links.forEach((l) => l.classList.remove('active'));
    link.classList.add('active');

    paginas.forEach((p) => p.classList.remove('ativa'));
    document.getElementById(`pagina-${destino}`).classList.add('ativa');
  });
});
