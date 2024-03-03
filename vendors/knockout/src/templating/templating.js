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
                    throw new Error("Cannot find template with ID " + template);
                return new ko.templateSources.domElement(elem);
            }
            if ([1,8].includes(template.nodeType)) {
                // Anonymous template
                return new ko.templateSources.anonymousTemplate(template);
            }
            throw new Error("Unknown template type: " + template);
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
            if ((typeof renderedNodesArray.length != "number") || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
                throw new Error("Template engine must return an array of DOM nodes");

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
        },

        cleanContainerDomDataKey = ko.utils.domData.nextKey();

    ko.bindingHandlers['template'] = {
        'init': (element, valueAccessor) => {
            // Support anonymous templates
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            if (typeof bindingValue == "string" || 'name' in bindingValue) {
                // It's a named template - clear the element
                ko.virtualElements.emptyNode(element);
            } else if ('nodes' in bindingValue) {
                // We've been given an array of DOM nodes. Save them as the template source.
                // There is no known use case for the node array being an observable array (if the output
                // varies, put that behavior *into* your template - that's what templates are for), and
                // the implementation would be a mess, so assert that it's not observable.
                var nodes = bindingValue['nodes'] || [];
                if (ko.isObservable(nodes)) {
                    throw new Error('The "nodes" option must be a plain, non-observable array.');
                }

                // If the nodes are already attached to a KO-generated container, we reuse that container without moving the
                // elements to a new one (we check only the first node, as the nodes are always moved together)
                let container = nodes[0]?.parentNode;
                if (!container || !ko.utils.domData.get(container, cleanContainerDomDataKey)) {
                    container = ko.utils.moveCleanedNodesToContainerElement(nodes);
                    ko.utils.domData.set(container, cleanContainerDomDataKey, true);
                }

                new ko.templateSources.anonymousTemplate(element).nodes(container);
            } else {
                // It's an anonymous template - store the element contents, then clear the element
                var templateNodes = ko.virtualElements.childNodes(element);
                if (templateNodes.length) {
                    let container = ko.utils.moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
                    new ko.templateSources.anonymousTemplate(element).nodes(container);
                } else {
                    throw new Error("Anonymous template defined, but no template content was provided");
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

                // Support "if"/"ifnot" conditions
                if ('if' in options)
                    shouldDisplay = ko.utils.unwrapObservable(options['if']);
                if (shouldDisplay && 'ifnot' in options)
                    shouldDisplay = !ko.utils.unwrapObservable(options['ifnot']);

                // Don't show anything if an empty name is given (see #2446)
                if (shouldDisplay && !template) {
                    shouldDisplay = false;
                }
            }

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

    // Anonymous templates can't be rewritten. Give a nice error message if you try to do it.
    ko.expressionRewriting.bindingRewriteValidators['template'] = bindingValue => {
        var parsedBindingValue = ko.expressionRewriting.parseObjectLiteral(bindingValue);

        if ((parsedBindingValue.length == 1) && parsedBindingValue[0]['unknown'])
            return null; // It looks like a string literal, not an object literal, so treat it as a named template (which is allowed for rewriting)

        if (ko.expressionRewriting.keyValueArrayContainsKey(parsedBindingValue, "name"))
            return null; // Named templates can be rewritten, so return "no error"
        return "This template engine does not support anonymous templates nested within its templates";
    };

    ko.virtualElements.allowedBindings['template'] = true;
})();
