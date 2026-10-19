(function () {
  'use strict';
  const { topics, cards, questions, missing, examDate, grade } = window.STUDY_CONTENT;
  const sources = window.STUDY_SOURCES;
  const { normalize, shuffle, cleanProgress } = window.StudyCore;
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const paths = { arrow: 'M4 12h15m-6-6 6 6-6 6', back: 'M20 12H5m6-6-6 6 6 6', check: 'm5 12 4 4L19 6', cross: 'm6 6 12 12M18 6 6 18', shuffle: 'm3 5 4 0 10 14h4m-4-4 4 4-4 3M3 19h4l3-4m4-6 3-4h4m-4-3 4 3-4 4', book: 'M12 5v15M12 5C8 3 5 3 2 4v14c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1Z', flip: 'M4 7h14l-4-4m4 4-4 4M20 17H6l4 4m-4-4 4-4', file: 'M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h6', external: 'M14 3h7v7m0-7L10 14M10 4H4v16h16v-6', search: 'M16 16l5 5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', info: 'M12 11v6M12 7v1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0' };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.arrow}"/></svg>`;
  const sourceLink = id => `<a class="source-link" href="#materialy/${id}" title="${escape(sources.find(s => s.id === id)?.title || '')}">${icon('file')} Zdroj ${id}</a>`;
  const getTopic = id => topics.find(topic => topic.id === id) || topics[0];
  let consent = null;
  let progress = cleanProgress(null, { topics, cards });
  let storageError = '';
  try {
    const preference = localStorage.getItem('sjl-preferences-v1');
    consent = preference === 'yes' ? true : preference === 'no' ? false : null;
    if (consent) progress = cleanProgress(JSON.parse(localStorage.getItem('sjl-progress-v1')), { topics, cards });
  } catch (_) { storageError = 'Uložený pokrok sa nepodarilo načítať. Učenie funguje ďalej počas tejto návštevy.'; }
  const state = { view: 'prehlad', topic: topics[0].id, search: '', cardTopic: 'all', onlyUnknown: false, deck: [], cardIndex: 0, flipped: false, quizTopic: 'all', quizSize: 10, quiz: null, sourceSearch: '' };
  let toastTimer;
  function announce(message) { $('#announcement').textContent = message; }
  function notify(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
  }
  function persist() {
    if (consent !== true) return;
    try { localStorage.setItem('sjl-progress-v1', JSON.stringify(progress)); }
    catch (_) { storageError = 'Pokrok sa nepodarilo uložiť. Počas tejto návštevy zostáva zachovaný.'; notify(storageError); }
  }
  function updateProgress() {
    $('#read-count').textContent = `${progress.read.length} / ${topics.length}`;
    $('#read-progress').max = topics.length;
    $('#read-progress').value = progress.read.length;
    $('#nav-cards').textContent = cards.length;
    $('#storage-label').textContent = consent === true && !storageError ? 'Pokrok sa ukladá' : 'Ukladanie pokroku';
  }
  function chooseStorage(enabled) {
    storageError = '';
    try {
      if (!enabled) localStorage.removeItem('sjl-progress-v1');
      localStorage.setItem('sjl-preferences-v1', enabled ? 'yes' : 'no');
      if (enabled) localStorage.setItem('sjl-progress-v1', JSON.stringify(progress));
      consent = enabled;
    } catch (_) {
      consent = false;
      storageError = 'Prehliadač nepovolil zmenu úložiska. Stránku môžeš používať ďalej, no uloženie ani odstránenie dát sa nepodarilo potvrdiť.';
    }
    $('#consent-banner').hidden = true;
    updateProgress();
    if (storageError) notify(storageError);
    else notify(enabled ? 'Pokrok sa bude ukladať iba v tomto prehliadači.' : 'Pokračuješ bez ukladania pokroku.');
  }
  function topicOptions(selected) {
    return `<option value="all"${selected === 'all' ? ' selected' : ''}>Všetky témy</option>` + topics.map(topic => `<option value="${topic.id}"${selected === topic.id ? ' selected' : ''}>${escape(topic.title)}</option>`).join('');
  }
  function heading(title, description, extra = '') {
    return `<div class="page-heading"><div><h1 id="page-title" tabindex="-1">${title}</h1>${description ? `<p>${description}</p>` : ''}</div>${extra}</div>`;
  }
  function empty(title, copy, action = '') { return `<div class="empty-state">${icon('search')}<h2>${title}</h2><p>${copy}</p>${action}</div>`; }
  function topicRow(topic) {
    const complete = progress.read.includes(topic.id);
    return `<a class="topic-row" href="#poznamky/${topic.id}"><span class="topic-mark ${topic.color}" aria-hidden="true">${topic.mark}</span><div><h3>${topic.title}</h3><p>${topic.description}</p><span class="topic-meta">${cards.filter(c => c.topic === topic.id).length} kariet <span>·</span> ${topic.sections.length} častí${complete ? '<span>·</span> Prečítané' : ''}</span></div><span class="row-end">${icon(complete ? 'check' : 'arrow')}</span></a>`;
  }
  function renderHome() {
    const next = topics.find(topic => !progress.read.includes(topic.id)) || topics[0];
    const last = progress.results.at(-1);
    return `<section class="home-hero" aria-labelledby="page-title"><div class="hero-copy"><h1 id="page-title" tabindex="-1">Slovenčina<span aria-hidden="true">.</span></h1><p>Poznámky a opakovanie k vstupnej písomke.</p><div class="hero-actions"><a class="button primary" href="#poznamky/${next.id}">${progress.read.length ? 'Pokračovať v poznámkach' : 'Otvoriť poznámky'} ${icon('arrow')}</a><a class="hero-secondary" href="#kviz">Precvičiť učivo ${icon('arrow')}</a></div><a class="exam-note" href="#materialy/18">${grade} · ${examDate}</a></div></section>
    <div class="home-columns"><section class="chapters"><div class="section-heading"><h2>Obsah</h2><a class="text-link" href="#poznamky">Všetky poznámky ${icon('arrow')}</a></div><div class="topic-list">${topics.map(topicRow).join('')}</div></section><aside class="study-aside"><div class="study-flow"><h2>Opakovanie</h2><a href="#karty"><div><strong>Flashkarty ${icon('arrow')}</strong><p>${cards.length} kariet so sebahodnotením.</p></div></a><a href="#kviz"><div><strong>Precvičovanie ${icon('arrow')}</strong><p>${questions.length} otázok s vysvetleniami.</p></div></a></div><div class="source-note"><h3>Podklady</h3><p>Pri učive nájdeš odkaz na pôvodný súbor. Chýbajúce výklady sú označené.</p><a href="#materialy">Pôvodné materiály ${icon('arrow')}</a><a href="#materialy/18">Rozsah písomky ${icon('arrow')}</a></div>${last ? `<div class="last-result"><span>Posledný kvíz</span><strong>${last.correct} / ${last.total}</strong><a href="#kviz">Nový kvíz ${icon('arrow')}</a></div>` : ''}</aside></div>`;
  }
  function renderTable(table) {
    return `<div class="table-scroll" role="region" aria-label="Prehľadová tabuľka" tabindex="0"><table><thead><tr>${table.heads.map(head => `<th scope="col">${escape(head)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row => `<tr>${row.map((cell, i) => `<${i ? 'td' : 'th scope="row"'}>${escape(cell)}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function renderSection(section, index) {
    return `<section class="note-section" id="part-${index}"><div class="note-section-heading"><h2>${escape(section.title)}</h2>${sourceLink(section.source)}</div>${(section.paragraphs || []).map(text => `<p>${escape(text)}</p>`).join('')}${section.table ? renderTable(section.table) : ''}${section.bullets ? `<ul class="note-list">${section.bullets.map(text => `<li>${escape(text)}</li>`).join('')}</ul>` : ''}${(section.paragraphsAfter || []).map(text => `<p>${escape(text)}</p>`).join('')}${section.note ? `<div class="note-callout">${icon('info')}<p>${escape(section.note)}</p></div>` : ''}${section.image ? `<figure class="study-image"><button data-image="${section.image}" data-alt="${escape(section.alt)}" aria-label="Zväčšiť: ${escape(section.alt)}"><img src="${section.image}" alt="${escape(section.alt)}" loading="lazy" decoding="async"></button><figcaption>Pôvodný podklad. Kliknutím ho zväčšíš. ${sourceLink(section.source)}</figcaption></figure>` : ''}</section>`;
  }
  function renderNotes() {
    if (state.search) {
      const query = normalize(state.search);
      const matches = topics.flatMap(topic => topic.sections.filter(section => normalize(JSON.stringify(section)).includes(query) || normalize(topic.title).includes(query)).map(section => ({ topic, section })));
      return `${heading('Vyhľadávanie', `Výsledky pre „${escape(state.search)}“`)}<div class="search-results">${matches.length ? `<p class="result-count">Nájdené časti: ${matches.length}</p>${matches.map(({ topic, section }) => `<a class="search-result" href="#poznamky/${topic.id}" data-clear-search><span>${escape(topic.title)}</span><h2>${escape(section.title)}</h2><p>${escape((section.paragraphs?.[0] || section.bullets?.[0] || topic.description).slice(0, 200))}</p>${icon('arrow')}</a>`).join('')}` : empty('Tento pojem sme nenašli.', 'Skús kratšie slovo. Vyhľadávanie funguje aj bez diakritiky.', '<button class="button secondary" data-clear-search>Vymazať hľadanie</button>')}</div>`;
    }
    const topic = getTopic(state.topic);
    const complete = progress.read.includes(topic.id);
    return `${heading('Poznámky', 'Sedem tém z dodaných materiálov.')}<div class="notes-layout"><nav class="chapter-nav" aria-label="Témy poznámok">${topics.map(t => `<a href="#poznamky/${t.id}"${t.id === topic.id ? ' aria-current="page"' : ''}><span class="chapter-dot ${t.color}" aria-hidden="true"></span>${escape(t.title)}${progress.read.includes(t.id) ? icon('check') : ''}</a>`).join('')}<a class="syllabus-link" href="#materialy/18">Čo ešte je v rozsahu? ${icon('external')}</a></nav><article class="notes-paper"><div class="lesson-heading"><span class="topic-mark ${topic.color}" aria-hidden="true">${topic.mark}</span><div><h2>${escape(topic.title)}</h2><p>${escape(topic.description)}</p></div></div><div class="lesson-actions"><a class="button secondary small" href="#karty/${topic.id}">${icon('flip')} Karty k téme</a><a class="text-link" href="#kviz/${topic.id}">Precvičiť tému ${icon('arrow')}</a></div><div class="lesson-outline">${topic.sections.map((s, i) => `<button data-scroll="part-${i}">${escape(s.title)}</button>`).join('')}</div>${topic.sections.map(renderSection).join('')}<div class="lesson-finish"><div><h3>${complete ? 'Tému máš označenú ako prečítanú.' : 'Dokončená téma?'}</h3><p>Označenie je tvoja vlastná pomôcka, nie výsledok skúšky.</p></div><button class="button ${complete ? 'secondary' : 'primary'}" data-complete="${topic.id}" aria-pressed="${complete}">${icon('check')} ${complete ? 'Zrušiť označenie' : 'Označiť ako prečítané'}</button><a class="text-link" href="#karty/${topic.id}">Prejsť na flashkarty ${icon('arrow')}</a></div></article></div>`;
  }
  function makeDeck() {
    state.deck = shuffle(cards.filter(c => (state.cardTopic === 'all' || c.topic === state.cardTopic) && (!state.onlyUnknown || !progress.known.includes(c.id)))).map(c => c.id);
    state.cardIndex = 0;
    state.flipped = false;
  }
  function cardToolbar() {
    return `<div class="learning-toolbar"><div class="field"><label for="card-topic">Vyber si tému</label><select id="card-topic">${topicOptions(state.cardTopic)}</select></div><label class="filter-check"><input type="checkbox" id="unknown-only"${state.onlyUnknown ? ' checked' : ''}>Iba tie, ktoré ešte neviem</label><button class="button secondary small shuffle-button" id="shuffle-deck">${icon('shuffle')} Premiešať</button></div>`;
  }
  function renderCards() {
    const card = cards.find(c => c.id === state.deck[state.cardIndex]);
    const finished = state.deck.length && state.cardIndex >= state.deck.length;
    let body;
    if (!state.deck.length) body = empty('V tejto sade nie sú ďalšie karty.', state.onlyUnknown ? 'Všetky karty tejto témy už máš označené ako zvládnuté. Môžeš si ich prejsť znova.' : 'Vyber inú tému a skús to znova.', '<button class="button primary" id="show-all-cards">Zobraziť všetky karty</button>');
    else if (finished) {
      const known = state.deck.filter(id => progress.known.includes(id)).length;
      body = `<div class="session-finished"><span class="success-seal">${icon('check')}</span><h2>Sada je za tebou.</h2><p>Prešiel si ${state.deck.length} kariet. Z nich máš ${known} označených ako zvládnuté.</p><div class="finish-actions">${known < state.deck.length ? '<button class="button primary" id="repeat-unknown">Zopakovať nezvládnuté</button>' : ''}<button class="button secondary" id="repeat-deck">Prejsť sadu znova ${icon('flip')}</button></div><a class="text-link" href="#kviz${state.cardTopic === 'all' ? '' : '/' + state.cardTopic}">Overiť si učivo v kvíze ${icon('arrow')}</a></div>`;
    } else {
      const topic = getTopic(card.topic);
      body = `<div class="card-session"><div class="session-meta"><span>${escape(topic.title)}</span><span>Karta <strong>${state.cardIndex + 1}</strong> / ${state.deck.length}</span></div><progress class="session-progress" value="${state.cardIndex}" max="${state.deck.length}" aria-label="Postup v sade kariet"></progress><button class="flashcard${state.flipped ? ' revealed' : ''}" id="flip-card" aria-expanded="${state.flipped}" aria-label="${escape(state.flipped ? 'Odpoveď: ' + card.back + ' Kliknutím sa vrátiš na otázku.' : 'Otázka: ' + card.front + ' Kliknutím zobrazíš odpoveď.')}"><span class="flashcard-face-label">${state.flipped ? 'Odpoveď' : 'Otázka'} ${icon('flip')}</span><span class="flashcard-content">${escape(state.flipped ? card.back : card.front)}</span><span class="flashcard-hint">${state.flipped ? 'Ako dobre si si odpoveď vybavil?' : 'Skús si odpovedať. Potom kartu otoč.'}</span></button><div class="card-source">${sourceLink(card.source)}<span>${progress.known.includes(card.id) ? 'Už označená ako zvládnutá' : 'Vlastné hodnotenie po otočení karty'}</span></div><div class="card-rating"><button class="button secondary" id="rate-again"${state.flipped ? '' : ' disabled'}>${icon('flip')} Ešte zopakovať <kbd>1</kbd></button><button class="button primary" id="rate-known"${state.flipped ? '' : ' disabled'}>${icon('check')} Toto už viem <kbd>2</kbd></button></div><div class="card-controls"><button class="text-button" id="previous-card"${state.cardIndex ? '' : ' disabled'}>${icon('back')} Predošlá karta</button><span><kbd>Medzerník</kbd> otočí kartu</span></div></div>`;
    }
    return `${heading('Flashkarty', 'Otoč kartu a označ, či si odpoveď vedel.', `<span class="quiet-badge">${progress.known.length} / ${cards.length} zvládnutých</span>`)}${cardToolbar()}${body}`;
  }
  function startQuiz(onlyWrong = false) {
    const selected = onlyWrong && state.quiz ? state.quiz.items.filter((_, i) => !state.quiz.answers[i]?.correct).map(item => item.question) : shuffle(questions.filter(q => state.quizTopic === 'all' || q.topic === state.quizTopic)).slice(0, state.quizSize);
    state.quiz = { items: selected.map(question => ({ question, choices: shuffle(question.options.map((label, index) => ({ label, index }))) })), index: 0, answers: [], done: false, recorded: false };
    renderCurrent();
    $('#question-title')?.focus();
  }
  function renderQuiz() {
    const quiz = state.quiz;
    if (!quiz) return `${heading('Precvičovanie', 'Vyber si tému a počet otázok. Po odpovedi sa zobrazí vysvetlenie.')}<div class="quiz-setup"><div class="quiz-setup-main"><span class="setup-symbol">${icon('check')}</span><h2>Zostaviť kvíz</h2><p>Otázky vychádzajú z dodaných podkladov. Nesprávne odpovede si môžeš na konci zopakovať.</p><div class="setup-fields"><div class="field"><label for="quiz-topic">Z čoho sa chceš vyskúšať?</label><select id="quiz-topic">${topicOptions(state.quizTopic)}</select></div><div class="field"><label for="quiz-size">Počet otázok</label><select id="quiz-size"><option value="5"${state.quizSize === 5 ? ' selected' : ''}>5 otázok</option><option value="10"${state.quizSize === 10 ? ' selected' : ''}>10 otázok</option><option value="20"${state.quizSize === 20 ? ' selected' : ''}>20 otázok</option></select></div></div><p class="small-copy" id="quiz-availability">V tejto sade je ${questions.filter(q => state.quizTopic === 'all' || q.topic === state.quizTopic).length} otázok. Ak ich vyberieš viac, použijú sa všetky dostupné.</p><button class="button primary" id="start-quiz">Začať precvičovanie ${icon('arrow')}</button></div><aside class="quiz-rules"><h3>Ako funguje kvíz</h3><div><strong>Jedna odpoveď</strong><p>Každá zaradená otázka má jednu správnu možnosť.</p></div><div><strong>Vysvetlenie hneď</strong><p>Správnu odpoveď sa dozvieš až po svojej voľbe.</p></div><div><strong>Zdroj poruke</strong><p>Kedykoľvek sa vrátiš k pôvodnému podkladu.</p></div><p class="quiz-source-note">Nejednoznačné úlohy a sporný vyplnený kľúč sa automaticky nehodnotia.</p></aside></div>`;
    if (quiz.done) {
      const correct = quiz.answers.filter(a => a.correct).length;
      const wrong = quiz.items.filter((_, i) => !quiz.answers[i]?.correct);
      const weak = [...new Set(wrong.map(item => item.question.topic))];
      return `${heading('Výsledok kvízu', 'Odpovede, vysvetlenia a otázky na zopakovanie.')}<div class="quiz-summary"><div class="result-score"><span>Správne odpovede</span><strong>${correct}<span> / ${quiz.items.length}</span></strong><h2>${wrong.length ? 'Už vieš, čo si ešte prejsť.' : 'Túto sadu máš zvládnutú.'}</h2><p>${wrong.length ? 'Zopakuj nesprávne odpovede alebo sa vráť k poznámkam.' : 'Všetky odpovede boli správne. Môžeš skúsiť novú sadu alebo inú tému.'}</p><div class="finish-actions">${wrong.length ? '<button class="button primary" id="retry-wrong">Zopakovať iba chyby</button>' : ''}<button class="button secondary" id="new-quiz">Nový kvíz ${icon('arrow')}</button></div></div>${weak.length ? `<div class="weak-topics"><h3>Vráť sa k týmto témam</h3>${weak.map(id => `<a href="#poznamky/${id}">${escape(getTopic(id).title)} ${icon('arrow')}</a>`).join('')}</div>` : ''}<div class="answer-review"><h3>Tvoje odpovede</h3>${quiz.items.map((item, i) => `<details><summary>${icon(quiz.answers[i]?.correct ? 'check' : 'cross')}<span>${escape(item.question.prompt)}</span><span class="review-state">${quiz.answers[i]?.correct ? 'Správne' : 'Zopakovať'}</span></summary><p><strong>Tvoja odpoveď:</strong> ${escape(item.question.options[quiz.answers[i]?.selected] || '')}</p><p><strong>Správna odpoveď:</strong> ${escape(item.question.options[item.question.answer])}</p><p>${escape(item.question.explanation)}</p>${sourceLink(item.question.source)}</details>`).join('')}</div></div>`;
    }
    const item = quiz.items[quiz.index];
    if (!item) return empty('Nie sú dostupné otázky.', 'Vyber inú tému.', '<button class="button primary" id="new-quiz">Späť na výber</button>');
    const question = item.question;
    const answer = quiz.answers[quiz.index];
    return `${heading('Precvičovanie', escape(getTopic(question.topic).title), '<button class="text-button" id="leave-quiz">Ukončiť túto sadu</button>')}<div class="quiz-session"><div class="session-meta"><span>Precvičovanie</span><span>Otázka <strong>${quiz.index + 1}</strong> / ${quiz.items.length}</span></div><progress class="session-progress" value="${quiz.index + (answer ? 1 : 0)}" max="${quiz.items.length}" aria-label="Postup v kvíze"></progress>${question.context ? `<div class="question-context"><strong>Najprv si prečítaj ukážku</strong><p>${escape(question.context)}</p>${sourceLink(question.source)}</div>` : ''}<h2 id="question-title" tabindex="-1">${escape(question.prompt)}</h2><div class="answer-options">${item.choices.map((choice, index) => `<button class="answer-option${answer ? choice.index === question.answer ? ' correct' : choice.index === answer.selected ? ' incorrect' : '' : ''}" data-answer="${choice.index}"${answer ? ' disabled' : ''} aria-pressed="${Boolean(answer && answer.selected === choice.index)}"><span class="option-letter">${'ABCD'[index]}</span><span>${escape(choice.label)}</span>${answer && choice.index === question.answer ? icon('check') : answer && choice.index === answer.selected ? icon('cross') : ''}</button>`).join('')}</div>${answer ? `<div class="quiz-feedback ${answer.correct ? 'positive' : 'negative'}" role="status"><strong>${icon(answer.correct ? 'check' : 'info')}${answer.correct ? 'Správne.' : 'Nesprávne.'}</strong>${!answer.correct ? `<p>Správna odpoveď: <strong>${escape(question.options[question.answer])}</strong></p>` : ''}<p>${escape(question.explanation)}</p>${sourceLink(question.source)}</div><div class="quiz-next"><button class="button primary" id="next-question">${quiz.index === quiz.items.length - 1 ? 'Pozrieť výsledok' : 'Ďalšia otázka'} ${icon('arrow')}</button></div>` : '<p class="question-hint">Vyber jednu odpoveď. Hneď potom uvidíš vysvetlenie.</p>'}</div>`;
  }
  function renderMaterials() {
    const selectedId = Number(location.hash.split('/')[1]);
    const filtered = sources.filter(source => normalize(source.title).includes(normalize(state.sourceSearch)));
    return `${heading('Tvoje materiály. Na jednom mieste.', 'Všetkých 30 súborov z dodaného ZIPu, pôvodný text aj originály.')}<section class="scope-panel"><div><h2>Čo v učive ešte chýba?</h2><p>Rozsah písomky uvádza aj tieto témy. ZIP k nim neobsahuje ucelený výklad, preto si ho nevymýšľame.</p></div><ul>${missing.map(item => `<li>${escape(item)}</li>`).join('')}</ul>${sourceLink(18)}</section><div class="materials-toolbar"><label for="source-search">Nájsť pôvodný súbor</label><input type="search" id="source-search" placeholder="Názov materiálu…" value="${escape(state.sourceSearch)}"><span>${filtered.length} / ${sources.length} súborov</span></div><div class="source-list">${filtered.length ? filtered.map(source => `<details class="source-item" id="source-${source.id}"${source.id === selectedId ? ' open' : ''}><summary><span class="file-type">${source.type}</span><span class="source-name"><strong>${escape(source.title)}</strong><span>Zdroj ${source.id}${source.id === 10 ? ' · kópia zdroja 8' : source.id === 24 ? ' · kópia pracovného listu 23' : ''}</span></span>${icon('arrow')}</summary><div class="source-body">${source.warning ? `<div class="note-callout">${icon('info')}<p>${escape(source.warning)}</p></div>` : ''}<a class="button secondary small original-link" href="${source.file}" target="_blank" rel="noopener"${['DOC','DOCX','PPTX'].includes(source.type) ? ` download="${escape(source.title.toLowerCase().endsWith('.' + source.type.toLowerCase()) ? source.title : source.title + '.' + source.type.toLowerCase())}"` : ''}>${icon('external')} ${['DOC','DOCX','PPTX'].includes(source.type) ? 'Stiahnuť originál' : 'Otvoriť originál'}</a>${source.text ? `<details class="original-text"><summary>Prečítať pôvodný text</summary><pre>${escape(source.text)}</pre></details>` : '<p class="small-copy">Tento podklad je obrázkový. Pozri si náhľad alebo otvor originál.</p>'}${source.images.map(image => `<figure class="source-image"><button data-image="${image.path}" data-alt="${escape(image.alt)}" aria-label="Zväčšiť: ${escape(image.alt)}"><img src="${image.path}" alt="${escape(image.alt)}" loading="lazy" decoding="async"></button></figure>`).join('')}</div></details>`).join('') : empty('Súbor s týmto názvom sme nenašli.', 'Skús kratší výraz alebo vymaž filter.')} </div>`;
  }
  function renderCurrent(focus = false) {
    const renderers = { prehlad: renderHome, poznamky: renderNotes, karty: renderCards, kviz: renderQuiz, materialy: renderMaterials };
    $('#main').innerHTML = (renderers[state.view] || renderHome)();
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (link.dataset.nav === state.view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = `${{ prehlad: 'Prehľad', poznamky: 'Poznámky', karty: 'Flashkarty', kviz: 'Precvičovanie', materialy: 'Materiály' }[state.view]} — Slovenčina`;
    updateProgress();
    if (focus) $('#page-title')?.focus({ preventScroll: true });
    const selected = state.view === 'materialy' && $('#source-' + Number(location.hash.split('/')[1]));
    if (selected) selected.scrollIntoView({ block: 'start' });
  }
  function route() {
    const [view, parameter] = location.hash.slice(1).split('/');
    state.view = ['prehlad','poznamky','karty','kviz','materialy'].includes(view) ? view : 'prehlad';
    if (state.view !== 'poznamky') clearSearch(false);
    if (state.view === 'materialy' && parameter) state.sourceSearch = '';
    if (state.view === 'poznamky' && topics.some(t => t.id === parameter)) { state.topic = parameter; clearSearch(false); }
    if (state.view === 'karty') {
      if (topics.some(t => t.id === parameter)) state.cardTopic = parameter;
      else if (parameter === 'all') state.cardTopic = 'all';
      makeDeck();
    }
    if (state.view === 'kviz' && topics.some(t => t.id === parameter)) { state.quizTopic = parameter; state.quiz = null; }
    renderCurrent(true);
    if (state.view !== 'materialy' || !parameter) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function clearSearch(render = true) {
    state.search = '';
    $('#global-search').value = '';
    $('#clear-search').hidden = true;
    if (render) renderCurrent();
  }
  function flipCard() {
    if (!state.deck[state.cardIndex]) return;
    state.flipped = !state.flipped;
    renderCurrent();
    $('#flip-card')?.focus({ preventScroll: true });
  }
  function rateCard(known) {
    if (!state.flipped) return;
    const id = state.deck[state.cardIndex];
    if (!id) return;
    progress.known = progress.known.filter(value => value !== id);
    if (known) progress.known.push(id);
    persist();
    state.cardIndex++;
    state.flipped = false;
    renderCurrent();
    $('#flip-card')?.focus({ preventScroll: true });
    announce(state.cardIndex < state.deck.length ? `Karta ${state.cardIndex + 1} z ${state.deck.length}` : 'Sada kariet dokončená.');
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button, a');
    if (!target) return;
    if (target.dataset.clearSearch !== undefined) clearSearch();
    if (target.dataset.scroll) { document.getElementById(target.dataset.scroll)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); return; }
    if (target.dataset.closeDialog) { document.getElementById(target.dataset.closeDialog).close(); return; }
    if (target.dataset.image) {
      $('#image-viewer').src = target.dataset.image;
      $('#image-viewer').alt = target.dataset.alt;
      $('#image-dialog').showModal();
      return;
    }
    if (target.dataset.complete) {
      const id = target.dataset.complete;
      progress.read = progress.read.includes(id) ? progress.read.filter(value => value !== id) : [...progress.read, id];
      persist(); renderCurrent();
      $(`[data-complete="${id}"]`)?.focus({ preventScroll: true });
      notify(progress.read.includes(id) ? 'Téma je označená ako prečítaná.' : 'Označenie prečítania je zrušené.');
      return;
    }
    if (target.dataset.answer !== undefined) {
      const quiz = state.quiz;
      if (!quiz || quiz.done || quiz.answers[quiz.index]) return;
      const selected = Number(target.dataset.answer);
      const question = quiz.items[quiz.index].question;
      if (!Number.isInteger(selected) || !question.options[selected]) return;
      quiz.answers[quiz.index] = { id: question.id, selected, correct: selected === question.answer };
      renderCurrent();
      announce((selected === question.answer ? 'Správne. ' : 'Správna odpoveď: ' + question.options[question.answer] + '. ') + question.explanation);
      $('#next-question')?.focus({ preventScroll: true });
      return;
    }
    switch (target.id) {
      case 'clear-search': clearSearch(); $('#global-search').focus(); break;
      case 'open-settings':
      case 'open-settings-mobile': $('#storage-consent').checked = consent === true; $('#storage-error').hidden = !storageError; $('#storage-error').textContent = storageError; $('#settings-dialog').showModal(); break;
      case 'accept-storage': chooseStorage(true); break;
      case 'decline-storage': chooseStorage(false); break;
      case 'reset-progress':
        if (confirm('Vymazať prečítané témy, zvládnuté karty a výsledky kvízov? Táto zmena sa nedá vrátiť.')) {
          try { localStorage.removeItem('sjl-progress-v1'); progress = cleanProgress(null, { topics, cards }); makeDeck(); state.quiz = null; renderCurrent(); notify('Pokrok je vymazaný. Môžeš začať odznova.'); }
          catch (_) { storageError = 'Prehliadač nepovolil vymazanie uloženého pokroku.'; $('#storage-error').hidden = false; $('#storage-error').textContent = storageError; }
        } break;
      case 'flip-card': flipCard(); break;
      case 'rate-again': rateCard(false); break;
      case 'rate-known': rateCard(true); break;
      case 'previous-card': if (state.cardIndex > 0) { state.cardIndex--; state.flipped = false; renderCurrent(); $('#flip-card')?.focus(); } break;
      case 'shuffle-deck': makeDeck(); renderCurrent(); announce('Karty sú premiešané.'); break;
      case 'show-all-cards': state.onlyUnknown = false; makeDeck(); renderCurrent(); break;
      case 'repeat-deck': state.onlyUnknown = false; makeDeck(); renderCurrent(); break;
      case 'repeat-unknown': state.onlyUnknown = true; makeDeck(); renderCurrent(); break;
      case 'start-quiz': startQuiz(); break;
      case 'retry-wrong': startQuiz(true); break;
      case 'new-quiz': state.quiz = null; renderCurrent(); $('#page-title')?.focus(); break;
      case 'leave-quiz': if (confirm('Ukončiť rozpracovanú sadu? Jej nedokončený výsledok sa neuloží.')) { state.quiz = null; renderCurrent(); } break;
      case 'next-question': {
        const quiz = state.quiz;
        if (!quiz || !quiz.answers[quiz.index]) break;
        if (quiz.index + 1 >= quiz.items.length) {
          quiz.done = true;
          if (!quiz.recorded) { progress.results.push({ correct: quiz.answers.filter(a => a.correct).length, total: quiz.items.length }); progress.results = progress.results.slice(-20); persist(); quiz.recorded = true; }
        } else quiz.index++;
        renderCurrent();
        ($('#question-title') || $('#page-title'))?.focus({ preventScroll: true });
        break;
      }
    }
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (target.id === 'card-topic') { state.cardTopic = target.value; makeDeck(); renderCurrent(); $('#card-topic').focus(); }
    if (target.id === 'unknown-only') { state.onlyUnknown = target.checked; makeDeck(); renderCurrent(); $('#unknown-only').focus(); }
    if (target.id === 'quiz-topic') { state.quizTopic = target.value; renderCurrent(); $('#quiz-topic').focus(); }
    if (target.id === 'quiz-size') state.quizSize = Number(target.value);
  });
  $('#storage-form').addEventListener('submit', event => { event.preventDefault(); chooseStorage($('#storage-consent').checked); if (!storageError) $('#settings-dialog').close(); else { $('#storage-error').hidden = false; $('#storage-error').textContent = storageError; } });
  $('#global-search').addEventListener('input', event => {
    state.search = event.target.value;
    $('#clear-search').hidden = !state.search;
    if (state.view !== 'poznamky') { state.view = 'poznamky'; history.replaceState(null, '', '#poznamky'); }
    renderCurrent();
  });
  document.addEventListener('input', event => {
    if (event.target.id !== 'source-search') return;
    const position = event.target.selectionStart;
    state.sourceSearch = event.target.value;
    history.replaceState(null, '', '#materialy');
    renderCurrent();
    const input = $('#source-search'); input.focus();
    if (position !== null) { try { input.setSelectionRange(position, position); } catch (_) {} }
  });
  document.addEventListener('keydown', event => {
    if (state.view !== 'karty' || event.ctrlKey || event.metaKey || event.altKey || $('dialog[open]') || event.target.closest('input, select, textarea')) return;
    if (event.code === 'Space' && (event.target === document.body || event.target.id === 'flip-card')) { event.preventDefault(); flipCard(); }
    if (event.target.id === 'flip-card' && state.flipped) {
      if (event.key === '1') { event.preventDefault(); rateCard(false); }
      if (event.key === '2') { event.preventDefault(); rateCard(true); }
    }
  });
  for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  window.addEventListener('hashchange', route);
  makeDeck();
  route();
  $('#consent-banner').hidden = consent !== null;
  if (storageError) notify(storageError);
})();
