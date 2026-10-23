/*
  ballot-kit.js: the shared ballot kit (phase BV1b).

  A classic script, so a ballot opened straight from disk still runs it. A
  ballot page loads it with one tag and mounts it once its cards are rendered:

    <script src="ballot-kit.js"></script>
    ...
    BallotKit.mount({ ballotId: BALLOT_ID, sheet, onChange: refresh });

  The page owns its cards and its Generate text (`sheet`); the kit owns the
  rest of the footer:
    - autosave: every tick, slot note and the general note is kept on the
      device (localStorage `ballot:<ballotId>:draft`) on each change, and a
      reload restores it;
    - Clear (with a confirm) empties the draft;
    - Generate and Copy, which need no network;
    - Submit, which posts the verdict to the miserere-api Worker. The first
      Submit asks for the API URL and the token and keeps them on the device
      (localStorage `ballot:api`, shared by every ballot). The token is never
      in a file, a URL or a query string.

  DOM the kit reads: `.pick` checkboxes (value = candidate id), `[data-note]`
  inputs (value of the attribute = slot id), `#general`, `#gen`, `#copy` and
  `#out`. It adds the Submit and Clear buttons and a status line after Copy.

  The pure parts (draft serialise and restore, payload build, error to words,
  submit with an injected fetch) carry no DOM and are tested in Node by
  `scripts/ballot-kit.test.mjs`.
*/
(function (root) {
  'use strict';

  var API_KEY = 'ballot:api';
  var DEFAULT_API_URL = 'https://miserere-api.no-trbl-2-u.workers.dev';
  var VERDICTS_PATH = '/v1/ballot-verdicts';

  /** The localStorage key one ballot's draft lives under. */
  function draftKey(ballotId) {
    return 'ballot:' + ballotId + ':draft';
  }

  /** Slot notes with the blank ones dropped and the rest trimmed. */
  function cleanNotes(notes) {
    var out = {};
    Object.keys(notes || {}).forEach(function (slot) {
      var text = String(notes[slot] == null ? '' : notes[slot]).trim();
      if (text) out[slot] = text;
    });
    return out;
  }

  /** The draft as stored: kept ids, the non-blank notes, the general note. */
  function serialiseDraft(draft) {
    return JSON.stringify({
      v: 1,
      kept: (draft.kept || []).slice(),
      notes: cleanNotes(draft.notes),
      general: String(draft.general || ''),
    });
  }

  /** A stored draft back to `{ kept, notes, general }`, or null when absent or unreadable. */
  function restoreDraft(text) {
    if (typeof text !== 'string' || text === '') return null;
    var raw;
    try { raw = JSON.parse(text); } catch (e) { return null; }
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
    var notes = {};
    if (raw.notes && typeof raw.notes === 'object') {
      Object.keys(raw.notes).forEach(function (slot) {
        if (typeof raw.notes[slot] === 'string') notes[slot] = raw.notes[slot];
      });
    }
    return {
      kept: Array.isArray(raw.kept) ? raw.kept.filter(function (id) { return typeof id === 'string'; }) : [],
      notes: notes,
      general: typeof raw.general === 'string' ? raw.general : '',
    };
  }

  /** The body `POST /v1/ballot-verdicts` takes. */
  function buildPayload(input) {
    var general = String(input.general || '').trim();
    return {
      ballotId: input.ballotId,
      verdictText: input.verdictText,
      kept: (input.kept || []).slice(),
      notes: cleanNotes(input.notes),
      general: general || null,
      client: input.client ? String(input.client).slice(0, 500) : null,
    };
  }

  /** `https://host/` or `host` to `https://host`, or null when it is not a URL. */
  function normaliseApiUrl(text) {
    var s = String(text || '').trim().replace(/\/+$/, '');
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    return /^https?:\/\/[^\s/?#]+$/i.test(s) ? s : null;
  }

  /**
   * A failed Submit in words. `failure` is `{ offline: true }` when the request
   * never got an answer, or `{ status, body }` when the Worker refused it.
   */
  function errorWords(failure) {
    var keep = ' Your draft is kept on this device.';
    if (!failure || failure.offline) {
      return 'Could not reach the server: you may be offline, or the Worker does not allow this page\'s address.' + keep;
    }
    var status = failure.status;
    var body = failure.body || {};
    if (status === 401) {
      return 'The server refused the token (401). The saved token was forgotten; press Submit to type it again.' + keep;
    }
    if (status === 400) {
      var reasons = Array.isArray(body.reasons) && body.reasons.length ? ': ' + body.reasons.join('; ') : '';
      return 'The server rejected the verdict (400)' + reasons + '.' + keep;
    }
    if (status === 413) {
      return 'The verdict is too large for the server (413): shorten the notes and submit again.' + keep;
    }
    return 'The server answered ' + status + (body.error ? ' (' + body.error + ')' : '') + '.' + keep;
  }

  /**
   * Posts one verdict. Resolves `{ ok: true, id, receivedAt }`, or
   * `{ ok: false, status, words }` (status 0 when the request never landed).
   */
  function submitVerdict(fetchFn, api, payload) {
    var request;
    try {
      request = fetchFn(api.url + VERDICTS_PATH, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + api.token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return Promise.resolve({ ok: false, status: 0, words: errorWords({ offline: true }) });
    }
    return Promise.resolve(request).then(function (res) {
      return res.text().then(function (text) {
        var body = {};
        try { body = text ? JSON.parse(text) : {}; } catch (e) { body = {}; }
        if (res.status === 201) return { ok: true, id: body.id, receivedAt: body.receivedAt };
        return { ok: false, status: res.status, words: errorWords({ status: res.status, body: body }) };
      });
    }, function () {
      return { ok: false, status: 0, words: errorWords({ offline: true }) };
    });
  }

  /* ---------------------------------------------------------------------
     The page wiring. Everything below touches the DOM and localStorage.
     --------------------------------------------------------------------- */

  /** localStorage, or null where the browser refuses it. */
  function storage() {
    try {
      var s = root.localStorage;
      var probe = 'ballot:probe';
      s.setItem(probe, '1');
      s.removeItem(probe);
      return s;
    } catch (e) {
      return null;
    }
  }

  function readApi(store) {
    if (!store) return null;
    try {
      var raw = JSON.parse(store.getItem(API_KEY) || 'null');
      if (raw && typeof raw.url === 'string' && typeof raw.token === 'string' && raw.token) return raw;
    } catch (e) { /* unreadable: ask again */ }
    return null;
  }

  /** The API URL and token: the saved pair, or asked for (and saved) now. */
  function askApi(store) {
    var saved = readApi(store);
    if (saved) return saved;
    var url = normaliseApiUrl(root.prompt('The ballot API URL:', DEFAULT_API_URL));
    if (!url) return null;
    var token = String(root.prompt('The API token (kept on this device only):', '') || '').trim();
    if (!token) return null;
    var api = { url: url, token: token };
    if (store) store.setItem(API_KEY, JSON.stringify(api));
    return api;
  }

  function button(doc, id, label) {
    var b = doc.getElementById(id);
    if (b) return b;
    b = doc.createElement('button');
    b.type = 'button';
    b.id = id;
    b.textContent = label;
    return b;
  }

  function mount(opts) {
    var doc = root.document;
    var ballotId = opts.ballotId;
    var sheet = opts.sheet;
    var onChange = opts.onChange || function () {};
    var store = storage();
    var key = draftKey(ballotId);
    var out = doc.getElementById('out');
    var general = doc.getElementById('general');
    var copy = doc.getElementById('copy');

    var submit = button(doc, 'submit', 'Submit');
    var clear = button(doc, 'clear', 'Clear');
    var status = doc.getElementById('status');
    if (!status) {
      status = doc.createElement('p');
      status.id = 'status';
      status.setAttribute('role', 'status');
      status.className = 'count';
    }
    if (!submit.parentNode) copy.insertAdjacentElement('afterend', submit);
    if (!clear.parentNode) submit.insertAdjacentElement('afterend', clear);
    if (!status.parentNode) out.insertAdjacentElement('beforebegin', status);

    var say = function (text) { status.textContent = text; };

    var picks = function () { return Array.prototype.slice.call(doc.querySelectorAll('.pick')); };
    var noteInputs = function () { return Array.prototype.slice.call(doc.querySelectorAll('[data-note]')); };

    var read = function () {
      var notes = {};
      noteInputs().forEach(function (n) { notes[n.dataset.note] = n.value; });
      return {
        kept: picks().filter(function (p) { return p.checked; }).map(function (p) { return p.value; }),
        notes: notes,
        general: general.value,
      };
    };

    var save = function () {
      if (!store) return;
      try { store.setItem(key, serialiseDraft(read())); }
      catch (e) { say('This browser would not save the draft: keep the page open until you submit.'); }
    };

    var apply = function (draft) {
      picks().forEach(function (p) { p.checked = draft.kept.indexOf(p.value) !== -1; });
      noteInputs().forEach(function (n) { n.value = draft.notes[n.dataset.note] || ''; });
      general.value = draft.general;
      onChange();
    };

    var draft = store ? restoreDraft(store.getItem(key)) : null;
    if (draft) {
      apply(draft);
      say('Draft restored from this device.');
    } else if (!store) {
      say('This browser will not save drafts: keep the page open until you submit.');
    }

    doc.addEventListener('change', save);
    doc.addEventListener('input', save);

    doc.getElementById('gen').addEventListener('click', function () {
      out.value = sheet();
    });

    copy.addEventListener('click', function () {
      if (!out.value) out.value = sheet();
      var fallback = function () { out.select(); if (doc.execCommand) doc.execCommand('copy'); };
      if (root.navigator && root.navigator.clipboard) root.navigator.clipboard.writeText(out.value).catch(fallback);
      else fallback();
    });

    clear.addEventListener('click', function () {
      if (!root.confirm('Clear every tick and note on this ballot? This cannot be undone.')) return;
      if (store) store.removeItem(key);
      apply({ kept: [], notes: {}, general: '' });
      out.value = '';
      say('Draft cleared.');
    });

    submit.addEventListener('click', function () {
      var api = askApi(store);
      if (!api) { say('Submit needs the API URL and the token. Your draft is kept on this device.'); return; }
      var text = sheet();
      out.value = text;
      var state = read();
      var payload = buildPayload({
        ballotId: ballotId,
        verdictText: text,
        kept: state.kept,
        notes: state.notes,
        general: state.general,
        client: root.navigator ? root.navigator.userAgent : null,
      });
      submit.disabled = true;
      say('Submitting...');
      submitVerdict(root.fetch.bind(root), api, payload).then(function (result) {
        submit.disabled = false;
        if (result.ok) {
          say('Submitted: verdict #' + result.id + ' stored at ' + result.receivedAt + '. The draft stays on this device until you Clear it.');
          return;
        }
        if (result.status === 401 && store) store.removeItem(API_KEY);
        say(result.words);
      });
    });
  }

  root.BallotKit = {
    API_KEY: API_KEY,
    DEFAULT_API_URL: DEFAULT_API_URL,
    VERDICTS_PATH: VERDICTS_PATH,
    draftKey: draftKey,
    serialiseDraft: serialiseDraft,
    restoreDraft: restoreDraft,
    buildPayload: buildPayload,
    normaliseApiUrl: normaliseApiUrl,
    errorWords: errorWords,
    submitVerdict: submitVerdict,
    mount: mount,
  };
})(typeof window !== 'undefined' ? window : globalThis);
