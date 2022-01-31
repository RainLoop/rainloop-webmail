export const textEncoder = new TextEncoder();

const decoders = new Map();

const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Use a lookup table to find the index.
const base64Lookup = new Uint8Array(256);
for (var i = 0; i < base64Chars.length; i++) {
    base64Lookup[base64Chars.charCodeAt(i)] = i;
}

export function decodeBase64(base64) {
    let bufferLength = Math.ceil(base64.length / 4) * 3;
    const len = base64.length;

    let p = 0;

    if (base64.length % 4 === 3) {
        bufferLength--;
    } else if (base64.length % 4 === 2) {
        bufferLength -= 2;
    } else if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') {
            bufferLength--;
        }
    }

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const bytes = new Uint8Array(arrayBuffer);

    for (let i = 0; i < len; i += 4) {
        let encoded1 = base64Lookup[base64.charCodeAt(i)];
        let encoded2 = base64Lookup[base64.charCodeAt(i + 1)];
        let encoded3 = base64Lookup[base64.charCodeAt(i + 2)];
        let encoded4 = base64Lookup[base64.charCodeAt(i + 3)];

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arrayBuffer;
}

export function getDecoder(charset) {
    charset = charset || 'utf8';
    if (decoders.has(charset)) {
        return decoders.get(charset);
    }
    let decoder;
    try {
        decoder = new TextDecoder(charset);
    } catch (err) {
        if (charset === 'utf8') {
            // is this even possible?
            throw err;
        }
        // use default
        return getDecoder();
    }

    decoders.set(charset, decoder);
    return decoder;
}

/**
 * Converts a Blob into an ArrayBuffer
 * @param {Blob} blob Blob to convert
 * @returns {ArrayBuffer} Converted value
 */
export async function blobToArrayBuffer(blob) {
    if ('arrayBuffer' in blob) {
        return await blob.arrayBuffer();
    }

    const fr = new FileReader();

    return new Promise((resolve, reject) => {
        fr.onload = function (e) {
            resolve(e.target.result);
        };

        fr.onerror = function (e) {
            reject(fr.error);
        };

        fr.readAsArrayBuffer(blob);
    });
}

export function getHex(c) {
    if ((c >= 0x30 /* 0 */ && c <= 0x39) /* 9 */ || (c >= 0x61 /* a */ && c <= 0x66) /* f */ || (c >= 0x41 /* A */ && c <= 0x46) /* F */) {
        return String.fromCharCode(c);
    }
    return false;
}

/**
 * Decode a complete mime word encoded string
 *
 * @param {String} str Mime word encoded string
 * @return {String} Decoded unicode string
 */
export function decodeWord(charset, encoding, str) {
    // RFC2231 added language tag to the encoding
    // see: https://tools.ietf.org/html/rfc2231#section-5
    // this implementation silently ignores this tag
    let splitPos = charset.indexOf('*');
    if (splitPos >= 0) {
        charset = charset.substr(0, splitPos);
    }

    encoding = encoding.toUpperCase();

    let byteStr;

    if (encoding === 'Q') {
        str = str
            // remove spaces between = and hex char, this might indicate invalidly applied line splitting
            .replace(/=\s+([0-9a-fA-F])/g, '=$1')
            // convert all underscores to spaces
            .replace(/[_\s]/g, ' ');

        let buf = textEncoder.encode(str);
        let encodedBytes = [];
        for (let i = 0, len = buf.length; i < len; i++) {
            let c = buf[i];
            if (i <= len - 2 && c === 0x3d /* = */) {
                let c1 = getHex(buf[i + 1]);
                let c2 = getHex(buf[i + 2]);
                if (c1 && c2) {
                    let c = parseInt(c1 + c2, 16);
                    encodedBytes.push(c);
                    i += 2;
                    continue;
                }
            }
            encodedBytes.push(c);
        }
        byteStr = new ArrayBuffer(encodedBytes.length);
        let dataView = new DataView(byteStr);
        for (let i = 0, len = encodedBytes.length; i < len; i++) {
            dataView.setUint8(i, encodedBytes[i]);
        }
    } else if (encoding === 'B') {
        byteStr = decodeBase64(str.replace(/[^a-zA-Z0-9\+\/=]+/g, ''));
    } else {
        // keep as is, convert ArrayBuffer to unicode string, assume utf8
        byteStr = textEncoder.encode(str);
    }

    return getDecoder(charset).decode(byteStr);
}

export function decodeWords(str) {
    return (
        (str || '')
            .toString()
            // find base64 words that can be joined
            .replace(/(=\?([^?]+)\?[Bb]\?[^?]*\?=)\s*(?==\?([^?]+)\?[Bb]\?[^?]*\?=)/g, (match, left, chLeft, chRight) => {
                // only mark b64 chunks to be joined if charsets match
                if (chLeft === chRight) {
                    // set a joiner marker
                    return left + '__\x00JOIN\x00__';
                }
                return match;
            })
            // find QP words that can be joined
            .replace(/(=\?([^?]+)\?[Qq]\?[^?]*\?=)\s*(?==\?([^?]+)\?[Qq]\?[^?]*\?=)/g, (match, left, chLeft, chRight) => {
                // only mark QP chunks to be joined if charsets match
                if (chLeft === chRight) {
                    // set a joiner marker
                    return left + '__\x00JOIN\x00__';
                }
                return match;
            })
            // join base64 encoded words
            .replace(/(\?=)?__\x00JOIN\x00__(=\?([^?]+)\?[QqBb]\?)?/g, '')
            // remove spaces between mime encoded words
            .replace(/(=\?[^?]+\?[QqBb]\?[^?]*\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]*\?=)/g, '$1')
            // decode words
            .replace(/=\?([\w_\-*]+)\?([QqBb])\?([^?]*)\?=/g, (m, charset, encoding, text) => decodeWord(charset, encoding, text))
    );
}

export function decodeURIComponentWithCharset(encodedStr, charset) {
    charset = charset || 'utf-8';

    let encodedBytes = [];
    for (let i = 0; i < encodedStr.length; i++) {
        let c = encodedStr.charAt(i);
        if (c === '%' && /^[a-f0-9]{2}/i.test(encodedStr.substr(i + 1, 2))) {
            // encoded sequence
            let byte = encodedStr.substr(i + 1, 2);
            i += 2;
            encodedBytes.push(parseInt(byte, 16));
        } else if (c.charCodeAt(0) > 126) {
            c = textEncoder.encode(c);
            for (let j = 0; j < c.length; j++) {
                encodedBytes.push(c[j]);
            }
        } else {
            // "normal" char
            encodedBytes.push(c.charCodeAt(0));
        }
    }

    const byteStr = new ArrayBuffer(encodedBytes.length);
    const dataView = new DataView(byteStr);
    for (let i = 0, len = encodedBytes.length; i < len; i++) {
        dataView.setUint8(i, encodedBytes[i]);
    }

    return getDecoder(charset).decode(byteStr);
}

export function decodeParameterValueContinuations(header) {
    // handle parameter value continuations
    // https://tools.ietf.org/html/rfc2231#section-3

    // preprocess values
    let paramKeys = new Map();

    Object.keys(header.params).forEach(key => {
        let match = key.match(/\*((\d+)\*?)?$/);
        if (!match) {
            // nothing to do here, does not seem like a continuation param
            return;
        }

        let actualKey = key.substr(0, match.index).toLowerCase();
        let nr = Number(match[2]) || 0;

        let paramVal;
        if (!paramKeys.has(actualKey)) {
            paramVal = {
                charset: false,
                values: []
            };
            paramKeys.set(actualKey, paramVal);
        } else {
            paramVal = paramKeys.get(actualKey);
        }

        let value = header.params[key];
        if (nr === 0 && match[0].charAt(match[0].length - 1) === '*' && (match = value.match(/^([^']*)'[^']*'(.*)$/))) {
            paramVal.charset = match[1] || 'utf-8';
            value = match[2];
        }

        paramVal.values.push({ nr, value });

        // remove the old reference
        delete header.params[key];
    });

    paramKeys.forEach((paramVal, key) => {
        header.params[key] = decodeURIComponentWithCharset(
            paramVal.values
                .sort((a, b) => a.nr - b.nr)
                .map(a => a.value)
                .join(''),
            paramVal.charset
        );
    });
}
