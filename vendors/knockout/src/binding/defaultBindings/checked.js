(()=>{

ko.bindingHandlers['checked'] = {
    'after': ['value', 'attr'],
    'init': function (element, valueAccessor, allBindings) {
        var isCheckbox = element.type == "checkbox",
            isRadio = element.type == "radio";

        // Only bind to check boxes and radio buttons
        if (isCheckbox || isRadio) {
            const checkedValue = ko.pureComputed(()=>{
                if (isRadio) {
                    return allBindings['has']('value')
                        ? ko.utils.unwrapObservable(allBindings.get('value'))
                        : element.value;
                }
            });

            // Set up two computeds to update the binding:

            // The first responds to element clicks
            element.addEventListener("click", () => {
                // When we're first setting up this computed, don't change any model state.
                if (ko.dependencyDetection.isInitial()) {
                    return;
                }

                // This updates the model value from the view value.
                // It runs in response to DOM events (click) and changes in checkedValue.
                var isChecked = element.checked;

                // We can ignore unchecked radio buttons, because some other radio
                // button will be checked, and that one can take care of updating state.
                // Also ignore value changes to an already unchecked checkbox.
                if (!isChecked && (isRadio || ko.dependencyDetection.getDependenciesCount())) {
                    return;
                }

                var elemValue = isCheckbox ? isChecked : checkedValue(),
                    modelValue = ko.dependencyDetection.ignore(valueAccessor);
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'checked', elemValue, true);
            }),

            // The second responds to changes in the model value (the one associated with the checked binding)
            ko.computed(() => {
                // This updates the view value from the model value.
                // It runs in response to changes in the bound (checked) value.
                var modelValue = ko.utils.unwrapObservable(valueAccessor());
                element.checked = isCheckbox ? !!modelValue : (checkedValue() === modelValue);
            }, null, { disposeWhenNodeIsRemoved: element });
        }
    }
};

ko.expressionRewriting.twoWayBindings['checked'] = true;

})();
