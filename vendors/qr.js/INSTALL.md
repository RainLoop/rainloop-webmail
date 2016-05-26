This document is only relevant for those that want to contribute to the [qr.js][] open source
project (we love you guys!). If you are only interested in installing the tool look at `README.md`.

## Build Requirements

In order to build [qr.js][], you need to have the following install [git][] 1.7+ and [node.js][]
0.8+ (which includes [npm][]).

### Canvas Support

[qr.js][] heavily depends on [node-canvas][] to support the HTML5 canvas element in the [node.js][]
environment. Unfortunately, this library is dependant on [Cairo][], which is not managed by
[npm][]. Before you are able to build [qr.js][] (and it's dependencies), you must have [Cairo][]
installed. Please see their wiki on steps on how to do this on various platforms:

https://github.com/LearnBoost/node-canvas/wiki/_pages

## Building

Follow these steps to build [qr.js][];

1. Clone a copy of the main [qr.js git repository](https://github.com/neocotic/qr.js) by running
   `git clone git://github.com/neocotic/qr.js.git`
2. `cd` to the repository directory
3. Ensure you have all of the dependencies by entering `npm install`
4. Ensure you can run [Grunt][] by running `npm install -g grunt-cli`
5. To run the full test suite enter `grunt test`
   * **Pro Tip:** You can easily run step 5 by just entering `grunt`
6. To update the optimized distributable file and documentation enter `grunt dist`
   * Outputs to documentation to the `docs` directory

## Important

If you're planning on contributing to [qr.js][] please do **NOT** update the distributable file or
documentation (step 6) when submitting a pull request. We will not accept pull requests when these
files have been changed as we do this ourselves when finalizing a release.

Read the `CONTRIBUTING.md` file for more information about submitting pull requests.

[cairo]: http://cairographics.org
[git]: http://git-scm.com
[grunt]: http://gruntjs.com
[node.js]: http://nodejs.org
[node-canvas]: https://github.com/LearnBoost/node-canvas
[npm]: http://npmjs.org
[qr.js]: http://neocotic.com/qr.js
