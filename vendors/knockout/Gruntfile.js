/*global module:false*/
module.exports = function(grunt) {
    var _ = grunt.util._;

    // Project configuration
    grunt.initConfig({
        // Metadata
        pkg: grunt.file.readJSON('package.json'),
        fragments: './build/fragments/',
        banner: '/*!\n' +
                ' * Knockout JavaScript library v<%= pkg.version %>\n' +
                ' * (c) The Knockout.js team - <%= pkg.homepage %>\n' +
                ' * License: <%= pkg.licenses[0].type %> (<%= pkg.licenses[0].url %>)\n' +
                ' */\n\n',

        build: {
            debug: './build/output/knockout-latest.debug.js',
            min: './build/output/knockout-latest.js'
        }
    });

    grunt.registerTask('clean', 'Clean up output files.', function (target) {
        var output = grunt.config('build');
        var files = [ output.debug, output.min ];
        var options = { force: (target == 'force') };
        _.forEach(files, function (file) {
            if (grunt.file.exists(file))
                grunt.file.delete(file, options);
        });
        return !this.errorCount;
    });

    function getReferencedSources(sourceReferencesFilename) {
        // Returns the array of filenames referenced by a file like source-references.js
        var result;
        global.knockoutDebugCallback = function(sources) { result = sources; };
        eval(grunt.file.read(sourceReferencesFilename));
        return result;
    }

    function getCombinedSources() {
        var fragments = grunt.config('fragments'),
            sourceFilenames = [
                fragments + 'extern-pre.js',
                getReferencedSources(fragments + 'source-references.js'),
                fragments + 'extern-post.js'
            ],
            flattenedSourceFilenames = Array.prototype.concat.apply([], sourceFilenames),
            combinedSources = flattenedSourceFilenames.map(function(filename) {
                return grunt.file.read('./' + filename);
            }).join('');

        return combinedSources.replace('##VERSION##', grunt.config('pkg.version'));
    }

    function buildDebug(output) {
        var source = [];
        source.push(grunt.config('banner'));
        source.push(getCombinedSources());
        grunt.file.write(output, source.join('').replace(/\r\n/g, '\n'));
    }

    function buildMin(output, done) {
        var cc = require('closure-compiler');
        var options = {
			language_in:'ECMASCRIPT_2020',
			language_out:'ECMASCRIPT_2020',
            compilation_level: 'ADVANCED_OPTIMIZATIONS',
            output_wrapper: '(()=>{%output%})();'
        };
        grunt.log.write('Compiling...');
        cc.compile('/**@const*/var DEBUG=false;' + getCombinedSources(), options, function (err, stdout, stderr) {
            if (err) {
                grunt.log.error(err);
                done(false);
            } else {
                grunt.log.ok();
                grunt.file.write(output, (grunt.config('banner') + stdout).replace(/\r\n/g, '\n'));
                done(true);
            }
        });
    }

    grunt.registerMultiTask('build', 'Build', function() {
        if (!this.errorCount) {
            var output = this.data;
            if (this.target === 'debug') {
                buildDebug(output);
            } else if (this.target === 'min') {
                buildMin(output, this.async());
            }
        }
        return !this.errorCount;
    });

    // Default task.
    grunt.registerTask('default', ['clean', 'build']);
};
