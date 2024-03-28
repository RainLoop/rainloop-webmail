(() => {
    const renderTemplateSource = templateSource => {
            var templateNodes = templateSource.nodes ? templateSource.nodes() : null;
            return templateNodes
                ? [...templateNodes.cloneNode(true).childNodes]
                : null;
        },

        makeTemplateSource = (template, templateDocument) => {
            // Named template
            if (typeof template == "string") {
                templateDocument = templateDocument || document;
                var elem = templateDocument.getElementById(template);
                if (!elem)
                    throw Error("Cannot find template with ID " + template);
                return new ko.templateSources.domElement(elem);
            }
            if ([1,8].includes(template.nodeType)) {
                // Anonymous template
                return new ko.templateSources.anonymousTemplate(template);
            }
            throw Error("Unknown template type: " + template);
        },

        invokeForEachNodeInContinuousRange = (firstNode, lastNode, action) => {
            var node, nextInQueue = firstNode, firstOutOfRangeNode = ko.virtualElements.nextSibling(lastNode);
            while (nextInQueue && ((node = nextInQueue) !== firstOutOfRangeNode)) {
                nextInQueue = ko.virtualElements.nextSibling(node);
                action(node, nextInQueue);
            }
        },

        activateBindingsOnContinuousNodeArray = (continuousNodeArray, bindingContext) => {
            // To be used on any nodes that have been rendered by a template and have been inserted into some parent element
            // Walks through continuousNodeArray (which *must* be continuous, i.e., an uninterrupted sequence of sibling nodes, because
            // the algorithm for walking them relies on this), and for each top-level item in the virtual-element sense,
            // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
            // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

            if (continuousNodeArray.length) {
                var firstNode = continuousNodeArray[0],
                    lastNode = continuousNodeArray[continuousNodeArray.length - 1],
                    parentNode = firstNode.parentNode;

                // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
                // whereas a regular applyBindings won't introduce new memoized nodes
                invokeForEachNodeInContinuousRange(firstNode, lastNode, node => {
                    if (node.nodeType === 1 || node.nodeType === 8)
                        ko.applyBindings(bindingContext, node);
                });

                // Make sure any changes done by applyBindings or unmemoize are reflected in the array
                ko.utils.fixUpContinuousNodeArray(continuousNodeArray, parentNode);
            }
        },

        getFirstNodeFromPossibleArray = (nodeOrNodeArray) => {
            return nodeOrNodeArray.nodeType ? nodeOrNodeArray
                                            : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
                                            : null;
        },

        executeTemplate = (targetNodeOrNodeArray, replaceChildren, template, bindingContext) => {
            var firstTargetNode = targetNodeOrNodeArray && getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
            var templateDocument = (firstTargetNode || template || {}).ownerDocument;

            var renderedNodesArray = renderTemplateSource(makeTemplateSource(template, templateDocument));

            // Loosely check result is an array of DOM nodes
            if (!Array.isArray(renderedNodesArray) || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
                throw Error("Template engine must return an array of DOM nodes");

            if (replaceChildren) {
                ko.virtualElements.setDomNodeChildren(targetNodeOrNodeArray, renderedNodesArray);
                activateBindingsOnContinuousNodeArray(renderedNodesArray, bindingContext);
                ko.bindingEvent.notify(targetNodeOrNodeArray, ko.bindingEvent.childrenComplete);
            }

            return renderedNodesArray;
        },

        resolveTemplateName = (template, data, context) => {
            // The template can be specified as:
            if (ko.isObservable(template)) {
                // 1. An observable, with string value
                return template();
            }
            // 2. A function of (data, context) returning a string ELSE 3. A string
            return (typeof template === 'function') ? template(data, context) : template;
        },

        renderTemplate = (template, dataOrBindingContext, options, targetNodeOrNodeArray) => {
            options = options || {};

            if (targetNodeOrNodeArray) {
                var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);

                var whenToDispose = () => (!firstTargetNode) || !ko.utils.domNodeIsAttachedToDocument(firstTargetNode); // Passive disposal (on next evaluation)

                return ko.computed( // So the DOM is automatically updated when any dependency changes
                    () => {
                        // Ensure we've got a proper binding context to work with
                        var bindingContext = (dataOrBindingContext instanceof ko.bindingContext)
                            ? dataOrBindingContext
                            : new ko.bindingContext(dataOrBindingContext, null, null, { "exportDependencies": true });

                        var templateName = resolveTemplateName(template, bindingContext['$data'], bindingContext);
                        executeTemplate(targetNodeOrNodeArray, true, templateName, bindingContext, options);
                    },
                    { disposeWhen: whenToDispose, disposeWhenNodeIsRemoved: firstTargetNode }
                );
            } else {
                console.log('no targetNodeOrNodeArray');
            }
        },

        renderTemplateForEach = (template, arrayOrObservableArray, options, targetNode, parentBindingContext) => {
            // Since setDomNodeChildrenFromArrayMapping always calls executeTemplateForArrayItem and then
            // activateBindingsCallback for added items, we can store the binding context in the former to use in the latter.
            var arrayItemContext;

            // This will be called by setDomNodeChildrenFromArrayMapping to get the nodes to add to targetNode
            var executeTemplateForArrayItem = (arrayValue, index) => {
                // Support selecting template as a function of the data being rendered
                arrayItemContext = parentBindingContext['createChildContext'](arrayValue, {
                    'extend': context => context['$index'] = index
                });

                var templateName = resolveTemplateName(template, arrayValue, arrayItemContext);
                return executeTemplate(targetNode, false, templateName, arrayItemContext, options);
            };

            // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
            var activateBindingsCallback = (arrayValue, addedNodesArray) => {
                activateBindingsOnContinuousNodeArray(addedNodesArray, arrayItemContext);

                // release the "cache" variable, so that it can be collected by
                // the GC when its value isn't used from within the bindings anymore.
                arrayItemContext = null;
            };

            var setDomNodeChildrenFromArrayMapping = (newArray, changeList) => {
                // Call setDomNodeChildrenFromArrayMapping, ignoring any observables unwrapped within (most likely from a callback function).
                // If the array items are observables, though, they will be unwrapped in executeTemplateForArrayItem and managed within setDomNodeChildrenFromArrayMapping.
                ko.dependencyDetection.ignore(ko.utils.setDomNodeChildrenFromArrayMapping, null, [targetNode, newArray, executeTemplateForArrayItem, options, activateBindingsCallback, changeList]);
                ko.bindingEvent.notify(targetNode, ko.bindingEvent.childrenComplete);
            };

            if (ko['isObservableArray'](arrayOrObservableArray)) {
                setDomNodeChildrenFromArrayMapping(arrayOrObservableArray.peek());

                var subscription = arrayOrObservableArray['subscribe'](changeList => {
                    setDomNodeChildrenFromArrayMapping(arrayOrObservableArray(), changeList);
                }, null, "arrayChange");
                subscription.disposeWhenNodeIsRemoved(targetNode);

                return subscription;
            }
            return ko.computed(() => {
                var unwrappedArray = ko.utils.unwrapObservable(arrayOrObservableArray) || [];
                if (!Array.isArray(unwrappedArray)) // Coerce single value into array
                    unwrappedArray = [unwrappedArray];

                setDomNodeChildrenFromArrayMapping(unwrappedArray);

            }, { disposeWhenNodeIsRemoved: targetNode });
        },

        templateComputedDomDataKey = ko.utils.domData.nextKey(),
        disposeOldComputedAndStoreNewOne = (element, newComputed) => {
            var oldComputed = ko.utils.domData.get(element, templateComputedDomDataKey);
            oldComputed?.['dispose']?.();
            ko.utils.domData.set(element, templateComputedDomDataKey, (newComputed && (!newComputed.isActive || newComputed.isActive())) ? newComputed : undefined);
        };

    ko.bindingHandlers['template'] = {
        'init': (element, valueAccessor) => {
            // Support anonymous templates
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            if (typeof bindingValue == "string" || 'name' in bindingValue) {
                // It's a named template - clear the element
                ko.virtualElements.emptyNode(element);
            } else {
                // It's an anonymous template - store the element contents, then clear the element
                var templateNodes = ko.virtualElements.childNodes(element);
                if (templateNodes.length) {
                    let container = ko.utils.moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
                    new ko.templateSources.anonymousTemplate(element).nodes(container);
                } else {
                    throw Error("Anonymous template defined, but no template content was provided");
                }
            }
            return { 'controlsDescendantBindings': true };
        },
        'update': (element, valueAccessor, allBindings, viewModel, bindingContext) => {
            var value = valueAccessor(),
                options = ko.utils.unwrapObservable(value),
                shouldDisplay = true,
                templateComputed = null,
                template;

            if (typeof options == "string") {
                template = value;
                options = {};
            } else {
                template = 'name' in options ? options['name'] : element;
            }

            // Don't show anything if an empty name is given (see #2446)
            shouldDisplay = !!template;

            if ('foreach' in options) {
                // Render once for each data point (treating data set as empty if shouldDisplay==false)
                templateComputed = renderTemplateForEach(template, (shouldDisplay && options['foreach']) || [], options, element, bindingContext);
            } else if (!shouldDisplay) {
                ko.virtualElements.emptyNode(element);
            } else {
                // Render once for this single data point (or use the viewModel if no data was provided)
                var innerBindingContext = bindingContext;
                if ('data' in options) {
                    innerBindingContext = bindingContext['createChildContext'](options['data'], {
                        'exportDependencies': true
                    });
                }
                templateComputed = renderTemplate(template, innerBindingContext, options, element);
            }

            // It only makes sense to have a single template computed per element (otherwise which one should have its output displayed?)
            disposeOldComputedAndStoreNewOne(element, templateComputed);
        }
    };

    ko.virtualElements.allowedBindings['template'] = true;
})();
