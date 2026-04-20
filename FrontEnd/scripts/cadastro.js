const BACKEND = "http://localhost:3001"; // ajuste conforme necessário

const cadastrar = async () => {
  const usuario = document.getElementById("usuarioCadastrado").value;
  const email = document.getElementById("emailCadastrado").value;
  const senha = document.getElementById("senhaCadastrada").value;
  const msg = document.getElementById("mensagemCadastro");

  try {
    const res = await fetch(`${BACKEND}/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, email, senha }),
    });

    if (!res.ok) {
      const texto = await res.text().catch(() => null);
      msg.innerText = texto || `Erro ${res.status}`;
      return;
    }

    const dados = await res.json();
    msg.innerText = dados.message;

    if (dados.success) {
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1000);
    }
  } catch (erro) {
    console.error("Erro no fetch:", erro);
    msg.innerText = "Erro ao conectar ao servidor";
  }
};
