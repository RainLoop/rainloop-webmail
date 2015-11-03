knockout-projections
============

Knockout.js observable arrays get smarter.

This plugin adds observable `map` and `filter` features to observable arrays, so you can transform collections in arbitrary ways and have the results automatically update whenever the underlying source data changes.

Installation
============

Download a copy of `knockout-projections-x.y.z.js` from [the `dist` directory](https://github.com/SteveSanderson/knockout-projections/tree/master/dist) and reference it in your web application:

    <script src='knockout-x.y.z.js'></script>              <!-- First reference KO itself -->
    <script src='knockout-projections-x.y.z.js'></script>  <!-- Then reference knockout-projections -->

Be sure to reference it *after* you reference Knockout itself, and of course replace `x.y.z` with the version number of the file you downloaded.

Usage
=====

**Mapping**

More info to follow. For now, here's a simple example:

    var sourceItems = ko.observableArray([1, 2, 3, 4, 5]);

There's a plain observable array. Now let's say we want to keep track of the squares of these values:

    var squares = sourceItems.map(function(x) { return x*x; });
   
Now `squares` is an observable array containing `[1, 4, 9, 16, 25]`. Let's modify the source data:

    sourceItems.push(6);
    // 'squares' has automatically updated and now contains [1, 4, 9, 16, 25, 36]
    
This works with any transformation of the source data, e.g.:

    sourceItems.reverse();
    // 'squares' now contains [36, 25, 16, 9, 4, 1]
    
The key point of this library is that these transformations are done *efficiently*. Specifically, your callback
function that performs the mapping is only called when strictly necessary (usually, that's only for newly-added
items). When you add new items to the source data, we *don't* need to re-map the existing ones. When you reorder
the source data, the output order is correspondingly changed *without* remapping anything.

This efficiency might not matter much if you're just squaring numbers, but when you are mapping complex nested
graphs of custom objects, it can be important to perform each mapping update with the minumum of work.

**Filtering**

As well as `map`, this plugin also provides `filter`:

    var evenSquares = squares.filter(function(x) { return x % 2 === 0; });
    // evenSquares is now an observable containing [36, 16, 4]

    sourceItems.push(9);
    // This has no effect on evenSquares, because 9*9=81 is odd

    sourceItems.push(10);
    // evenSquares now contains [36, 16, 4, 100]

Again, your `filter` callbacks are only called when strictly necessary. Re-ordering or deleting source items don't
require any refiltering - the output is simply updated to match. Only newly-added source items must be subjected
to your `filter` callback.

**Chaining**

The above code also demonstrates that you can chain together successive `map` and `filter` transformations.

When the underlying data changes, the effects will ripple out through the chain of computed arrays with the
minimum necessary invocation of your `map` and `filter` callbacks.

How to build from source
========================

First, install [NPM](https://npmjs.org/) if you don't already have it. It comes with Node.js.

Second, install Grunt globally, if you don't already have it:

    npm install -g grunt-cli

Third, use NPM to download all the dependencies for this module:

    cd wherever_you_cloned_this_repo
    npm install

Now you can build the package (linting and running tests along the way):

    grunt
    
Or you can just run the linting tool and tests:

    grunt test
    
Or you can make Grunt watch for changes to the sources/specs and auto-rebuild after each change:
    
    grunt watch
    
The browser-ready output files will be dumped at the following locations:

 * `dist/knockout-projections.js`
 * `dist/knockout-projections.min.js`

License - Apache 2.0
====================

Copyright (c) Microsoft Corporation

All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 

THIS CODE IS PROVIDED *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions and limitations under the License.
