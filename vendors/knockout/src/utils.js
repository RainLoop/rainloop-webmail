ko.utils = {
    extend: (target, source) => source ? Object.assign(target, source) : target,

    objectForEach: (obj, action) => obj && Object.entries(obj).forEach(prop => action(prop[0], prop[1])),

    emptyDomNode: domNode => [...domNode.childNodes].forEach(child => ko.removeNode(child)),

    moveCleanedNodesToContainerElement: nodes => {
        // Ensure it's a real array, as we're about to reparent the nodes and
        // we don't want the underlying collection to change while we're doing that.
        var nodesArray = [...nodes];
        var templateDocument = (nodesArray[0] && nodesArray[0].ownerDocument) || document;

        var container = templateDocument.createElement('div');
        nodesArray.forEach(node => container.append(ko.cleanNode(node)));
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
                --continuousNodeArray.length;

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

    domNodeIsAttachedToDocument: node =>
        node.ownerDocument.documentElement.contains(node.nodeType !== 1 ? node.parentNode : node),

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
