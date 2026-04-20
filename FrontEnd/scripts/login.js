const BACKEND = "http://localhost:3002";

const logar = async () => {
  const email = document.getElementById("usuarioDigitado").value;
  const senha = document.getElementById("senhaDigitada").value;
  const msg = document.getElementById("mensagemLogin");

  if (!email || !senha) {
    msg.innerText = "Preencha todos os campos";
    return;
  }

  if (!email.includes("@")) {
    msg.innerText = "Preencha um email válido.";
  }

  try {
    const res = await fetch(`${BACKEND}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
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
        window.location.href = "home.html";
      }, 1500);
    }
  } catch (erro) {
    console.error("Fetch error:", erro);
    msg.innerText = "Erro ao conectar ao servidor";
  }
};

console.log("mudança teste");
