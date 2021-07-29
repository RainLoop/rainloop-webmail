(() => {

let uniqueId = 0,
    dataStoreKeyExpandoPropertyName = "__ko__" + (Date.now()),
    dataStore = new WeakMap();

ko.utils.domData = {
    get: (node, key) => (dataStore.get(node) || {})[key],
    set: (node, key, value) => {
        if (dataStore.has(node)) {
            dataStore.get(node)[key] = value;
        } else {
            let dataForNode = {};
            dataForNode[key] = value;
            dataStore.set(node, dataForNode);
        }
        return value;
    },
    getOrSet: function(node, key, value) {
        return this.get(node, key) || this.set(node, key, value);
    },
    clear: node => dataStore.delete(node),

    nextKey: () => (uniqueId++) + dataStoreKeyExpandoPropertyName
};

})();
