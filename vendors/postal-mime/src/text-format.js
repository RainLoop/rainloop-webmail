const element = document.createElement('div');

export function escapeHtml(str) {
    return str.trim().replace(/[<>"'?&]/g, c => {
        let hex = c.charCodeAt(0).toString(16);
        if (hex.length < 2) {
            hex = '0' + hex;
        }
        return '&#x' + hex.toUpperCase() + ';';
    });
}

export function textToHtml(str) {
    return escapeHtml(str).replace(/\n/g, '<br />');
}

export function htmlToText(str) {
    str = str
        // we can't process tags on multiple lines so remove newlines first
        .replace(/\r?\n/g, '\u0001')
        .replace(/<!--.*?-->/gi, ' ')

        .replace(/<br\b[^>]*>/gi, '\n')
        .replace(/<\/?(p|div|table|tr|td|th)\b[^>]*>/gi, '\n\n')
        .replace(/<script\b[^>]*>.*?<\/script\b[^>]*>/gi, ' ')
        .replace(/^.*<body\b[^>]*>/i, '')
        .replace(/^.*<\/head\b[^>]*>/i, '')
        .replace(/^.*<!doctype\b[^>]*>/i, '')
        .replace(/<\/body\b[^>]*>.*$/i, '')
        .replace(/<\/html\b[^>]*>.*$/i, '')

        .replace(/<a\b[^>]*href\s*=\s*["']?([^\s"']+)[^>]*>/gi, ' ($1) ')

        .replace(/<\/?(span|em|i|strong|b|u|a)\b[^>]*>/gi, '')

        .replace(/<li\b[^>]*>[\n\u0001\s]*/gi, '* ')

        .replace(/<hr\b[^>]*>/g, '\n-------------\n')

        .replace(/<[^>]*>/g, ' ')

        // convert linebreak placeholders back to newlines
        .replace(/\u0001/g, '\n')

        .replace(/[ \t]+/g, ' ')

        .replace(/^\s+$/gm, '')

        .replace(/\n\n+/g, '\n\n')
        .replace(/^\n+/, '\n')
        .replace(/\n+$/, '\n');

    element.innerHTML = str;
    str = element.textContent;
    element.textContent = '';

    return str;
}

function formatTextAddress(address) {
    return []
        .concat(address.name || [])
        .concat(address.name ? `<${address.address}>` : address.address)
        .join(' ');
}

function formatTextAddresses(addresses) {
    let parts = [];

    let processAddress = (address, partCounter) => {
        if (partCounter) {
            parts.push(', ');
        }

        if (address.group) {
            let groupStart = `${address.name}:`;
            let groupEnd = `;`;

            parts.push(groupStart);
            address.group.forEach(processAddress);
            parts.push(groupEnd);
        } else {
            parts.push(formatTextAddress(address));
        }
    };

    addresses.forEach(processAddress);

    return parts.join('');
}

function formatHtmlAddress(address) {
    return `<a href="mailto:${escapeHtml(address.address)}" class="postal-email-address">${escapeHtml(address.name || `<${address.address}>`)}</a>`;
}

function formatHtmlAddresses(addresses) {
    let parts = [];

    let processAddress = (address, partCounter) => {
        if (partCounter) {
            parts.push('<span class="postal-email-address-separator">, </span>');
        }

        if (address.group) {
            let groupStart = `<span class="postal-email-address-group">${escapeHtml(address.name)}:</span>`;
            let groupEnd = `<span class="postal-email-address-group">;</span>`;

            parts.push(groupStart);
            address.group.forEach(processAddress);
            parts.push(groupEnd);
        } else {
            parts.push(formatHtmlAddress(address));
        }
    };

    addresses.forEach(processAddress);

    return parts.join(' ');
}

function foldLines(str, lineLength, afterSpace) {
    str = (str || '').toString();
    lineLength = lineLength || 76;

    let pos = 0,
        len = str.length,
        result = '',
        line,
        match;

    while (pos < len) {
        line = str.substr(pos, lineLength);
        if (line.length < lineLength) {
            result += line;
            break;
        }
        if ((match = line.match(/^[^\n\r]*(\r?\n|\r)/))) {
            line = match[0];
            result += line;
            pos += line.length;
            continue;
        } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || '').length : 0) < line.length) {
            line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || '').length : 0)));
        } else if ((match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/))) {
            line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || '').length : 0));
        }

        result += line;
        pos += line.length;
        if (pos < len) {
            result += '\r\n';
        }
    }

    return result;
}

export function formatTextHeader(message) {
    let rows = [];

    if (message.from) {
        rows.push({ key: 'From', val: formatTextAddress(message.from) });
    }

    if (message.subject) {
        rows.push({ key: 'Subject', val: message.subject });
    }

    if (message.date) {
        let dateOptions = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        };

        let dateStr = typeof Intl === 'undefined' ? message.date
			: new Intl.DateTimeFormat('default', dateOptions).format(new Date(message.date));

        rows.push({ key: 'Date', val: dateStr });
    }

    if (message.to && message.to.length) {
        rows.push({ key: 'To', val: formatTextAddresses(message.to) });
    }

    if (message.cc && message.cc.length) {
        rows.push({ key: 'Cc', val: formatTextAddresses(message.cc) });
    }

    if (message.bcc && message.bcc.length) {
        rows.push({ key: 'Bcc', val: formatTextAddresses(message.bcc) });
    }

    // Align keys and values by adding space between these two
    // Also make sure that the separator line is as long as the longest line
    // Should end up with something like this:
    /*
    -----------------------------
    From:    xx xx <xxx@xxx.com>
    Subject: Example Subject
    Date:    16/02/2021, 02:57:06
    To:      not@found.com
    -----------------------------
    */

    let maxKeyLength = rows
        .map(r => r.key.length)
        .reduce((acc, cur) => {
            return cur > acc ? cur : acc;
        }, 0);

    rows = rows.flatMap(row => {
        let sepLen = maxKeyLength - row.key.length;
        let prefix = `${row.key}: ${' '.repeat(sepLen)}`;
        let emptyPrefix = `${' '.repeat(row.key.length + 1)} ${' '.repeat(sepLen)}`;

        let foldedLines = foldLines(row.val, 80, true)
            .split(/\r?\n/)
            .map(line => line.trim());

        return foldedLines.map((line, i) => `${i ? emptyPrefix : prefix}${line}`);
    });

    console.log(rows);
    console.log(rows.map(r => r.length));

    let maxLineLength = rows
        .map(r => r.length)
        .reduce((acc, cur) => {
            return cur > acc ? cur : acc;
        }, 0);
    console.log(maxLineLength);

    let lineMarker = '-'.repeat(maxLineLength);

    let template = `
${lineMarker}
${rows.join('\n')}
${lineMarker}
`;

    return template;
}

export function formatHtmlHeader(message) {
    let rows = [];

    if (message.from) {
        rows.push(`<div class="postal-email-header-key">From</div><div class="postal-email-header-value">${formatHtmlAddress(message.from)}</div>`);
    }

    if (message.subject) {
        rows.push(
            `<div class="postal-email-header-key">Subject</div><div class="postal-email-header-value postal-email-header-subject">${escapeHtml(
                message.subject
            )}</div>`
        );
    }

    if (message.date) {
        let dateOptions = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        };

        let dateStr = typeof Intl === 'undefined' ? message.date
			: new Intl.DateTimeFormat('default', dateOptions).format(new Date(message.date));

        rows.push(
            `<div class="postal-email-header-key">Date</div><div class="postal-email-header-value postal-email-header-date" data-date="${escapeHtml(
                message.date
            )}">${escapeHtml(dateStr)}</div>`
        );
    }

    if (message.to && message.to.length) {
        rows.push(`<div class="postal-email-header-key">To</div><div class="postal-email-header-value">${formatHtmlAddresses(message.to)}</div>`);
    }

    if (message.cc && message.cc.length) {
        rows.push(`<div class="postal-email-header-key">Cc</div><div class="postal-email-header-value">${formatHtmlAddresses(message.cc)}</div>`);
    }

    if (message.bcc && message.bcc.length) {
        rows.push(`<div class="postal-email-header-key">Bcc</div><div class="postal-email-header-value">${formatHtmlAddresses(message.bcc)}</div>`);
    }

    let template = `<div class="postal-email-header">${rows.length ? '<div class="postal-email-header-row">' : ''}${rows.join(
        '</div>\n<div class="postal-email-header-row">'
    )}${rows.length ? '</div>' : ''}</div>`;

    return template;
}
