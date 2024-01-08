ko.bindingHandlers['value'] = {
    'init': (element, valueAccessor, allBindings) => {
        var isSelectElement = element.matches("SELECT"),
            isInputElement = element.matches("INPUT");

        // If the value binding is placed on a radio/checkbox, then just pass through to checkedValue and quit
        if (isInputElement && (element.type == "checkbox" || element.type == "radio")) {
            ko.applyBindingAccessorsToNode(element, { 'checkedValue': valueAccessor });
            return;
        }

        var eventsToCatch = new Set,
            requestedEventsToCatch = allBindings.get("valueUpdate"),
            elementValueBeforeEvent = null,
            updateFromModel,
            registerEventHandler = (event, handler) =>
                element.addEventListener(event, handler),

            valueUpdateHandler = () => {
                elementValueBeforeEvent = null;
                var modelValue = valueAccessor();
                var elementValue = ko.selectExtensions.readValue(element);
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'value', elementValue);
            };

        if (requestedEventsToCatch) {
            // Allow both individual event names, and arrays of event names
            if (typeof requestedEventsToCatch == "string") {
                eventsToCatch.add(requestedEventsToCatch);
            } else {
                requestedEventsToCatch.forEach(item => eventsToCatch.add(item));
            }
            eventsToCatch.delete("change");  // We'll subscribe to "change" events later
        }

        eventsToCatch.forEach(eventName => {
            // The syntax "after<eventname>" means "run the handler asynchronously after the event"
            // This is useful, for example, to catch "keydown" events after the browser has updated the control
            // (otherwise, ko.selectExtensions.readValue(this) will receive the control's value *before* the key event)
            var handler = valueUpdateHandler;
            if ((eventName||'').startsWith("after")) {
                handler = () => {
                    // The elementValueBeforeEvent variable is non-null *only* during the brief gap between
                    // a keyX event firing and the valueUpdateHandler running, which is scheduled to happen
                    // at the earliest asynchronous opportunity. We store this temporary information so that
                    // if, between keyX and valueUpdateHandler, the underlying model value changes separately,
                    // we can overwrite that model value change with the value the user just typed. Otherwise,
                    // techniques like rateLimit can trigger model changes at critical moments that will
                    // override the user's inputs, causing keystrokes to be lost.
                    elementValueBeforeEvent = ko.selectExtensions.readValue(element);
                    setTimeout(valueUpdateHandler, 0);
                };
                eventName = eventName.slice(5);
            }
            registerEventHandler(eventName, handler);
        });

        if (isInputElement && element.type == "file") {
            // For file input elements, can only write the empty string
            updateFromModel = () => {
                var newValue = ko.utils.unwrapObservable(valueAccessor());
                if (newValue == null || newValue === "") {
                    element.value = "";
                } else {
                    ko.dependencyDetection.ignore(valueUpdateHandler);  // reset the model to match the element
                }
            }
        } else {
            updateFromModel = () => {
                var newValue = ko.utils.unwrapObservable(valueAccessor());
                var elementValue = ko.selectExtensions.readValue(element);

                if (elementValueBeforeEvent !== null && newValue === elementValueBeforeEvent) {
                    setTimeout(updateFromModel, 0);
                    return;
                }

                var valueHasChanged = newValue !== elementValue;

                if (valueHasChanged || elementValue === undefined) {
                    if (isSelectElement) {
                        var allowUnset = allBindings.get('valueAllowUnset');
                        ko.selectExtensions.writeValue(element, newValue, allowUnset);
                        if (!allowUnset && newValue !== ko.selectExtensions.readValue(element)) {
                            // If you try to set a model value that can't be represented in an already-populated dropdown, reject that change,
                            // because you're not allowed to have a model value that disagrees with a visible UI selection.
                            ko.dependencyDetection.ignore(valueUpdateHandler);
                        }
                    } else {
                        ko.selectExtensions.writeValue(element, newValue);
                    }
                }
            };
        }

        if (isSelectElement) {
            var updateFromModelComputed;
            ko.bindingEvent.subscribe(element, ko.bindingEvent.childrenComplete, () => {
                if (!updateFromModelComputed) {
                    registerEventHandler("change", valueUpdateHandler);
                    updateFromModelComputed = ko.computed(updateFromModel, { disposeWhenNodeIsRemoved: element });
                } else if (allBindings.get('valueAllowUnset')) {
                    updateFromModel();
                } else {
                    valueUpdateHandler();
                }
            }, null, { 'notifyImmediately': true });
        } else {
            registerEventHandler("change", valueUpdateHandler);
            ko.computed(updateFromModel, { disposeWhenNodeIsRemoved: element });
        }
    },
    'update': () => {} // Keep for backwards compatibility with code that may have wrapped value binding
};
//ko.expressionRewriting.twoWayBindings.add('value');
