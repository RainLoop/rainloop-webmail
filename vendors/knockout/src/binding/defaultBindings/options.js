var captionPlaceholder = {};
ko.bindingHandlers['options'] = {
    'init': element => {
        if (!element.matches("SELECT"))
            throw new Error("options binding applies only to SELECT elements");

        // Remove all existing <option>s.
        let l = element.length;
        while (l--) {
            element.remove(l);
        }

        // Ensures that the binding processor doesn't try to bind the options
        return { 'controlsDescendantBindings': true };
    },
    'update': (element, valueAccessor, allBindings) => {

        var selectWasPreviouslyEmpty = element.length == 0,
            multiple = element.multiple,
            previousScrollTop = (!selectWasPreviouslyEmpty && multiple) ? element.scrollTop : null,
            unwrappedArray = ko.utils.unwrapObservable(valueAccessor()),
            arrayToDomNodeChildrenOptions = {},
            captionValue,
            filteredArray,
            previousSelectedValues = [],

            selectedOptions = () => Array.from(element.options).filter(node => node.selected),

            applyToObject = (object, predicate, defaultValue) => {
                var predicateType = typeof predicate;
                if (predicateType == "function")    // Given a function; run it against the data value
                    return predicate(object);
                else if (predicateType == "string") // Given a string; treat it as a property name on the data value
                    return object[predicate];
                                                    // Given no optionsText arg; use the data value itself
                    return defaultValue;
            },

            setSelectionCallback = (arrayEntry, newOptions) => {
                if (previousSelectedValues.length) {
                    // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
                    // That's why we first added them without selection. Now it's time to set the selection.
                    var isSelected = previousSelectedValues.includes(ko.selectExtensions.readValue(newOptions[0]));
                    newOptions[0].selected = isSelected;

                    // If this option was changed from being selected during a single-item update, notify the change
                    if (itemUpdate && !isSelected) {
                        ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
                    }
                }
            };

        if (multiple) {
            previousSelectedValues = selectedOptions().map(ko.selectExtensions.readValue);
        } else if (element.selectedIndex >= 0) {
            previousSelectedValues.push(ko.selectExtensions.readValue(element.options[element.selectedIndex]));
        }

        if (unwrappedArray) {
            if (!Array.isArray(unwrappedArray)) // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            filteredArray = unwrappedArray.filter(item => item || item == null);
        } else {
            // If a falsy value is provided (e.g. null), we'll simply empty the select element
        }

        // The following functions can run at two different times:
        // The first is when the whole array is being updated directly from this binding handler.
        // The second is when an observable value for a specific array entry is updated.
        // oldOptions will be empty in the first case, but will be filled with the previously generated option in the second.
        var itemUpdate = false,
        optionForArrayItem = (arrayEntry, index, oldOptions) => {
            if (oldOptions.length) {
                previousSelectedValues = oldOptions[0].selected ? [ ko.selectExtensions.readValue(oldOptions[0]) ] : [];
                itemUpdate = true;
            }
            var option = element.ownerDocument.createElement("option");
            if (arrayEntry === captionPlaceholder) {
                ko.utils.setTextContent(option);
                ko.selectExtensions.writeValue(option, undefined);
            } else {
                // Apply a value to the option element
                var optionValue = applyToObject(arrayEntry, allBindings.get('optionsValue'), arrayEntry);
                ko.selectExtensions.writeValue(option, ko.utils.unwrapObservable(optionValue));

                // Apply some text to the option element
                var optionText = applyToObject(arrayEntry, allBindings.get('optionsText'), optionValue);
                ko.utils.setTextContent(option, optionText);
            }
            return [option];
        };

        var callback = setSelectionCallback;
        if (allBindings['has']('optionsAfterRender') && typeof allBindings.get('optionsAfterRender') == "function") {
            callback = (arrayEntry, newOptions) => {
                setSelectionCallback(arrayEntry, newOptions);
                ko.dependencyDetection.ignore(allBindings.get('optionsAfterRender'), null, [newOptions[0], arrayEntry !== captionPlaceholder ? arrayEntry : undefined]);
            }
        }

        ko.utils.setDomNodeChildrenFromArrayMapping(element, filteredArray, optionForArrayItem, arrayToDomNodeChildrenOptions, callback);

        // Determine if the selection has changed as a result of updating the options list
        var selectionChanged, prevLength = previousSelectedValues.length;
        if (multiple) {
            // For a multiple-select box, compare the new selection count to the previous one
            // But if nothing was selected before, the selection can't have changed
            selectionChanged = prevLength && selectedOptions().length < prevLength;
        } else {
            // For a single-select box, compare the current value to the previous value
            // But if nothing was selected before or nothing is selected now, just look for a change in selection
            selectionChanged = (prevLength && element.selectedIndex >= 0)
                ? (ko.selectExtensions.readValue(element.options[element.selectedIndex]) !== previousSelectedValues[0])
                : (prevLength || element.selectedIndex >= 0);
        }

        // Ensure consistency between model value and selected option.
        // If the dropdown was changed so that selection is no longer the same,
        // notify the value or selectedOptions binding.
        selectionChanged && ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);

        if (ko.dependencyDetection.isInitial()) {
            ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
        }

        if (previousScrollTop && Math.abs(previousScrollTop - element.scrollTop) > 20)
            element.scrollTop = previousScrollTop;
    }
};
ko.bindingHandlers['options'].optionValueDomDataKey = ko.utils.domData.nextKey();
