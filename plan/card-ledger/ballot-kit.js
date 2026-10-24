/*
  ballot-kit.js: the shared ballot kit (phases BV1b, BV2b).

  A classic script, so a ballot opened straight from disk still runs it. A
  ballot page loads it with one tag and mounts it once its cards are rendered:

    <script src="ballot-kit.js"></script>
    ...
    BallotKit.mount({ ballotId: BALLOT_ID, sheet, onChange: refresh });

  The page owns its cards and its Generate text (`sheet`); the kit owns the
  rest of the footer:
    - autosave: every tick, slot note and the general note is kept on the
      device (localStorage `ballot:<ballotId>:draft`, stamped `savedAt`) on
      each change, and a reload restores it;
    - load from the save: when the device holds the API URL and token, the
      newest row for the ballot (a Save or a Submit) is fetched and applied
      when it is newer than the device's draft;
    - Clear (with a confirm) empties the draft;
    - Generate and Copy, which need no network;
    - Save, which posts the ballot unfinished as a `draft` row, and Submit,
      which posts the verdict as a `final` row, to the miserere-api Worker.
      Whichever runs first asks for the API URL and the token and keeps them
      on the device (localStorage `ballot:api`, shared by every ballot). The
      token is never in a file, a URL or a query string.

  DOM the kit reads: `.pick` checkboxes (value = candidate id), `[data-note]`
  inputs (value of the attribute = slot id), `#general`, `#gen`, `#copy` and
  `#out`. It adds the Save, Submit and Clear buttons and a status line after Copy.

  The pure parts (draft serialise and restore, payload build, error to words,
  post and fetch with an injected fetch, the newer-wins choice, the load
  words) carry no DOM and are tested in Node by
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

  /** The draft as stored: kept ids, the non-blank notes, the general note, when it was saved. */
  function serialiseDraft(draft) {
    var stored = {
      v: 1,
      kept: (draft.kept || []).slice(),
      notes: cleanNotes(draft.notes),
      general: String(draft.general || ''),
    };
    if (typeof draft.savedAt === 'string' && draft.savedAt) stored.savedAt = draft.savedAt;
    return JSON.stringify(stored);
  }

  /**
   * A stored draft back to `{ kept, notes, general, savedAt }`, or null when
   * absent or unreadable. A draft from before BV2b has no stamp: `savedAt` null.
   */
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
      savedAt: typeof raw.savedAt === 'string' && !isNaN(Date.parse(raw.savedAt)) ? raw.savedAt : null,
    };
  }

  /** A stored row from the Worker as a draft the page can apply, stamped with its `receivedAt`. */
  function rowToDraft(row) {
    var notes = {};
    if (row.notes && typeof row.notes === 'object') {
      Object.keys(row.notes).forEach(function (slot) {
        if (typeof row.notes[slot] === 'string') notes[slot] = row.notes[slot];
      });
    }
    return {
      kept: Array.isArray(row.kept) ? row.kept.filter(function (id) { return typeof id === 'string'; }) : [],
      notes: notes,
      general: typeof row.general === 'string' ? row.general : '',
      savedAt: row.receivedAt,
    };
  }

  /**
   * Newest wins: true when the online row should replace the device's draft,
   * that is when there is a row and it was received after the draft was saved.
   * No draft, or a draft with no stamp, counts as older.
   */
  function rowIsNewer(row, draft) {
    if (!row || isNaN(Date.parse(row.receivedAt))) return false;
    if (!draft || !draft.savedAt) return true;
    return Date.parse(row.receivedAt) > Date.parse(draft.savedAt);
  }

  /** An ISO time as `2026-10-23 10:00 UTC`, the same on every device. */
  function formatTime(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return String(iso);
    return new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }

  /** The status line once a row from the Worker is applied. */
  function loadedWords(row) {
    var when = formatTime(row.receivedAt);
    return row.status === 'draft'
      ? 'Loaded your save from ' + when + ' (not submitted).'
      : 'Loaded your submitted verdict from ' + when + '.';
  }

  /** The status line after a successful Save. */
  function savedWords(result) {
    return 'Saved, not submitted: #' + result.id + ' at ' + formatTime(result.receivedAt) + '.';
  }

  /**
   * The status line when the online save was not loaded. `failure` is null
   * when the device has no API URL and token yet, or a fetch result's words.
   */
  function loadFailedWords(hasDraft, failure) {
    var lead = hasDraft ? 'Draft restored from this device. ' : '';
    if (!failure) {
      return lead + 'The online save could not be reached: this device has no API token yet, so Save or Submit asks for it.';
    }
    return lead + 'The online save could not be reached. ' + failure.words;
  }

  /** The body `POST /v1/ballot-verdicts` takes; `status` is `draft` for a Save, `final` (the default) for a Submit. */
  function buildPayload(input) {
    var general = String(input.general || '').trim();
    return {
      ballotId: input.ballotId,
      verdictText: input.verdictText,
      kept: (input.kept || []).slice(),
      notes: cleanNotes(input.notes),
      general: general || null,
      client: input.client ? String(input.client).slice(0, 500) : null,
      status: input.status === 'draft' ? 'draft' : 'final',
    };
  }

  /** `https://host/` or `host` to `https://host`, or null when it is not a URL. */
  function normaliseApiUrl(text) {
    var s = String(text || '').trim().replace(/\/+$/, '');
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    return /^https?:\/\/[^\s/?#]+$/i.test(s) ? s : null;
  }

  /** What each action posts or reads, as the error words name it. */
  var ACTION_NOUNS = { submit: 'verdict', save: 'save', load: 'request' };

  /**
   * A failed Submit, Save or load in words. `failure` is `{ offline: true }`
   * when the request never got an answer, or `{ status, body }` when the
   * Worker refused it. `action` is `submit` (the default), `save` or `load`.
   */
  function errorWords(failure, action) {
    var noun = ACTION_NOUNS[action] || ACTION_NOUNS.submit;
    var keep = ' Your draft is kept on this device.';
    if (!failure || failure.offline) {
      return 'Could not reach the server: you may be offline, or the Worker does not allow this page\'s address.' + keep;
    }
    var status = failure.status;
    var body = failure.body || {};
    if (status === 401) {
      return 'The server refused the token (401). The saved token was forgotten; press Save or Submit to type it again.' + keep;
    }
    if (status === 400) {
      var reasons = Array.isArray(body.reasons) && body.reasons.length ? ': ' + body.reasons.join('; ') : '';
      return 'The server rejected the ' + noun + ' (400)' + reasons + '.' + keep;
    }
    if (status === 413) {
      return 'The ' + noun + ' is too large for the server (413): shorten the notes and ' + (action === 'save' ? 'save' : 'submit') + ' again.' + keep;
    }
    return 'The server answered ' + status + (body.error ? ' (' + body.error + ')' : '') + '.' + keep;
  }

  /**
   * One request to the Worker. Resolves `{ ok: true, status, body }` on the
   * expected status, or `{ ok: false, status, words }` (status 0 when the
   * request never landed).
   */
  function call(fetchFn, url, init, expected, action) {
    var request;
    try {
      request = fetchFn(url, init);
    } catch (e) {
      return Promise.resolve({ ok: false, status: 0, words: errorWords({ offline: true }, action) });
    }
    return Promise.resolve(request).then(function (res) {
      return res.text().then(function (text) {
        var body = {};
        try { body = text ? JSON.parse(text) : {}; } catch (e) { body = {}; }
        if (res.status === expected) return { ok: true, status: res.status, body: body };
        return { ok: false, status: res.status, words: errorWords({ status: res.status, body: body }, action) };
      });
    }, function () {
      return { ok: false, status: 0, words: errorWords({ offline: true }, action) };
    });
  }

  /**
   * Posts one row: a Submit, or a Save when the payload's status is `draft`.
   * Resolves `{ ok: true, id, receivedAt }`, or `{ ok: false, status, words }`.
   */
  function submitVerdict(fetchFn, api, payload) {
    var action = payload && payload.status === 'draft' ? 'save' : 'submit';
    return call(fetchFn, api.url + VERDICTS_PATH, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + api.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 201, action).then(function (result) {
      if (!result.ok) return result;
      return { ok: true, id: result.body.id, receivedAt: result.body.receivedAt };
    });
  }

  /**
   * The newest row of either status for one ballot. Resolves `{ ok: true, row }`
   * (`row` null when the ballot has none), or `{ ok: false, status, words }`.
   */
  function fetchNewest(fetchFn, api, ballotId) {
    return call(fetchFn, api.url + VERDICTS_PATH + '?ballot=' + encodeURIComponent(ballotId), {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + api.token },
    }, 200, 'load').then(function (result) {
      if (!result.ok) return result;
      var rows = Array.isArray(result.body.ballotVerdicts) ? result.body.ballotVerdicts : [];
      return { ok: true, row: rows.length ? rows[0] : null };
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

    var saveButton = button(doc, 'save', 'Save');
    var submit = button(doc, 'submit', 'Submit');
    var clear = button(doc, 'clear', 'Clear');
    var status = doc.getElementById('status');
    if (!status) {
      status = doc.createElement('p');
      status.id = 'status';
      status.setAttribute('role', 'status');
      status.className = 'count';
    }
    if (!saveButton.parentNode) copy.insertAdjacentElement('afterend', saveButton);
    if (!submit.parentNode) saveButton.insertAdjacentElement('afterend', submit);
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

    /** Keeps the on-screen ballot on the device, stamped now unless `savedAt` is given. */
    var autosave = function (savedAt) {
      if (!store) return;
      var state = read();
      state.savedAt = typeof savedAt === 'string' ? savedAt : new Date().toISOString();
      try { store.setItem(key, serialiseDraft(state)); }
      catch (e) { say('This browser would not save the draft: keep the page open until you submit.'); }
    };
    var localDraft = function () { return store ? restoreDraft(store.getItem(key)) : null; };

    var apply = function (draft) {
      picks().forEach(function (p) { p.checked = draft.kept.indexOf(p.value) !== -1; });
      noteInputs().forEach(function (n) { n.value = draft.notes[n.dataset.note] || ''; });
      general.value = draft.general;
      onChange();
    };

    var draft = localDraft();
    if (draft) {
      apply(draft);
      say('Draft restored from this device.');
    } else if (!store) {
      say('This browser will not save drafts: keep the page open until you submit.');
    }

    // Load from the save: the device's draft is on screen already; the newest
    // online row replaces it only when it is newer. The draft is read again
    // when the answer lands, so a tick made while the fetch was out wins.
    var api = readApi(store);
    if (!api) {
      if (store) say(loadFailedWords(!!draft, null));
    } else if (typeof root.fetch === 'function') {
      say((draft ? 'Draft restored from this device. ' : '') + 'Checking the online save...');
      fetchNewest(root.fetch.bind(root), api, ballotId).then(function (result) {
        var now = localDraft();
        if (!result.ok) {
          if (result.status === 401 && store) store.removeItem(API_KEY);
          say(loadFailedWords(!!now, result));
          return;
        }
        if (rowIsNewer(result.row, now)) {
          apply(rowToDraft(result.row));
          autosave(result.row.receivedAt);
          say(loadedWords(result.row));
        } else {
          say(now ? 'Draft restored from this device; it is newer than the online save.' : 'No save yet for this ballot.');
        }
      });
    }

    doc.addEventListener('change', function () { autosave(); });
    doc.addEventListener('input', function () { autosave(); });

    doc.getElementById('gen').addEventListener('click', function () {
      out.value = sheet();
    });

    copy.addEventListener('click', function () {
      if (!out.value) out.value = sheet();
      var fallback = function () { out.select(); if (doc.execCommand) doc.execCommand('copy'); };
      if (root.navigator && root.navigator.clipboard) root.navigator.clipboard.writeText(out.value).catch(fallback);
      else fallback();
    });

    // Clear keeps an empty draft stamped now rather than none, so a reload
    // does not bring back an older online save the player just cleared.
    clear.addEventListener('click', function () {
      if (!root.confirm('Clear every tick and note on this ballot? This cannot be undone.')) return;
      apply({ kept: [], notes: {}, general: '' });
      autosave();
      out.value = '';
      say('Draft cleared.');
    });

    /** Posts the on-screen ballot as a `draft` (Save) or `final` (Submit) row. */
    var post = function (rowStatus) {
      var label = rowStatus === 'draft' ? 'Save' : 'Submit';
      var api = askApi(store);
      if (!api) { say(label + ' needs the API URL and the token. Your draft is kept on this device.'); return; }
      var text = sheet();
      if (rowStatus === 'final') out.value = text;
      var state = read();
      var payload = buildPayload({
        ballotId: ballotId,
        verdictText: text,
        kept: state.kept,
        notes: state.notes,
        general: state.general,
        client: root.navigator ? root.navigator.userAgent : null,
        status: rowStatus,
      });
      saveButton.disabled = true;
      submit.disabled = true;
      say(rowStatus === 'draft' ? 'Saving...' : 'Submitting...');
      submitVerdict(root.fetch.bind(root), api, payload).then(function (result) {
        saveButton.disabled = false;
        submit.disabled = false;
        if (result.ok) {
          say(rowStatus === 'draft'
            ? savedWords(result)
            : 'Submitted: verdict #' + result.id + ' stored at ' + result.receivedAt + '. The draft stays on this device until you Clear it.');
          return;
        }
        if (result.status === 401 && store) store.removeItem(API_KEY);
        say(result.words);
      });
    };

    saveButton.addEventListener('click', function () { post('draft'); });
    submit.addEventListener('click', function () { post('final'); });
  }

  root.BallotKit = {
    API_KEY: API_KEY,
    DEFAULT_API_URL: DEFAULT_API_URL,
    VERDICTS_PATH: VERDICTS_PATH,
    draftKey: draftKey,
    serialiseDraft: serialiseDraft,
    restoreDraft: restoreDraft,
    rowToDraft: rowToDraft,
    rowIsNewer: rowIsNewer,
    formatTime: formatTime,
    loadedWords: loadedWords,
    savedWords: savedWords,
    loadFailedWords: loadFailedWords,
    buildPayload: buildPayload,
    normaliseApiUrl: normaliseApiUrl,
    errorWords: errorWords,
    submitVerdict: submitVerdict,
    fetchNewest: fetchNewest,
    mount: mount,
  };
})(typeof window !== 'undefined' ? window : globalThis);
