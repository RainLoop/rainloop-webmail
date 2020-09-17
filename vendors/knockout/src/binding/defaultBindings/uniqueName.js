ko.bindingHandlers['uniqueName'] = {
    'init': function (element, valueAccessor) {
        if (valueAccessor()) {
            element.name = "ko_unique_" + (++ko.bindingHandlers['uniqueName'].currentIndex);
        }
    }
};
ko.bindingHandlers['uniqueName'].currentIndex = 0;
