(() => {
    // Objective:
    // * Given an input array, a container DOM node, and a function from array elements to arrays of DOM nodes,
    //   map the array elements to arrays of DOM nodes, concatenate together all these arrays, and use them to populate the container DOM node
    // * Next time we're given the same combination of things (with the array possibly having mutated), update the container DOM node
    //   so that its children is again the concatenation of the mappings of the array elements, but don't re-map any array elements that we
    //   previously mapped - retain those nodes, and just insert/delete other ones

    // "callbackAfterAddingNodes" will be invoked after any "mapping"-generated nodes are inserted into the container node
    // You can use this, for example, to activate bindings on those nodes.

    function mapNodeAndRefreshWhenChanged(containerNode, mapping, valueToMap, callbackAfterAddingNodes, index) {
        // Map this array value inside a dependentObservable so we re-map when any dependency changes
        var mappedNodes = [];
        var dependentObservable = ko.computed(() => {
            var newMappedNodes = mapping(valueToMap, index, ko.utils.fixUpContinuousNodeArray(mappedNodes, containerNode)) || [];

            // On subsequent evaluations, just replace the previously-inserted DOM nodes
            if (mappedNodes.length > 0) {
                var nodesToReplaceArray = mappedNodes.nodeType ? [mappedNodes] : mappedNodes;
                if (nodesToReplaceArray.length > 0) {
                    var insertionPoint = nodesToReplaceArray[0],
                        parent = insertionPoint.parentNode;
                    newMappedNodes.forEach(node => parent.insertBefore(node, insertionPoint));
                    nodesToReplaceArray.forEach(node => ko.removeNode(node));
                }
                if (callbackAfterAddingNodes)
                    ko.dependencyDetection.ignore(callbackAfterAddingNodes, null, [valueToMap, newMappedNodes, index]);
            }

            // Replace the contents of the mappedNodes array, thereby updating the record
            // of which nodes would be deleted if valueToMap was itself later removed
            mappedNodes.length = 0;
            mappedNodes.push(...newMappedNodes);
        }, {
            disposeWhenNodeIsRemoved: containerNode,
            disposeWhen: ()=>!!mappedNodes.find(ko.utils.domNodeIsAttachedToDocument)
        });
        return {
            mappedNodes : mappedNodes,
            dependentObservable : (dependentObservable.isActive() ? dependentObservable : undefined)
        };
    }

    var lastMappingResultDomDataKey = ko.utils.domData.nextKey(),
        deletedItemDummyValue = ko.utils.domData.nextKey();

    ko.utils.setDomNodeChildrenFromArrayMapping = (domNode, array, mapping, options, callbackAfterAddingNodes, editScript) => {
        array = array || [];
        if (!Array.isArray(array)) // Coerce single value into array
            array = [array];

        options = options || {};
        var lastMappingResult = ko.utils.domData.get(domNode, lastMappingResultDomDataKey),
            isFirstExecution = !lastMappingResult,

            // Build the new mapping result
            newMappingResult = [],
            lastMappingResultIndex = 0,
            currentArrayIndex = 0,

            nodesToDelete = [],
            itemsToMoveFirstIndexes = [],
            itemsForBeforeRemoveCallbacks = [],
            mapData,
            countWaitingForRemove = 0,

            itemAdded = value => {
                mapData = { arrayEntry: value, indexObservable: ko.observable(currentArrayIndex++) };
                newMappingResult.push(mapData);
            },

            itemMovedOrRetained = oldPosition => {
                mapData = lastMappingResult[oldPosition];
                // Since updating the index might change the nodes, do so before calling fixUpContinuousNodeArray
                mapData.indexObservable(currentArrayIndex++);
                ko.utils.fixUpContinuousNodeArray(mapData.mappedNodes, domNode);
                newMappingResult.push(mapData);
            };

        if (isFirstExecution) {
            array.forEach(itemAdded);
        } else {
            if (!editScript || (lastMappingResult && lastMappingResult['_countWaitingForRemove'])) {
                // Compare the provided array against the previous one
                editScript = ko.utils.compareArrays(
                    Array.prototype.map.call(lastMappingResult, x => x.arrayEntry),
                    array,
                    {
                        'sparse': true
                    });
            }

            let movedIndex, itemIndex;
            editScript.forEach(editScriptItem => {
                movedIndex = editScriptItem['moved'];
                itemIndex = editScriptItem['index'];
                switch (editScriptItem['status']) {
                    case "deleted":
                        while (lastMappingResultIndex < itemIndex) {
                            itemMovedOrRetained(lastMappingResultIndex++);
                        }
                        if (movedIndex === undefined) {
                            mapData = lastMappingResult[lastMappingResultIndex];

                            // Stop tracking changes to the mapping for these nodes
                            if (mapData.dependentObservable) {
                                mapData.dependentObservable['dispose']();
                                mapData.dependentObservable = undefined;
                            }

                            // Queue these nodes for later removal
                            if (ko.utils.fixUpContinuousNodeArray(mapData.mappedNodes, domNode).length) {
                                if (mapData) {
                                    nodesToDelete.push.apply(nodesToDelete, mapData.mappedNodes);
                                }
                            }
                        }
                        lastMappingResultIndex++;
                        break;

                    case "added":
                        while (currentArrayIndex < itemIndex) {
                            itemMovedOrRetained(lastMappingResultIndex++);
                        }
                        if (movedIndex !== undefined) {
                            itemsToMoveFirstIndexes.push(newMappingResult.length);
                            itemMovedOrRetained(movedIndex);
                        } else {
                            itemAdded(editScriptItem['value']);
                        }
                        break;
                }
            });

            while (currentArrayIndex < array.length) {
                itemMovedOrRetained(lastMappingResultIndex++);
            }

            // Record that the current view may still contain deleted items
            // because it means we won't be able to use a provided editScript.
            newMappingResult['_countWaitingForRemove'] = countWaitingForRemove;
        }

        // Store a copy of the array items we just considered so we can difference it next time
        ko.utils.domData.set(domNode, lastMappingResultDomDataKey, newMappingResult);

        // Next remove nodes for deleted items
        nodesToDelete.forEach(ko.removeNode);

        var i, lastNode, mappedNodes, activeElement,
            insertNode = nodeToInsert => {
                ko.virtualElements.insertAfter(domNode, nodeToInsert, lastNode);
                lastNode = nodeToInsert;
            };

        // Since most browsers remove the focus from an element when it's moved to another location,
        // save the focused element and try to restore it later.
        activeElement = domNode.ownerDocument.activeElement;

        // Try to reduce overall moved nodes by first moving the ones that were marked as moved by the edit script
        if (itemsToMoveFirstIndexes.length) {
            while ((i = itemsToMoveFirstIndexes.shift()) != undefined) {
                mapData = newMappingResult[i];
                for (lastNode = undefined; i; ) {
                    mappedNodes = newMappingResult[--i].mappedNodes;
                    if (mappedNodes?.length) {
                        lastNode = mappedNodes[mappedNodes.length - 1];
                        break;
                    }
                }
                mapData.mappedNodes.forEach(insertNode);
            }
        }

        // Next add/reorder the remaining items
        newMappingResult.forEach(mapData => {
            // Get nodes for newly added items
            mapData.mappedNodes
            || ko.utils.extend(mapData, mapNodeAndRefreshWhenChanged(domNode, mapping, mapData.arrayEntry, callbackAfterAddingNodes, mapData.indexObservable));

            // Put nodes in the right place if they aren't there already
            mapData.mappedNodes.forEach(insertNode);

            // Run the callbacks for newly added nodes (for example, to apply bindings, etc.)
            if (!mapData.initialized && callbackAfterAddingNodes) {
                callbackAfterAddingNodes(mapData.arrayEntry, mapData.mappedNodes, mapData.indexObservable);
                mapData.initialized = true;
                lastNode = mapData.mappedNodes[mapData.mappedNodes.length - 1];     // get the last node again since it may have been changed by a preprocessor
            }
        });

        // Restore the focused element if it had lost focus
        if (domNode.ownerDocument.activeElement != activeElement) {
            activeElement?.focus();
        }

        // Replace the stored values of deleted items with a dummy value. This provides two benefits: it marks this item
        // as already "removed", and it ensures that the item won't match up
        // with an actual item in the array and appear as "retained" or "moved".
        itemsForBeforeRemoveCallbacks.forEach(callback => callback && (callback.arrayEntry = deletedItemDummyValue));
    }
})();
