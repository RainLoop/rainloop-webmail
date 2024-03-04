(() => {
    // "Virtual elements" is an abstraction on top of the usual DOM API which understands the notion that comment nodes
    // may be used to represent hierarchy (in addition to the DOM's natural hierarchy).
    // If you call the DOM-manipulating functions on ko.virtualElements, you will be able to read and write the state
    // of that virtual hierarchy
    //
    // The point of all this is to support containerless templates (e.g., <!-- ko foreach:someCollection -->blah<!-- /ko -->)
    // without having to scatter special cases all over the binding and templating code.

    var startCommentRegex = /^\s*ko(?:\s+([\s\S]+))?\s*$/;
    var endCommentRegex =   /^\s*\/ko\s*$/;

    function isStartComment(node) {
        return (node.nodeType == 8) && startCommentRegex.test(node.nodeValue);
    }

    function isEndComment(node) {
        return (node.nodeType == 8) && endCommentRegex.test(node.nodeValue);
    }

    function isUnmatchedEndComment(node) {
        return isEndComment(node) && !(ko.utils.domData.get(node, matchedEndCommentDataKey));
    }

    var matchedEndCommentDataKey = "__ko_matchedEndComment__"

    function getVirtualChildren(startComment, allowUnbalanced) {
        var currentNode = startComment;
        var depth = 1;
        var children = [];
        while (currentNode = currentNode.nextSibling) {
            if (isEndComment(currentNode)) {
                ko.utils.domData.set(currentNode, matchedEndCommentDataKey, true);
                if (!--depth)
                    return children;
            }

            children.push(currentNode);

            if (isStartComment(currentNode))
                ++depth;
        }
        if (!allowUnbalanced)
            throw Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
        return null;
    }

    function getMatchingEndComment(startComment, allowUnbalanced) {
        var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
        if (allVirtualChildren) {
            return (allVirtualChildren.length
                ? allVirtualChildren[allVirtualChildren.length - 1]
                : startComment).nextSibling;
        }
        return null; // Must have no matching end comment, and allowUnbalanced is true
    }

    ko.virtualElements = {
        allowedBindings: {},

        childNodes: node => isStartComment(node) ? getVirtualChildren(node) : node.childNodes,

        emptyNode: node => {
            if (isStartComment(node)) {
                var virtualChildren = getVirtualChildren(node);
                virtualChildren && [...virtualChildren].forEach(child => ko.removeNode(child));
            } else
                ko.utils.emptyDomNode(node);
        },

        setDomNodeChildren: (node, childNodes) => {
            if (isStartComment(node)) {
                ko.virtualElements.emptyNode(node);
                node.after(...childNodes);
            } else
                ko.utils.setDomNodeChildren(node, childNodes);
        },

        prepend: (containerNode, nodeToPrepend) => {
            // Start comments must always have a parent and at least one following sibling (the end comment)
            isStartComment(containerNode)
                ? containerNode.nextSibling.before(nodeToPrepend)
                : containerNode.prepend(nodeToPrepend);
        },

        insertAfter: (containerNode, nodeToInsert, insertAfterNode) => {
            insertAfterNode
                ? insertAfterNode.after(nodeToInsert)
                : ko.virtualElements.prepend(containerNode, nodeToInsert);
        },

        firstChild: node => {
            if (isStartComment(node)) {
                let next = node.nextSibling;
                return (!next || isEndComment(next)) ? null : next;
            }
            let first = node.firstChild;
            if (first && isEndComment(first)) {
                throw Error("Found invalid end comment, as the first child of " + node);
            }
            return first;
        },

        nextSibling: node => {
            if (isStartComment(node)) {
                node = getMatchingEndComment(node);
            }
            let next = node.nextSibling;
            if (next && isEndComment(next)) {
                if (isUnmatchedEndComment(next)) {
                    throw Error("Found end comment without a matching opening comment, as child of " + node);
                }
                return null;
            }
            return next;
        },

        hasBindingValue: isStartComment,

        virtualNodeBindingValue: node => {
            var regexMatch = node.nodeValue.match(startCommentRegex);
            return regexMatch ? regexMatch[1] : null;
        }
    };
})();
