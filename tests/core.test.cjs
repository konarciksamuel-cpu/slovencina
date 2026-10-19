const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const core = fs.existsSync(path.join(root, 'core.js')) ? require('../core.js') : {};

test('vyhľadávanie ignoruje slovenskú diakritiku, veľkosť a nadbytočné medzery', () => {
  assert.equal(typeof core.normalize, 'function');
  assert.equal(core.normalize('  PRÍSUDOK   a prívlastok '), 'prisudok a privlastok');
});

test('poškodený alebo cudzí uložený pokrok neovplyvní nové učenie', () => {
  assert.equal(typeof core.cleanProgress, 'function');
  const catalog = { topics: [{ id: 'syntax' }], cards: [{ id: 's1' }] };
  assert.deepEqual(core.cleanProgress(null, catalog), { read: [], known: [], results: [] });
  assert.deepEqual(core.cleanProgress({ read: ['syntax', 'bad', 'syntax'], known: ['s1', 4, 'bad'], results: [{ correct: 2, total: 1 }, { correct: 1, total: 2 }, null] }, catalog), { read: ['syntax'], known: ['s1'], results: [{ correct: 1, total: 2 }] });
});

test('miešanie zachová všetky karty a nemení zdrojové pole', () => {
  assert.equal(typeof core.shuffle, 'function');
  const source = ['a', 'b', 'c', 'd'];
  for (let i = 0; i < 20; i++) {
    const result = core.shuffle(source);
    assert.deepEqual([...result].sort(), source);
    assert.deepEqual(source, ['a', 'b', 'c', 'd']);
    assert.notEqual(result, source);
  }
});

test('každá karta a jednoznačná kvízová otázka majú platnú tému aj pôvodný zdroj', () => {
  assert.ok(fs.existsSync(path.join(root, 'content.js')), 'učebný obsah ešte neexistuje');
  const context = { window: {} };
  vm.createContext(context);
  for (const file of ['sources.js', 'content.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  const { topics, cards, questions } = context.window.STUDY_CONTENT;
  const sources = context.window.STUDY_SOURCES;
  for (const source of sources) {
    const bytes = fs.readFileSync(path.join(root, source.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256, source.title);
    for (const image of source.images) {
      assert.ok(fs.existsSync(path.join(root, image.path)), image.path);
      assert.ok(image.alt.length > 25 && !/obrázok \d/.test(image.alt), image.path);
    }
  }
  const ids = new Set();
  assert.equal(sources.length, 30);
  assert.equal(topics.length, 7);
  assert.ok(cards.length >= 60);
  assert.ok(questions.length >= 40);
  for (const item of [...cards, ...questions]) {
    assert.ok(!ids.has(item.id), `duplicitné ID ${item.id}`);
    ids.add(item.id);
    assert.ok(topics.some(t => t.id === item.topic), item.id);
    assert.ok(sources.some(s => s.id === item.source), item.id);
    if (item.options) {
      assert.equal(new Set(item.options).size, item.options.length, item.id);
      assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length, item.id);
      assert.ok(item.explanation.length > 15, item.id);
    } else assert.ok(item.front && item.back, item.id);
  }
  for (const topic of topics) {
    assert.ok(cards.some(c => c.topic === topic.id));
    assert.ok(questions.some(q => q.topic === topic.id));
    for (const section of topic.sections) assert.ok(sources.some(s => s.id === section.source));
  }
});
