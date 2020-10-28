(() => {
    var none = [0, "", ""],
        table = [1, "<table>", "</table>"],
        tbody = [2, "<table><tbody>", "</tbody></table>"],
        tr = [3, "<table><tbody><tr>", "</tr></tbody></table>"],
        select = [1, "<select multiple='multiple'>", "</select>"],
        lookup = {
            'thead': table,
            'tbody': table,
            'tfoot': table,
            'tr': tbody,
            'td': tr,
            'th': tr,
            'option': select,
            'optgroup': select
        };

    function getWrap(tags) {
        var m = tags.match(/^(?:<!--.*?-->\s*?)*?<([a-z]+)[\s>]/);
        return (m && lookup[m[1]]) || none;
    }

    function simpleHtmlParse(html, documentContext) {
        documentContext || (documentContext = document);
        var windowContext = documentContext['parentWindow'] || documentContext['defaultView'] || window;

        // Based on jQuery's "clean" function, but only accounting for table-related elements.

        // Trim whitespace, otherwise indexOf won't work as expected
        var tags = ko.utils.stringTrim(html).toLowerCase(), div = documentContext.createElement("div"),
            wrap = getWrap(tags),
            depth = wrap[0];

        // Go to html and back, then peel off extra wrappers
        div.innerHTML = "<div>" + wrap[1] + html + wrap[2] + "</div>";

        // Move to the right depth
        while (depth--)
            div = div.lastChild;

        return [...div.lastChild.childNodes];
    }

    ko.utils.parseHtmlFragment = (html, documentContext) =>
        simpleHtmlParse(html, documentContext);  // ... otherwise, this simple logic will do in most common cases.

    ko.utils.parseHtmlForTemplateNodes = (html, documentContext) => {
        var nodes = ko.utils.parseHtmlFragment(html, documentContext);
        return (nodes.length && nodes[0].parentElement) || ko.utils.moveCleanedNodesToContainerElement(nodes);
    };

    ko.utils.setHtml = (node, html) => {
        ko.utils.emptyDomNode(node);

        // There's no legitimate reason to display a stringified observable without unwrapping it, so we'll unwrap it
        html = ko.utils.unwrapObservable(html);

        if ((html !== null) && (html !== undefined)) {
            if (typeof html != 'string')
                html = html.toString();

            // jQuery contains a lot of sophisticated code to parse arbitrary HTML fragments,
            // for example <tr> elements which are not normally allowed to exist on their own.
            // If you've referenced jQuery we'll use that rather than duplicating its code.
            // ... otherwise, use KO's own parsing logic.
            var parsedNodes = ko.utils.parseHtmlFragment(html, node.ownerDocument);
            for (var i = 0; i < parsedNodes.length; i++)
                node.appendChild(parsedNodes[i]);
        }
    };
})();
