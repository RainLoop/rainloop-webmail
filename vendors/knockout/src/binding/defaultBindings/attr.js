ko.bindingHandlers['attr'] = {
    'update': (element, valueAccessor) => {
        var value = ko.utils.unwrapObservable(valueAccessor()) || {};
        ko.utils.objectForEach(value, function(attrName, attrValue) {
            attrValue = ko.utils.unwrapObservable(attrValue);

            // Find the namespace of this attribute, if any.
            var prefixLen = attrName.indexOf(':');
            var namespace = "lookupNamespaceURI" in element && prefixLen > 0 && element.lookupNamespaceURI(attrName.slice(0, prefixLen));

            // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
            // when someProp is a "no value"-like value (strictly null, false, or undefined)
            // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
            var toRemove = (attrValue === false) || (attrValue == null);
            if (toRemove) {
                namespace ? element.removeAttributeNS(namespace, attrName) : element.removeAttribute(attrName);
            } else {
                attrValue = attrValue.toString();
                namespace ? element.setAttributeNS(namespace, attrName, attrValue) : element.setAttribute(attrName, attrValue);
            }
        });
    }
};
