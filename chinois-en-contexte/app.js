const lessons = window.lessons;
const byId = (id) => document.getElementById(id);
const home = byId("home");
const lessonPage = byId("lesson");
const cards = byId("cards");
const filters = byId("filters");
const order = byId("order");
let selectedTheme = "";

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

const zh = (value) => `<span lang="zh-Hans">${escapeHtml(value)}</span>`;
const list = (items) => `<ol lang="zh-Hans">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
const section = (id, title, content) => `<section id="${id}"><h2>${title}</h2>${content}</section>`;
const readingLinks = (media) => media.map(([label, url, prompt]) =>
  `<li><a href="${escapeHtml(url)}" lang="zh-Hans">${escapeHtml(label)}</a><br>${zh(prompt)}</li>`
).join("");

for (const theme of ["", ...new Set(lessons.map((lesson) => lesson.topic))]) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = theme || "Tous les thèmes";
  button.dataset.theme = theme;
  button.addEventListener("click", () => {
    selectedTheme = theme;
    renderCards();
  });
  filters.append(button);
}

function renderCards() {
  const visible = lessons.filter((lesson) => !selectedTheme || lesson.topic === selectedTheme);
  visible.sort((first, second) => order.value === "asc"
    ? first.id.localeCompare(second.id, "fr", { numeric: true })
    : second.id.localeCompare(first.id, "fr", { numeric: true }));
  for (const button of filters.children) {
    button.setAttribute("aria-pressed", String(button.dataset.theme === selectedTheme));
  }
  byId("count").textContent = `${visible.length} dossier(s)`;
  cards.innerHTML = visible.map((lesson) => `
    <a class="card" data-mark="${escapeHtml(lesson.mark)}" href="#${escapeHtml(lesson.id)}">
      <div class="card-art" aria-hidden="true">${zh(lesson.mark)}</div>
      <div class="card-body">
        <span class="category">${escapeHtml(lesson.id)} · ${escapeHtml(lesson.topic)}</span>
        <h3>${zh(lesson.title)}</h3>
        <p class="card-desc">${escapeHtml(lesson.fr)}</p>
        <span class="open">Ouvrir le dossier <span aria-hidden="true">→</span></span>
      </div>
    </a>`).join("");
}

function renderLesson(lesson) {
  const vocab = lesson.words.map(([word, pinyin, meaning]) =>
    `<div><dt>${zh(word)}</dt><dd><span class="pinyin" lang="zh-Latn">${escapeHtml(pinyin)}</span>${escapeHtml(meaning)}</dd></div>`
  ).join("");
  const chunks = lesson.chunks.map(([chunk, meaning]) =>
    `<li><strong>${zh(chunk)}</strong> · ${escapeHtml(meaning)}</li>`
  ).join("");
  const patterns = lesson.patterns.map(([pattern, example]) =>
    `<li><strong>${zh(pattern)}</strong><br>${zh(example)}</li>`
  ).join("");
  const reading = lesson.reading.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  lessonPage.innerHTML = `
    <a class="crumb" href="#dossiers">← Tous les dossiers</a>
    <div class="lesson-top">
      <p class="category">${escapeHtml(lesson.id)} · ${escapeHtml(lesson.topic)} · ${zh(lesson.theme)}</p>
      <h1 tabindex="-1">${zh(lesson.title)}</h1>
      <p class="subtitle">${escapeHtml(lesson.fr)}</p>
      <p>${zh(lesson.intro)}<br>${escapeHtml(lesson.goal)}</p>
    </div>
    <nav class="lesson-menu" aria-label="Dans ce dossier">
      <a href="#${lesson.id}/lecture">Lecture</a><a href="#${lesson.id}/lexique">Lexique</a>
      <a href="#${lesson.id}/expressions">Expressions et structures</a>
      <a href="#${lesson.id}/oral">Discussion et oral</a>
    </nav>
    ${section("lecture", "Lire et comprendre · " + zh("阅读"), `
      <div class="reading" lang="zh-Hans">${reading}</div>
      <h3>Vérifier la compréhension</h3>${list(lesson.check)}
      <h3>Pour aller plus loin</h3><ul class="media">${readingLinks(lesson.media)}</ul>`)}
    ${section("lexique", "Mots clés · " + zh("核心词汇"), `<dl class="vocab">${vocab}</dl>`)}
    ${section("expressions", "Expressions et structures · " + zh("语块与句型"), `
      <h3>Expressions à réutiliser</h3><ul>${chunks}</ul>
      <h3>Structures en contexte</h3><ul>${patterns}</ul>`)}
    ${section("oral", "Échanger et s’exprimer · " + zh("讨论与口语"), `
      <h3>Discussion</h3>${list(lesson.discussion)}
      <h3>À vous de parler</h3><p class="task" lang="zh-Hans">${escapeHtml(lesson.speaking)}</p>`)}
  `;
}

let activeLesson = null;
function route() {
  const [id, anchor] = location.hash.slice(1).split("/");
  const lesson = lessons.find((item) => item.id === id);
  home.hidden = Boolean(lesson);
  lessonPage.hidden = !lesson;
  document.title = lesson ? `${lesson.id} · ${lesson.title} | 语境中文` : "语境中文 · Le chinois en contexte";
  if (!lesson) {
    activeLesson = null;
    if (id === "dossiers") byId(id).scrollIntoView();
    else window.scrollTo(0, 0);
    return;
  }
  if (activeLesson !== lesson.id) {
    renderLesson(lesson);
    activeLesson = lesson.id;
  }
  const target = anchor && byId(anchor);
  if (target && lessonPage.contains(target)) {
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView();
  } else {
    lessonPage.querySelector("h1").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

order.addEventListener("change", renderCards);
window.addEventListener("hashchange", route);
renderCards();
route();
