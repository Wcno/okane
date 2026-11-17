/**
 * Okane public API (/api/v1) from Google Apps Script.
 *
 * Setup: in Project Settings > Script properties add
 *   OKANE_URL   the address of your Okane, without a trailing slash
 *   OKANE_TOKEN a personal token from Settings > Integrations
 * The token never appears in the code or in the spreadsheet.
 *
 * Contract: docs/contratos.md and GET {OKANE_URL}/api/v1/openapi.json.
 */

var MAX_ATTEMPTS = 3;

function property_(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('Missing script property ' + name);
  return value;
}

function request_(method, path, options) {
  var headers = { Authorization: 'Bearer ' + property_('OKANE_TOKEN') };
  var fetchOptions = { method: method, headers: headers, muteHttpExceptions: true };
  if (options && options.key) headers['Idempotency-Key'] = options.key;
  if (options && options.body) {
    fetchOptions.contentType = 'application/json';
    fetchOptions.payload = JSON.stringify(options.body);
  }
  return UrlFetchApp.fetch(property_('OKANE_URL') + path, fetchOptions);
}

/** Reads a page of Movements; `query` is a string such as "?type=expense&page_size=20". */
function listMovements(query) {
  var response = request_('get', '/api/v1/movements' + (query || ''));
  if (response.getResponseCode() !== 200) {
    throw new Error('Okane answered ' + response.getResponseCode() + ': ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

/**
 * Creates one Movement, such as
 *   { type: 'expense', account_id: 1, category_id: 2, amount: '12.50', description: 'Lunch' }
 * The same operation always sends the same Idempotency-Key: when the answer is lost
 * or Okane is busy, the retry cannot create a second record. Pass your own `key`
 * (for example the id of a spreadsheet row) to also survive a rerun of the script.
 * Returns the record: 201 the first time, 200 when the key was already used.
 */
function createMovement(movement, key) {
  var idempotencyKey = key || Utilities.getUuid();
  for (var attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    var response = null;
    try {
      response = request_('post', '/api/v1/movements', { body: movement, key: idempotencyKey });
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
    }
    if (response) {
      var status = response.getResponseCode();
      if (status === 200 || status === 201) return JSON.parse(response.getContentText());
      var retryable = status === 429 || status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) {
        throw new Error('Okane answered ' + status + ': ' + response.getContentText());
      }
      var wait = Number(response.getHeaders()['Retry-After']) || attempt;
      Utilities.sleep(Math.min(wait, 30) * 1000);
    } else {
      Utilities.sleep(attempt * 1000);
    }
  }
}
