/* ===================== Campinho — lógica do app ===================== */

/* Cadastro padrão embutido no código (opcional).
   Use o botão "Exportar cadastro p/ código" para gerar um novo bloco
   e colar aqui, assim o cadastro sobrevive mesmo se o navegador for limpo. */
const DEFAULT_ROSTER = [
  // { id: "a1", name: "João", photo: "data:image/jpeg;base64,...." },
];

const DEFAULT_TEAMS = [
  { id: "azul", name: "Azul", color: "#2166d6" },
  { id: "amarelo", name: "Amarelo", color: "#f2c12e" },
  { id: "preto", name: "Preto", color: "#1c1c1c" },
];

const LS_KEYS = {
  roster: "campinho_roster",
  teams: "campinho_teams",
  board: "campinho_board",
  logo: "campinho_logo",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ===================== Estado ===================== */

let roster = loadJSON(LS_KEYS.roster, null) || DEFAULT_ROSTER.slice();
let teams = loadJSON(LS_KEYS.teams, null) || DEFAULT_TEAMS.slice();
let board = loadJSON(LS_KEYS.board, null); // { [teamId]: [{id, name, photo}] }
if (!board) {
  board = {};
  teams.forEach((t) => (board[t.id] = []));
}
let logoDataUrl = localStorage.getItem(LS_KEYS.logo) || "";

function persistRoster() { saveJSON(LS_KEYS.roster, roster); }
function persistTeams() { saveJSON(LS_KEYS.teams, teams); }
function persistBoard() { saveJSON(LS_KEYS.board, board); }

/* ===================== Utils ===================== */

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function findRosterMatch(name) {
  const n = normalize(name);
  if (!n) return null;
  let match = roster.find((r) => normalize(r.name) === n);
  if (match) return match;
  match = roster.find((r) => normalize(r.name).includes(n) || n.includes(normalize(r.name)));
  return match || null;
}

/* ===================== Logo ===================== */

const logoImg = document.getElementById("logo-img");
const logoInput = document.getElementById("logo-input");

function renderLogo() {
  logoImg.src = logoDataUrl || "";
  logoImg.style.background = logoDataUrl ? "transparent" : "#223";
}
logoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  logoDataUrl = await fileToDataUrl(file);
  localStorage.setItem(LS_KEYS.logo, logoDataUrl);
  renderLogo();
});
renderLogo();

/* ===================== Roster UI ===================== */

const rosterList = document.getElementById("roster-list");
const rosterCount = document.getElementById("roster-count");
const athletePhotoInput = document.getElementById("athlete-photo-input");
const athletePhotoPreview = document.getElementById("athlete-photo-preview");
const athleteNameInput = document.getElementById("athlete-name-input");
const addAthleteForm = document.getElementById("add-athlete-form");

let pendingAthletePhoto = "";

athletePhotoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pendingAthletePhoto = await fileToDataUrl(file);
  athletePhotoPreview.src = pendingAthletePhoto;
});

addAthleteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = athleteNameInput.value.trim();
  if (!name) return;
  roster.push({ id: uid(), name, photo: pendingAthletePhoto || "" });
  persistRoster();
  athleteNameInput.value = "";
  athletePhotoInput.value = "";
  athletePhotoPreview.src = "";
  pendingAthletePhoto = "";
  renderRoster();
  renderTeamsBoard(); // datalist depends on roster
});

function renderRoster() {
  rosterList.innerHTML = "";
  rosterCount.textContent = roster.length;
  roster.forEach((r) => {
    const card = document.createElement("div");
    card.className = "athlete-card";
    card.innerHTML = `
      <img src="${r.photo || ""}" alt="">
      <span class="name">${escapeHtml(r.name)}</span>
      <button class="remove" title="Remover" data-id="${r.id}">✕</button>
    `;
    card.querySelector(".remove").addEventListener("click", () => {
      roster = roster.filter((x) => x.id !== r.id);
      persistRoster();
      renderRoster();
    });
    rosterList.appendChild(card);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/* Exportar / Importar cadastro */

document.getElementById("export-roster-btn").addEventListener("click", () => {
  const out = document.getElementById("export-roster-output");
  const code = `const DEFAULT_ROSTER = ${JSON.stringify(roster, null, 2)};`;
  out.value = code;
  out.classList.remove("hidden");
  out.select();
});

document.getElementById("import-roster-btn").addEventListener("click", () => {
  document.getElementById("import-roster-input").click();
});
document.getElementById("import-roster-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      roster = data;
      persistRoster();
      renderRoster();
      renderTeamsBoard();
    }
  } catch (err) {
    alert("Arquivo inválido.");
  }
});

/* ===================== Teams config UI ===================== */

const teamsConfigEl = document.getElementById("teams-config");

function renderTeamsConfig() {
  teamsConfigEl.innerHTML = "";
  teams.forEach((t) => {
    const card = document.createElement("div");
    card.className = "team-config-card";
    card.innerHTML = `
      <span class="color-swatch" style="background:${t.color}"></span>
      <input type="text" value="${escapeHtml(t.name)}" data-id="${t.id}" class="team-name-input" style="width:110px;">
      <input type="color" value="${t.color}" data-id="${t.id}" class="team-color-input">
      <button type="button" class="danger remove-team" data-id="${t.id}" style="padding:5px 8px;">✕</button>
    `;
    card.querySelector(".team-name-input").addEventListener("input", (e) => {
      t.name = e.target.value;
      persistTeams();
      renderTeamsBoard();
    });
    card.querySelector(".team-color-input").addEventListener("input", (e) => {
      t.color = e.target.value;
      persistTeams();
      renderTeamsBoard();
    });
    card.querySelector(".remove-team").addEventListener("click", () => {
      teams = teams.filter((x) => x.id !== t.id);
      delete board[t.id];
      persistTeams();
      persistBoard();
      renderTeamsConfig();
      renderTeamsBoard();
    });
    teamsConfigEl.appendChild(card);
  });
}

document.getElementById("add-team-btn").addEventListener("click", () => {
  const nameInput = document.getElementById("new-team-name");
  const colorInput = document.getElementById("new-team-color");
  const name = nameInput.value.trim();
  if (!name) return;
  const id = uid();
  teams.push({ id, name, color: colorInput.value });
  board[id] = [];
  persistTeams();
  persistBoard();
  nameInput.value = "";
  renderTeamsConfig();
  renderTeamsBoard();
});

/* ===================== OCR ===================== */

const ocrDrop = document.getElementById("ocr-drop");
const ocrInput = document.getElementById("ocr-input");
const ocrPreview = document.getElementById("ocr-preview");
const ocrProgress = document.getElementById("ocr-progress");
const ocrRaw = document.getElementById("ocr-raw");
const ocrParseBtn = document.getElementById("ocr-parse-btn");

ocrDrop.addEventListener("click", () => ocrInput.click());
ocrDrop.addEventListener("dragover", (e) => {
  e.preventDefault();
  ocrDrop.classList.add("dragover");
});
ocrDrop.addEventListener("dragleave", () => ocrDrop.classList.remove("dragover"));
ocrDrop.addEventListener("drop", (e) => {
  e.preventDefault();
  ocrDrop.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) runOcr(file);
});
ocrInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) runOcr(file);
});

async function runOcr(file) {
  const url = await fileToDataUrl(file);
  ocrPreview.src = url;
  ocrPreview.style.display = "block";
  ocrRaw.style.display = "none";
  ocrParseBtn.disabled = true;
  ocrProgress.textContent = "Lendo imagem...";

  try {
    const result = await Tesseract.recognize(url, "por", {
      logger: (m) => {
        if (m.status && typeof m.progress === "number") {
          ocrProgress.textContent = `${m.status}: ${Math.round(m.progress * 100)}%`;
        }
      },
    });
    ocrRaw.value = result.data.text;
    ocrRaw.style.display = "block";
    ocrProgress.textContent = "Leitura concluída. Revise o texto e clique em 'Distribuir nos times'.";
    ocrParseBtn.disabled = false;
  } catch (err) {
    ocrProgress.textContent = "Erro ao ler imagem: " + err.message;
  }
}

/* Palavras reconhecidas como cabeçalho de time (além dos nomes já cadastrados em `teams`) */
const COLOR_WORDS = ["azul", "amarelo", "amarela", "preto", "preta", "branco", "branca", "vermelho", "verde", "cinza", "laranja"];

function parseOcrText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const groups = []; // { header, names: [] }
  let current = null;

  for (const line of lines) {
    const clean = line.replace(/^[\-\*•]+\s*/, "");
    const isHeader = isTeamHeaderLine(clean);
    if (isHeader) {
      current = { header: clean, names: [] };
      groups.push(current);
      continue;
    }
    // remove numbering like "1.", "1)", "1 -"
    const nameOnly = clean.replace(/^\d+[\.\)\-]?\s*/, "").trim();
    if (!nameOnly) continue;
    if (!current) {
      current = { header: null, names: [] };
      groups.push(current);
    }
    current.names.push(nameOnly);
  }
  return groups;
}

function isTeamHeaderLine(line) {
  const n = normalize(line).replace(/[:.\-–]+$/, "").trim();
  if (n.split(/\s+/).length > 3) return false; // header lines are short
  if (COLOR_WORDS.some((w) => n === w || n.includes(w))) return true;
  if (teams.some((t) => normalize(t.name) === n || n.includes(normalize(t.name)))) return true;
  return false;
}

function matchGroupToTeam(header) {
  if (!header) return null;
  const n = normalize(header);
  let t = teams.find((t) => normalize(t.name) === n || n.includes(normalize(t.name)));
  if (t) return t;
  // try color words -> create team with a sensible default color
  const colorMap = { azul: "#2166d6", amarelo: "#f2c12e", amarela: "#f2c12e", preto: "#1c1c1c", preta: "#1c1c1c", branco: "#e8e8e8", branca: "#e8e8e8", vermelho: "#d62e2e", verde: "#2e9e4f", cinza: "#7a7a7a", laranja: "#f28b1e" };
  for (const word in colorMap) {
    if (n.includes(word)) {
      const label = header.trim().replace(/[:.\-–]+$/, "");
      const id = uid();
      const newTeam = { id, name: label.charAt(0).toUpperCase() + label.slice(1), color: colorMap[word] };
      teams.push(newTeam);
      board[id] = [];
      return newTeam;
    }
  }
  return null;
}

ocrParseBtn.addEventListener("click", () => {
  const text = ocrRaw.value;
  const groups = parseOcrText(text);

  groups.forEach((g) => {
    const team = matchGroupToTeam(g.header) || teams[0];
    if (!team) return;
    g.names.forEach((name) => {
      const match = findRosterMatch(name);
      board[team.id].push({
        id: match ? match.id : uid(),
        name: match ? match.name : name,
        photo: match ? match.photo : "",
      });
    });
  });

  persistTeams();
  persistBoard();
  renderTeamsConfig();
  renderTeamsBoard();
  document.getElementById("teams-board").scrollIntoView({ behavior: "smooth" });
});

/* ===================== Board (tabela editável) ===================== */

const teamsBoardEl = document.getElementById("teams-board");

function renderTeamsBoard() {
  teamsBoardEl.innerHTML = "";

  // datalist for roster autocomplete
  let datalist = document.getElementById("roster-datalist");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "roster-datalist";
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = roster.map((r) => `<option value="${escapeHtml(r.name)}">`).join("");

  teams.forEach((team) => {
    if (!board[team.id]) board[team.id] = [];
    const col = document.createElement("div");
    col.className = "team-column";

    const textColor = isDark(team.color) ? "#fff" : "#111";
    col.innerHTML = `
      <div class="team-column-header" style="background:${team.color};color:${textColor}">
        <span>${escapeHtml(team.name)} (${board[team.id].length})</span>
      </div>
      <div class="team-column-body" data-team="${team.id}"></div>
    `;
    const body = col.querySelector(".team-column-body");

    board[team.id].forEach((player, idx) => {
      const row = document.createElement("div");
      row.className = "player-row";
      row.innerHTML = `
        <img src="${player.photo || ""}" alt="">
        <input type="text" value="${escapeHtml(player.name)}" list="roster-datalist">
        <select class="move-select"></select>
        <button type="button" class="rm">✕</button>
      `;
      const nameInput = row.querySelector("input");
      nameInput.addEventListener("input", (e) => {
        player.name = e.target.value;
        const match = findRosterMatch(player.name);
        player.photo = match ? match.photo : player.photo;
        if (match) row.querySelector("img").src = player.photo;
        persistBoard();
      });

      const select = row.querySelector(".move-select");
      select.innerHTML = teams.map((t) => `<option value="${t.id}" ${t.id === team.id ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("");
      select.addEventListener("change", (e) => {
        const targetId = e.target.value;
        board[team.id].splice(idx, 1);
        board[targetId].push(player);
        persistBoard();
        renderTeamsBoard();
      });

      row.querySelector(".rm").addEventListener("click", () => {
        board[team.id].splice(idx, 1);
        persistBoard();
        renderTeamsBoard();
      });

      body.appendChild(row);
    });

    const addRow = document.createElement("div");
    addRow.className = "add-player-row";
    addRow.innerHTML = `
      <input type="text" placeholder="Adicionar jogador..." list="roster-datalist">
      <button type="button">+</button>
    `;
    const addInput = addRow.querySelector("input");
    const addBtn = addRow.querySelector("button");
    const doAdd = () => {
      const name = addInput.value.trim();
      if (!name) return;
      const match = findRosterMatch(name);
      board[team.id].push({ id: match ? match.id : uid(), name: match ? match.name : name, photo: match ? match.photo : "" });
      persistBoard();
      renderTeamsBoard();
    };
    addBtn.addEventListener("click", doAdd);
    addInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doAdd(); }
    });
    body.appendChild(addRow);

    teamsBoardEl.appendChild(col);
  });
}

function isDark(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

/* ===================== Imagem final ===================== */

const finalCanvas = document.getElementById("final-canvas");
const downloadBtn = document.getElementById("download-final-btn");

document.getElementById("generate-final-btn").addEventListener("click", async () => {
  await drawFinalCard();
  downloadBtn.disabled = false;
});

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "campinho-times.png";
  link.href = finalCanvas.toDataURL("image/png");
  link.click();
});

async function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function drawFinalCard() {
  const ctx = finalCanvas.getContext("2d");
  const W = finalCanvas.width;
  const H = finalCanvas.height;

  ctx.fillStyle = "#0f1720";
  ctx.fillRect(0, 0, W, H);

  // header
  const logo = await loadImage(logoDataUrl);
  const headerH = 90;
  ctx.fillStyle = "#141f28";
  ctx.fillRect(0, 0, W, headerH);

  if (logo) {
    const size = 60;
    ctx.save();
    ctx.beginPath();
    ctx.arc(20 + size / 2, headerH / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logo, 20, (headerH - size) / 2, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = "#2a3a48";
    ctx.beginPath();
    ctx.arc(50, headerH / 2, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8fa3b0";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚽", 50, headerH / 2 + 2);
  }

  const title = document.getElementById("final-title").value.trim() || "Times de hoje";
  ctx.fillStyle = "#e8eef2";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 100, headerH / 2);

  // columns
  const topPad = headerH + 20;
  const gap = 16;
  const colW = (W - gap * (teams.length + 1)) / Math.max(teams.length, 1);
  const rowH = 46;
  const colHeaderH = 44;

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const players = board[team.id] || [];
    const x = gap + i * (colW + gap);
    const colH = colHeaderH + Math.max(players.length, 1) * rowH + 16;

    // column bg
    ctx.fillStyle = "#17212b";
    roundRect(ctx, x, topPad, colW, colH, 10);
    ctx.fill();

    // header
    ctx.fillStyle = team.color;
    roundRectTop(ctx, x, topPad, colW, colHeaderH, 10);
    ctx.fill();

    ctx.fillStyle = isDark(team.color) ? "#fff" : "#111";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(team.name, x + colW / 2, topPad + colHeaderH / 2);

    // players
    for (let j = 0; j < players.length; j++) {
      const p = players[j];
      const py = topPad + colHeaderH + 8 + j * rowH + rowH / 2;
      const photo = await loadImage(p.photo);
      const cx = x + 30;
      if (photo) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, py, 18, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(photo, cx - 18, py - 18, 36, 36);
        ctx.restore();
      } else {
        ctx.fillStyle = "#2a3a48";
        ctx.beginPath();
        ctx.arc(cx, py, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8fa3b0";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((p.name[0] || "?").toUpperCase(), cx, py + 1);
      }
      ctx.fillStyle = "#e8eef2";
      ctx.font = "15px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name, x + 58, py, colW - 66);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

/* ===================== Init ===================== */

renderRoster();
renderTeamsConfig();
renderTeamsBoard();
