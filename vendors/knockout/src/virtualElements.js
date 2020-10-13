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
                depth--;
                if (depth === 0)
                    return children;
            }

            children.push(currentNode);

            if (isStartComment(currentNode))
                depth++;
        }
        if (!allowUnbalanced)
            throw new Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
        return null;
    }

    function getMatchingEndComment(startComment, allowUnbalanced) {
        var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
        if (allVirtualChildren) {
            if (allVirtualChildren.length > 0)
                return allVirtualChildren[allVirtualChildren.length - 1].nextSibling;
            return startComment.nextSibling;
        }
        return null; // Must have no matching end comment, and allowUnbalanced is true
    }

    ko.virtualElements = {
        allowedBindings: {},

        childNodes: node => isStartComment(node) ? getVirtualChildren(node) : node.childNodes,

        emptyNode: node => {
            if (!isStartComment(node))
                ko.utils.emptyDomNode(node);
            else {
                var virtualChildren = ko.virtualElements.childNodes(node);
                for (var i = 0, j = virtualChildren.length; i < j; i++)
                    ko.removeNode(virtualChildren[i]);
            }
        },

        setDomNodeChildren: (node, childNodes) => {
            if (!isStartComment(node))
                ko.utils.setDomNodeChildren(node, childNodes);
            else {
                ko.virtualElements.emptyNode(node);
                var endCommentNode = node.nextSibling; // Must be the next sibling, as we just emptied the children
                for (var i = 0, j = childNodes.length; i < j; i++)
                    endCommentNode.parentNode.insertBefore(childNodes[i], endCommentNode);
            }
        },

        prepend: (containerNode, nodeToPrepend) => {
            var insertBeforeNode;

            if (isStartComment(containerNode)) {
                // Start comments must always have a parent and at least one following sibling (the end comment)
                insertBeforeNode = containerNode.nextSibling;
                containerNode = containerNode.parentNode;
            } else {
                insertBeforeNode = containerNode.firstChild;
            }

            containerNode.insertBefore(nodeToPrepend, insertBeforeNode);
        },

        insertAfter: (containerNode, nodeToInsert, insertAfterNode) => {
            if (!insertAfterNode) {
                ko.virtualElements.prepend(containerNode, nodeToInsert);
            } else {
                // Children of start comments must always have a parent and at least one following sibling (the end comment)
                var insertBeforeNode = insertAfterNode.nextSibling;

                if (isStartComment(containerNode)) {
                    containerNode = containerNode.parentNode;
                }

                containerNode.insertBefore(nodeToInsert, insertBeforeNode);
            }
        },

        firstChild: node => {
            if (!isStartComment(node)) {
                if (node.firstChild && isEndComment(node.firstChild)) {
                    throw new Error("Found invalid end comment, as the first child of " + node);
                }
                return node.firstChild;
            }
            return (!node.nextSibling || isEndComment(node.nextSibling)) ? null : node.nextSibling;
        },

        nextSibling: node => {
            if (isStartComment(node)) {
                node = getMatchingEndComment(node);
            }

            if (node.nextSibling && isEndComment(node.nextSibling)) {
                if (isUnmatchedEndComment(node.nextSibling)) {
                    throw Error("Found end comment without a matching opening comment, as child of " + node);
                }
                return null;
            }
            return node.nextSibling;
        },

        hasBindingValue: isStartComment,

        virtualNodeBindingValue: node => {
            var regexMatch = (node.nodeValue).match(startCommentRegex);
            return regexMatch ? regexMatch[1] : null;
        }
    };
})();
