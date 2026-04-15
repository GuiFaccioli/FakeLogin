const logar = async () => {
  const email = document.getElementById("usuarioDigitado").value;
  const senha = document.getElementById("senhaDigitada").value;
  const msg = document.getElementById("mensagemLogin");

  if (!email || !senha) {
    msg.innerText = "Preencha todos os campos";
    return;
  }

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const dados = await res.json();

    if (dados.success) {
      msg.innerText = dados.message;
      setTimeout(
        () => (window.location.href = "/home.html"),
        1500,
      );
    } else {
      msg.innerText = dados.message;
    }
  } catch (erro) {
    msg.innerText = "Erro ao conectar";
  }
};
