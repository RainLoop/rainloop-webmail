
ko.utils.domNodeDisposal = (() => {
    var domDataKey = ko.utils.domData.nextKey();
    var cleanableNodeTypes = { 1: 1, 8: 1, 9: 1 };       // Element, Comment, Document
    var cleanableNodeTypesWithDescendants = { 1: 1, 9: 1 }; // Element, Document

    const getDisposeCallbacksCollection = (node, createIfNotFound) => {
        var allDisposeCallbacks = ko.utils.domData.get(node, domDataKey);
        if (createIfNotFound && !allDisposeCallbacks) {
            allDisposeCallbacks = new Set;
            ko.utils.domData.set(node, domDataKey, allDisposeCallbacks);
        }
        return allDisposeCallbacks;
    },

    destroyCallbacksCollection = node => ko.utils.domData.set(node, domDataKey, null),

    cleanSingleNode = node => {
        // Run all the dispose callbacks
        var callbacks = getDisposeCallbacksCollection(node);
        if (callbacks) {
            // Clone, as the array may be modified during iteration (typically, callbacks will remove themselves)
            (new Set(callbacks)).forEach(callback => callback(node));
        }

        // Erase the DOM data
        ko.utils.domData.clear(node);

        // Clear any immediate-child comment nodes, as these wouldn't have been found by
        // node.getElementsByTagName("*") in cleanNode() (comment nodes aren't elements)
        cleanableNodeTypesWithDescendants[node.nodeType]
        && cleanNodesInList(node.childNodes, true/*onlyComments*/);
    },

    cleanNodesInList = (nodeList, onlyComments) => {
        var cleanedNodes = [], lastCleanedNode;
        for (var i = 0; i < nodeList.length; i++) {
            if (!onlyComments || nodeList[i].nodeType === 8) {
                cleanSingleNode(cleanedNodes[cleanedNodes.length] = lastCleanedNode = nodeList[i]);
                if (nodeList[i] !== lastCleanedNode) {
                    while (i-- && !cleanedNodes.includes(nodeList[i]));
                }
            }
        }
    };

    return {
        'addDisposeCallback' : (node, callback) => {
            if (typeof callback != "function")
                throw new Error("Callback must be a function");
            getDisposeCallbacksCollection(node, 1).add(callback);
        },

        removeDisposeCallback : (node, callback) => {
            var callbacksCollection = getDisposeCallbacksCollection(node);
            if (callbacksCollection) {
                callbacksCollection.delete(callback);
                callbacksCollection.size || destroyCallbacksCollection(node);
            }
        },

        cleanNode : node => {
            ko.dependencyDetection.ignore(() => {
                // First clean this node, where applicable
                if (cleanableNodeTypes[node.nodeType]) {
                    cleanSingleNode(node);

                    // ... then its descendants, where applicable
                    cleanableNodeTypesWithDescendants[node.nodeType]
                    && cleanNodesInList(node.getElementsByTagName("*"));
                }
            });

            return node;
        },

        removeNode : node => {
            ko.cleanNode(node);
            node.parentNode && node.parentNode.removeChild(node);
        }
    };
})();
ko.cleanNode = ko.utils.domNodeDisposal.cleanNode; // Shorthand name for convenience
ko.removeNode = ko.utils.domNodeDisposal.removeNode; // Shorthand name for convenience
ko.exportSymbol('utils.domNodeDisposal', ko.utils.domNodeDisposal);
