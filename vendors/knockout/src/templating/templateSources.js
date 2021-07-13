(() => {
    // A template source represents a read/write way of accessing a template. This is to eliminate the need for template loading/saving
    // logic to be duplicated in every template engine (and means they can all work with anonymous templates, etc.)
    //
    // Two are provided by default:
    //  1. ko.templateSources.domElement       - reads/writes the text content of an arbitrary DOM element
    //  2. ko.templateSources.anonymousElement - uses ko.utils.domData to read/write text *associated* with the DOM element, but
    //                                           without reading/writing the actual element text content, since it will be overwritten
    //                                           with the rendered template output.
    //
    // Once you've implemented a templateSource, make your template engine use it by subclassing whatever template engine you were
    // using and overriding "makeTemplateSource" to return an instance of your custom template source.

    let templatesDomDataKey = ko.utils.domData.nextKey();

    // ---- ko.templateSources.anonymousTemplate -----
    // Anonymous templates are normally saved/retrieved as DOM nodes through "nodes".
    // For compatibility, you can also read "text"; it will be serialized from the nodes on demand.
    // Writing to "text" is still supported, but then the template data will not be available as DOM nodes.
    class anonymousTemplate
    {
        constructor(element)
        {
            this.domElement = element;
        }

        nodes(...args)
        {
            let element = this.domElement;
            if (!args.length) {
                return ko.utils.domData.get(element, templatesDomDataKey) || (
                        this.templateType === 11 ? element.content :
                        this.templateType === 1 ? element :
                        undefined);
            }
            ko.utils.domData.set(element, templatesDomDataKey, args[0]);
        }
    }

    // ---- ko.templateSources.domElement -----
    class domElement extends anonymousTemplate
    {
        constructor(element)
        {
            super(element);

            if (element) {
                this.templateType =
                    element.matches("TEMPLATE") && element.content ? element.content.nodeType : 1;
            }
        }
    }

    ko.templateSources = {
        domElement: domElement,
        anonymousTemplate: anonymousTemplate
    };
})();
