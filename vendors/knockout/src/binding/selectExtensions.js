
const hasDomDataExpandoProperty = '__ko__hasDomDataOptionValue__';

// Normally, SELECT elements and their OPTIONs can only take value of type 'string' (because the values
// are stored on DOM attributes). ko.selectExtensions provides a way for SELECTs/OPTIONs to have values
// that are arbitrary objects. This is very convenient when implementing things like cascading dropdowns.
ko.selectExtensions = {
    readValue : element => {
        switch (element.nodeName) {
            case 'OPTION':
                return (element[hasDomDataExpandoProperty] === true)
                    ? ko.utils.domData.get(element, ko.bindingHandlers.options.optionValueDomDataKey)
                    : element.value;
            case 'SELECT':
                return element.selectedIndex >= 0
                    ? ko.selectExtensions.readValue(element.options[element.selectedIndex])
                    : undefined;
            default:
                return element.value;
        }
    },

    writeValue: (element, value) => {
        switch (element.nodeName) {
            case 'OPTION':
                if (typeof value === "string") {
                    ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, undefined);
                    delete element[hasDomDataExpandoProperty];
                    element.value = value;
                }
                else {
                    // Store arbitrary object using DomData
                    ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, value);
                    element[hasDomDataExpandoProperty] = true;

                    // Special treatment of numbers is just for backward compatibility. KO 1.2.1 wrote numerical values to element.value.
                    element.value = typeof value === "number" ? value : "";
                }
                break;
            case 'SELECT':
                // A blank string or null value will select the caption
                var selection = -1, noValue = ("" === value || null == value),
                    i = element.options.length, optionValue;
                while (i--) {
                    optionValue = ko.selectExtensions.readValue(element.options[i]);
                    // Include special check to handle selecting a caption with a blank string value
                    if (optionValue == value || (optionValue === "" && noValue)) {
                        selection = i;
                        break;
                    }
                }
                if (selection >= 0 || (noValue && element.size > 1)) {
                    element.selectedIndex = selection;
                }
                break;
            default:
                element.value = (value == null) ? "" : value;
                break;
        }
    }
};
