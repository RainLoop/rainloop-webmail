(() => {
    var componentLoadingOperationUniqueId = 0;

    ko.bindingHandlers['component'] = {
        'init': (element, valueAccessor, ignored1, ignored2, bindingContext) => {
            var currentViewModel,
                currentLoadingOperationId,
                afterRenderSub,
                disposeAssociatedComponentViewModel = () => {
                    var currentViewModelDispose = currentViewModel && currentViewModel['dispose'];
                    if (typeof currentViewModelDispose === 'function') {
                        currentViewModelDispose.call(currentViewModel);
                    }
                    if (afterRenderSub) {
                        afterRenderSub['dispose']();
                    }
                    afterRenderSub = null;
                    currentViewModel = null;
                    // Any in-flight loading operation is no longer relevant, so make sure we ignore its completion
                    currentLoadingOperationId = null;
                },
                originalChildNodes = [...ko.virtualElements.childNodes(element)];

            ko.virtualElements.emptyNode(element);
            ko.utils.domNodeDisposal['addDisposeCallback'](element, disposeAssociatedComponentViewModel);

            ko.computed(() => {
                var componentName = ko.utils.unwrapObservable(valueAccessor()),
                    componentParams;

                if (typeof componentName !== 'string') {
                    componentParams = ko.utils.unwrapObservable(componentName['params']);
                    componentName = ko.utils.unwrapObservable(componentName['name']);
                }

                if (!componentName) {
                    throw new Error('No component name specified');
                }

                var asyncContext = ko.bindingEvent.startPossiblyAsyncContentBinding(element, bindingContext);

                var loadingOperationId = currentLoadingOperationId = ++componentLoadingOperationUniqueId;
                ko['components'].get(componentName, componentDefinition => {
                    // If this is the current load operation for this element
                    if (currentLoadingOperationId === loadingOperationId) {
                        // Clean up previous state
                        disposeAssociatedComponentViewModel();

                        // Instantiate and bind new component. Implicitly this cleans any old DOM nodes.
                        if (!componentDefinition) {
                            throw new Error('Unknown component \'' + componentName + '\'');
                        }
                        // cloneTemplateIntoElement
                        var template = componentDefinition['template'];
                        if (!template) {
                            throw new Error('Component \'' + componentName + '\' has no template');
                        }
                        ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(template));

                        currentViewModel = componentDefinition['createViewModel'](componentParams, {
                            'element': element,
                            'templateNodes': originalChildNodes
                        });
                        ko.applyBindingsToDescendants(asyncContext['createChildContext'](currentViewModel, {
                                'extend': ctx => {
                                    ctx['$component'] = currentViewModel;
                                    ctx['$componentTemplateNodes'] = originalChildNodes;
                                }
                            }), element);
                    }
                });
            }, { disposeWhenNodeIsRemoved: element });

            return { 'controlsDescendantBindings': true };
        }
    };

    ko.virtualElements.allowedBindings['component'] = true;

})();
