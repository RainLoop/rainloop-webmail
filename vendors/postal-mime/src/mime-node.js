import { getDecoder, decodeParameterValueContinuations, textEncoder, blobToArrayBuffer } from './decode-strings';
import PassThroughDecoder from './pass-through-decoder';
import Base64Decoder from './base64-decoder';
import QPDecoder from './qp-decoder';

export default class MimeNode {
    constructor(opts) {
        opts = opts || {};

        this.postalMime = opts.postalMime;

        this.root = !!opts.parentNode;
        this.childNodes = [];
        if (opts.parentNode) {
            opts.parentNode.childNodes.push(this);
        }

        this.state = 'header';

        this.headerLines = [];
        this.decoders = new Map();

        this.contentType = {
            value: 'text/plain'
        };

        this.contentTransferEncoding = {
            value: '8bit'
        };

        this.contentDisposition = {
            value: ''
        };

        this.headers = [];

        this.contentDecoder = false;
    }

    setupContentDecoder(transferEncoding) {
        if (/base64/i.test(transferEncoding)) {
            this.contentDecoder = new Base64Decoder();
        } else if (/quoted-printable/i.test(transferEncoding)) {
            this.contentDecoder = new QPDecoder({ decoder: getDecoder(this.contentType.parsed.params.charset) });
        } else {
            this.contentDecoder = new PassThroughDecoder();
        }
    }

    async finalize() {
        if (this.state === 'finished') {
            return;
        }

        if (this.state === 'header') {
            this.processHeaders();
        }

        // remove self from boundary listing
        let boundaries = this.postalMime.boundaries;
        for (let i = boundaries.length - 1; i >= 0; i--) {
            let boundary = boundaries[i];
            if (boundary.node === this) {
                boundaries.splice(i, 1);
                break;
            }
        }

        await this.finalizeChildNodes();

        this.content = this.contentDecoder
			? await blobToArrayBuffer(new Blob(this.contentDecoder.finalize(), { type: 'application/octet-stream' }))
			: null;

        this.state = 'finished';
    }

    async finalizeChildNodes() {
        for (let childNode of this.childNodes) {
            await childNode.finalize();
        }
    }

    parseStructuredHeader(str) {
        let response = {
            value: false,
            params: {}
        };

        let key = false;
        let value = '';
        let stage = 'value';

        let quote = false;
        let escaped = false;
        let chr;

        for (let i = 0, len = str.length; i < len; i++) {
            chr = str.charAt(i);
            switch (stage) {
                case 'key':
                    if (chr === '=') {
                        key = value.trim().toLowerCase();
                        stage = 'value';
                        value = '';
                        break;
                    }
                    value += chr;
                    break;
                case 'value':
                    if (escaped) {
                        value += chr;
                    } else if (chr === '\\') {
                        escaped = true;
                        continue;
                    } else if (quote && chr === quote) {
                        quote = false;
                    } else if (!quote && chr === '"') {
                        quote = chr;
                    } else if (!quote && chr === ';') {
                        if (key === false) {
                            response.value = value.trim();
                        } else {
                            response.params[key] = value.trim();
                        }
                        stage = 'key';
                        value = '';
                    } else {
                        value += chr;
                    }
                    escaped = false;
                    break;
            }
        }

        // finalize remainder
        value = value.trim();
        if (stage === 'value') {
            if (key === false) {
                // default value
                response.value = value;
            } else {
                // subkey value
                response.params[key] = value;
            }
        } else if (value) {
            // treat as key without value, see emptykey:
            // Header-Key: somevalue; key=value; emptykey
            response.params[value.toLowerCase()] = '';
        }

        if (response.value) {
            response.value = response.value.toLowerCase();
        }

        // convert Parameter Value Continuations into single strings
        decodeParameterValueContinuations(response);

        return response;
    }

    decodeFlowedText(str, delSp) {
        return (
            str
                .split(/\r?\n/)
                // remove soft linebreaks
                // soft linebreaks are added after space symbols
                .reduce((previousValue, currentValue) => {
                    if (/ $/.test(previousValue) && !/(^|\n)-- $/.test(previousValue)) {
                        if (delSp) {
                            // delsp adds space to text to be able to fold it
                            // these spaces can be removed once the text is unfolded
                            return previousValue.slice(0, -1) + currentValue;
                        } else {
                            return previousValue + currentValue;
                        }
                    } else {
                        return previousValue + '\n' + currentValue;
                    }
                })
                // remove whitespace stuffing
                // http://tools.ietf.org/html/rfc3676#section-4.4
                .replace(/^ /gm, '')
        );
    }

    getTextContent() {
        if (!this.content) {
            return '';
        }

        let str = getDecoder(this.contentType.parsed.params.charset).decode(this.content);

        if (/^flowed$/i.test(this.contentType.parsed.params.format)) {
            str = this.decodeFlowedText(str, /^yes$/i.test(this.contentType.parsed.params.delsp));
        }

        return str;
    }

    processHeaders() {
        for (let i = this.headerLines.length - 1; i >= 0; i--) {
            let line = this.headerLines[i];
            if (i && /^\s/.test(line)) {
                this.headerLines[i - 1] += '\n' + line;
                this.headerLines.splice(i, 1);
            } else {
                // remove folding and extra WS
                line = line.replace(/\s+/g, ' ');
                let sep = line.indexOf(':');
                let key = sep < 0 ? line.trim() : line.substr(0, sep).trim();
                let value = sep < 0 ? '' : line.substr(sep + 1).trim();
                this.headers.push({ key: key.toLowerCase(), originalKey: key, value });

                switch (key.toLowerCase()) {
                    case 'content-type':
                        this.contentType = { value, parsed: {} };
                        break;
                    case 'content-transfer-encoding':
                        this.contentTransferEncoding = { value, parsed: {} };
                        break;
                    case 'content-disposition':
                        this.contentDisposition = { value, parsed: {} };
                        break;
                    case 'content-id':
                        this.contentId = value;
                        break;
                }
            }
        }

        this.contentType.parsed = this.parseStructuredHeader(this.contentType.value);
        this.contentType.multipart = /^multipart\//i.test(this.contentType.parsed.value)
            ? this.contentType.parsed.value.substr(this.contentType.parsed.value.indexOf('/') + 1)
            : false;

        if (this.contentType.multipart && this.contentType.parsed.params.boundary) {
            // add self to boundary terminator listing
            this.postalMime.boundaries.push({
                value: textEncoder.encode(this.contentType.parsed.params.boundary),
                node: this
            });
        }

        this.contentDisposition.parsed = this.parseStructuredHeader(this.contentDisposition.value);

        this.contentTransferEncoding.encoding = this.contentTransferEncoding.value
            .toLowerCase()
            .split(/[^\w-]/)
            .shift();

        this.setupContentDecoder(this.contentTransferEncoding.encoding);
    }

    feed(line) {
        switch (this.state) {
            case 'header':
                if (!line.length) {
                    this.state = 'body';
                    return this.processHeaders();
                }
                this.headerLines.push(getDecoder().decode(line));
                break;
            case 'body': {
                // add line to body
                this.contentDecoder.update(line);
            }
        }
    }
}
