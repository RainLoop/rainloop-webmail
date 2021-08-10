(function () {

// Makes a binding like with or if
function makeWithIfBinding(bindingKey, isWith, isNot) {
    ko.bindingHandlers[bindingKey] = {
        'init': (element, valueAccessor, allBindings, viewModel, bindingContext) => {
            var didDisplayOnLastUpdate, savedNodes, contextOptions = {}, needAsyncContext, renderOnEveryChange;

            if (isWith) {
                var as = allBindings.get('as'), noChildContext = allBindings.get('noChildContext');
                renderOnEveryChange = !(as && noChildContext);
                contextOptions = { 'as': as, 'noChildContext': noChildContext, 'exportDependencies': renderOnEveryChange };
            }

            needAsyncContext = allBindings['has'](ko.bindingEvent.descendantsComplete);

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
                    if (!isWith || renderOnEveryChange) {
                        contextOptions['dataDependency'] = ko.dependencyDetection.computed();
                    }

                    if (isWith) {
                        childContext = bindingContext['createChildContext'](typeof value == "function" ? value : valueAccessor, contextOptions);
                    } else if (ko.dependencyDetection.getDependenciesCount()) {
                        childContext = bindingContext['extend'](null, contextOptions);
                    } else {
                        childContext = bindingContext;
                    }
                }

                // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                if (isInitial && ko.dependencyDetection.getDependenciesCount()) {
                    savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                }

                if (shouldDisplay) {
                    if (!isInitial) {
                        ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));
                    }

                    ko.applyBindingsToDescendants(childContext, element);
                } else {
                    ko.virtualElements.emptyNode(element);

                    ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
                }

                didDisplayOnLastUpdate = shouldDisplay;

            }, { disposeWhenNodeIsRemoved: element });

            return { 'controlsDescendantBindings': true };
        }
    };
    ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
    ko.virtualElements.allowedBindings[bindingKey] = true;
}

// Construct the actual binding handlers
makeWithIfBinding('if');
makeWithIfBinding('ifnot', false /* isWith */, true /* isNot */);
makeWithIfBinding('with', true /* isWith */);

})();
