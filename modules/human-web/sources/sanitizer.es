/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';

function isCharNumber(char) {
  const code = char.charCodeAt(0);
  return code >= 48 && code <= 57; // ASCII range for 0-9
}

// precondition: isCharNumber(char) === true
function uncheckedCharToNumber(char) {
  return char.charCodeAt(0) - 48; // 48 == ASCII '0'
}

// https://en.wikipedia.org/wiki/International_Article_Number
// In the US, also known as GTIN or UPTC.
export function isValidEAN13(ean) {
  if (ean.length !== 13 || ![...ean].every(isCharNumber)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const factor = i % 2 === 0 ? 1 : 3;
    sum += factor * uncheckedCharToNumber(ean[i]);
  }
  const checksum = 10 - (sum % 10);
  return checksum === uncheckedCharToNumber(ean[12]);
}

// https://en.wikipedia.org/wiki/International_Standard_Serial_Number
export function isValidISSN(issn_) {
  let issn = issn_;

  if (!/^[0-9]{4}-?[0-9]{3}[0-9xX]$/.test(issn)) {
    return false;
  }
  issn = issn.replace('-', '');

  let checksum = 0;
  for (let i = 0; i < 7; i += 1) {
    checksum += uncheckedCharToNumber(issn[i]) * (8 - i);
  }
  const endsWithX = issn[7] === 'x' || issn[7] === 'X';
  checksum += endsWithX ? 10 : uncheckedCharToNumber(issn[7]);

  return checksum % 11 === 0;
}

/**
 * Returns true if the given string contains any text that looks
 * like an email address. The check is conservative, that means
 * false positives are expected, but false negatives are not.
 */
function checkForEmail(str) {
  return /[a-z0-9\-_@]+(@|%40|%(25)+40)[a-z0-9\-_]+\.[a-z0-9\-_]/i.test(str);
}

/**
 * Intended to filter out potentially problematic numbers.
 * Tries to reduce the number of false-positives by detecting certain common
 * product IDs (EAN, ISSN), which are common in search, but don't have personal
 * information.
 *
 * Otherwise, it discard queries that contain numbers longer than 7 digits.
 * So, 123456 is still allowed, but phone numbers like (090)90-2 or 5555 3235
 * will be dropped.
 *
 * Note:
 * - the current implementation discard anything that contains full dates
 *   (e.g. "2023/05/17", "17.05.2023").
 *  (TODO: perhaps this restriction should be reconsidered to allow a search
 *   like "What happened on 24.12.1914?")
 */
function hasLongNumber(str_) {
  let str = str_;

  // allow one ISSN number
  const issn = str.split(' ').find(isValidISSN);
  if (issn) {
    str = str.replace(issn, ' ');
  }

  const numbers = str
    .replace(/[^A-Za-z0-9]/g, '')
    .replace(/[^0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(num => num.length > 2);
  if (numbers.length === 1) {
    const num = numbers[0];
    if (num.length === 13 && str.includes(num)) {
      const isEAN = isValidEAN13(num);
      return !isEAN;
    }
  }

  return numbers.some(num => num.length > 7);
}

function isLogogramChar(char) {
  const codePoint = char.codePointAt(0);

  // Chinese: Range of Unicode code points for common Chinese characters
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
    return true;
  }

  // Japanese: Range of Unicode code points for Hiragana and Katakana characters
  if (codePoint >= 0x3040 && codePoint <= 0x30ff) {
    return true;
  }

  // Korean: Range of Unicode code points for Hangul syllables
  if (codePoint >= 0xac00 && codePoint <= 0xd7af) {
    return true;
  }

  // Thai: Range of Unicode code points for Thai characters
  if (codePoint >= 0x0e00 && codePoint <= 0x0e7f) {
    return true;
  }

  return false;
}

/**
 * Most languages have an alphabet where a word consist of multiple characters.
 * But other languages (e.g. Chinese) use logograms, where a single character
 * is equivalent to a word. Thus, heuristics need to adjusted if they count the
 * number of characters or words ("words" being defined as characters not
 * separated by whitespace).
 *
 * Note: texts in Arabic or European languages should not trigger this check.
 */
function hasLogograms(str) {
  return [...str].some(isLogogramChar);
}

export function checkSuspiciousQuery(query_) {
  function accept() {
    return {
      accept: true,
    };
  }

  function discard(reason) {
    return {
      accept: false,
      reason,
    };
  }

  // First, normalize white spaces
  //
  // Note: this code doesn't trim but preserves a leading or trailing
  // whitespace. We could trim  (and the expected differences would be minimal).
  // Yet there is little benefit in trimming and it would lose information.
  const query = query_.replace(/\s+/g, ' ');

  // Remove the msg if the query is too long
  if (query.length > 120) {
    return discard('too long (120 character limit)');
  }
  if (query.length > 50 && hasLogograms(query)) {
    return discard('too long (50 characters and logograms are present)');
  }

  const words = query.split(' ');
  if (words.length > 9) {
    if (words.filter(x => x.length >= 4).length > 16) {
      return discard('too many words');
    }
    if (hasLogograms(query)) {
      return discard('too many words (smaller limit but logograms are present');
    }
  }

  if (hasLongNumber(query)) {
    return discard('long number detected');
  }

  // Remove if it contains text that could be an email,
  // even if the email is not well formed
  if (checkForEmail(query)) {
    return discard('looks like an email');
  }

  if (/[^:]+:[^@]+@/.test(query)) {
    return discard('looks like an http password');
  }

  for (let i = 0; i < words.length; i += 1) {
    if (words[i].length > 45) {
      return discard('found long word');
    }

    // Long words are common in some languages (e.g. German)
    if (words[i].length > 20 && !/^[a-zA-ZäöüéÄÖÜ][a-zäöüéß]+$/.test(words[i])) {
      return discard('found long word (smaller limit but uncommon shape)');
    }
  }

  return accept();
}

export function isSuspiciousQuery(query) {
  const { accept, reason } = checkSuspiciousQuery(query);
  if (!accept) {
    logger.debug(`Dropping suspicious query: <<${query}>> (reason: ${reason})`);
    return true;
  }
  return false;
}
