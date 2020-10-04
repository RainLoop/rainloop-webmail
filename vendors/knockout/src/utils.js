ko.utils = (() => {

    function arrayCall(name, arr, p1, p2) {
        return Array.prototype[name].call(arr, p1, p2);
    }

    function objectForEach(obj, action) {
        obj && Object.entries(obj).forEach(prop => action(prop[0], prop[1]));
    }

    function extend(target, source) {
        if (source) {
            Object.entries(source).forEach(prop => target[prop[0]] = prop[1]);
        }
        return target;
    }

    function setPrototypeOf(obj, proto) {
        obj.__proto__ = proto;
        return obj;
    }

    var canSetPrototype = ({ __proto__: [] } instanceof Array);

    // For details on the pattern for changing node classes
    // see: https://github.com/knockout/knockout/issues/1597
    function toggleDomNodeCssClass(node, classNames, shouldHaveClass) {
        if (classNames) {
            var addOrRemoveFn = shouldHaveClass ? 'add' : 'remove';
            classNames.split(/\s+/).forEach(className =>
                node.classList[addOrRemoveFn](className)
            );
        }
    }

    return {
        arrayForEach: (array, action, actionOwner) =>
            arrayCall('forEach', array, action, actionOwner),

        arrayIndexOf: (array, item) =>
            arrayCall('indexOf', array, item),

        arrayFirst: (array, predicate, predicateOwner) => {
            for (var i = 0, j = array.length; i < j; i++) {
                if (predicate.call(predicateOwner, array[i], i, array))
                    return array[i];
            }
            return undefined;
        },

        arrayRemoveItem: (array, itemToRemove) => {
            var index = ko.utils.arrayIndexOf(array, itemToRemove);
            if (index > 0) {
                array.splice(index, 1);
            }
            else if (index === 0) {
                array.shift();
            }
        },

        arrayFilter: (array, predicate, predicateOwner) =>
            array ? arrayCall('filter', array, predicate, predicateOwner) : [],

        arrayPushAll: (array, valuesToPush) => {
            if (valuesToPush instanceof Array)
                array.push.apply(array, valuesToPush);
            else
                for (var i = 0, j = valuesToPush.length; i < j; i++)
                    array.push(valuesToPush[i]);
            return array;
        },

        canSetPrototype: canSetPrototype,

        extend: extend,

        setPrototypeOf: setPrototypeOf,

        setPrototypeOfOrExtend: canSetPrototype ? setPrototypeOf : extend,

        objectForEach: objectForEach,

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
            var nodesArray = ko.utils.makeArray(nodes);
            var templateDocument = (nodesArray[0] && nodesArray[0].ownerDocument) || document;

            var container = templateDocument.createElement('div');
            nodes.forEach(node => container.append(ko.cleanNode(node)));
            return container;
        },

        cloneNodes: (nodesArray, shouldCleanNodes) =>
            arrayCall('map', nodesArray, shouldCleanNodes
                ? node => ko.cleanNode(node.cloneNode(true))
                : node => node.cloneNode(true)
            ),

        setDomNodeChildren: (domNode, childNodes) => {
            ko.utils.emptyDomNode(domNode);
            childNodes && domNode.append.apply(domNode, childNodes);
        },

        replaceDomNodes: (nodeToReplaceOrNodeArray, newNodesArray) => {
            var nodesToReplaceArray = nodeToReplaceOrNodeArray.nodeType
                ? [nodeToReplaceOrNodeArray] : nodeToReplaceOrNodeArray;
            if (nodesToReplaceArray.length > 0) {
                var insertionPoint = nodesToReplaceArray[0],
                    parent = insertionPoint.parentNode,
                    i, j;
                for (i = 0, j = newNodesArray.length; i < j; i++)
                    parent.insertBefore(newNodesArray[i], insertionPoint);
                for (i = 0, j = nodesToReplaceArray.length; i < j; i++) {
                    ko.removeNode(nodesToReplaceArray[i]);
                }
            }
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

        stringTrim: string => string === null || string === undefined ? '' :
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

        anyDomNodeIsAttachedToDocument: nodes => !!ko.utils.arrayFirst(nodes, ko.utils.domNodeIsAttachedToDocument),

        // For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
        // Possible future optimization: If we know it's an element from an XHTML document (not HTML),
        // we don't need to do the .toLowerCase() as it will always be lower case anyway.
        tagNameLower: element => element && element.tagName && element.tagName.toLowerCase(),

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

        peekObservable: value => ko.isObservable(value) ? value.peek() : value,

        toggleDomNodeCssClass: toggleDomNodeCssClass,

        setTextContent: (element, textContent) => {
            var value = ko.utils.unwrapObservable(textContent);
            if ((value === null) || (value === undefined))
                value = "";

            // We need there to be exactly one child: a text node.
            // If there are no children, more than one, or if it's not a text node,
            // we'll clear everything and create a single text node.
            var innerTextNode = ko.virtualElements.firstChild(element);
            if (!innerTextNode || innerTextNode.nodeType != 3 || ko.virtualElements.nextSibling(innerTextNode)) {
                ko.virtualElements.setDomNodeChildren(element, [element.ownerDocument.createTextNode(value)]);
            } else {
                innerTextNode.data = value;
            }
        },

        makeArray: arrayLikeObject => Array['from'](arrayLikeObject)
    }
})();

ko.exportSymbol('utils', ko.utils);
ko.exportSymbol('utils.arrayForEach', ko.utils.arrayForEach);
ko.exportSymbol('utils.arrayFirst', ko.utils.arrayFirst);
ko.exportSymbol('utils.arrayFilter', ko.utils.arrayFilter);
ko.exportSymbol('utils.arrayIndexOf', ko.utils.arrayIndexOf);
ko.exportSymbol('utils.arrayPushAll', ko.utils.arrayPushAll);
ko.exportSymbol('utils.arrayRemoveItem', ko.utils.arrayRemoveItem);
ko.exportSymbol('utils.cloneNodes', ko.utils.cloneNodes);
ko.exportSymbol('utils.extend', ko.utils.extend);
ko.exportSymbol('utils.objectMap', ko.utils.objectMap);
ko.exportSymbol('utils.peekObservable', ko.utils.peekObservable);
ko.exportSymbol('utils.registerEventHandler', ko.utils.registerEventHandler);
ko.exportSymbol('utils.stringifyJson', ko.utils.stringifyJson);
ko.exportSymbol('utils.toggleDomNodeCssClass', ko.utils.toggleDomNodeCssClass);
ko.exportSymbol('utils.triggerEvent', ko.utils.triggerEvent);
ko.exportSymbol('utils.unwrapObservable', ko.utils.unwrapObservable);
ko.exportSymbol('utils.objectForEach', ko.utils.objectForEach);
ko.exportSymbol('utils.setTextContent', ko.utils.setTextContent);
ko.exportSymbol('unwrap', ko.utils.unwrapObservable); // Convenient shorthand, because this is used so commonly
