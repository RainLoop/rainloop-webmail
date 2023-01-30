ko.bindingHandlers['textInput'] = {
    'init': (element, valueAccessor, allBindings) => {

        var previousElementValue = element.value,
            timeoutHandle,
            elementValueBeforeEvent;

        var updateModel = () => {
            clearTimeout(timeoutHandle);
            elementValueBeforeEvent = timeoutHandle = undefined;

            var elementValue = element.value;
            if (previousElementValue !== elementValue) {
                // Provide a way for tests to know exactly which event was processed
                previousElementValue = elementValue;
                ko.expressionRewriting.writeValueToProperty(valueAccessor(), allBindings, 'textInput', elementValue);
            }
        };

        var updateView = () => {
            var modelValue = ko.utils.unwrapObservable(valueAccessor());

            if (modelValue == null) {
                modelValue = '';
            }

            if (elementValueBeforeEvent !== undefined && modelValue === elementValueBeforeEvent) {
                setTimeout(updateView, 4);
                return;
            }

            // Update the element only if the element and model are different. On some browsers, updating the value
            // will move the cursor to the end of the input, which would be bad while the user is typing.
            if (element.value !== modelValue) {
                element.value = modelValue;
                previousElementValue = element.value; // In case the browser changes the value (see #2281)
            }
        };

        var onEvent = (event, handler) =>
            element.addEventListener(event, handler);

        onEvent('input', updateModel);

        // Bind to the change event so that we can catch programmatic updates of the value that fire this event.
        onEvent('change', updateModel);

        // To deal with browsers that don't notify any kind of event for some changes (IE, Safari, etc.)
        onEvent('blur', updateModel);

        ko.computed(updateView, { disposeWhenNodeIsRemoved: element });
    }
};
ko.expressionRewriting.twoWayBindings.add('textInput');

// textinput is an alias for textInput
ko.bindingHandlers['textinput'] = {
    // preprocess is the only way to set up a full alias
    'preprocess': (value, name, addBinding) => addBinding('textInput', value)
};
