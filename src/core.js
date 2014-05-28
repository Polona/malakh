/**
 * Constructs a Seadragon instance.
 *
 * @class Represents the whole Seadragon.
 *
 * @param {jQuery|string} containerSelectorOrElement  The jQuery object which will serve as the Seadragon container
 *                                                    or selector pointing to that object.
 * @param {Object} configOverrides  Overrides for default configuration options.
 */
Seadragon = function (containerSelectorOrElement, configOverrides) {
    var $canvas, canvasContext;
    var seadragon = this;
    this.seadragon = this; // needed for prototype methods

    /**
     * Constructors wrappers. Allows invoking:
     *     <code>var rectangle = this.Rectangle(2, 3, 50, 23);</code>
     * instead of:
     *     <code>var rectangle = new Seadragon.Rectangle(this.seadragon, 2, 3, 50, 23);</code>
     * etc.
     */
    utils.forEach(['AnimatedRectangle', 'CanvasLayersManager', 'Controller', 'Drawer',
        'DziImage', 'ImageLoader', 'LayoutManager', 'Magnifier', 'Markers', 'Picker',
        'SingleImage', 'Spring', 'Tile', 'TiledImage', 'Viewport'],
        function (name) {
            seadragon[name] = function () {
                var args = [].slice.call(arguments, 0);
                // Passing seadragon as the first parameter; null is needed for `bind` to work.
                args.unshift(null, seadragon);
                var constructor = Seadragon[name];
                var FactoryConstructor = constructor.bind.apply(constructor, args);
                return new FactoryConstructor();
            };
        }
    );


    // TODO correct jsDoc for config parameters, now it doesn't get generated.
    /**
     * Configuration options of this Seadragon instance.
     * @type Object
     */
    this.config = {
        /**
         * Prints more info to the console etc.
         * @type boolean
         */
        debugMode: false,


        /**
         * Blocks user-invoked canvas movement in horizontal and/or vertical direction.
         * Programatic panning works as before.
         *
         * @property {boolean} horizontal blocks movement in horizontal direction
         * @property {boolean} vertical blocks movement in vertical direction
         * @type Object
         */
        blockMovement: {
            horizontal: false,
            vertical: false,
        },
        /**
         * If <code>blockZoom</code>, use wheel event to pan.
         * @type boolean
         */
        wheelToPanWhenZoomBlocked: true,


        /**
         * Time it takes to finish various shorter animations (e.g. panning) in miliseconds.
         * @type number
         */
        animationTime: 100,
        /**
         * Time it takes to finish various longer animations (e.g. zooming) in miliseconds.
         * @type number
         */
        mouseAnimationTime: 500,
        /**
         * Time it takes to blend in/out tiles in miliseconds.
         * @type number
         */
        blendTime: 500,


        /**
         * Defines sharpness of springs moves; springs are used for animations.
         * @type number
         */
        springStiffness: 8,


        /**
         * Maximum number of simultaneous AJAX image requests.
         * @type number
         */
        imageLoaderLimit: 4,
        /**
         * Maximum waiting time for an image to load.
         * @type number
         */
        imageLoaderTimeout: 15000,
        /**
         * If true, image reuqests that exceedes <code>imageLoaderTimeout</code> are dropped.
         * @type boolean
         */
        dropImageLoadingOnTimeout: true,

        /**
         * Maximum number of images we should keep in memory.
         * @type number
         */
        imageCacheSize: 500,
        /**
         * The most shrunk a tile should be.
         * @type number
         */
        minPixelRatio: 0.5,
        /**
         * Maximum of two values when zoomed out as much as possible: current tiled image height in pixels divided
         * by container height, the same for width.
         * @type number
         */
        minVisibilityRatio: 1,
        /**
         * How much one can zoom in when constrained to a particular tiled image; 1 means native size.
         * If more than one tiled image is displayed, this condition is checked against each of them;
         * one positive result is enough.
         *
         * @type number
         */
        maxTiledImageStretch: 1,
        /**
         * <p>This parameter enlarges the target constraints rectangle when using <code>LayoutManager#fitImage</code>.
         * This makes it possible to pan the zoomed image a little further from edges.
         *
         * <p>The margin size is treated as percent of the smaller edge.
         *
         * @type number
         */
        marginFactor: 0,
        /**
         * <p>Modern browsers support subpixel precision when drawing on canvas. Utilizing it eliminates
         * the ugly "jumping effect" between tiles.
         *
         * <p>NOTE: subpixel tile drawing doesn't work well when there is no overlap between tiles. That's
         * one of reasons one should NEVER use zero overlap but in case we stumble upon such tiled images,
         * it can be desirable to disable subpixel tile drawing. That's why even if this setting is set
         * to true, it gets overriden for tiled images with zero tile overlap.
         *
         * @type boolean
         */
        subpixelTileParameters: true,


        /**
         * DZI format has tiles as small as 1x1 pixel. Loading them all on one side
         * prevents loading too large images conserving memory but, on the other hand,
         * causes a fuzzy effect. Level set here should be small enough to be contained
         * in one tile only.
         *
         * @type number
         */
        minLevelToDraw: 8,


        /**
         * How much to zoom on mouse wheel event.
         * @type number
         */
        zoomPerScroll: 1.2,


        /**
         * How much to scale <code>wheel</code> <code>deltaX</code> and <code>deltaY</code> values when
         * using the <code>wheel</code> event to pan instead of zooming.
         *
         * @type number
         */
        wheelToPanScale: 0.5,


        /**
         * Maximum number of tile images to keep in cache.
         * @type number
         */
        maxImageCacheCount: 100,


        /**
         * Do we draw the picker currently?
         * @type boolean
         */
        enablePicker: false,
        /**
         * Determines the size of the area surrounding picker borders which triggers resizing mode
         * when pressing the left mouse button when cursor is over it.
         *
         * @type number
         */
        pickerHandleSize: 10,


        /**
         * Do we draw the magnifier currently?
         * @type Boolean
         */
        enableMagnifier: false,
        /**
         * How much magnifier zooms tiles below it.
         * @type number
         */
        magnifierZoom: 2,
        /**
         * Magnifier is a circle; this parameter represents its radius in pixels.
         * @type number
         */
        magnifierRadius: 200,
        /**
         * Color of background beneath drawn images. Needed for magnifier to correctly
         * redraw background in places where there are no tiles to display.
         *
         * @type string
         */
        backgroundColor: '',

        /**
         * Text to display on the screen when a critical error occurs.
         *
         * @type string
         */
        criticalErrorText: 'A critical error occured. Please refresh the site.',
    };

    $.extend(this.config, configOverrides);

    // No DZIs loaded yet.
    this.tiledImages = [];

    this.$container = $(containerSelectorOrElement);
    if (this.$container.length === 0) {
        console.log('Received containerSelectorOrElement:', containerSelectorOrElement);
        this.fail('Can\'t create a Controller instance without a container!');
    }
    var originalContainerPosition = this.$container.css('position');
    this.$container.empty().css({
        // we need the container to be positioned
        position: originalContainerPosition === '' || originalContainerPosition === 'static' ?
            'relative' :
            originalContainerPosition,
        boxSizing: 'content-box',
        padding: 0,
        backgroundColor: this.config.backgroundColor,
    });

    Object.defineProperties(this,
        /**
         * @lends Seadragon#
         */
        {
            $canvas: {
                get: function () {
                    return $canvas;
                },
                set: function (val) {
                    $canvas = val;
                    canvasContext = $canvas.get(0).getContext('2d');
                },
                enumerable: true,
            },
            canvasContext: { // caching canvas context for performance boost
                get: function () {
                    return canvasContext;
                },
                set: function () {
                    console.error('Field canvasContext is not settable');
                },
                enumerable: true,
            },
        }
    );

    this.$canvas = $('<canvas>').css({
        boxSizing: 'border-box',
        position: 'absolute',
        width: '100%',
        height: '100%',
        margin: 0,
    });
    this.$container.append(this.$canvas);

    this.imageLoader = this.ImageLoader();

    this.viewport = this.Viewport();
    this.canvasLayersManager = this.CanvasLayersManager();

    if (Seadragon.Magnifier) {
        /**
         * @type Seadragon.Magnifier
         */
        this.magnifier = this.Magnifier([0, 0]);
    }
    if (Seadragon.Picker) {
        /**
         * @type Seadragon.Picker
         */
        this.picker = this.Picker();
    }
    if (Seadragon.Markers) {
        /**
         * @type Seadragon.Markers
         */
        this.markers = this.Markers();
    }
    /**
     * A <code>Seadragon.Drawer</code> instance, handles all the drawing.
     * @type Seadragon.Drawer
     */
    this.drawer = this.Drawer();
    if (Seadragon.LayoutManager) {
        /**
         * A <code>Seadragon.LayoutManager</code> instance, contains helper layout methods.
         * @type Seadragon.LayoutManager
         */
        this.layoutManager = this.LayoutManager();
    }
    /**
     * The main Seadragon controller.
     * @type Seadragon.Controller
     */
    this.controller = this.Controller();

    /**
     * Defines a proxy for a member's field, allowing to refer to <code>this[field]</code> instead of
     * <code>this[member][field]</code> for both getting or setting the field.
     *
     * @param {string} member  A field of the member of <code>this</code> indicated by this string is proxied.
     * @param {string} field  The field's name.
     * @param {boolean} enumerable  Value of field's planned <code>enumerable</code> flag.
     * @private
     */
    this._defineProxyForField = function _defineProxyForField(member, field, enumerable) {
        var that = this;
        (function (field) {
            Object.defineProperty(that, field, {
                get: function () {
                    return this[member][field];
                },
                set: function (value) {
                    this[member][field] = value;
                },
                enumerable: !!enumerable, // we don't want duplicate enumerated fields in proxies by default
            });
        })(field);
        return this;
    };

    this._defineProxyForAllFields = function _defineProxyForAllFields(member) {
        var that = this;
        utils.forEach(Object.keys(this[member]), function (field) {
            that._defineProxyForField(member, field);
        });
        return this;
    };

    // Proxying `Controller`/`LayoutManager` fields.
    this._defineProxyForAllFields('controller')
        ._defineProxyForAllFields('layoutManager');


    // Those values are handled using ES5 getters/setters but since they need Seadragon
    // initialized for their setters to work, they're defined at the end of the constructor.
    var configProxies = {
        blockZoom: this.config.blockZoom || false,
        centerWhenZoomedOut: this.config.centerWhenZoomedOut == null ? true : this.config.centerWhenZoomedOut,
        constrainViewport: this.config.constrainViewport || false,
        debugTileBorders: this.config.debugTileBorders || false,
    };

    this._setupVariableAndForceRedraw = function _setupVariableAndForceRedraw(name, forceIfTrue) {
        Object.defineProperty(this.config, name, {
            get: function () {
                return configProxies[name];
            },
            set: function (value) {
                configProxies[name] = value;
                if (forceIfTrue == null || configProxies[name] === forceIfTrue) {
                    seadragon.$container.trigger('seadragon:force_redraw');
                    seadragon.viewport.applyConstraints();
                }
            },
            enumerable: true,
        });
        this.config[name] = configProxies[name]; // trigger setters
        return this;
    };

    // Setup getters/setters.
    this
    /**
     * <p>If image is zoomed out so that its width is smaller than the container width, this switch means
     * the image is being kept centered horizontally; the same applies to height. Otherwise, user is free
     * to move the image as long as it doesn't go outside of the container.
     *
     * <p>This setting has effect only if <code>marginFactor === 0</code>.
     *
     * @type boolean
     */
        ._setupVariableAndForceRedraw('centerWhenZoomedOut', true)
    /**
     * If set to true, it prevents user from panning/zooming too far from
     * the viewport.constraintBounds rectangle.
     * @type boolean
     */
        ._setupVariableAndForceRedraw('constrainViewport', true)
    /**
     * Adds borders to tiles so that loading process is more explicit.
     * @type boolean
     */
        ._setupVariableAndForceRedraw('debugTileBorders');

    Object.defineProperties(this.config,
        /**
         * @lends Seadragon#config
         */
        {
            /**
             * Blocks user-invoked zoom; viewport methods still work.
             * @type boolean
             */
            blockZoom: {
                get: function () {
                    return configProxies.blockZoom;
                },
                set: function (value) {
                    configProxies.blockZoom = value;
                    if (configProxies.blockZoom && seadragon.config.wheelToPanWhenZoomBlocked) {
                        seadragon.enableWheelToPan();
                    } else {
                        seadragon.disableWheelToPan();
                    }
                },
                enumerable: true,
            },
        }
    );
    this.config.blockZoom = configProxies.blockZoom;
};

(function () {
    var NativeError = Error;
    /**
     * Constructs a <code>Seadragon.Error</code> instance.
     *
     * @class A Seadragon <code>Error</code> wrapper.
     *
     * @param {string} [message]
     */
    Seadragon.Error = function Error(message) {
        var error = new NativeError(message);
        error.constructor = Seadragon.Error;
        return error;
    };
    Seadragon.Error.prototype = Object.create(Error.prototype);
})();

$.extend(Seadragon.prototype,
    /**
     * @lends Seadragon.prototype
     */
    {
        /**
         * Checks if the <code>args</code> arguments object contains all expected values; throws an error otherwise.
         *
         * @param {Object} args  The <code>arguments</code> object to check.
         * @param {string} className  The name of the class used to create the object; needed for an error message.
         * @param {Array.<string>}expectedArguments  An array of argument names expected in the <code>args</code> array.
         * @returns {*} this
         */
        ensureArguments: function ensureArgumentsNum(args, className, expectedArguments) {
            expectedArguments = expectedArguments || [];
            var firstArg = args[0];

            if (!(firstArg instanceof Seadragon) ||
                args.length < expectedArguments.length + 1) { // +1 because of the `seadragon` parameter

                className = className || 'ClassName';

                var names = expectedArguments.join(', ');
                var errorString = 'Incorrect paremeters! Use:\n' +
                    '    var obj = seadragon.' + className + '(' + names + ')\n';

                expectedArguments.unshift('seadragon');
                var namesWithSeadragon = expectedArguments.join(', ');
                errorString += 'or:\n' +
                    '    new Seadragon.' + className + '(' + namesWithSeadragon + ')\n';

                console.log('Received arguments:', [].slice.call(args));
                this.fail(errorString);
            }

            /**
             * Main Seadragon instance.
             * @type Seadragon
             */
            this.seadragon = firstArg;
            return this;
        },

        /**
         * Checks if the <code>options</code> object contains all expected keys; throws an error otherwise.
         *
         * @param {Object} options  The <code>options</code> object to check.
         * @param {string} className  The name of the class used to create the object; needed for an error message.
         * @param {Array.<string>} expectedOptionsArray  An array of key names expected in the <code>options</code>
         *                                               object.
         */
        ensureOptions: function ensureOptions(options, className, expectedOptionsArray) {
            var missingOption = !options;
            utils.forEach(expectedOptionsArray, function (expectedOption) {
                if (!(options.hasOwnProperty(expectedOption))) {
                    missingOption = true;
                }
            });
            if (missingOption) {
                console.log('Received options:', options);
                this.fail('Seadragon.' + className + ' needs a JSON parameter with at least the ' +
                    'following fields: ' + expectedOptionsArray.join(', ') + '.');
            }
            return this;
        },
        /**
         * Invokes <code>console.log</code> iff <code>config.debugMode</code> is true.
         */
        log: function log() {
            if (this.config.debugMode) {
                console.log.apply(console, arguments);
            }
            return this;
        },
        /**
         * Displays an error message on Seadragon canvas and throws a new <code>Seadragon.Error</code>.
         * @param {string} [errorText]
         */
        fail: function fail(errorText) {
            var offset = this.$canvas.position();

            this.$container
                .append($('<div>')
                    .css({
                        position: 'absolute',
                        top: offset.top,
                        left: offset.left,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        color: 'white',
                        fontSize: 40,
                        textAlign: 'center',
                        display: 'table',
                        width: '100%',
                        height: '100%',
                    })
                    .append($('<div>')
                        .css({
                            display: 'table-cell',
                            verticalAlign: 'middle',
                        })
                        .append($('<div>')
                            .css({
                                display: 'block',
                                margin: '0 auto',
                            })
                            .text(this.config.criticalErrorText)
                        )
                    )
                );

            throw new Seadragon.Error(errorText);
        },
    }
);
