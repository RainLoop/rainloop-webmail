(() => {

// Makes a binding like with or if
function makeWithIfBinding(bindingKey, isWith, isNot) {
    ko.bindingHandlers[bindingKey] = {
        'init': (element, valueAccessor, allBindings, viewModel, bindingContext) => {
            var savedNodes, contextOptions = {}, needAsyncContext;

            if (isWith) {
                contextOptions = { 'exportDependencies': true };
            }

            needAsyncContext = allBindings['has'](ko.bindingEvent.descendantsComplete);

            ko.computed(() => {
                var value = ko.utils.unwrapObservable(valueAccessor()),
                    shouldDisplay = !isNot !== !value, // equivalent to isNot ? !value : !!value,
                    isInitial = !savedNodes,
                    childContext;

                if (needAsyncContext) {
                    bindingContext = ko.bindingEvent.startPossiblyAsyncContentBinding(element, bindingContext);
                }

                if (shouldDisplay) {
                    contextOptions['dataDependency'] = ko.dependencyDetection.computed();

                    childContext = isWith
                        ? bindingContext['createChildContext'](typeof value == "function" ? value : valueAccessor, contextOptions)
                        : (ko.dependencyDetection.getDependenciesCount()
                            ? bindingContext['extend'](null, contextOptions)
                            : bindingContext
                        );
                }

                // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                if (isInitial && ko.dependencyDetection.getDependenciesCount()) {
                    savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                }

                if (shouldDisplay) {
                    isInitial || ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));

                    ko.applyBindingsToDescendants(childContext, element);
                } else {
                    ko.virtualElements.emptyNode(element);

                    ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
                }

            }, { disposeWhenNodeIsRemoved: element });

            return { 'controlsDescendantBindings': true };
        }
    };
    ko.virtualElements.allowedBindings[bindingKey] = true;
}

// Construct the actual binding handlers
makeWithIfBinding('if');
makeWithIfBinding('ifnot', false /* isWith */, true /* isNot */);
makeWithIfBinding('with', true /* isWith */);

})();
