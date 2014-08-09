/* jshint strict: true */
/* global module: false, process: false, require: false, Buffer: false */

module.exports = function (grunt) {
    'use strict';

    var distpaths = [
            'dist/malakh.js',
            'dist/malakh.min.js',
            'dist/malakh.min.js.map',
        ],
        readOptionalJSON = function (filepath) {
            var data = {};
            try {
                data = grunt.file.readJSON(filepath);
            } catch (e) {
            }
            return data;
        },
        srcHintOptions = readOptionalJSON('.jshintrc');

    srcHintOptions.strict = true; // this is disabled for non-concatenated files so that IDEs don't complain

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        dst: readOptionalJSON('dist/.destination.json'),
        build: {
            all: {
                dest: 'dist/malakh.js',
                src: [
                    'src/_intro.js',
                    'src/utils.js',

                    {flag: 'polyfill_static_methods', src: 'src/polyfills/static_methods.js'},
                    {flag: 'polyfill_raf', src: 'src/polyfills/request_animation_frame.js'},
                    {flag: 'polyfill_wheel', src: 'src/polyfills/jquery.wheel.js'},

                    'src/core.js',
                    'src/malakh_proxy.js',

                    'src/utility_classes/point.js',
                    'src/utility_classes/segment.js',
                    'src/utility_classes/rectangle.js',

                    'src/derived_classes/spring.js',
                    'src/derived_classes/tile.js',
                    'src/derived_classes/animated_rectangle.js',
                    'src/derived_classes/tiled_image.js',
                    {flag: 'single_image', src: 'src/derived_classes/single_image.js'},
                    {flag: 'dzi', src: 'src/derived_classes/dzi_image.js'},

                    'src/instances/image_loader.js',
                    {flag: 'magnifier', src: 'src/instances/magnifier.js'},
                    'src/instances/viewport.js',
                    {flag: 'picker', src: 'src/instances/picker.js'},
                    {flag: 'markers', src: 'src/instances/markers.js'},
                    'src/instances/canvas_layers_manager.js',
                    'src/instances/drawer.js',
                    {flag: 'layout_manager', src: 'src/instances/layout_manager.js'},
                    'src/instances/controller.js',

                    'src/_outro.js',
                ]
            },
        },

        jshint: {
            dist: {
                src: ['dist/malakh.js'],
                options: srcHintOptions,
            },
            grunt: {
                src: ['Gruntfile.js'],
                options: srcHintOptions,
            }
        },

        watch: {
            files: ['<%= jshint.grunt.src %>', 'src/**/*.js'],
            tasks: 'dev',
        },

        uglify: {
            options: {
                compress: {
                    screw_ie8: true,
                },
                mangle: {
                    screw_ie8: true,
                },
            },
            all: {
                files: {
                    'dist/malakh.min.js': [ 'dist/malakh.js' ],
                },
                options: {
                    banner: '/*! Malakh v<%= pkg.version %> | (c) 2013 Laboratorium EE */',
                    sourceMap: true,
                },
            }
        }
    });

    // Special 'alias' task to make custom build creation less grawlix-y
    grunt.registerTask('custom', function () {
        var done = this.async(),
            args = [].slice.call(arguments),
            modules = args.length ? args[0].replace(/,/g, ':') : '';

        // Translation example
        //
        //   grunt custom:+magnifier,-picker
        //
        // Becomes:
        //
        //   grunt build:*:*:+magnifier,-picker

        grunt.log.writeln('Creating custom build...\n');

        grunt.util.spawn({
            cmd: 'grunt',
            args: ['build:*:*:' + modules, 'uglify', 'dist']
        }, function (err, result) {
            if (err) {
                grunt.verbose.error();
                done(err);
                return;
            }
            grunt.log.writeln(result.stdout.replace('Done, without errors.', ''));
            done();
        });
    });

    // Special concat/build task to handle various Malakh build requirements.
    grunt.registerMultiTask(
        'build',
        'Concatenate source (include/exclude modules with +/- flags), embed date/version',
        function () {

            // Concat specified files.
            var compiled = '',
                modules = this.flags,
                optIn = !modules['*'],
                explicit = optIn || Object.keys(modules).length > 1,
                name = this.data.dest,
                src = this.data.src,
                deps = {},
                excluded = {},
                version = grunt.config('pkg.version'),
                excluder = function (flag, needsFlag) {
                    // optIn defaults implicit behavior to weak exclusion
                    if (optIn && !modules[flag] && !modules['+' + flag]) {
                        excluded[flag] = false;
                    }

                    // explicit or inherited strong exclusion
                    if (excluded[needsFlag] || modules['-' + flag]) {
                        excluded[flag] = true;
                    }
                    // explicit inclusion overrides weak exclusion
                    else if (excluded[needsFlag] === false &&
                        (modules[flag] || modules[ '+' + flag])) {

                        delete excluded[needsFlag];

                        // ...all the way down
                        if (deps[needsFlag]) {
                            deps[needsFlag].forEach(function (subDep) {
                                modules[needsFlag] = true;
                                excluder(needsFlag, subDep);
                            });
                        }
                    }
                };

            // append commit id to version
            if (process.env.COMMIT) {
                version += ' ' + process.env.COMMIT;
            }

            // figure out which files to exclude based on these rules in this order:
            //  dependency explicit exclude
            //  > explicit exclude
            //  > explicit include
            //  > dependency implicit exclude
            //  > implicit exclude
            // examples:
            //  *                           none (implicit exclude)
            //  *:*                         all (implicit include)
            //  *:*:-magnifier              all except magnifier and dependents (explicit > implicit)
            //  *:*:-magnifier:+dependency  same (excludes dependency because explicit include is trumped by
            //                              explicit exclude of dependency)
            //  *:+picker                   none except picker and its dependencies (explicit include trumps
            //                              implicit exclude of dependency)
            src.forEach(function (filepath) {
                var flag = filepath.flag;

                if (flag) {
                    excluder(flag);

                    // check for dependencies
                    if (filepath.needs) {
                        deps[ flag ] = filepath.needs;
                        filepath.needs.forEach(function (needsFlag) {
                            excluder(flag, needsFlag);
                        });
                    }
                }
            });

            // append excluded modules to version
            if (Object.keys(excluded).length) {
                version += ' -' + Object.keys(excluded).join(',-');
                // set pkg.version to version with excludes, so minified file picks it up
                grunt.config.set('pkg.version', version);
            }


            // conditionally concatenate source
            src.forEach(function (filepath) {
                var flag = filepath.flag,
                    specified = false,
                    omit = false,
                    message = '';

                if (flag) {
                    if (excluded[flag] !== undefined) {
                        message = ('Excluding ' + flag).red;
                        specified = true;
                        omit = true;
                    } else {
                        message = ('Including ' + flag).green;

                        // If this module was actually specified by the
                        // builder, then st the flag to include it in the
                        // output list
                        if (modules['+' + flag]) {
                            specified = true;
                        }
                    }

                    // Only display the inclusion/exclusion list when handling
                    // an explicit list.
                    //
                    // Additionally, only display modules that have been specified
                    // by the user
                    if (explicit && specified) {
                        grunt.log.writetableln([ 27, 30 ], [
                            message,
                            ('(' + filepath.src + ')').grey
                        ]);
                    }

                    filepath = filepath.src;
                }

                if (!omit) {
                    compiled += grunt.file.read(filepath);
                }
            });

            // Embed Version
            // Embed Date
            compiled = compiled.replace(/@VERSION/g, version)
                .replace('@DATE', function () {
                    // YYYY-MM-DD
                    return ( new Date() ).toISOString().replace(/T.*/, '');
                });

            // Write concatenated source to file
            grunt.file.write(name, compiled);

            // Fail task if errors were logged.
            if (this.errorCount) {
                return false;
            }

            // Otherwise, print a success message.
            grunt.log.writeln('File "' + name + '" created.');
            return true;
        });

    // Process files for distribution
    grunt.registerTask('dist', function () {
        var flags, paths, stored;

        // Check for stored destination paths
        // ( set in dist/.destination.json )
        stored = Object.keys(grunt.config('dst'));

        // Allow command line input as well
        flags = Object.keys(this.flags);

        // Combine all output target paths
        paths = [].concat(stored, flags).filter(function (path) {
            return path !== '*';
        });

        // Ensure the dist files are pure ASCII
        var fs = require('fs'),
            nonascii = false;

        distpaths.forEach(function (filename) {
            var i, c, map,
                text = fs.readFileSync(filename, 'utf8');

            if (/\.min\.js$/.test(filename)) {
                // Ensure files use only \n for line endings, not \r\n
                if (/\x0d\x0a/.test(text)) {
                    grunt.log.writeln(filename + ': Incorrect line endings (\\r\\n)');
                    nonascii = true;
                }

                // Ensure only ASCII chars so script tags don't need a charset attribute
                if (text.length !== Buffer.byteLength(text, 'utf8')) {
                    grunt.log.writeln(filename + ': Non-ASCII characters detected:');
                    for (i = 0; i < text.length; i++) {
                        c = text.charCodeAt(i);
                        if (c > 127) {
                            grunt.log.writeln('- position ' + i + ': ' + c);
                            grunt.log.writeln('-- ' + text.substring(i - 20, i + 20));
                            break;
                        }
                    }
                    nonascii = true;
                }
            }

            // Modify map/min so that it points to files in the same folder;
            // see https://github.com/mishoo/UglifyJS2/issues/47
            if (/\.map$/.test(filename)) {
                text = text.replace(/"dist\//g, '"');
                fs.writeFileSync(filename, text, 'utf-8');
            } else if (/\.min\.js$/.test(filename)) {
                // Wrap sourceMap directive in multiline comments (#13274)
                text = text.replace(/\n?(\/\/@\s*sourceMappingURL=)(.*)/,
                    function (_, directive, path) {
                        map = '\n' + directive + path.replace(/^dist\//, '');
                        return '';
                    });
                if (map) {
                    text = text.replace(/(^\/\*[\w\W]*?)\s*\*\/|$/,
                        function (_, comment) {
                            return ( comment || '\n/*' ) + map + '\n*/';
                        });
                }
                fs.writeFileSync(filename, text, 'utf-8');
            }

            // Optionally copy dist files to other locations
            paths.forEach(function (path) {
                var created;

                if (!/\/$/.test(path)) {
                    path += '/';
                }

                created = path + filename.replace('dist/', '');
                grunt.file.write(created, text);
                grunt.log.writeln('File "' + created + '" created.');
            });
        });

        return !nonascii;
    });

    // Load grunt tasks from NPM packages
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['build:*:*', 'jshint', 'uglify', 'dist:*']);

    grunt.registerTask('test', ['default']);

    // Short list as a high frequency watch task
    grunt.registerTask('dev', ['build:*:*', 'jshint']);
};
