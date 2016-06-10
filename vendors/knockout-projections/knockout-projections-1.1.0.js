/*! Knockout projections plugin - version 1.1.0
------------------------------------------------------------------------------
Copyright (c) Microsoft Corporation
All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 
THIS CODE IS PROVIDED *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT.
See the Apache Version 2.0 License for specific language governing permissions and limitations under the License.
------------------------------------------------------------------------------
*/

(function(global, undefined) {
    'use strict';

    var exclusionMarker = {};

    function StateItem(ko, inputItem, initialStateArrayIndex, initialOutputArrayIndex, mappingOptions, arrayOfState, outputObservableArray) {
        // Capture state for later use
        this.inputItem = inputItem;
        this.stateArrayIndex = initialStateArrayIndex;
        this.mappingOptions = mappingOptions;
        this.arrayOfState = arrayOfState;
        this.outputObservableArray = outputObservableArray;
        this.outputArray = this.outputObservableArray.peek();
        this.isIncluded = null; // Means 'not yet determined'
        this.suppressNotification = false; // TODO: Instead of this technique, consider raising a sparse diff with a "mutated" entry when a single item changes, and not having any other change logic inside StateItem

        // Set up observables
        this.outputArrayIndex = ko.observable(initialOutputArrayIndex); // When excluded, it's the position the item would go if it became included
        this.disposeFuncFromMostRecentMapping = null;
        this.mappedValueComputed = ko.computed(this.mappingEvaluator, this);
        this.mappedValueComputed.subscribe(this.onMappingResultChanged, this);
        this.previousMappedValue = this.mappedValueComputed.peek();
    }

    StateItem.prototype.dispose = function() {
        this.mappedValueComputed.dispose();
        this.disposeResultFromMostRecentEvaluation();
    };

    StateItem.prototype.disposeResultFromMostRecentEvaluation = function() {
        if (this.disposeFuncFromMostRecentMapping) {
            this.disposeFuncFromMostRecentMapping();
            this.disposeFuncFromMostRecentMapping = null;
        }

        if (this.mappingOptions.disposeItem) {
            var mappedItem = this.mappedValueComputed();
            this.mappingOptions.disposeItem(mappedItem);
        }
    };

    StateItem.prototype.mappingEvaluator = function() {
        if (this.isIncluded !== null) { // i.e., not first run
            // This is a replace-in-place, so call any dispose callbacks
            // we have for the earlier value
            this.disposeResultFromMostRecentEvaluation();
        }

        var mappedValue;
        if (this.mappingOptions.mapping) {
            mappedValue = this.mappingOptions.mapping(this.inputItem, this.outputArrayIndex);
        } else if (this.mappingOptions.mappingWithDisposeCallback) {
            var mappedValueWithDisposeCallback = this.mappingOptions.mappingWithDisposeCallback(this.inputItem, this.outputArrayIndex);
            if (!('mappedValue' in mappedValueWithDisposeCallback)) {
                throw new Error('Return value from mappingWithDisposeCallback should have a \'mappedItem\' property.');
            }
            mappedValue = mappedValueWithDisposeCallback.mappedValue;
            this.disposeFuncFromMostRecentMapping = mappedValueWithDisposeCallback.dispose;
        } else {
            throw new Error('No mapping callback given.');
        }

        var newInclusionState = mappedValue !== exclusionMarker;

        // Inclusion state changes can *only* happen as a result of changing an individual item.
        // Structural changes to the array can't cause this (because they don't cause any remapping;
        // they only map newly added items which have no earlier inclusion state to change).
        if (this.isIncluded !== newInclusionState) {
            if (this.isIncluded !== null) { // i.e., not first run
                this.moveSubsequentItemsBecauseInclusionStateChanged(newInclusionState);
            }

            this.isIncluded = newInclusionState;
        }

        return mappedValue;
    };

    StateItem.prototype.onMappingResultChanged = function(newValue) {
        if (newValue !== this.previousMappedValue) {
            if (this.isIncluded) {
                this.outputArray.splice(this.outputArrayIndex.peek(), 1, newValue);
            }

            if (!this.suppressNotification) {
                this.outputObservableArray.valueHasMutated();
            }

            this.previousMappedValue = newValue;
        }
    };

    StateItem.prototype.moveSubsequentItemsBecauseInclusionStateChanged = function(newInclusionState) {
        var outputArrayIndex = this.outputArrayIndex.peek(),
            iterationIndex,
            stateItem;

        if (newInclusionState) {
            // Shift all subsequent items along by one space, and increment their indexes.
            // Note that changing their indexes might cause remapping, but won't affect their
            // inclusion status (by definition, inclusion status must not be affected by index,
            // otherwise you get undefined results) so there's no risk of a chain reaction.
            this.outputArray.splice(outputArrayIndex, 0, null);
            for (iterationIndex = this.stateArrayIndex + 1; iterationIndex < this.arrayOfState.length; iterationIndex++) {
                stateItem = this.arrayOfState[iterationIndex];
                stateItem.setOutputArrayIndexSilently(stateItem.outputArrayIndex.peek() + 1);
            }
        } else {
            // Shift all subsequent items back by one space, and decrement their indexes
            this.outputArray.splice(outputArrayIndex, 1);
            for (iterationIndex = this.stateArrayIndex + 1; iterationIndex < this.arrayOfState.length; iterationIndex++) {
                stateItem = this.arrayOfState[iterationIndex];
                stateItem.setOutputArrayIndexSilently(stateItem.outputArrayIndex.peek() - 1);
            }
        }
    };

    StateItem.prototype.setOutputArrayIndexSilently = function(newIndex) {
        // We only want to raise one output array notification per input array change,
        // so during processing, we suppress notifications
        this.suppressNotification = true;
        this.outputArrayIndex(newIndex);
        this.suppressNotification = false;
    };

    function getDiffEntryPostOperationIndex(diffEntry, editOffset) {
        // The diff algorithm's "index" value refers to the output array for additions,
        // but the "input" array for deletions. Get the output array position.
        if (!diffEntry) { return null; }
        switch (diffEntry.status) {
        case 'added':
            return diffEntry.index;
        case 'deleted':
            return diffEntry.index + editOffset;
        default:
            throw new Error('Unknown diff status: ' + diffEntry.status);
        }
    }

    function insertOutputItem(ko, diffEntry, movedStateItems, stateArrayIndex, outputArrayIndex, mappingOptions, arrayOfState, outputObservableArray, outputArray) {
        // Retain the existing mapped value if this is a move, otherwise perform mapping
        var isMoved = typeof diffEntry.moved === 'number',
            stateItem = isMoved ?
                movedStateItems[diffEntry.moved] :
                new StateItem(ko, diffEntry.value, stateArrayIndex, outputArrayIndex, mappingOptions, arrayOfState, outputObservableArray);
        arrayOfState.splice(stateArrayIndex, 0, stateItem);
        if (stateItem.isIncluded) {
            outputArray.splice(outputArrayIndex, 0, stateItem.mappedValueComputed.peek());
        }

        // Update indexes
        if (isMoved) {
            // We don't change the index until *after* updating this item's position in outputObservableArray,
            // because changing the index may trigger re-mapping, which in turn would cause the new
            // value to be written to the 'index' position in the output array
            stateItem.stateArrayIndex = stateArrayIndex;
            stateItem.setOutputArrayIndexSilently(outputArrayIndex);
        }

        return stateItem;
    }

    function deleteOutputItem(diffEntry, arrayOfState, stateArrayIndex, outputArrayIndex, outputArray) {
        var stateItem = arrayOfState.splice(stateArrayIndex, 1)[0];
        if (stateItem.isIncluded) {
            outputArray.splice(outputArrayIndex, 1);
        }
        if (typeof diffEntry.moved !== 'number') {
            // Be careful to dispose only if this item really was deleted and not moved
            stateItem.dispose();
        }
    }

    function updateRetainedOutputItem(stateItem, stateArrayIndex, outputArrayIndex) {
        // Just have to update its indexes
        stateItem.stateArrayIndex = stateArrayIndex;
        stateItem.setOutputArrayIndexSilently(outputArrayIndex);

        // Return the new value for outputArrayIndex
        return outputArrayIndex + (stateItem.isIncluded ? 1 : 0);
    }

    function makeLookupOfMovedStateItems(diff, arrayOfState) {
        // Before we mutate arrayOfComputedMappedValues at all, grab a reference to each moved item
        var movedStateItems = {};
        for (var diffIndex = 0; diffIndex < diff.length; diffIndex++) {
            var diffEntry = diff[diffIndex];
            if (diffEntry.status === 'added' && (typeof diffEntry.moved === 'number')) {
                movedStateItems[diffEntry.moved] = arrayOfState[diffEntry.moved];
            }
        }
        return movedStateItems;
    }

    function getFirstModifiedOutputIndex(firstDiffEntry, arrayOfState, outputArray) {
        // Work out where the first edit will affect the output array
        // Then we can update outputArrayIndex incrementally while walking the diff list
        if (!outputArray.length || !arrayOfState[firstDiffEntry.index]) {
            // The first edit is beyond the end of the output or state array, so we must
            // just be appending items.
            return outputArray.length;
        } else {
            // The first edit corresponds to an existing state array item, so grab
            // the first output array index from it.
            return arrayOfState[firstDiffEntry.index].outputArrayIndex.peek();
        }
    }

    function respondToArrayStructuralChanges(ko, inputObservableArray, arrayOfState, outputArray, outputObservableArray, mappingOptions) {
        return inputObservableArray.subscribe(function(diff) {
            if (!diff.length) {
                return;
            }

            var movedStateItems = makeLookupOfMovedStateItems(diff, arrayOfState),
                diffIndex = 0,
                diffEntry = diff[0],
                editOffset = 0, // A running total of (num(items added) - num(items deleted)) not accounting for filtering
                outputArrayIndex = diffEntry && getFirstModifiedOutputIndex(diffEntry, arrayOfState, outputArray);

            // Now iterate over the state array, at each stage checking whether the current item
            // is the next one to have been edited. We can skip all the state array items whose
            // indexes are less than the first edit index (i.e., diff[0].index).
            for (var stateArrayIndex = diffEntry.index; diffEntry || (stateArrayIndex < arrayOfState.length); stateArrayIndex++) {
                // Does the current diffEntry correspond to this position in the state array?
                if (getDiffEntryPostOperationIndex(diffEntry, editOffset) === stateArrayIndex) {
                    // Yes - insert or delete the corresponding state and output items
                    switch (diffEntry.status) {
                    case 'added':
                        // Add to output, and update indexes
                        var stateItem = insertOutputItem(ko, diffEntry, movedStateItems, stateArrayIndex, outputArrayIndex, mappingOptions, arrayOfState, outputObservableArray, outputArray);
                        if (stateItem.isIncluded) {
                            outputArrayIndex++;
                        }
                        editOffset++;
                        break;
                    case 'deleted':
                        // Just erase from the output, and update indexes
                        deleteOutputItem(diffEntry, arrayOfState, stateArrayIndex, outputArrayIndex, outputArray);
                        editOffset--;
                        stateArrayIndex--; // To compensate for the "for" loop incrementing it
                        break;
                    default:
                        throw new Error('Unknown diff status: ' + diffEntry.status);
                    }

                    // We're done with this diff entry. Move on to the next one.
                    diffIndex++;
                    diffEntry = diff[diffIndex];
                } else if (stateArrayIndex < arrayOfState.length) {
                    // No - the current item was retained. Just update its index.
                    outputArrayIndex = updateRetainedOutputItem(arrayOfState[stateArrayIndex], stateArrayIndex, outputArrayIndex);
                }
            }

            outputObservableArray.valueHasMutated();
        }, null, 'arrayChange');
    }

    // Mapping
    function observableArrayMap(ko, mappingOptions) {
        var inputObservableArray = this,
            arrayOfState = [],
            outputArray = [],
            outputObservableArray = ko.observableArray(outputArray),
            originalInputArrayContents = inputObservableArray.peek();

        // Shorthand syntax - just pass a function instead of an options object
        if (typeof mappingOptions === 'function') {
            mappingOptions = { mapping: mappingOptions };
        }

        // Validate the options
        if (mappingOptions.mappingWithDisposeCallback) {
            if (mappingOptions.mapping || mappingOptions.disposeItem) {
                throw new Error('\'mappingWithDisposeCallback\' cannot be used in conjunction with \'mapping\' or \'disposeItem\'.');
            }
        } else if (!mappingOptions.mapping) {
            throw new Error('Specify either \'mapping\' or \'mappingWithDisposeCallback\'.');
        }

        // Initial state: map each of the inputs
        for (var i = 0; i < originalInputArrayContents.length; i++) {
            var inputItem = originalInputArrayContents[i],
                stateItem = new StateItem(ko, inputItem, i, outputArray.length, mappingOptions, arrayOfState, outputObservableArray),
                mappedValue = stateItem.mappedValueComputed.peek();
            arrayOfState.push(stateItem);

            if (stateItem.isIncluded) {
                outputArray.push(mappedValue);
            }
        }

        // If the input array changes structurally (items added or removed), update the outputs
        var inputArraySubscription = respondToArrayStructuralChanges(ko, inputObservableArray, arrayOfState, outputArray, outputObservableArray, mappingOptions);

        // Return value is a readonly computed which can track its own changes to permit chaining.
        // When disposed, it cleans up everything it created.
        var returnValue = ko.computed(outputObservableArray).extend({ trackArrayChanges: true }),
            originalDispose = returnValue.dispose;
        returnValue.dispose = function() {
            inputArraySubscription.dispose();
            ko.utils.arrayForEach(arrayOfState, function(stateItem) {
                stateItem.dispose();
            });
            originalDispose.call(this, arguments);
        };

        // Make projections chainable
        addProjectionFunctions(ko, returnValue);

        return returnValue;
    }

    // Filtering
    function observableArrayFilter(ko, predicate) {
        return observableArrayMap.call(this, ko, function(item) {
            return predicate(item) ? item : exclusionMarker;
        });
    }

    // Attaching projection functions
    // ------------------------------
    //
    // Builds a collection of projection functions that can quickly be attached to any object.
    // The functions are predefined to retain 'this' and prefix the arguments list with the
    // relevant 'ko' instance.

    var projectionFunctionsCacheName = '_ko.projections.cache';

    function attachProjectionFunctionsCache(ko) {
        // Wraps callback so that, when invoked, its arguments list is prefixed by 'ko' and 'this' 
        function makeCaller(ko, callback) {
            return function() {
                return callback.apply(this, [ko].concat(Array.prototype.slice.call(arguments, 0)));
            };
        }
        ko[projectionFunctionsCacheName] = {
            map: makeCaller(ko, observableArrayMap),
            filter: makeCaller(ko, observableArrayFilter)
        };
    }

    function addProjectionFunctions(ko, target) {
        ko.utils.extend(target, ko[projectionFunctionsCacheName]);
        return target; // Enable chaining
    }

    // Module initialisation
    // ---------------------
    //
    // When this script is first evaluated, it works out what kind of module loading scenario
    // it is in (Node.js or a browser `<script>` tag), and then attaches itself to whichever
    // instance of Knockout.js it can find.

    function attachToKo(ko) {
        ko.projections = {
            _exclusionMarker: exclusionMarker
        };
        attachProjectionFunctionsCache(ko);
        addProjectionFunctions(ko, ko.observableArray.fn); // Make all observable arrays projectable
    }

    // Determines which module loading scenario we're in, grabs dependencies, and attaches to KO
    function prepareExports() {
        if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
            // Node.js case - load KO synchronously
            var ko = require('knockout');
            attachToKo(ko);
            module.exports = ko;
        } else if (typeof define === 'function' && define.amd) {
            define(['knockout'], attachToKo);
        } else if ('ko' in global) {
            // Non-module case - attach to the global instance
            attachToKo(global.ko);
        }
    }

    prepareExports();

})(this);
