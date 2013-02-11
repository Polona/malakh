// TODO document all methods
var seadragonBasePrototype = {
    throwIncorrectParametersError: function throwIncorrectParametersError(args, className, expectedArguments) {
        className = className || 'ClassName';

        var names = expectedArguments.join(', ');
        var errorString = 'Incorrect paremeters! Use:\n' +
            '    var obj = seadragon.' + className + '(' + names + ')\n';

        expectedArguments.unshift('seadragon');
        var namesWithSeadragon = expectedArguments.join(', ');
        errorString += 'or:\n' +
            '    new Seadragon.' + className + '(' + namesWithSeadragon + ')\n';

        console.info('Received arguments:', [].slice.call(args));
        throw new Error(errorString);
    },

    ensureArguments: function ensureArgumentsNum(args, className, expectedArguments) {
        expectedArguments = expectedArguments || [];
        if (args.length < expectedArguments.length + 1) { // +1 because of the `seadragon` parameter
            return this.throwIncorrectParametersError(args, className, expectedArguments);
        }
        var firstArg = args[0];
        if (!firstArg instanceof Seadragon) {
            return this.throwIncorrectParametersError(args, className, expectedArguments);
        }
        /**
         * Main Seadragon instance.
         * @type Seadragon
         */
        this.seadragon = firstArg;
        return this;
    },

    ensureOptions: function ensureOptions(options, className, expectedOptionsArray) {
        var missingOption = !options;
        expectedOptionsArray.forEach(function (expectedOption) {
            if (!(options.hasOwnProperty(expectedOption))) {
                missingOption = true;
            }
        });
        if (missingOption) {
            console.info('Received options:', options);
            throw new Error('Seadragon.' + className + ' needs a JSON parameter with at least the following ' +
                'fields: ' + expectedOptionsArray.join(', ') + '.');
        }
        return this;
    }
};

// We're making seadragon fields accessible from any Seadragon class via this.field
// instead of this.seadragon.field. But we still reflect all changes onto this.seadragon.field
[
    // properties
    'config',
    '$container', '$canvas', 'canvasContext',
    'dziImages', 'viewport', 'canvasLayersManager',
    'magnifier', 'picker', 'markers',
    'imageLoader', 'drawer', 'controller',
    // constructors
    'AnimatedRectangle', 'CanvasLayersManager', 'Controller', 'Drawer',
    'DziImage', 'ImageLoader', 'LayoutManager', 'Magnifier', 'Markers', 'Picker',
    'Spring', 'Tile', 'TiledImage', 'Viewport'
].forEach(
    function (field) {
        Object.defineProperty(seadragonBasePrototype, field, {
            get: function () {
                return this.seadragon[field];
            },
            set: function (value) {
                this.seadragon[field] = value;
            }
        });
    }
);
