(() => {

// Makes a binding like with or if
function makeIfBinding(bindingKey, isNot) {
    ko.bindingHandlers[bindingKey] = {
        'init': (element, valueAccessor, allBindings, viewModel, bindingContext) => {
            var didDisplayOnLastUpdate, savedNodes, contextOptions = {}, completeOnRender, needAsyncContext, renderOnEveryChange;

            completeOnRender = allBindings.get("completeOn") == "render";
            needAsyncContext = completeOnRender || allBindings['has'](ko.bindingEvent.descendantsComplete);

            ko.computed(() => {
                var value = ko.utils.unwrapObservable(valueAccessor()),
                    shouldDisplay = !isNot !== !value, // equivalent to isNot ? !value : !!value,
                    isInitial = !savedNodes,
                    childContext;

                if (!renderOnEveryChange && shouldDisplay === didDisplayOnLastUpdate) {
                    return;
                }

                if (needAsyncContext) {
                    bindingContext = ko.bindingEvent.startPossiblyAsyncContentBinding(element, bindingContext);
                }

                if (shouldDisplay) {
                    if (renderOnEveryChange) {
                        contextOptions['dataDependency'] = ko.computedContext.computed();
                    }

                    if (ko.computedContext.getDependenciesCount()) {
                        childContext = bindingContext['extend'](null, contextOptions);
                    } else {
                        childContext = bindingContext;
                    }
                }

                // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                if (isInitial && ko.computedContext.getDependenciesCount()) {
                    savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                }

                if (shouldDisplay) {
                    if (!isInitial) {
                        ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));
                    }

                    ko.applyBindingsToDescendants(childContext, element);
                } else {
                    ko.virtualElements.emptyNode(element);

                    if (!completeOnRender) {
                        ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
                    }
                }

                didDisplayOnLastUpdate = shouldDisplay;

            }, null, { disposeWhenNodeIsRemoved: element });

            return { 'controlsDescendantBindings': true };
        }
    };
    ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
    ko.virtualElements.allowedBindings[bindingKey] = true;
}

// Construct the actual binding handlers
makeIfBinding('if');
makeIfBinding('ifnot', true);

})();
