import { decodeBase64 } from './decode-strings';

export default class Base64Decoder {
    constructor() {
        this.decoder = new TextDecoder();

        this.maxChunkSize = 100 * 1024;

        this.chunks = [];

        this.remainder = '';
    }

    update(buffer) {
        let str = this.decoder.decode(buffer);

        if (/[^a-zA-Z0-9+/]/.test(str)) {
            str = str.replace(/[^a-zA-Z0-9+/]+/g, '');
        }

        this.remainder += str;

        if (this.remainder.length >= this.maxChunkSize) {
            let allowedBytes = Math.floor(this.remainder.length / 4) * 4;
            let base64Str;

            if (allowedBytes === this.remainder.length) {
                base64Str = this.remainder;
                this.remainder = '';
            } else {
                base64Str = this.remainder.substr(0, allowedBytes);
                this.remainder = this.remainder.substr(allowedBytes);
            }

            if (base64Str.length) {
                this.chunks.push(decodeBase64(base64Str));
            }
        }
    }

    finalize() {
        if (this.remainder && !/^=+$/.test(this.remainder)) {
            this.chunks.push(decodeBase64(this.remainder));
        }

        return this.chunks;
    }
}
