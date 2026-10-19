(function (root) {
  'use strict';
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function cleanProgress(value, catalog) {
    const data = value && typeof value === 'object' ? value : {};
    const validIds = (input, items) => Array.isArray(input) ? [...new Set(input.filter(id => items.some(item => item.id === id)))] : [];
    const results = Array.isArray(data.results) ? data.results.filter(item => item && Number.isInteger(item.correct) && Number.isInteger(item.total) && item.total > 0 && item.total <= 100 && item.correct >= 0 && item.correct <= item.total).slice(-20).map(({ correct, total }) => ({ correct, total })) : [];
    return { read: validIds(data.read, catalog.topics), known: validIds(data.known, catalog.cards), results };
  }
  const api = { normalize, shuffle, cleanProgress };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StudyCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
