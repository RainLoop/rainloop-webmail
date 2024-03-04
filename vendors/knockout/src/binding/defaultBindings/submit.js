ko.bindingHandlers['submit'] = {
    'init': (element, valueAccessor, allBindings, viewModel, bindingContext) => {
        if (typeof valueAccessor() != "function")
            throw Error("The value for a submit binding must be a function");
        element.addEventListener("submit", event => {
            var handlerReturnValue;
            var value = valueAccessor();
            try { handlerReturnValue = value.call(bindingContext['$data'], element); }
            finally {
                if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                    event.preventDefault();
                }
            }
        });
    }
};
