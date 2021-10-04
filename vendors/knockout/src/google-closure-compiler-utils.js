// Google Closure Compiler helpers (used only to make the minified file smaller)
ko.exportSymbol = (koPath, object) => {
    var tokens = koPath.split(".");

    // In the future, "ko" may become distinct from "koExports" (so that non-exported objects are not reachable)
    // At that point, "target" would be set to: (typeof koExports !== "undefined" ? koExports : ko)
    var target = ko, i = 0, l = tokens.length - 1;

    for (; i < l; i++)
        target = target[tokens[i]];
    target[tokens[l]] = object;
};
ko.exportProperty = (owner, publicName, object) => owner[publicName] = object;
