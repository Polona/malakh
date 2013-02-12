// TODO document
function Seadragon(containerSelectorOrElement, configOverrides) {
    var seadragon = this;
    this.seadragon = this; // needed for prototype methods

    /**
     * Constructors wrappers. Allows invoking:
     *     <code>var rectangle = this.Rectangle(2, 3, 50, 23);</code>
     * instead of:
     *     <code>var rectangle = new Seadragon.Rectangle(this.seadragon, 2, 3, 50, 23);</code>
     * etc.
     */
    ['AnimatedRectangle', 'CanvasLayersManager', 'Controller', 'Drawer',
        'DziImage', 'ImageLoader', 'LayoutManager', 'Magnifier', 'Markers', 'Picker',
        'Spring', 'Tile', 'TiledImage', 'Viewport']
        .forEach(function (name) {
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
         * Adds borders to tiles so that loading process is more explicit.
         * @type boolean
         */
        debugTileBorders: false,


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
            vertical: false
        },
        /**
         * Blocks user-invoked zoom; viewport methods still work.
         * @type boolean
         */
        blockZoom: false,


        /**
         * If set to true, it prevents user from panning/zooming too far from
         * the viewport.constraintBounds rectangle.
         * @type boolean
         */
        constraintViewport: false,


        /**
         * DZI format has tiles as small as 1x1 pixel. Loading them all on one side
         * prevents loading too large images conserving memory but, on the other hand,
         * causes a fuzzy effect. Level set here should be small enough to be contained
         * in one tile only.
         * @type number
         */
        minLevelToDraw: 8,


        /**
         * Time it takes to finish various animations in miliseconds.
         * @type number
         */
        animationTime: 1000,
        /**
         * Time it takes to blend in/out tiles in miliseconds.
         * WARNING: needs to be lower than animationTime!
         * @type number
         */
        blendTime: 500,


        /**
         * Defines sharpness of springs moves; springs are used for animations.
         * @type number
         */
        springStiffness: 5,


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
         * How much to zoom on mouse wheel event.
         * @type number
         */
        zoomPerScroll: 1.2,


        /**
         * Maximum number of tile images to keep in cache.
         * @type number
         */
        maxImageCacheCount: 100,


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
         * Do we draw the picker currently?
         * @type boolean
         */
        enablePicker: false,
        /**
         * Determines the size of the area surrounding picker borders which triggers resizing mode
         * when pressing the left mouse button when cursor is over it.
         * @type number
         */
        pickerHandleSize: 10,


        /**
         * Color of background beneath drawn images. Needed for magnifier to correctly
         * redraw background in places where there are no tiles to display.
         * @type string
         */
        backgroundColor: ''
    };
    $.extend(this.config, configOverrides);

    // No DZIs loaded yet.
    this.dziImages = [];

    this.$container = $(containerSelectorOrElement);
    if (this.$container.length === 0) {
        console.info('Received containerSelectorOrElement:', containerSelectorOrElement);
        throw new Error('Can\'t create a Controller instance without a container!');
    }
    this.$container.empty().css({
        backgroundColor: this.config.backgroundColor
    });

    this.$canvas = $('<canvas>');
    this.$container.append(this.$canvas);
    this.canvasContext = this.$canvas.get(0).getContext('2d'); // caching canvas context for performance boost

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

    function defineControllerProxyForField(field) {
        (function (field) {
            Object.defineProperty(seadragon, field, {
                get: function () {
                    return this.controller[field];
                },
                set: function (value) {
                    this.controller[field] = value;
                }
            });
        })(field);
    }

    // From user perspective controller is no different from seadragon itself so
    // we're propagating its methods/fields.
    for (var field in this.controller) {
        if (this.controller.hasOwnProperty(field)) {
            defineControllerProxyForField(field);
        }
    }
}

// Export a `Seadragon` global.
global.Seadragon = Seadragon;
