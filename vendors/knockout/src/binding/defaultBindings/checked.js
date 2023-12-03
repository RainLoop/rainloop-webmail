(()=>{

ko.bindingHandlers['checked'] = {
    'after': ['value', 'attr'],
    'init': function (element, valueAccessor, allBindings) {
        var isCheckbox = element.type == "checkbox",
            isRadio = element.type == "radio";

        // Only bind to check boxes and radio buttons
        if (isCheckbox || isRadio) {
            const checkedValue = ko.pureComputed(()=>{
                // Treat "value" like "checkedValue" when it is included with "checked" binding
                if (allBindings['has']('checkedValue')) {
                    return ko.utils.unwrapObservable(allBindings.get('checkedValue'));
                } else if (useElementValue) {
                    return allBindings['has']('value')
                        ? ko.utils.unwrapObservable(allBindings.get('value'))
                        : element.value;
                }
            });

            var updateModel = () => {
                // When we're first setting up this computed, don't change any model state.
                if (ko.dependencyDetection.isInitial()) {
                    return;
                }

                // This updates the model value from the view value.
                // It runs in response to DOM events (click) and changes in checkedValue.
                var isChecked = element.checked,
                    elemValue = checkedValue();

                // We can ignore unchecked radio buttons, because some other radio
                // button will be checked, and that one can take care of updating state.
                // Also ignore value changes to an already unchecked checkbox.
                if (!isChecked && (isRadio || ko.dependencyDetection.getDependenciesCount())) {
                    return;
                }

                var modelValue = ko.dependencyDetection.ignore(valueAccessor);
                if (valueIsArray) {
                    var writableValue = rawValueIsNonArrayObservable ? modelValue.peek() : modelValue,
                        saveOldValue = oldElemValue;
                    oldElemValue = elemValue;

                    if (saveOldValue !== elemValue) {
                        // When we're responding to the checkedValue changing, and the element is
                        // currently checked, replace the old elem value with the new elem value
                        // in the model array.
                        if (isChecked) {
							writableValue.push(elemValue);
							writableValue.remove(saveOldValue);
                        }
                    } else {
                        // When we're responding to the user having checked/unchecked a checkbox,
                        // add/remove the element value to the model array.
                        isChecked ? writableValue.push(elemValue) : writableValue.remove(elemValue);
                    }

                    if (rawValueIsNonArrayObservable && ko.isWriteableObservable(modelValue)) {
                        modelValue(writableValue);
                    }
                } else {
                    if (isCheckbox) {
                        if (elemValue === undefined) {
                            elemValue = isChecked;
                        } else if (!isChecked) {
                            elemValue = undefined;
                        }
                    }
                    ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'checked', elemValue, true);
                }
            }

            var rawValue = valueAccessor(),
                valueIsArray = isCheckbox && (ko.utils.unwrapObservable(rawValue) instanceof Array),
                rawValueIsNonArrayObservable = !(valueIsArray && rawValue.push && rawValue.splice),
                useElementValue = isRadio || valueIsArray,
                oldElemValue = valueIsArray ? checkedValue() : undefined;

            // IE 6 won't allow radio buttons to be selected unless they have a name
            if (isRadio && !element.name)
                ko.bindingHandlers['uniqueName']['init'](element, function() { return true });

            // Set up two computeds to update the binding:

            // The first responds to changes in the checkedValue value and to element clicks
            ko.computed(updateModel, null, { disposeWhenNodeIsRemoved: element });
            element.addEventListener("click", updateModel);

            // The second responds to changes in the model value (the one associated with the checked binding)
            ko.computed(() => {
                // This updates the view value from the model value.
                // It runs in response to changes in the bound (checked) value.
                var modelValue = ko.utils.unwrapObservable(valueAccessor()),
                    elemValue = checkedValue();

                if (valueIsArray) {
                    // When a checkbox is bound to an array, being checked represents its value being present in that array
                    element.checked = modelValue.includes(elemValue);
                    oldElemValue = elemValue;
                } else if (isCheckbox && elemValue === undefined) {
                    // When a checkbox is bound to any other value (not an array) and "checkedValue" is not defined,
                    // being checked represents the value being trueish
                    element.checked = !!modelValue;
                } else {
                    // Otherwise, being checked means that the checkbox or radio button's value corresponds to the model value
                    element.checked = (checkedValue() === modelValue);
                }
            }, null, { disposeWhenNodeIsRemoved: element });

            rawValue = undefined;
        }
    }
};
ko.expressionRewriting.twoWayBindings['checked'] = true;

ko.bindingHandlers['checkedValue'] = {
    'update': function (element, valueAccessor) {
        element.value = ko.utils.unwrapObservable(valueAccessor());
    }
};

})();
