ko.utils = {
    arrayRemoveItem: (array, itemToRemove) => {
        var index = array.indexOf(itemToRemove);
        if (index > 0) {
            array.splice(index, 1);
        }
        else if (index === 0) {
            array.shift();
        }
    },

    extend: (target, source) => {
        source && Object.entries(source).forEach(prop => target[prop[0]] = prop[1]);
        return target;
    },

    objectForEach: (obj, action) => obj && Object.entries(obj).forEach(prop => action(prop[0], prop[1])),

    objectMap: (source, mapping, mappingOwner) => {
        if (!source)
            return source;
        var target = {};
        Object.entries(source).forEach(prop =>
            target[prop[0]] = mapping.call(mappingOwner, prop[1], prop[0], source)
        );
        return target;
    },

    emptyDomNode: domNode => {
        while (domNode.firstChild) {
            ko.removeNode(domNode.firstChild);
        }
    },

    moveCleanedNodesToContainerElement: nodes => {
        // Ensure it's a real array, as we're about to reparent the nodes and
        // we don't want the underlying collection to change while we're doing that.
        var nodesArray = [...nodes];
        var templateDocument = (nodesArray[0] && nodesArray[0].ownerDocument) || document;

        var container = templateDocument.createElement('div');
        nodes.forEach(node => container.append(ko.cleanNode(node)));
        return container;
    },

    cloneNodes: (nodesArray, shouldCleanNodes) =>
        Array.prototype.map.call(nodesArray, shouldCleanNodes
            ? node => ko.cleanNode(node.cloneNode(true))
            : node => node.cloneNode(true)),

    setDomNodeChildren: (domNode, childNodes) => {
        ko.utils.emptyDomNode(domNode);
        childNodes && domNode.append(...childNodes);
    },

    fixUpContinuousNodeArray: (continuousNodeArray, parentNode) => {
        // Before acting on a set of nodes that were previously outputted by a template function, we have to reconcile
        // them against what is in the DOM right now. It may be that some of the nodes have already been removed, or that
        // new nodes might have been inserted in the middle, for example by a binding. Also, there may previously have been
        // leading comment nodes (created by rewritten string-based templates) that have since been removed during binding.
        // So, this function translates the old "map" output array into its best guess of the set of current DOM nodes.
        //
        // Rules:
        //   [A] Any leading nodes that have been removed should be ignored
        //       These most likely correspond to memoization nodes that were already removed during binding
        //       See https://github.com/knockout/knockout/pull/440
        //   [B] Any trailing nodes that have been remove should be ignored
        //       This prevents the code here from adding unrelated nodes to the array while processing rule [C]
        //       See https://github.com/knockout/knockout/pull/1903
        //   [C] We want to output a continuous series of nodes. So, ignore any nodes that have already been removed,
        //       and include any nodes that have been inserted among the previous collection

        if (continuousNodeArray.length) {
            // The parent node can be a virtual element; so get the real parent node
            parentNode = (parentNode.nodeType === 8 && parentNode.parentNode) || parentNode;

            // Rule [A]
            while (continuousNodeArray.length && continuousNodeArray[0].parentNode !== parentNode)
                continuousNodeArray.splice(0, 1);

            // Rule [B]
            while (continuousNodeArray.length > 1
                && continuousNodeArray[continuousNodeArray.length - 1].parentNode !== parentNode)
                continuousNodeArray.length--;

            // Rule [C]
            if (continuousNodeArray.length > 1) {
                var current = continuousNodeArray[0], last = continuousNodeArray[continuousNodeArray.length - 1];
                // Replace with the actual new continuous node set
                continuousNodeArray.length = 0;
                while (current !== last) {
                    continuousNodeArray.push(current);
                    current = current.nextSibling;
                }
                continuousNodeArray.push(last);
            }
        }
        return continuousNodeArray;
    },

    stringTrim: string => string == null ? '' :
            string.trim ?
                string.trim() :
                string.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g, ''),

    stringStartsWith: (string, startsWith) => {
        string = string || "";
        if (startsWith.length > string.length)
            return false;
        return string.substring(0, startsWith.length) === startsWith;
    },

    domNodeIsContainedBy: (node, containedByNode) =>
        containedByNode.contains(node.nodeType !== 1 ? node.parentNode : node),

    domNodeIsAttachedToDocument: node => ko.utils.domNodeIsContainedBy(node, node.ownerDocument.documentElement),

    catchFunctionErrors: delegate => {
        return ko['onError'] ? function () {
            try {
                return delegate.apply(this, arguments);
            } catch (e) {
                ko['onError'] && ko['onError'](e);
                throw e;
            }
        } : delegate;
    },

    setTimeout: (handler, timeout) => setTimeout(ko.utils.catchFunctionErrors(handler), timeout),

    deferError: error => setTimeout(() => {
            ko['onError'] && ko['onError'](error);
            throw error;
        }, 0),

    registerEventHandler: (element, eventType, handler) => {
        var wrappedHandler = ko.utils.catchFunctionErrors(handler);

        element.addEventListener(eventType, wrappedHandler, false);
    },

    triggerEvent: (element, eventType) => {
        if (!(element && element.nodeType))
            throw new Error("element must be a DOM node when calling triggerEvent");

        element.dispatchEvent(new Event(eventType));
    },

    unwrapObservable: value => ko.isObservable(value) ? value() : value,

    setTextContent: (element, textContent) =>
        element.textContent = ko.utils.unwrapObservable(textContent) || ""
};

ko.exportSymbol('utils', ko.utils);
ko.exportSymbol('unwrap', ko.utils.unwrapObservable); // Convenient shorthand, because this is used so commonly
