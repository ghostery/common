/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';
import prefs from '../core/prefs';

/**
 * Returns true if the given string contains any text that looks
 * like an email address. The check is conservative, that means
 * false positives are expected, but false negatives are not.
 */
function checkForEmail(str) {
  return /[a-z0-9\-_@]+(@|%40|%(25)+40)[a-z0-9\-_]+\.[a-z0-9\-_]/i.test(str);
}

function checkForLongNumber(str, maxNumberLength) {
  const cstr = str.replace(/[^A-Za-z0-9]/g, '');

  let lcn = 0;
  let maxlcn = 0;
  let maxlcnpos = null;

  for (let i = 0; i < cstr.length; i += 1) {
    if (cstr[i] >= '0' && cstr[i] <= '9') {
      lcn += 1;
    } else if (lcn > maxlcn) {
      maxlcn = lcn;
      maxlcnpos = i;
      lcn = 0;
    } else {
      lcn = 0;
    }
  }

  if (lcn > maxlcn) {
    maxlcn = lcn;
    maxlcnpos = cstr.length;
    lcn = 0;
  } else {
    lcn = 0;
  }

  if (maxlcnpos != null && maxlcn > maxNumberLength) {
    return cstr.slice(maxlcnpos - maxlcn, maxlcnpos);
  }
  return null;
}

function isSuspiciousQueryStub(query) {
  logger.info('[STUB] isSuspiciousQuery is not fully ported.');

  // Remove the msg if the query is too long,
  if (query.length > 50) {
    return true;
  }

  if (query.split(' ').length > 7) {
    return true;
  }

  // Remove the msg if the query contains a number longer than 7 digits
  // can be 666666 but also things like (090)90-2, 5555 3235
  // note that full dates will be removed 2014/12/12
  const haslongnumber = checkForLongNumber(query, 7) !== null;
  if (haslongnumber) {
    return true;
  }

  // Remove if email (exact), even if not totally well formed
  if (checkForEmail(query)) {
    return true;
  }

  // Remove if query looks like an http password
  if (/[^:]+:[^@]+@/.test(query)) {
    return true;
  }

  const v = query.split(' ');
  for (let i = 0; i < v.length; i += 1) {
    if (v[i].length > 20) {
      return true;
    }
    if (/[^:]+:[^@]+@/.test(v[i])) {
      return true;
    }
  }

  return false;
}

function tryParseUrl(url) {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
}

function checkForInternalIp(hostname) {
  // TODO: this could be extended to detect more cases
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * There should be no reason for these URLs to show up, but if they do
 * we should never send them to the backend. Especially, "moz-extension"
 * is problematic, as it includes an id that is unique per user and
 * can be used to link messages.
 */
function urlLeaksExtensionId(url) {
  return url.startsWith('moz-extension://') || url.startsWith('chrome-extension://');
}

/**
 * Sanity checks to protect against accidentially sending sensitive URLs.
 *
 * There are three possible outcomes:
 * 1) "safe": URL can be accepted as is
 * 2) "truncated": URL may have sensitive parts but can be truncated
 *    (use includ the hostname but remove the rest)
 * 3) "dropped": URL is corrupted or unsafe
 *
 * Expections: this function should be seen as an additional layer of defence,
 * but do not expect it to detect all situation. Instead, make sure to extract
 * only URLs where the context is safe. Otherwise, you are expecting too
 * much from this static classifier.
 *
 * When changing new rules here, it is OK to be conservative. Since
 * classification error are expected, rather err on the side of
 * dropping (or truncating) too much.
 */
export function sanitizeUrl(url) {
  const accept = () => ({ result: 'safe', safeUrl: url });
  const drop = reason => ({ result: 'dropped', safeUrl: null, reason });

  // first run some sanity check on the structure of the URL
  const parsedUrl = tryParseUrl(url);
  if (!parsedUrl) {
    return drop('invalid URL');
  }
  if (parsedUrl.username) {
    return drop('URL sets username');
  }
  if (parsedUrl.password) {
    return drop('URL sets password');
  }
  if (parsedUrl.port && (parsedUrl.port !== '80' && parsedUrl.port !== '443')) {
    return drop('URL has uncommon port');
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return drop('URL has uncommon protocol');
  }
  if (checkForInternalIp(parsedUrl.hostname)) {
    return drop('URL is not public');
  }
  if (urlLeaksExtensionId(url)) {
    return drop('URL leaks extension ID');
  }

  try {
    // At this point, the most problematic URLs should be gone;
    // now we can also decide to truncated by limiting it to the hostname.
    //
    // Often, that is a good compromise, as it still provides value
    // but the risk that it contains sensitive information is limited.
    // Note that even on https, the hostname will be shared in plaintext,
    // so it is less likely that sites include secrets or personal
    // identifiers in the hostname.
    const truncate = (reason) => {
      const safeUrl = `${parsedUrl.protocol}://${parsedUrl.hostname}/ (PROTECTED)`;
      logger.debug('sanitizeUrl truncated URL:', url, '->', safeUrl);
      return {
        result: 'truncated',
        safeUrl,
        reason,
      };
    };

    // TODO: these rules could use some polishing
    if (url.hostname > 50) {
      return drop('hostname too long');
    }
    if (url.length > 200) {
      return truncate('url too long');
    }

    const decodedUrl = decodeURIComponent(url);
    if (checkForEmail(url) || checkForEmail(decodedUrl)) {
      return truncate('potential email found');
    }

    // TODO: check each path and query parameter and truncate if there
    // are fields that could be tokens, secrets, names or logins.

    return accept();
  } catch (e) {
    logger.warn(`Unexpected error in sanitizeUrl. Skipping url=${url}`, e);
    return drop('Unexpected error');
  }
}

/**
 * Set of heuristics to prevent accidentally leaking sensitive data.
 *
 * It is a hard problem to classify sensititive from non-sensitive data.
 * If you look at the risk of false positives (non-sensitive data being dropped)
 * versus fast negatives (sensitive data being sent out), the risks are very clear.
 *
 * Leaking sensitive data is far more dangerous then dropping harmless messages
 * for multiple reasons. Because of that, we should always thrive for being
 * rather too conservative than being to open when it comes to the heuristics.
 *
 * In other words, because of the non-symmetric risks, it is unavoidable that
 * you will find many harmless examples that will be rejected by the rules.
 */
export default class Sanitizer {
  constructor(config) {
    this.allowedCountryCodes = config.ALLOWED_COUNTRY_CODES;
    if (!this.allowedCountryCodes) {
      throw new Error('config.ALLOWED_COUNTRY_CODES not set');
    }
  }

  isSuspiciousQuery(query) {
    function accept() {
      return {
        accept: true,
      };
    }

    function discard(reason) {
      logger.debug('isSuspiciousQuery rejected query:', query, ', reason:', reason);
      return {
        accept: false,
        reason,
      };
    }

    // TODO: port full Human Web rules
    if (isSuspiciousQueryStub(query)) {
      return discard('failed one of the heuristics in isSuspiciousQueryStub');
    }

    return accept();
  }

  maskURL(url) {
    if (sanitizeUrl(url)) {
      return url;
    }
    return null;
  }

  /**
   * As long as there are enough other users, revealing the country
   * will not compromise anonymity. Only if the user base is too low
   * (e.g., Liechtenstein), we have to be careful. In that case,
   * do not reveal the country, otherwise fingerprinting attacks
   * could be possible.
   *
   * As the expected number of users varies between products,
   * the information needs to be provided by the config.
   */
  getSafeCountryCode() {
    const ctry = prefs.get('config_location', null);
    return this.allowedCountryCodes.includes(ctry) ? ctry : '--';
  }
}
