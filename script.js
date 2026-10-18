var N = 17;
var NIVEIS = {
  facil:   {base: 170, min: 115, passo: 4, atravessa: true,  nome: "Fácil"},
  medio:   {base: 130, min: 85,  passo: 5, atravessa: false, nome: "Médio"},
  dificil: {base: 100, min: 62,  passo: 5, atravessa: false, nome: "Difícil"}
};

var canvas = document.getElementById("tela");
var ctx = canvas.getContext("2d");
var palco = document.getElementById("palco");
var cobertura = document.getElementById("cobertura");

var nivelAtual = "facil";
var cobra, dir, fila, comida, pontos, recordes = {facil: 0, medio: 0, dificil: 0};
var estado = "parado"; // parado | jogando | pausado | fim
var timer = null, cell = 20, flash = 0;

try {
  var salvo = JSON.parse(localStorage.getItem("takeshi_snake_recordes"));
  if (salvo) { for (var k in recordes) if (typeof salvo[k] === "number") recordes[k] = salvo[k]; }
  var nv = localStorage.getItem("takeshi_snake_nivel");
  if (nv && NIVEIS[nv]) nivelAtual = nv;
} catch (e) {}

function el(id) { return document.getElementById(id); }

/* ---------- tamanho: o canvas é sempre quadrado e cabe no espaço disponível ---------- */
function ajustar() {
  var lado = Math.min(palco.clientWidth, palco.clientHeight);
  var dpr = window.devicePixelRatio || 1;
  cell = Math.max(8, Math.floor((lado * dpr) / N));
  canvas.width = cell * N;
  canvas.height = cell * N;
  canvas.style.width = (cell * N / dpr) + "px";
  canvas.style.height = (cell * N / dpr) + "px";
  var cw = cell * N / dpr;
  cobertura.style.width = cw + "px";
  cobertura.style.height = cw + "px";
  desenhar();
}

function resetar() {
  var m = Math.floor(N / 2);
  cobra = [{x: m, y: m}, {x: m - 1, y: m}, {x: m - 2, y: m}];
  dir = {x: 1, y: 0};
  fila = [];
  pontos = 0;
  el("pontos").textContent = "0";
  el("recorde").textContent = String(recordes[nivelAtual]);
  novaComida();
  desenhar();
}

function novaComida() {
  var livres = [], x, y, i, ocupado;
  for (x = 0; x < N; x++) {
    for (y = 0; y < N; y++) {
      ocupado = false;
      for (i = 0; i < cobra.length; i++) if (cobra[i].x === x && cobra[i].y === y) { ocupado = true; break; }
      if (!ocupado) livres.push({x: x, y: y});
    }
  }
  comida = livres.length ? livres[Math.floor(Math.random() * livres.length)] : null;
}

function intervalo() {
  var n = NIVEIS[nivelAtual];
  return Math.max(n.min, n.base - Math.floor(pontos / 3) * n.passo);
}

function agendar() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(passo, intervalo());
}

function parar() { if (timer) { clearTimeout(timer); timer = null; } }

function mostrar(titulo, texto, botao, comNiveis) {
  el("ovTitulo").textContent = titulo;
  el("ovTexto").innerHTML = texto;
  el("btnJogar").textContent = botao;
  el("niveis").className = "niveis" + (comNiveis ? "" : " oculto");
  cobertura.classList.remove("oculto");
}

function esconder() { cobertura.classList.add("oculto"); }

function iniciar() {
  if (estado === "pausado") { estado = "jogando"; esconder(); agendar(); return; }
  resetar();
  estado = "jogando";
  esconder();
  agendar();
}

function pausar() {
  if (estado !== "jogando") return;
  estado = "pausado";
  parar();
  mostrar("Pausado", "Toque em continuar para voltar.", "Continuar", false);
}

function virar(dx, dy) {
  if (estado === "parado" || estado === "fim") { iniciar(); }
  if (estado !== "jogando") return;
  var ref = fila.length ? fila[fila.length - 1] : dir;
  if ((ref.x === -dx && ref.y === -dy) || (ref.x === dx && ref.y === dy)) return;
  if (fila.length < 3) fila.push({x: dx, y: dy});
}

function passo() {
  if (estado !== "jogando") return;
  if (fila.length) dir = fila.shift();
  var n = NIVEIS[nivelAtual];
  var cab = {x: cobra[0].x + dir.x, y: cobra[0].y + dir.y};

  if (n.atravessa) {
    cab.x = (cab.x + N) % N;
    cab.y = (cab.y + N) % N;
  } else if (cab.x < 0 || cab.y < 0 || cab.x >= N || cab.y >= N) {
    return fim();
  }

  var comeu = comida && cab.x === comida.x && cab.y === comida.y;
  var limite = comeu ? cobra.length : cobra.length - 1; // a cauda sai do lugar
  for (var i = 0; i < limite; i++) if (cobra[i].x === cab.x && cobra[i].y === cab.y) return fim();

  cobra.unshift(cab);
  if (comeu) {
    pontos++;
    flash = 1;
    el("pontos").textContent = String(pontos);
    novaComida();
    if (!comida) return fim(true);
  } else {
    cobra.pop();
  }
  desenhar();
  agendar();
}

function fim(ganhou) {
  estado = "fim";
  parar();
  if (pontos > recordes[nivelAtual]) {
    recordes[nivelAtual] = pontos;
    el("recorde").textContent = String(pontos);
    try { localStorage.setItem("takeshi_snake_recordes", JSON.stringify(recordes)); } catch (e) {}
  }
  desenhar();
  mostrar(
    ganhou ? "Você zerou!" : "Fim de jogo",
    "Pontos: <b>" + pontos + "</b> | Recorde (" + NIVEIS[nivelAtual].nome + "): <b>" + recordes[nivelAtual] + "</b>",
    "Jogar de novo",
    true
  );
}

/* ---------- desenho ---------- */
function caixa(x, y, cor, raio, folga) {
  var f = folga, c = cell;
  ctx.fillStyle = cor;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x * c + f, y * c + f, c - f * 2, c - f * 2, raio);
  else ctx.rect(x * c + f, y * c + f, c - f * 2, c - f * 2);
  ctx.fill();
}

function desenhar() {
  if (!cobra) return;
  var x, y, i, c = cell;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (x = 0; x < N; x++) {
    for (y = 0; y < N; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#12231a" : "#0f1d15";
      ctx.fillRect(x * c, y * c, c, c);
    }
  }

  if (comida) {
    var pulso = 1 + Math.sin(Date.now() / 180) * 0.06;
    ctx.save();
    ctx.shadowColor = "#fb7185";
    ctx.shadowBlur = c * 0.7;
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(comida.x * c + c / 2, comida.y * c + c / 2, c * 0.34 * pulso, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#ffe4e6";
    ctx.beginPath();
    ctx.arc(comida.x * c + c * 0.42, comida.y * c + c * 0.4, c * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  for (i = cobra.length - 1; i >= 0; i--) {
    var s = cobra[i], t = i / Math.max(1, cobra.length - 1);
    if (i === 0) {
      caixa(s.x, s.y, estado === "fim" ? "#f87171" : "#bbf7d0", c * 0.32, c * 0.06);
      var ox = dir.y !== 0 ? c * 0.2 : 0, oy = dir.x !== 0 ? c * 0.2 : 0;
      var cx = s.x * c + c / 2 + dir.x * c * 0.14, cy = s.y * c + c / 2 + dir.y * c * 0.14;
      ctx.fillStyle = "#052e16";
      ctx.beginPath(); ctx.arc(cx - ox, cy - oy, c * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + ox, cy + oy, c * 0.09, 0, Math.PI * 2); ctx.fill();
    } else {
      var g = Math.round(200 - t * 70);
      caixa(s.x, s.y, "rgb(34," + g + ",94)", c * 0.28, c * 0.1);
    }
  }
}

/* ---------- controles ---------- */
document.addEventListener("keydown", function(e) {
  var m = {ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
           ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0]};
  if (m[e.key]) { e.preventDefault(); virar(m[e.key][0], m[e.key][1]); }
  else if (e.key === " " || e.key === "p" || e.key === "P") {
    e.preventDefault();
    if (estado === "jogando") pausar(); else if (estado === "pausado") iniciar();
  }
});

var toque = null;
canvas.addEventListener("touchstart", function(e) {
  var t = e.touches[0];
  toque = {x: t.clientX, y: t.clientY};
  e.preventDefault();
}, {passive: false});
canvas.addEventListener("touchmove", function(e) { e.preventDefault(); }, {passive: false});
canvas.addEventListener("touchend", function(e) {
  if (!toque) return;
  var t = e.changedTouches[0], dx = t.clientX - toque.x, dy = t.clientY - toque.y;
  toque = null;
  e.preventDefault();
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) { pausar(); return; }
  if (Math.abs(dx) > Math.abs(dy)) virar(dx > 0 ? 1 : -1, 0);
  else virar(0, dy > 0 ? 1 : -1);
}, {passive: false});

function ligar(id, fn) {
  el(id).addEventListener("pointerdown", function(e) { e.preventDefault(); fn(); });
}
ligar("bEsq", function() { virar(-1, 0); });
ligar("bCima", function() { virar(0, -1); });
ligar("bBaixo", function() { virar(0, 1); });
ligar("bDir", function() { virar(1, 0); });

el("btnJogar").addEventListener("click", iniciar);

var botoesNivel = document.querySelectorAll(".nv");
function marcarNivel() {
  for (var i = 0; i < botoesNivel.length; i++) {
    botoesNivel[i].className = "nv" + (botoesNivel[i].getAttribute("data-n") === nivelAtual ? " on" : "");
  }
}
for (var bi = 0; bi < botoesNivel.length; bi++) {
  botoesNivel[bi].addEventListener("click", function() {
    nivelAtual = this.getAttribute("data-n");
    try { localStorage.setItem("takeshi_snake_nivel", nivelAtual); } catch (e) {}
    marcarNivel();
    el("recorde").textContent = String(recordes[nivelAtual]);
  });
}

document.addEventListener("visibilitychange", function() { if (document.hidden) pausar(); });
window.addEventListener("resize", ajustar);
if (window.ResizeObserver) new ResizeObserver(ajustar).observe(palco);

setInterval(function() { if (estado !== "jogando") desenhar(); }, 120); // anima a comida parada

marcarNivel();
resetar();
ajustar();
