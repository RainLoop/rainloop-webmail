// For certain common events (currently just 'click'), allow a simplified data-binding syntax
// e.g. click:handler instead of the usual full-length event:{click:handler}
function makeEventHandlerShortcut(eventName) {
    ko.bindingHandlers[eventName] = {
        'init'(element, valueAccessor, allBindings, viewModel, bindingContext) {
            return ko.bindingHandlers['event']['init'].call(this, element,
                () => ({[eventName]: valueAccessor()}), // newValueAccessor
                allBindings, viewModel, bindingContext);
        }
    }
}

ko.bindingHandlers['event'] = {
    'init'(element, valueAccessor, allBindings, viewModel, bindingContext) {
        ko.utils.objectForEach(valueAccessor() || {}, eventName => {
            if (typeof eventName == "string") {
                element.addEventListener(eventName, (...args) => {
                    var handlerReturnValue,
                        handlerFunction = valueAccessor()[eventName];
                    if (handlerFunction) {
                        try {
                            viewModel = bindingContext['$data'];
                            // Take all the event args, and prefix with the viewmodel
                            handlerReturnValue = handlerFunction.apply(viewModel, [viewModel, ...args]);
                        } finally {
                            if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                                args[0].preventDefault();
                            }
                        }
                    }
                });
            }
        });
    }
};
