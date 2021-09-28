// For certain common events (currently just 'click'), allow a simplified data-binding syntax
// e.g. click:handler instead of the usual full-length event:{click:handler}
function makeEventHandlerShortcut(eventName) {
    ko.bindingHandlers[eventName] = {
        'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var newValueAccessor = () => {
                return {
                    [eventName]: valueAccessor()
                };
            };
            return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindings, viewModel, bindingContext);
        }
    }
}

ko.bindingHandlers['event'] = {
    'init' : (element, valueAccessor, allBindings, viewModel, bindingContext) => {
        var eventsToHandle = valueAccessor() || {};
        ko.utils.objectForEach(eventsToHandle, eventName => {
            if (typeof eventName == "string") {
                element.addEventListener(eventName, function (event) {
                    var handlerReturnValue;
                    var handlerFunction = valueAccessor()[eventName];
                    if (!handlerFunction)
                        return;

                    try {
                        viewModel = bindingContext['$data'];
                        // Take all the event args, and prefix with the viewmodel
                        handlerReturnValue = handlerFunction.apply(viewModel, [viewModel, ...arguments]);
                    } finally {
                        if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                            event.preventDefault();
                        }
                    }
                });
            }
        });
    }
};
