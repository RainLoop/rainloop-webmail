import MimeNode from './mime-node';
import { textToHtml, htmlToText, formatTextHeader, formatHtmlHeader } from './text-format';
//import addressParser from './address-parser';
import { decodeWords, textEncoder, blobToArrayBuffer } from './decode-strings';

export default class PostalMime {
    constructor() {
        this.root = this.currentNode = new MimeNode({
            postalMime: this
        });
        this.boundaries = [];

        this.textContent = {};
        this.attachments = [];

        this.started = false;
    }

    async finalize() {
        // close all pending nodes
        await this.root.finalize();
    }

    async processLine(line, isFinal) {
        let boundaries = this.boundaries;

        // check if this is a mime boundary
        if (boundaries.length && line.length > 2 && line[0] === 0x2d && line[1] === 0x2d) {
            // could be a boundary marker
            for (let i = boundaries.length - 1; i >= 0; i--) {
                let boundary = boundaries[i];

                if (line.length !== boundary.value.length + 2 && line.length !== boundary.value.length + 4) {
                    continue;
                }

                let isTerminator = line.length === boundary.value.length + 4;

                if (isTerminator && (line[line.length - 2] !== 0x2d || line[line.length - 1] !== 0x2d)) {
                    continue;
                }

                let boudaryMatches = true;
                for (let i = 0; i < boundary.value.length; i++) {
                    if (line[i + 2] !== boundary.value[i]) {
                        boudaryMatches = false;
                        break;
                    }
                }
                if (!boudaryMatches) {
                    continue;
                }

                if (isTerminator) {
                    await boundary.node.finalize();

                    this.currentNode = boundary.node.parentNode || this.root;
                } else {
                    // finalize any open child nodes (should be just one though)
                    await boundary.node.finalizeChildNodes();

                    this.currentNode = new MimeNode({
                        postalMime: this,
                        parentNode: boundary.node
                    });
                }

                if (isFinal) {
                    return this.finalize();
                }

                return;
            }
        }

        this.currentNode.feed(line);

        if (isFinal) {
            return this.finalize();
        }
    }

    readLine() {
        let startPos = this.readPos;
        let endPos = this.readPos;

        let res = () => {
            return {
                bytes: new Uint8Array(this.buf, startPos, endPos - startPos),
                done: this.readPos >= this.av.length
            };
        };

        while (this.readPos < this.av.length) {
            const c = this.av[this.readPos++];

            if (c !== 0x0d && c !== 0x0a) {
                endPos = this.readPos;
            }

            if (c === 0x0a) {
                return res();
            }
        }

        return res();
    }

    async processNodeTree() {
        // get text nodes

        let textContent = {};

        let textTypes = new Set();
        let textMap = (this.textMap = new Map());

        let walk = async (node, alternative, related) => {
            alternative = alternative || false;
            related = related || false;

            if (!node.contentType.multipart) {
                // regular node

                // is it inline message/rfc822
                if (node.contentType.parsed.value === 'message/rfc822' && node.contentDisposition.parsed.value !== 'attachment') {
                    const subParser = new PostalMime();
                    node.subMessage = await subParser.parse(node.content);

                    if (!textMap.has(node)) {
                        textMap.set(node, {});
                    }

                    let textEntry = textMap.get(node);

                    // default to text if there is no content
                    if (node.subMessage.text || !node.subMessage.html) {
                        textEntry.plain = textEntry.plain || [];
                        textEntry.plain.push({ type: 'subMessage', value: node.subMessage });
                        textTypes.add('plain');
                    }

                    if (node.subMessage.html) {
                        textEntry.html = textEntry.html || [];
                        textEntry.html.push({ type: 'subMessage', value: node.subMessage });
                        textTypes.add('html');
                    }

                    if (subParser.textMap) {
                        subParser.textMap.forEach((subTextEntry, subTextNode) => {
                            textMap.set(subTextNode, subTextEntry);
                        });
                    }

                    for (let attachment of node.subMessage.attachments || []) {
                        this.attachments.push(attachment);
                    }
                }

                // is it text?
                else if (
                    (/^text\//i.test(node.contentType.parsed.value) || node.contentType.parsed.value === 'message/delivery-status') &&
                    node.contentDisposition.parsed.value !== 'attachment'
                ) {
                    let textType = node.contentType.parsed.value.substr(node.contentType.parsed.value.indexOf('/') + 1);
                    if (node.contentType.parsed.value === 'message/delivery-status') {
                        textType = 'plain';
                    }

                    let selectorNode = alternative || node;
                    if (!textMap.has(selectorNode)) {
                        textMap.set(selectorNode, {});
                    }

                    let textEntry = textMap.get(selectorNode);
                    textEntry[textType] = textEntry[textType] || [];
                    textEntry[textType].push({ type: 'text', value: node.getTextContent() });
                    textTypes.add(textType);
                }

                // is it an attachment
                else if (node.content) {
                    let filename = node.contentDisposition.parsed.params.filename || node.contentType.parsed.params.name || null;
                    let attachment = {
                        filename: decodeWords(filename),
                        mimeType: node.contentType.parsed.value,
                        disposition: node.contentDisposition.parsed.value || null
                    };

                    if (related && node.contentId) {
                        attachment.related = true;
                    }

                    if (node.contentId) {
                        attachment.contentId = node.contentId;
                    }

                    attachment.content = node.content;

                    this.attachments.push(attachment);
                }
            } else if (node.contentType.multipart === 'alternative') {
                alternative = node;
            } else if (node.contentType.multipart === 'related') {
                related = node;
            }

            for (let childNode of node.childNodes) {
                await walk(childNode, alternative, related);
            }
        };

        await walk(this.root, false, []);

        textMap.forEach(mapEntry => {
            textTypes.forEach(textType => {
                if (!textContent[textType]) {
                    textContent[textType] = [];
                }

                if (mapEntry[textType]) {
                    mapEntry[textType].forEach(textEntry => {
                        switch (textEntry.type) {
                            case 'text':
                                textContent[textType].push(textEntry.value);
                                break;

                            case 'subMessage':
                                {
                                    switch (textType) {
                                        case 'html':
                                            textContent[textType].push(formatHtmlHeader(textEntry.value));
                                            break;
                                        case 'plain':
                                            textContent[textType].push(formatTextHeader(textEntry.value));
                                            break;
                                    }
                                }
                                break;
                        }
                    });
                } else {
                    let alternativeType;
                    switch (textType) {
                        case 'html':
                            alternativeType = 'plain';
                            break;
                        case 'plain':
                            alternativeType = 'html';
                            break;
                    }

                    (mapEntry[alternativeType] || []).forEach(textEntry => {
                        switch (textEntry.type) {
                            case 'text':
                                switch (textType) {
                                    case 'html':
                                        textContent[textType].push(textToHtml(textEntry.value));
                                        break;
                                    case 'plain':
                                        textContent[textType].push(htmlToText(textEntry.value));
                                        break;
                                }
                                break;

                            case 'subMessage':
                                {
                                    switch (textType) {
                                        case 'html':
                                            textContent[textType].push(formatHtmlHeader(textEntry.value));
                                            break;
                                        case 'plain':
                                            textContent[textType].push(formatTextHeader(textEntry.value));
                                            break;
                                    }
                                }
                                break;
                        }
                    });
                }
            });
        });

        Object.keys(textContent).forEach(textType => {
            textContent[textType] = textContent[textType].join('\n');
        });

        this.textContent = textContent;
    }

    async parse(buf) {
        if (this.started) {
            throw new Error('Can not reuse parser, create a new PostalMime object');
        }
        this.started = true;

        // should it thrown on empty value instead?
        buf = buf || ArrayBuffer(0);

        if (typeof buf === 'string') {
            // cast string input to ArrayBuffer
            buf = textEncoder.encode(buf);
        }

        if (buf instanceof Blob || Object.prototype.toString.call(buf) === '[object Blob]') {
            // can't process blob directly, cast to ArrayBuffer
            buf = await blobToArrayBuffer(buf);
        }

        if (buf.buffer instanceof ArrayBuffer) {
            // Node.js Buffer object or Uint8Array
            buf = new Uint8Array(buf).buffer;
        }

        this.buf = buf;
        this.av = new Uint8Array(buf);
        this.readPos = 0;

        while (this.readPos < this.av.length) {
            const line = this.readLine();

            await this.processLine(line.bytes, line.done);
        }

        await this.processNodeTree();

        let message = {
            headers: this.root.headers.map(entry => ({ key: entry.key, value: entry.value })).reverse()
        };
/*
        for (let key of ['from', 'sender', 'reply-to']) {
            let addressHeader = this.root.headers.find(line => line.key === key);
            if (addressHeader && addressHeader.value) {
                let addresses = addressParser(addressHeader.value);
                if (addresses && addresses.length) {
                    message[key.replace(/\-(.)/g, (o, c) => c.toUpperCase())] = addresses[0];
                }
            }
        }

        for (let key of ['delivered-to', 'return-path']) {
            let addressHeader = this.root.headers.find(line => line.key === key);
            if (addressHeader && addressHeader.value) {
                let addresses = addressParser(addressHeader.value);
                if (addresses && addresses.length && addresses[0].address) {
                    message[key.replace(/\-(.)/g, (o, c) => c.toUpperCase())] = addresses[0].address;
                }
            }
        }

        for (let key of ['to', 'cc', 'bcc']) {
            let addressHeaders = this.root.headers.filter(line => line.key === key);
            let addresses = [];

            addressHeaders
                .filter(entry => entry && entry.value)
                .map(entry => addressParser(entry.value))
                .forEach(parsed => (addresses = addresses.concat(parsed || [])));

            if (addresses && addresses.length) {
                message[key] = addresses;
            }
        }

        for (let key of ['subject', 'message-id', 'in-reply-to', 'references']) {
            let header = this.root.headers.find(line => line.key === key);
            if (header && header.value) {
                message[key.replace(/\-(.)/g, (o, c) => c.toUpperCase())] = decodeWords(header.value);
            }
        }

        let dateHeader = this.root.headers.find(line => line.key === 'date');
        if (dateHeader) {
            let date = new Date(dateHeader.value);
            if (!date || date.toString() === 'Invalid Date') {
                date = dateHeader.value;
            } else {
                // enforce ISO format if seems to be a valid date
                date = date.toISOString();
            }
            message.date = date;
        }
*/
        if (this.textContent && this.textContent.html) {
            message.html = this.textContent.html;
        }

        if (this.textContent && this.textContent.plain) {
            message.text = this.textContent.plain;
        }

        message.attachments = this.attachments;

        return message;
    }
}
