ko.bindingHandlers['text'] = {
    'init': () => {
        // Prevent binding on the dynamically-injected text node (as developers are unlikely to expect that, and it has security implications).
        // It should also make things faster, as we no longer have to consider whether the text node might be bindable.
        return { 'controlsDescendantBindings': true };
    },
    'update': (element, valueAccessor) => {
        if (8 === element.nodeType) {
            element.text || element.after(element.text = document.createTextNode(''));
            element = element.text;
        }
        ko.utils.setTextContent(element, valueAccessor());
    }
};
ko.virtualElements.allowedBindings['text'] = true;
