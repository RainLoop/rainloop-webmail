export default class QPDecoder {
    constructor(opts) {
        opts = opts || {};

        this.decoder = opts.decoder || new TextDecoder();

        this.maxChunkSize = 100 * 1024;

        this.remainder = '';

        this.chunks = [];
    }

    decodeQPBytes(encodedBytes) {
        let buf = new ArrayBuffer(encodedBytes.length);
        let dataView = new DataView(buf);
        for (let i = 0, len = encodedBytes.length; i < len; i++) {
            dataView.setUint8(i, parseInt(encodedBytes[i], 16));
        }
        return buf;
    }

    decodeChunks(str) {
        // unwrap newlines
        str = str.replace(/=\r?\n/g, '');

        let list = str.split(/(?==)/);
        let encodedBytes = [];
        for (let part of list) {
            if (part.charAt(0) !== '=') {
                if (encodedBytes.length) {
                    this.chunks.push(this.decodeQPBytes(encodedBytes));
                    encodedBytes = [];
                }
                this.chunks.push(part);
                continue;
            }

            if (part.length === 3) {
                encodedBytes.push(part.substr(1));
                continue;
            }

            if (part.length > 3) {
                encodedBytes.push(part.substr(1, 2));
                this.chunks.push(this.decodeQPBytes(encodedBytes));
                encodedBytes = [];

                part = part.substr(3);
                this.chunks.push(part);
            }
        }
        if (encodedBytes.length) {
            this.chunks.push(this.decodeQPBytes(encodedBytes));
            encodedBytes = [];
        }
    }

    update(buffer) {
        // expect full lines, so add line terminator as well
        let str = this.decoder.decode(buffer) + '\n';

        str = this.remainder + str;

        if (str.length < this.maxChunkSize) {
            this.remainder = str;
            return;
        }

        this.remainder = '';

        let partialEnding = str.match(/=[a-fA-F0-9]?$/);
        if (partialEnding) {
            if (partialEnding.index === 0) {
                this.remainder = str;
                return;
            }
            this.remainder = str.substr(partialEnding.index);
            str = str.substr(0, partialEnding.index);
        }

        this.decodeChunks(str);
    }

    finalize() {
        if (this.remainder.length) {
            this.decodeChunks(this.remainder);
            this.remainder = '';
        }

        return this.chunks;
    }
}
