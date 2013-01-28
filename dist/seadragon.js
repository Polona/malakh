/*!
 * Seadragon v0.9.0pre
 *
 * Publisher: 2013 Laboratorium EE
 * Author: Michał Gołębiowski <michal.golebiowski@laboratorium.ee>
 * Released under the New BSD license (see the license.txt file for license information)
 *
 * Date: 2013-1-28
 */

this.Seadragon = {};

(function (global, Seadragon, undefined) {
    'use strict';

/**
 * <p>Configuration options of Seadragon.
 *
 * @namespace
 *
 * @author <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a> @
 *         <a href="http://laboratorium.ee/">Laboratorium EE</a>
 * @license MIT (see the license.txt file for copyright information)
 */
Seadragon.Config = {
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
     * @type string
     */
    backgroundColor: '#2d2a2b'
};
/**
 * <p>Constructs a point. Use cases are as follows:
 * <ul>
 *     <li><code>new Seadragon.Point()</code> gives point <code>(0, 0)</code></li>
 *     <li><code>new Seadragon.Point({x: xVal, y: yVal})</code> gives point <code>(xVal, yVal)</code></li>
 *     <li><code>new Seadragon.Point(x, y)</code> gives point <code>(x, y)</code></li>
 * </ul>
 *
 * @class <p>Represents a point on a 2-dimensional plane.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 */
Seadragon.Point = function Point() {
    var arguments0 = arguments[0];
    if (arguments0 == null) {
        /**
         * Horizontal point parameter.
         * @type number
         * @default 0
         */
        this.x = 0;
        /**
         * Vertical point parameter.
         * @type number
         * @default 0
         */
        this.y = 0;
    } else if (arguments0.x == null) {
        this.x = arguments0 || 0;
        this.y = arguments[1] || 0;
    } else {
        this.x = arguments0.x || 0;
        this.y = arguments0.y || 0;
    }
};

Seadragon.Point.prototype = {
    /**
     * Returns a sum by current point and another one.
     *
     * @param {Seadragon.Point} point
     * @return {Seadragon.Point}
     */
    plus: function plus(point) {
        return new Seadragon.Point(this.x + point.x, this.y + point.y);
    },

    /**
     * Returns a difference by current point and another one.
     *
     * @param {Seadragon.Point} point
     * @return {Seadragon.Point}
     */
    minus: function minus(point) {
        return new Seadragon.Point(this.x - point.x, this.y - point.y);
    },

    /**
     * Returns the current point multiplied by a given factor.
     *
     * @param {number} factor
     * @return {Seadragon.Point}
     */
    multiply: function multiply(factor) {
        return new Seadragon.Point(this.x * factor, this.y * factor);
    },

    /**
     * Returns the current point divided by a given factor.
     *
     * @param {number} factor
     * @return {Seadragon.Point}
     */
    divide: function divide(factor) {
        return new Seadragon.Point(this.x / factor, this.y / factor);
    },

    /**
     * Returns a negated point (i.e. replaces <code>x</code> by <code>-x</code> etc.).
     *
     * @return {Seadragon.Point}
     */
    negate: function negate() {
        return new Seadragon.Point(-this.x, -this.y);
    },

    /**
     * Returns an inverted point (i.e. replaces <code>x</code> by <code>1/x</code> etc.).
     *
     * @return {Seadragon.Point}
     */
    invert: function invert() {
        return new Seadragon.Point(1 / this.x, 1 / this.y);
    },

    /**
     * Calculates a distance to another point.
     *
     * @param {Seadragon.Point} point
     * @return {number}
     */
    distanceTo: function distanceTo(point) {
        return Math.sqrt(Math.pow(this.x - point.x, 2) + Math.pow(this.y - point.y, 2));
    },

    /**
     * Applies a function to both of point fields.
     *
     * @param {function} func
     * @return {Seadragon.Point}
     */
    apply: function apply(func) {
        return new Seadragon.Point(func(this.x), func(this.y));
    },

    /**
     * Returns the current point with both of fields rounded to integers.
     *
     * @return {Seadragon.Point}
     */
    round: function round() {
        return new Seadragon.Point(Math.round(this.x), Math.round(this.y));
    },

    /**
     * Checks if another point is equal to the current one.
     *
     * @param {Seadragon.Point} point
     * @return {boolean}
     */
    equals: function equals(point) {
        return point instanceof Seadragon.Point && this.x === point.x && this.y === point.y;
    },

    /**
     * Returns a <code>string</code> representing the point.
     *
     * @return {string}
     */
    toString: function toString() {
        return '(' + this.x + ', ' + this.y + ')';
    }
};
/**
 * <p>Constructs a segment <code>[(x_1, y_1), (x_2, y_2)]</code>.
 *
 * @class <p>Represents a Segment <code>[(x_1, y_1), (x_2, y_2)]</code> on a 2-dimensional plane.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {number} [x1=0]
 * @param {number} [y1=0]
 * @param {number} [x2=0]
 * @param {number} [y2=0]
 */
Seadragon.Segment = function Segment(x1, y1, x2, y2) {
    this.x1 = x1 || 0;
    this.y1 = y1 || 0;
    this.x2 = x2 || 0;
    this.y2 = y2 || 0;
};

Seadragon.Segment.prototype = {
    /**
     * Checks if another segment is equal to the current one.
     *
     * @param {Seadragon.Segment} segment
     * @return {boolean}
     */
    equals: function equals(segment) {
        return segment instanceof Seadragon.Segment &&
            this.x1 === segment.x1 && segment.y1 === segment.y1 &&
            this.x2 === segment.x2 && segment.y2 === segment.y2;
    },

    /**
     * Returns a <code>string</code> representing the segment.
     *
     * @return {string}
     */
    toString: function toString() {
        return '[(' + this.x1 + ', ' + this.y1 + '), ' + '(' + this.x2 + ', ' + this.y2 + ')]';
    }
};
/**
 * <p>Constructs a rectangle. Use cases are as follows:
 * <ul>
 *     <li><code>new Seadragon.Rectangle()</code> gives rectangle <code>[0, 0, 0 x 0]</code></li>
 *     <li><code>new Seadragon.Rectangle({x: x, y: y, width: width, height: height})</code>
 *         gives rectangle <code>[x, y, width x height]</code></li>
 *     <li><code>new Seadragon.Rectangle(x, y, width, height)</code>
 *         gives rectangle <code>[x, y, width x height]</code></li>
 * </ul>
 *
 * @class <p>Represents a rectangle on a 2-dimensional plane.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 */
Seadragon.Rectangle = function Rectangle() {
    var arguments0 = arguments[0];
    if (arguments0 == null) {
        /**
         * Horizontal left-top corner parameter.
         * @type number
         * @default 0
         */
        this.x = 0;
        /**
         * Vertical left-top corner parameter.
         * @type number
         * @default 0
         */
        this.y = 0;
        /**
         * Rectangle width.
         * @type number
         * @default 0
         */
        this.width = 0;
        /**
         * Rectangle height.
         * @type number
         * @default 0
         */
        this.height = 0;
    } else if (arguments0.x == null) {
        this.x = arguments0 || 0;
        this.y = arguments[1] || 0;
        this.width = arguments[2] || 0;
        this.height = arguments[3] || 0;
    } else {
        this.x = arguments0.x || 0;
        this.y = arguments0.y || 0;
        this.width = arguments0.width || 0;
        this.height = arguments0.height || 0;
    }
};

Seadragon.Rectangle.prototype = {
    /**
     * Returns aspect ratio of the rectangle (<code>width / height</code>).
     *
     * @return {number}
     */
    getAspectRatio: function getAspectRatio() {
        return this.width / this.height;
    },

    /**
     * Returns a point representing the top left corner of the rectangle.
     *
     * @return {Seadragon.Point}
     */
    getTopLeft: function getTopLeft() {
        return new Seadragon.Point(this.x, this.y);
    },

    /**
     * Returns a point representing the bottom right corner of the rectangle.
     *
     * @return {Seadragon.Point}
     */
    getBottomRight: function getBottomRight() {
        return new Seadragon.Point(this.x + this.width, this.y + this.height);
    },

    /**
     * Returns a point representing the center of the rectangle.
     *
     * @return {Seadragon.Point}
     */
    getCenter: function getCenter() {
        return new Seadragon.Point(this.x + this.width / 2, this.y + this.height / 2);
    },

    /**
     * Returns a point representing Rectangle size; that is: <code>(width, height)</code>.
     *
     * @return {Seadragon.Point}
     */
    getSize: function getSize() {
        return new Seadragon.Point(this.width, this.height);
    },

    /**
     * Checks if another rectangle is equal to the current one.
     *
     * @param {Seadragon.Rectangle} rectangle
     * @return {boolean}
     */
    equals: function equals(rectangle) {
        return rectangle instanceof Seadragon.Rectangle &&
            this.x === rectangle.x && this.y === rectangle.y &&
            this.width === rectangle.width && this.height === rectangle.height;
    },

    /**
     * Pans the rectangle by a given delta.
     *
     * @param {Seadragon.Point} delta
     */
    panBy: function panBy(delta) {
        var oldCenter = this.getCenter();
        this.panTo(oldCenter.plus(delta));
    },

    /**
     * Pans the rectangle so that it's center matches a given point.
     *
     * @param {Seadragon.Point} center
     */
    panTo: function panTo(center) {
        this.x = center.x - this.width / 2;
        this.y = center.y - this.height / 2;
    },

    /**
     * Checks if the rectangle contains a given point.
     *
     * @param {Seadragon.Point} point
     * @return {boolean}
     */
    containsPoint: function containsPoint(point) {
        return this.x <= point.x && point.x <= this.x + this.width &&
            this.y <= point.y && point.y <= this.y + this.height;
    },

    /**
     * Checks if the rectangle intersects a horizontal/vertical segment.
     * WARNING: it gives incorrect results for other kinds of segments!
     *
     * @param {Seadragon.Segment} segment
     * @param {boolean} horizontal Do we check for a horizontal intersection?
     * @return {boolean}
     */
    intersectsSegment: function intersectsSegment(segment, horizontal) {
        // ('x', 'y', 'height', 'width') or ('y', 'x', 'width', 'height')
        var par1, par2, length1, length2;
        // Parameters of projections of both segment and rectangle to the more
        // important axis.
        var segmentStart, segmentEnd, rectangleStart, rectangleEnd;

        if (!(segment instanceof Seadragon.Segment)) {
            console.error('Function intersetsSegment expects a Seadragon.Segment instance as a parameter');
            return false;
        }

        if (horizontal) {
            par1 = 'x';
            par2 = 'y';
            length1 = 'width';
            length2 = 'height';
        } else { // We convert everything to the horizontal case (further comments assume horizontal case).
            par1 = 'y';
            par2 = 'x';
            length1 = 'height';
            length2 = 'width';
        }
        if (segment[par2 + '1'] < this[par2] || segment[par2 + '1'] > this[par2] + this[length2]) {
            // The segment is above or below the rectangle.
            return false;
        }

        // We check the other dimension.
        segmentStart = segment[par1 + '1'];
        segmentEnd = segment[par1 + '2'];
        rectangleStart = this[par1];
        rectangleEnd = this[par1] + this[length1];

        return ((segmentStart > rectangleStart || segmentEnd > rectangleStart) &&
            (segmentStart < rectangleEnd || segmentEnd < rectangleEnd));
    },

    /**
     * Checks if the rectangle intersects another rectangle.
     *
     * @param {Seadragon.Rectangle} rectangle
     * @return {boolean}
     */
    intersectsRectangle: function intersectsRectangle(rectangle) {
        var left = rectangle.x;
        var right = rectangle.x + rectangle.width;
        var top = rectangle.y;
        var bottom = rectangle.y + rectangle.height;

        // Does rectangle's center lie inside the rectangle?
        return rectangle.containsPoint(this.getCenter()) ||
            // Does one of rectangle edges intersect the circle?
            this.intersectsSegment(new Seadragon.Segment(left, top, right, top), true) || // top edge
            this.intersectsSegment(new Seadragon.Segment(right, top, right, bottom), false) || // right edge
            this.intersectsSegment(new Seadragon.Segment(right, bottom, left, bottom), true) || // bottom edge
            this.intersectsSegment(new Seadragon.Segment(left, bottom, left, top), false); // left edge
    },

    /**
     * Returns a <code>string</code> representing the rectangle.
     *
     * @return {string}
     */
    toString: function toString() {
        return '[' + this.x + ', ' + this.y + ', ' + this.width + ' x ' + this.height + ']';
    }
};
/**
 * <p>Constructs a spring.
 *
 * @class <p>Represents a one-dimensional value together with animation definition invoked
 * on the value change. A lot of methods in other classes use springs to implement
 * their animations. The often met parameter in methods using springs is 'current'.
 * If true, it returns current value of the spring that can be during it's animation.
 * When false or missing, it returns the target value. This is used in various
 * loading scenarios when we prefer tiles closer to the target point, not the current,
 * temporary one.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {number} [initialValue=0]
 */
Seadragon.Spring = function Spring(initialValue) {
    /**
     * Current value of the spring, should be between <code>startValue</code> and <code>targetValue</code>.
     * @type number
     * @default 0
     */
    this.currentValue = initialValue || 0;
    /**
     * A value set at the moment the new <code>targetValue</code> is set.
     * It's used for computing <code>currentValue</code>.
     * @type number
     */
    this.startValue = this.currentValue;
    /**
     * A new desired value of the spring. Based on turning on or off animations<code>currentValue</code>
     * is either immediately set to it or scheduled to reach it in some time.
     * @type number
     */
    this.targetValue = this.currentValue;

    var currentTime = Date.now();
    /**
     * Indicates when animation started..
     * @type number
     */
    this.startTime = currentTime;
    /**
     * Time to which animation is scheduled to end.
     * @type number
     */
    this.targetTime = currentTime;

    /**
     * Cached value indicating if the spring is currently animated. This value is set to true
     * at the beginning of the <code>springTo</code> method and is updated in each use of
     * the <code>isAnimating</code> method.
     * @type boolean
     * @private
     */
    this.cacheIsAnimating = true;
};

Seadragon.Spring.prototype = {
    /**
     * Function mapping the segment [0, 1] onto itself in a continuous way.
     * Sharpness of the transformation is determined by the
     * <code>Seadragon.Config.springStiffness</code> parameter.
     *
     * @param {number} x
     * @return {number}
     * @private
     */
    transform: function transform(x) {
        var s = Seadragon.Config.springStiffness;
        return (1.0 - Math.exp(-x * s)) / (1.0 - Math.exp(-s));
    },

    /**
     * Returns the value of the spring. Depending on the <code>current</code> parameter,
     * current or target value is returned.
     *
     * @param {boolean} [current=false] Do we want the current value to be returned?
     * @return {boolean}
     */
    get: function get(current) {
        if (current) {
            return this.currentValue;
        } else {
            return this.targetValue;
        }
    },

    /**
     * Changes the target value of the spring.
     *
     * @param {number} target
     * @param {boolean} [immediately=false] If true, we immediately change
     * <code>currentValue</code> to the target one.
     */
    springTo: function springTo(target, immediately) {
        this.cacheIsAnimating = true;
        this.startValue = this.currentValue;
        this.startTime = Date.now();
        this.targetValue = target;
        if (immediately) {
            this.targetTime = this.startTime;
        } else {
            this.targetTime = this.startTime + Seadragon.Config.animationTime;
        }
    },

    /**
     * Changes the value without animating it.
     *
     * @param {number} target
     */
    resetTo: function resetTo(target) {
        this.springTo(target, true);
    },

    /**
     * Returns true if spring is animating. Note that we cache the return value
     * for performance reasons and use the cached version if it's false. Thus,
     * the value is manually set to true at the beginning of the springTo method.
     *
     * @return {boolean}
     * @private
     */
    isAnimating: function isAnimating() {
        if (!this.cacheIsAnimating) {
            return false;
        }
        this.cacheIsAnimating = this.currentValue !== this.targetValue;
        return this.cacheIsAnimating;
    },

    /**
     * Updates the current value of the spring based on current time and start and target values.
     * This method has to be invoked manually which is done by Seadragon.Drawer.
     */
    update: function update() {
        var currentTime = Date.now();
        this.currentValue = currentTime >= this.targetTime ?
            this.targetValue :
            this.startValue + (this.targetValue - this.startValue) *
                this.transform((currentTime - this.startTime) / (this.targetTime - this.startTime));
    }
};
/**
 * <p>Creates a new <code>ImageLoader</code>.
 *
 * @class <p>Represents objects managing loading of images. Remembers number of images
 * currently downloading and makes sure it doesn't exceed maximum set in
 * <code>Seadragon.Config.imageLoaderLimit</code>.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 */
Seadragon.ImageLoader = function ImageLoader() {
    /**
     * Number of images currently downloaded.
     * @type number
     * @default 0
     */
    this.downloading = 0;
};

Seadragon.ImageLoader.prototype = {
    /**
     * Loads an image.
     *
     * @param {string} src URL to the image to be loaded
     * @param {function} [callback] Callback function to be executed after image is loaded
     * @return {boolean} Was loading successful?
     */
    loadImage: function loadImage(src, callback) {
        if (this.downloading >= Seadragon.Config.imageLoaderLimit) {
            return false;
        }
        var self = this;

        this.downloading++;
        var timeout;
        var image = new Image();

        function catchedCallback() {
            self.downloading--;
            if (typeof callback === 'function') {
                try {
                    callback(image);
                } catch (error) {
                    console.error('Error while executing ' + src + ' callback.', error);
                }
            }
        }

        function finish() {
            if (timeout) {
                clearTimeout(timeout);
            }
            image.onload = image.onabort = image.onerror = null;

            // Call on a timeout to ensure asynchronous behavior.
            setTimeout(catchedCallback, 1, src, image.complete ? image : null);
        }

        image.onload = image.onabort = image.onerror = finish;

        // Consider it a failure if the image times out.
        timeout = setTimeout(finish, Seadragon.Config.imageLoaderTimeout);
        image.src = src;

        return true;
    }
};
//noinspection JSValidateJSDoc
/**
 * <p>Constructs a tiled image.
 *
 * @class <p>Represents a (potentially) large image in a following structure:
 * <ul>
 *     <li>There are levels numbered from 0 upwards; maximum level represents the image in its full size,
 *         level one below - the image with its width and height divided by 2 etc. Level in which the image
 *         has dimensions 1x1 is marked as level 0</li>
 *     <li>Each level is divided into tiles of dimensions <code>options.tileSize</code> (or lower on sides
 *         and corners) with overlap of <code>options.tileOverlap</code> pixels; if a particular level
 *         has smaller dimensions, there is only one tile.</li>
 * </ul>
 *
 * <p>See <code>Seadragon.Viewport</code> description for information about conventions around parameter
 * named <code>current</code> and names <strong>point</strong> and <strong>pixel</strong>.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @see Seadragon.Viewport
 *
 * @param {Object} options An object containing all given options.
 * @param {jQuery object} options.$container A jQuery object representing the DOM element containing
 *                                           all the HTML structure of Seadragon.
 * @param {number} options.width Sets <code>this.width</code>.
 * @param {number} options.height Sets <code>this.height</code>.
 * @param {number} options.tileSize Sets <code>this.tileSize</code>.
 * @param {number} [options.tileOverlap] Sets <code>this.tileOverlap</code>.
 * @param {number} [options.bounds=new Seadragon.Rectangle(0, 0, options.width, options.height)]
 *                 Sets <code>this.bounds</code>.
 * @param {number} [options.minLevel=Seadragon.Config.minLevelToDraw] Sets this.minLevel.
 * @param {number} [options.maxLevel=maximum image level] Sets this.maxLevel.
 * @param {number} [options.shown=true] If true, an image is hidden.
 */
Seadragon.TiledImage = function TiledImage(options) {
    if (options == null || options.$container == null || options.width == null || options.height == null ||
        options.tileSize == null || options.tileOverlap == null) {
        console.log('Received arguments: ');
        console.log(Array.prototype.slice.apply(arguments));
        throw new Error('Seadragon.TiledImage needs a JSON parameter with at least the following fields: ' +
            '$container, width, height, tileSize.\n' +
            'Fields: tileOverlap, bounds, minLevel, maxLevel, shown are optional.');
    }

    /**
     * Width of the tiled image (in pixels).
     * @type number
     */
    this.width = options.width;
    /**
     * Height of the tiled image (in pixels).
     * @type number
     */
    this.height = options.height;

    /**
     * Minimum level to be drawn.
     * @type number
     * @see Seadragon.Config.minLevelToDraw
     * @default Seadragon.Config.minLevelToDraw
     */
    this.minLevel = options.minLevel ? options.minLevel : Seadragon.Config.minLevelToDraw;
    /**
     * Maximum level to be drawn.
     * @type number
     * @default maximum image level
     */
    this.maxLevel = options.maxLevel ? options.maxLevel :
        Math.ceil(Math.log(Math.max(options.width, options.height)) / Math.log(2));

    /**
     * Maximum width and height of a single tile image (in pixels).
     * @type number
     */
    this.tileSize = options.tileSize;
    /**
     * Number of pixels neighbour tiles overlap.
     * @type number
     */
    this.tileOverlap = options.tileOverlap ? options.tileOverlap : 1;

    // Bounds are coordinates of a Seadragon Image on the virtual plane containing all the images.
    if (!options.bounds) {
        options.bounds = new Seadragon.Rectangle(0, 0, options.width, options.height);
    }
    /**
     * Animated bounds of the image. They represent position and shape of the image on the virtual
     * Seadragon plane.
     * @type {Seadragon.AnimatedRectangle}
     */
    this.bounds = new Seadragon.AnimatedRectangle(options.$container, options.bounds);

    // For hiding/showing an image with animation:
    /**
     * Is the image being blended in or out?
     * @type boolean
     */
    this.blending = false;
    /**
     * Time of blending start.
     * Relevant only when <code>this.blending</code> is true.
     * @type number
     */
    this.blendStart = null;
    /**
     * Is the image being hiden?
     * Relevant only when <code>this.blending</code> is true.
     * @type {Boolean}
     */
    this.hiding = false;

    if (options.shown == null) { // True by default.
        options.shown = true;
    }
    /**
     * Opacity of the image. Fully opaque by default.
     * @type number
     * @default 1
     */
    this.opacity = options.shown ? 1 : 0;
};

//noinspection JSValidateJSDoc,JSValidateJSDoc
Seadragon.TiledImage.prototype = {
    /**
     * Is the image fully shown? False during blending in/out.
     *
     * @return {boolean}
     */
    isShown: function isShown() {
        return !this.blending && this.opacity === 1;
    },

    /**
     * Is the image fully hidden? False during blending in/out.
     *
     * @return {boolean}
     */
    isHidden: function isHidden() {
        return !this.blending && this.opacity === 0;
    },

    /**
     * Is the image in the process of being shown?
     *
     * @return {boolean}
     */
    isShowing: function isShowing() {
        return this.blending && !this.hiding;
    },

    /**
     * Is the image in the process of being hidden?
     *
     * @return {boolean}
     */
    isHiding: function isHiding() {
        return this.blending && this.hiding;
    },

    /**
     * Scales the "virtual" canvas level to the current DZI image one.
     * This is important since DZIs can be scaled by changing their bounds
     * (e.g. by using controller's aligning methods) and we want tile sizes to draw
     * to match their size on canvas after scaling the whole image (e.g. if bounds
     * for the image are its default parameters divided by 2 we want to load tiles
     * one level lower so that they're not too small (and so that we don't load
     * too many of them!)
     *
     * @param {number} level
     * @param {boolean} current
     * @return {number}
     */
    getAdjustedLevel: function getAdjustedLevel(level, current) {
        var boundsScale = this.getBoundsScale(current);
        return level + Math.ceil(Math.log(Math.max(boundsScale.x, boundsScale.y)) / Math.log(2));
    },

    /**
     * Reverses <code>this.getAdjustedLevel</code>.
     *
     * @see #getAdjustedLevel
     *
     * @param {number} level
     * @param {boolean} current
     * @return {number}
     */
    getUnadjustedLevel: function getUnadjustedLevel(level, current) {
        var boundsScale = this.getBoundsScale(current);
        return level - Math.ceil(Math.log(Math.max(boundsScale.x, boundsScale.y)) / Math.log(2));
    },

    /**
     * Returns bounds width & height with regards to original image dimensions.
     *
     * @param {boolean} current
     * @return {Seadragon.Point}
     */
    getBoundsScale: function getBoundsScale(current) {
        var bounds;
        bounds = this.bounds.getRectangle(current);
        return new Seadragon.Point(
            bounds.width / this.width,
            bounds.height / this.height
        );
    },


    /**
     * How many times smaller are images from the given level compared to original image dimensions?
     *
     * @param {number} level
     * @return {number}
     */
    getLevelScale: function getLevelScale(level) {
        return Math.pow(0.5, this.maxLevel - level);
    },

    /**
     * Returns number of tiles in both dimensions at the current level.
     *
     * @param {number} level
     * @return {Seadragon.Point}
     */
    getNumTiles: function getNumTiles(level) {
        var scale = this.getLevelScale(level);
        var x = Math.ceil(scale * this.width / this.tileSize);
        var y = Math.ceil(scale * this.height / this.tileSize);

        return new Seadragon.Point(x, y);
    },

    /**
     * Returns bounds dimensions scaled (i.e. usually divided by some power of 2) to the given level.
     *
     * @param {number} level
     * @param {boolean} current
     * @return {Seadragon.Point}
     */
    getScaledDimensions: function getScaledDimensions(level, current) {
        var bounds = this.bounds.getRectangle(current);
        return new Seadragon.Point(bounds.width, bounds.height).multiply(this.getLevelScale(level));
    },

    /**
     * Returns a tile containing a given point.
     *
     * @param {number} level
     * @param {Seadragon.Point} point
     * @param {boolean} current
     * @return {Seadragon.Point}
     */
    getTileAtPoint: function getTileAtPoint(level, point, current) {
        var scale = this.getBoundsScale(current);
        var bounds = this.bounds.getRectangle(current);

        point = point.minus(new Seadragon.Point(bounds.x, bounds.y));
        point.x /= scale.x;
        point.y /= scale.y;
        var pixel = point.multiply(this.getLevelScale(level));

        var tx = Math.floor(pixel.x / this.tileSize);
        var ty = Math.floor(pixel.y / this.tileSize);

        return new Seadragon.Point(tx, ty);
    },

    /**
     * Returns tile bounds in points.
     *
     * @param {number} level
     * @param {number} x
     * @param {number} y
     * @param {boolean} current
     * @return {Seadragon.Rectangle}
     */
    getTileBounds: function getTileBounds(level, x, y, current) {
        var scale, bounds, px, py, sx, sy, levelScale;

        scale = this.getBoundsScale(current);
        bounds = this.bounds.getRectangle(current);

        // Find position, adjust for no overlap data on top and left edges.
        px = x === 0 ? 0 : this.tileSize * x - this.tileOverlap;
        py = y === 0 ? 0 : this.tileSize * y - this.tileOverlap;

        // Find size, adjust for no overlap data on top and left edges.
        sx = this.tileSize + (x === 0 ? 1 : 2) * this.tileOverlap;
        sy = this.tileSize + (y === 0 ? 1 : 2) * this.tileOverlap;

        // Normalize.
        levelScale = this.getLevelScale(level);
        px /= levelScale;
        py /= levelScale;
        sx /= levelScale;
        sy /= levelScale;

        // Adjust size for single-tile levels where the image size is smaller
        // than the regular tile size, and for tiles on the bottom and right
        // edges that would exceed the image bounds.
        sx = Math.min(sx, this.width - px);
        sy = Math.min(sy, this.height - py);

        // Adjust to bounds.
        px = bounds.x + px * scale.x;
        py = bounds.y + py * scale.y;
        sx *= scale.x;
        sy *= scale.y;

        return new Seadragon.Rectangle(px, py, sx, sy);
    },

    /**
     * Returns tile's URL/path. An abstract method - needs to be redefined in classes extending this one!
     * @param {number} level The image level the tile lies on.
     * @param {number} x Tile's column number (starting from 0).
     * @param {number} y Tile's row number (starting from 0).
     * @return {string}
     */
    getTileUrl: function getTileUrl(/* level, x, y */) {
        console.error('Method not implemented.');
        return '';
    },

    /**
     * @see Seadragon.AnimatedRectangle#fitBounds
     *
     * @param {Seadragon.Rectangle} bounds
     * @param {boolean} immediately
     */
    fitBounds: function fitBounds(bounds, immediately) {
        this.bounds.fitBounds(bounds, immediately);
    }
};
//noinspection JSValidateJSDoc
/**
 * Constructs an animated rectangle.
 *
 * @class <p>Represents a rectangle that can be moved using animations. It's represented
 * by a set of four <code>Seadragon.Springs</code> which handle animating.
 *
 * <p>All <code>AnimatedRectangle</code>'s methods follow the same conventions with respect
 * to <code>current</code> and <code>immediately</code> parameters as <code>Viewport</code>'s ones.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @see Seadragon.Viewport
 *
 * @param {jQuery object} $container Sets <code>this.$container</code>.
 * @param {Seadragon.Rectangle} bounds A rectangle representing the initial value of the animated rectangle.
 */
Seadragon.AnimatedRectangle = function AnimatedRectangle($container, bounds) {
    var self = this;

    if ($container == null || !(bounds instanceof Seadragon.Rectangle)) {
        console.log('Received arguments: ');
        console.log(Array.prototype.slice.apply(arguments));
        throw new Error('Incorrect paremeters given to Seadragon.AnimatedRectangle!\n' +
            'Use Seadragon.AnimatedRectangle($container, bounds)');
    }

    /**
     * Indicates if the animated rectangle is in the process of changing its value.
     * @type boolean
     * @default true
     */
    this.isAnimating = true;

    var version = Date.now();
    Object.defineProperties(this, {
        /**
         * Accessing the <code>version</code> parameter updates it to the current date (!),
         * updating isAnimating, too, if it was true. Note that we never change isAnimating
         * if it was false, we need to remember to set it manually when starting particular animations!
         * (this is for performance reasons). Manually setting version is not allowed.
         *
         * @type number
         * @memberof Seadragon.AnimatedRectangle#
         */
        version: {
            get: function () {
                if (self.isAnimating) { // We cache it otherwise for performance reasons.
                    self.isAnimating = self.springs.x.isAnimating() || self.springs.y.isAnimating() ||
                        self.springs.width.isAnimating() || self.springs.height.isAnimating();
                    version = Date.now(); // We want an update at least one more time.
                }
                return version;
            },
            set: function () {
                console.error('Seadragon.AnimatedRectangle\'s version parameter can\'t be manually changed');
            }
        }
    });

    /**
     * A jQuery object representing the DOM element containing all the HTML structure of Seadragon.
     * @type jQuery object
     */
    this.$container = $container;

    /**
     * @type Object
     * @property {Seadragon.Spring} x A spring representing the top-left horizontal parameter.
     * @property {Seadragon.Spring} y A spring representing the top-left vertical parameter.
     * @property {Seadragon.Spring} width A spring representing width of the rectangle.
     * @property {Seadragon.Spring} height A spring representing height of the rectangle.
     */
    this.springs = {
        x: new Seadragon.Spring(bounds.x),
        y: new Seadragon.Spring(bounds.y),
        width: new Seadragon.Spring(bounds.width),
        height: new Seadragon.Spring(bounds.height)
    };
};

Seadragon.AnimatedRectangle.prototype = {
    /**
     * Returns the usual Seadragon.Rectangle instance from the current or target state.
     *
     * @param {boolean} current
     * @return {Seadragon.Rectangle}
     */
    getRectangle: function getRectangle(current) {
        return new Seadragon.Rectangle(
            this.springs.x.get(current),
            this.springs.y.get(current),
            this.springs.width.get(current),
            this.springs.height.get(current)
        );
    },

    /**
     * Returns aspect ratio of the rectangle (<code>width / height</code>).
     *
     * @param {boolean} current
     * @return {number}
     */
    getAspectRatio: function getAspectRatio(current) {
        return this.getRectangle(current).getAspectRatio();
    },

    /**
     * @param {boolean} current
     * @return {Seadragon.Point}
     */
    getTopLeft: function getTopLeft(current) {
        return this.getRectangle(current).getTopLeft();
    },

    /**
     * @param {boolean} current
     * @return {Seadragon.Point}
     */
    getBottomRight: function getBottomRight(current) {
        return this.getRectangle(current).getBottomRight();
    },

    /**
     * Returns a point <code>(width, height)</code>.
     *
     * @param {boolean} current
     * @return {Seadragon.Point}
     */
    getSize: function getSize(current) {
        return this.getRectangle(current).getSize();
    },

    /**
     * @param current
     * @return {Seadragon.Point}
     */
    getCenter: function getCenter(current) {
        return this.getRectangle(current).getCenter();
    },

    /**
     * Pans the viewport to a given center.
     *
     * @param {Seadragon.Point} center
     * @param {boolean} immediately
     */
    panTo: function panTo(center, immediately) {
        this.springs.x.springTo(center.x - this.springs.width.targetValue / 2, immediately);
        this.springs.y.springTo(center.y - this.springs.height.targetValue / 2, immediately);

        this.isAnimating = true;
        this.$container.trigger('seadragon.forceredraw');
    },

    /**
     * Pans the viewport by a given <code>delta</code> vector.
     * @param {Seadragon.Point} delta
     * @param {boolean} immediately
     */
    panBy: function panBy(delta, immediately) {
        this.panTo(this.getCenter().plus(delta), immediately);
    },

    /**
     * Updates the state of all rectangle springs. In case of a change, triggers
     * a <code>seadragon.forceredraw</code> event on the container.
     *
     * @return {boolean} Did anything change?
     */
    update: function update() {
        var bounds = this.getRectangle(true);

        this.springs.x.update();
        this.springs.y.update();
        this.springs.width.update();
        this.springs.height.update();

        var anythingChanged = this.springs.x.currentValue !== bounds.x ||
            this.springs.y.currentValue !== bounds.y ||
            this.springs.width.currentValue !== bounds.width ||
            this.springs.height.currentValue !== bounds.height;
        if (anythingChanged) {
            this.$container.trigger('seadragon.forceredraw');
        }
        return anythingChanged;
    },

    /**
     * Animates a rectangle to a new one.
     *
     * @param {Seadragon.Rectangle} bounds
     * @param {boolean} immediately
     */
    fitBounds: function fitBounds(bounds, immediately) {
        this.isAnimating = true;

        this.springs.x.springTo(bounds.x, immediately);
        this.springs.y.springTo(bounds.y, immediately);
        this.springs.width.springTo(bounds.width, immediately);
        this.springs.height.springTo(bounds.height, immediately);
    }
};
/**
 * <p>Creates a magnifier with given <code>center</code> and <code>radius</code>.
 *
 * @class <p>Represents a magnifier which enlarges tiles around the mouse pointer
 * enclosing them in a circular shape.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {Seadragon.Point} center
 * @param {number} radius
 */
Seadragon.Magnifier = function Magnifier(center, radius) {
    if (!(center instanceof Seadragon.Point) || !radius) {
        console.log('Received arguments: ');
        console.log(Array.prototype.slice.apply(arguments));
        throw new Error('Incorrect paremeters given to Seadragon.Magnifier!\n' +
            'Use Seadragon.Magnifier(center, radius). Radius has to be a positive number.');
    }
    this.center = center;
    this.radius = radius;
};

Seadragon.Magnifier.prototype = {
    /**
     * Pans the magnifier by a given vector represented by a <code>Seadragon.Point</code> instance.
     *
     * @param {Seadragon.Point} delta
     */
    panBy: function panBy(delta) {
        this.center.x += delta.x;
        this.center.y += delta.y;
    },

    /**
     * Pans the magnifier so that its new center matches a given one.
     *
     * @param {Seadragon.Point} newCenter New center point of the magnifier
     */
    panTo: function panTo(newCenter) {
        this.center.x = newCenter.x;
        this.center.y = newCenter.y;
    },

    contains: function contains(point) {
        return this.center.distanceTo(point) <= this.radius;
    },

    /**
     * Checks if a magnifier has a non-empty intersection with a given rectangle.
     * WARNING: this methods returns true in some cases where the rectangle
     * doesn't intersect a circle! This operation is used very often so quick
     * checking is important.
     *
     * @param {Seadragon.Rectangle} rectangle
     * @return {boolean}
     */
    intersectsRectangle: function intersectsRectangle(rectangle) {
        return rectangle.intersectsRectangle(new Seadragon.Rectangle(
            this.center.x - this.radius / Seadragon.Config.magnifierZoom,
            this.center.y - this.radius / Seadragon.Config.magnifierZoom,
            2 * this.radius / Seadragon.Config.magnifierZoom,
            2 * this.radius / Seadragon.Config.magnifierZoom
        ));
    },

    /**
     * Defines a shape enclosing the magnifier.
     *
     * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
     */
    drawPath: function drawPath(context) {
        context.lineWidth = 5;
        context.strokeStyle = '#00d5ef';

        // Defines the circle.
        context.beginPath();
        context.arc(this.center.x, this.center.y, Seadragon.Config.magnifierRadius, 0, Math.PI * 2, true);
        context.closePath();
        context.fillStyle = Seadragon.Config.backgroundColor;
        context.fill();
        context.clip();

        var crossLength = 20;

        // Defines a cross in the middle of the magnifier.
        context.moveTo(this.center.x - crossLength / 2, this.center.y);
        context.lineTo(this.center.x + crossLength / 2, this.center.y);
        context.moveTo(this.center.x, this.center.y - crossLength / 2);
        context.lineTo(this.center.x, this.center.y + crossLength / 2);
    },

    /**
     * Draws the defined shape (used after loading tiles so that they don't cover drawn lines).
     *
     * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
     */
    drawOnFinish: function drawOnFinish(context) {
        context.lineWidth = 5;
        context.strokeStyle = '#00d5ef';
        context.stroke();
    },

    /**
     * Returns a <code>string</code> representing the magnifier.
     *
     * @return {string}
     */
    toString: function toString() {
        return 'Magnifier((' + this.center.x + ', ' + this.center.y + '), ' + this.radius + ')';
    }
};
/**
 * <p>Creates a magnifier with given <code>center</code> and <code>radius</code>.
 *
 * @class <p>Represents a magnifier which enlarges tiles around the mouse pointer
 * enclosing them in a circular shape.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {Seadragon.Point} center
 * @param {number} radius
 */
Seadragon.Magnifier = function Magnifier(center, radius) {
    if (!(center instanceof Seadragon.Point) || !radius) {
        console.log('Received arguments: ');
        console.log(Array.prototype.slice.apply(arguments));
        throw new Error('Incorrect paremeters given to Seadragon.Magnifier!\n' +
            'Use Seadragon.Magnifier(center, radius). Radius has to be a positive number.');
    }
    this.center = center;
    this.radius = radius;
};

Seadragon.Magnifier.prototype = {
    /**
     * Pans the magnifier by a given vector represented by a <code>Seadragon.Point</code> instance.
     *
     * @param {Seadragon.Point} delta
     */
    panBy: function panBy(delta) {
        this.center.x += delta.x;
        this.center.y += delta.y;
    },

    /**
     * Pans the magnifier so that its new center matches a given one.
     *
     * @param {Seadragon.Point} newCenter New center point of the magnifier
     */
    panTo: function panTo(newCenter) {
        this.center.x = newCenter.x;
        this.center.y = newCenter.y;
    },

    contains: function contains(point) {
        return this.center.distanceTo(point) <= this.radius;
    },

    /**
     * Checks if a magnifier has a non-empty intersection with a given rectangle.
     * WARNING: this methods returns true in some cases where the rectangle
     * doesn't intersect a circle! This operation is used very often so quick
     * checking is important.
     *
     * @param {Seadragon.Rectangle} rectangle
     * @return {boolean}
     */
    intersectsRectangle: function intersectsRectangle(rectangle) {
        return rectangle.intersectsRectangle(new Seadragon.Rectangle(
            this.center.x - this.radius / Seadragon.Config.magnifierZoom,
            this.center.y - this.radius / Seadragon.Config.magnifierZoom,
            2 * this.radius / Seadragon.Config.magnifierZoom,
            2 * this.radius / Seadragon.Config.magnifierZoom
        ));
    },

    /**
     * Defines a shape enclosing the magnifier.
     *
     * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
     */
    drawPath: function drawPath(context) {
        context.lineWidth = 5;
        context.strokeStyle = '#00d5ef';

        // Defines the circle.
        context.beginPath();
        context.arc(this.center.x, this.center.y, Seadragon.Config.magnifierRadius, 0, Math.PI * 2, true);
        context.closePath();
        context.fillStyle = Seadragon.Config.backgroundColor;
        context.fill();
        context.clip();

        var crossLength = 20;

        // Defines a cross in the middle of the magnifier.
        context.moveTo(this.center.x - crossLength / 2, this.center.y);
        context.lineTo(this.center.x + crossLength / 2, this.center.y);
        context.moveTo(this.center.x, this.center.y - crossLength / 2);
        context.lineTo(this.center.x, this.center.y + crossLength / 2);
    },

    /**
     * Draws the defined shape (used after loading tiles so that they don't cover drawn lines).
     *
     * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
     */
    drawOnFinish: function drawOnFinish(context) {
        context.lineWidth = 5;
        context.strokeStyle = '#00d5ef';
        context.stroke();
    },

    /**
     * Returns a <code>string</code> representing the magnifier.
     *
     * @return {string}
     */
    toString: function toString() {
        return 'Magnifier((' + this.center.x + ', ' + this.center.y + '), ' + this.radius + ')';
    }
};
//noinspection JSValidateJSDoc
/**
 * Constructs a DZI image.
 *
 * @class Represents a tiled image in the DZI format.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @extends Seadragon.TiledImage
 *
 * @param {Object} options An object containing all given options.
 * @param {jQuery object} options.$container A jQuery object representing the DOM element containing
 *                                           all the HTML structure of Seadragon.
 * @param {number} options.width Sets <code>this.width</code>.
 * @param {number} options.height Sets <code>this.height</code>.
 * @param {number} options.tileSize Sets <code>this.tileSize</code>.
 * @param {number} options.tilesURL Sets <code>this.tilesUrl</code>.
 * @param {number} options.tileFormat Sets <code>this.tileFormat</code>.
 * @param {number} [options.tileOverlap] Sets <code>this.tileOverlap</code>.
 * @param {number} [options.bounds] Sets <code>this.bounds</code>.
 * @param {number} [options.minLevel] Sets this.minLevel.
 * @param {number} [options.maxLevel] Sets this.maxLevel.
 * @param {number} [options.shown=true] If true, an image is hidden.
 */
Seadragon.DziImage = function DziImage(options) {
    if (options == null || options.$container == null || options.width == null || options.height == null ||
        options.tileSize == null || options.tilesUrl == null || options.fileFormat == null) {
        console.log('\nReceived options: ');
        console.log(options);
        throw new Error('Seadragon.DziImage needs a JSON parameter with at least the following ' +
            'fields: $container, width, height, tileSize, tilesUrl, fileFormat.\n' +
            'Fields: tileOverlap, bounds, minLevel, maxLevel, shown are optional.');
    }

    Seadragon.TiledImage.call(this, {
        $container: options.$container,
        width: options.width,
        height: options.height,
        tileSize: options.tileSize,
        tileOverlap: options.tileOverlap,
        bounds: options.bounds,
        minLevel: options.minLevel,
        maxLevel: options.maxLevel,
        shown: options.shown
    });

    this.tilesUrl = options.tilesUrl;
    this.fileFormat = options.fileFormat;
};

Seadragon.DziImage.prototype = Object.create(Seadragon.TiledImage.prototype);

$.extend(Seadragon.DziImage.prototype,
    /**
     * @lends Seadragon.DziImage.prototype
     */
    {
        /**
         * Returns tile's URL/path.
         *
         * @param {number} level The image level the tile lies on.
         * @param {number} x Tile's column number (starting from 0).
         * @param {number} y Tile's row number (starting from 0).
         * @return {string}
         */
        getTileUrl: function getTileUrl(level, x, y) {
            return this.tilesUrl + '_files/' + level + '/' + x + '_' + y + '.' + this.fileFormat;
        }
    }
);


//noinspection JSValidateJSDoc
/**
 * Processes a DZI file, creating a <code>DziImage</code> instance.
 *
 * @param {Object} options An object containing all given options.
 * @param {Document} options.data An object representing a DZI file.
 * @param {string} options.dziUrl See <a href="#createFromDzi"><code>Seadragon.DziImage.createFromDzi</code></a>.
 * @param {jQuery object} options.$container See <a href="#createFromDzi"><code>Seadragon.DziImage.createFromDzi</code></a>.
 * @param {Document} [options.bounds] Bounds in which an image must fit. If not given, we assume the rectangle
 *                                    <code>[0, 0, width x height]</code> where <code>width</code> and
 *                                    <code>height</code> are taken from DZI.
 * @param {boolean} [options.shown] See <a href="#createFromDzi"><code>Seadragon.DziImage.createFromDzi</code></a>.
 * @return {Seadragon.DziImage}
 *
 * @memberof Seadragon.DziImage~
 * @private
 */
function processDzi(options) {
    var imageNode = $(options.data.documentElement);
    if (!imageNode || imageNode.prop('tagName') !== 'Image') {
        throw new Error('Sorry, we only support Deep Zoom Image!');
    }

    var fileFormat = imageNode.attr('Format');

    var sizeNode = imageNode.children('size');

    var invalidFormatMessage = 'This doesn\'t appear to be a valid Deep Zoom Image.';
    if (!sizeNode) {
        throw new Error(invalidFormatMessage);
    }

    var width = parseInt(sizeNode.attr('Width'), 10);
    var height = parseInt(sizeNode.attr('Height'), 10);
    var tileSize = parseInt(imageNode.attr('TileSize'), 10);
    var tileOverlap = parseInt(imageNode.attr('Overlap'), 10);

    if (!width || !height || !tileSize) {
        throw new Error(invalidFormatMessage);
    }

    var tilesUrl = getTilesPath(options.dziUrl);

    if (!options.bounds) {
        options.bounds = new Seadragon.Rectangle(0, 0, width, height); // default bounds copied from DZI
    }

    return new Seadragon.DziImage({
        $container: options.$container,
        width: width,
        height: height,
        tileSize: tileSize,
        tileOverlap: tileOverlap,
        tilesUrl: tilesUrl,
        fileFormat: fileFormat,
        bounds: options.bounds,
        shown: options.shown
    });
}

function getTilesPath(dziUrl) {
    // Extracts tiles url.

    var urlParts = dziUrl.split('/');
    var filename = urlParts[urlParts.length - 1];
    var lastDot = filename.lastIndexOf('.');

    if (lastDot > -1) {
        urlParts[urlParts.length - 1] = filename.slice(0, lastDot);
    }
    return urlParts.join('/');
}

//noinspection JSValidateJSDoc
/**
 * Creates a DziImage instance from the DZI file.
 *
 * @param {Object} options An object containing all given options.
 * @param {string} options.dziUrl An URL/path to the DZI file.
 * @param {jQuery object} options.$container A jQuery object representing the DOM element containing
 *                                           all the HTML structure of Seadragon.
 * @param {function} options.callback Function invoked when DZI is fully processed.
 * @param {Seadragon.Rectangle} [options.bounds] Bounds representing position and shape of the image on the virtual
 *                                       Seadragon plane.
 * @param {number} [options.index] If specified, an image is loaded into <code>controller.dziImages[index]</code>.
 *                         Otherwise it's put at the end of the table.
 * @param {boolean} [options.shown=true] If false, image is not drawn. It can be made visible later.
 */
Seadragon.DziImage.createFromDzi = function createFromDzi(options) {
    if (options == null || options.dziUrl == null || options.$container == null || options.callback == null) {
        console.log('\nReceived options: ');
        console.log(options);
        throw new Error('Seadragon.DziImage\'s createFromDzi method needs a JSON parameter with at ' +
            'least the following fields: dziUrl, $container, callback.\n' +
            'Fields: bounds, index, shown are optional.');
    }

    if (!options.dziUrl) {
        throw new Error('No url to DZI given!');
    }

    $.ajax({
        type: 'GET',
        url: options.dziUrl,
        dataType: 'xml',
        success: function (data) {
            options.data = data;
            options.callback(processDzi(options), options.index);
        },
        error: function (_, statusText) {
            throw new Error('Unable to retrieve the given DZI file, does it really exist? ', statusText);
        }
    });
};
//noinspection JSValidateJSDoc
/**
 * <p>Constructs a viewport.
 *
 * @class <p>Represents the visible part of the virtual plane containing all Seadragon images.
 * Supports animations by extending <code>Seadragon.AnimatedRectangle</code>.
 *
 * <p>All methods of this class adhere to two conventions:
 * <ul>
 *     <li><code>current</code> parameter set to true means functions return the current, not target state
 *         of the object; they differ only during animations. By default the target state is returned.</li>
 *     <li><code>immediately</code> parameter set to true means functions invoke an action immediately,
 *         bypassing animations.</li>
 * </ul>
 *
 * <p>Wherever a <code>refPoint</code> parameter appears, it indicates a method tries to apply a transformation
 * while keeping the point's place on the viewport intact. (e.g. if we zoom using mouse we want the point
 * under it not to move).
 *
 * <p>Here and in other parts of code the convention is: <strong>point</strong> means the position
 * on the virtual plane containing all Seadragon images, whereas <strong>pixel</strong> is the usual
 * pixel on the screen. E.g. when user zooms or drags the canvas <strong>pixels</strong> move but
 * <strong>points</strong> stay the same.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @extends Seadragon.AnimatedRectangle
 *
 * @param {jQuery object} $container A jQuery object representing the DOM element containing
 *                                   all the HTML structure of Seadragon.
 */
Seadragon.Viewport = function Viewport($container) {
    if ($container == null) {
        console.log('Received arguments: ');
        console.log(Array.prototype.slice.apply(arguments));
        throw new Error('Incorrect paremeter given to Seadragon.Viewport!\n' +
            'Use Seadragon.Viewport($container)');
    }

    var containerDimensions = $container.css(['width', 'height']);
    var containerWidth = parseInt(containerDimensions.width, 10);
    var containerHeight = parseInt(containerDimensions.height, 10);
    Seadragon.AnimatedRectangle.call(this, $container,
        new Seadragon.Rectangle(0, 0, containerWidth, containerHeight));

    /**
     * <code>$container</code> size, cached for performance reasons. NOTE: needs to be manually
     * updated on each <code>$container</code> resize by invoking the <code>resize</code> method!
     * <code>Seadragon.Controller</code> invokes it automatically on window resize event.
     *
     * @type Seadragon.Point
     */
    this.containerSize = new Seadragon.Point(containerWidth, containerHeight);
    /**
     * Maximum permissible
     * @type number
     */
    this.maxLevelScale = Infinity; // We'll change it later.
    /**
     * Viewport can be constrained in a particular rectangle so that a user can't pan or zoom
     * beyond its visibility. It's done by setting <code>Seadragon.Config.constraintViewport</code>
     * to true and then this parameter is used for constraining. If this parameter is not an instance
     * of <code>Seadragon.Rectangle</code>, viewport is not constrained regardless of
     * <code>Seadragon.Config.constraintViewport</code> setting.
     *
     * @type Seadragon.Rectangle
     */
    this.constraintBounds = undefined;
};

Seadragon.Viewport.prototype = Object.create(Seadragon.AnimatedRectangle.prototype);

$.extend(Seadragon.Viewport.prototype,
    /**
     * @lends Seadragon.Viewport.prototype
     */
    {
        /**
         * Returns a number indicating how much the viewport is zoomed in. zoom === 1 means container width
         * equals viewport width.
         *
         * @param {boolean} current
         * @return {number}
         */
        getZoom: function getZoom(current) {
            return this.containerSize.x / this.springs.width.get(current);
        },

        /**
         * Zooms an image to a given value. <code>zoom</code> of value 1 means 1 point equals 1 pixel.
         *
         * @param {number} zoom
         * @param {boolean} immediately
         * @param {Seadragon.Point} refPoint
         */
        zoomTo: function zoomTo(zoom, immediately, refPoint, /* internal */ dontApplyConstraints) {
            if (!(refPoint instanceof Seadragon.Point)) {
                refPoint = this.getCenter();
            }

            var aspect = this.getAspectRatio();

            var oldBounds = this.getRectangle();
            var distanceToTopLeft = refPoint.minus(new Seadragon.Point(oldBounds.x, oldBounds.y));
            var refPointRelativeDimensions = new Seadragon.Point(
                distanceToTopLeft.x / oldBounds.width,
                distanceToTopLeft.y / oldBounds.height);

            this.springs.width.springTo(this.containerSize.x / zoom, immediately);
            this.springs.height.springTo(this.springs.width.targetValue / aspect, immediately);
            this.springs.x.springTo(
                refPoint.x - refPointRelativeDimensions.x * this.springs.width.targetValue, immediately);
            this.springs.y.springTo(
                refPoint.y - refPointRelativeDimensions.y * this.springs.height.targetValue, immediately);

            if (!dontApplyConstraints) {
                this.applyConstraints(false, refPoint);
            }
            this.$container.trigger('seadragon.forceredraw');
        },

        /**
         * Changes <code>zoom</code> value to <code>zoom * factor </code>.
         *
         * @see #zoomTo
         *
         * @param {number} factor
         * @param {boolean} immediately
         * @param {Seadragon.Point} refPoint
         */
        zoomBy: function zoomBy(factor, immediately, refPoint, /* internal */ dontApplyConstraints) {
            this.zoomTo(this.getZoom() * factor, immediately, refPoint, dontApplyConstraints);
        },

        /**
         * Pans the viewport so that its center moves to a given <code>center</code> parameter.
         *
         * @param {Seadragon.Point} center
         * @param {boolean} immediately
         */
        panTo: function panTo(center, immediately, /* internal */ dontApplyConstraints) {
            Seadragon.AnimatedRectangle.prototype.panTo.call(this, center, immediately);
            if (!dontApplyConstraints) {
                this.applyConstraints(false);
            }
            this.$container.trigger('seadragon.forceredraw');
        },

        /**
         * Pans the viewport my a given vector.
         *
         * @param {Seadragon.Point} delta A vector by which we pan the viewport.
         * @param {boolean} immediately
         */
        panBy: function panBy(delta, immediately, /* internal */ dontApplyConstraints) {
            this.panTo(this.getCenter().plus(delta), immediately, dontApplyConstraints);
        },

        /**
         * Displays the whole rectangle as large as possible so that it still
         * fits into the viewport and centers it.
         *
         * Note: this method it's a little different from it's equivalent in
         * <code>Seadragon.AnimatedRectangle</code> as we can't change the viewport's aspect ratio.
         *
         * @see Seadragon.AnimatedRectangle#fitBounds
         *
         * @param {Seadragon.Rectangle} bounds
         * @param {boolean} immediately
         */
        fitBounds: function fitBounds(bounds, immediately) {
            var aspect = this.getAspectRatio();
            var center = bounds.getCenter();

            // Resize bounds to match viewport's aspect ratio, maintaining center.
            var newBounds = new Seadragon.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
            if (newBounds.getAspectRatio() >= aspect) {
                // Width is bigger relative to viewport, resize height.
                newBounds.height = bounds.width / aspect;
                newBounds.y = center.y - newBounds.height / 2;
            } else {
                // Height is bigger relative to viewport, resize width.
                newBounds.width = bounds.height * aspect;
                newBounds.x = center.x - newBounds.width / 2;
            }

            Seadragon.AnimatedRectangle.prototype.fitBounds.call(this, newBounds, immediately);

            this.$container.trigger('seadragon.forcealign');
        },

        /**
         * Zooms out as much as possible while preserving constraints.
         *
         * @param {boolean} immediately
         */
        fitConstraintBounds: function fitConstraintBounds(immediately) {
            if (!(this.constraintBounds instanceof Seadragon.Rectangle)) {
                console.error('Can\'t fit the viewport to constraintBounds because they\'re not set.');
                return;
            }
            this.fitBounds(this.constraintBounds, immediately);
        },

        /**
         * Invoked on window resize.
         *
         * @param {Seadragon.Point} newContainerSize point: <code>(container width, container height)</code>.
         */
        resize: function resize(newContainerSize) {
            var zoom = this.getZoom();
            // Update container size, but make a copy first.
            this.containerSize = new Seadragon.Point(newContainerSize.x, newContainerSize.y);
            this.springs.width.resetTo(this.containerSize.x / zoom);
            this.springs.height.resetTo(this.springs.width.get() * this.containerSize.y / this.containerSize.x);
            this.applyConstraints(true);
        },

        /**
         * <p>Moves the viewport so that the user doesn't go too far away. Without it it's easy
         * to "lose" the image.
         *
         * <p>NOTE: Since viewport doesn't have any information about pixel density in particular DZIs,
         * without the <code>maxLevelScale</code> parameter it can't protect from zooming in too much but
         * only from zooming out or dragging the constraints rectangle outside of the viewport. Zooming
         * in has to be handled separately. Thus, it's advised to NOT USE this method directly but
         * to use controller's <code>applyConstraints</code> method instead. This method ignores the
         * <code>Seadragon.Config.constraintViewport</code> parameter since it's checked in controller's
         * method anyway.
         *
         * @param {boolean} immediately
         * @param {Seadragon.Point} refPoint
         */
        applyConstraints: function applyConstraints(immediately, refPoint) {
            if (!Seadragon.Config.constraintViewport) {
                return;
            }
            if (!(this.constraintBounds instanceof Seadragon.Rectangle)) {
                console.error('Can\'t apply constraints because constraintBounds is not set.');
                return;
            }
            var scale;
            var needToAdjust = false;
            var whatToScale = 'height';

            var cR = this.constraintBounds; // constraints rectangle
            var vR = this.getRectangle(); // viewport rectangle

            var viewportRatio = vR.getAspectRatio();
            var constraintsRatio = cR.width / cR.height;

            if (viewportRatio < constraintsRatio) { // Empty borders on top and bottom.
                // We will turn this case into the latter one.
                whatToScale = 'width';
            }

            /// ZOOMING PART
            // Now we assume viewportRatio < constraintsRatio which means empty borders on sides.
            if (vR[whatToScale] > cR[whatToScale]) { // Too small, we need to zoom in.
                needToAdjust = true;
                scale = vR[whatToScale] / cR[whatToScale];
            } else {
                // We use 'else' just in case the maxLevelScale parameter has a stupid value.
                // Otherwise, it could case the image to flicker.
                var cRInPixels = this.deltaPixelsFromPoints(new Seadragon.Point(cR.width, cR.height));
                if (cRInPixels.x > this.maxLevelScale) { // We've zoomed in too much
                    needToAdjust = true;
                    scale = this.maxLevelScale / cRInPixels.x;
                } else if (cRInPixels.y > this.maxLevelScale) { // We've zoomed in too much
                    needToAdjust = true;
                    scale = this.maxLevelScale / cRInPixels.y;
                }
            }

            if (needToAdjust) {
                this.zoomBy(scale, immediately, refPoint, true);
                vR = this.getRectangle();
            }

            /// PANNING PART
            var parameterPairs = [
                {start: 'x', length: 'width'},
                {start: 'y', length: 'height'}
            ];
            for (var i = 0; i < 2; i++) {
                var pair = parameterPairs[i];
                var start = pair.start;
                var length = pair.length;

                if (vR[length] > cR[length]) {
                    // If the image is zoomed out so that its height/width is
                    // smaller than constraints, center it.
                    needToAdjust = true;
                    vR[start] = cR[start] + cR[length] / 2 - vR[length] / 2;
                }
                else if ((vR[start] < cR[start] && vR[start] + vR[length] < cR[start] + cR[length]) ||
                    (vR[start] > cR[start] && vR[start] + vR[length] > cR[start] + cR[length])) {
                    // Too far on the left/top.
                    needToAdjust = true;

                    // We need to choose the smaller delta so that we don't make
                    // the image jump from side to side.
                    var delta1 = Math.abs(cR[start] - vR[start]);
                    var delta2 = Math.abs(cR[start] + cR[length] - vR[start] - vR[length]);
                    var delta = Math.min(delta1, delta2);

                    if (vR[start] > cR[start]) { // Restoring correct sign of delta.
                        delta = -delta;
                    }
                    vR[start] += delta;
                }
            }

            if (needToAdjust) {
                this.panTo(vR.getCenter(), immediately, true);
            }
        },

        // CONVERSION HELPERS
        /**
         * Converts a point-vector (i.e. a vector indicating distance between two points) to a pixel-vector
         * (analogous).
         *
         * @param {Seadragon.Point} deltaPoints
         * @param {boolean} current
         * @return {Seadragon.Point}
         */
        deltaPixelsFromPoints: function deltaPixelsFromPoints(deltaPoints, current) {
            return deltaPoints.multiply(this.getZoom(current));
        },

        /**
         * Converts a pixel-vector to a point-vector. It's different from converting pixels to points because
         * viewport top-left corner's pixel coordinates are always <code>(0, 0)</code> but points don't
         * exhibit this behaviour.
         *
         * @param {Seadragon.Point} deltaPixels
         * @param {boolean} current
         * @return {Seadragon.Point}
         */
        deltaPointsFromPixels: function deltaPointsFromPixels(deltaPixels, current) {
            return deltaPixels.divide(this.getZoom(current));
        },

        /**
         * Converts a point to a pixel. Note that viewport top-left corner's pixel coordinates are always
         * <code>(0, 0)</code>.
         *
         * @param {Seadragon.Point} point
         * @param {boolean} current
         * @return {Seadragon.Point}
         */
        pixelFromPoint: function pixelFromPoint(point, current) {
            var bounds, zoom;
            bounds = this.getRectangle(current);
            zoom = this.getZoom(current);
            return point.minus(bounds.getTopLeft()).multiply(zoom);
        },

        /**
         * Converts a pixel to a point.
         *
         * @param {Seadragon.Point} pixel
         * @param {boolean} current
         * @return {Seadragon.Point}
         */
        pointFromPixel: function pointFromPixel(pixel, current) {
            var bounds = this.getRectangle(current);
            var zoom = this.getZoom(current);
            return pixel.divide(zoom).plus(bounds.getTopLeft());
        },

        /**
         * Converts rectangle's <code>(topLeftX, topLeftY, width, height)</code> coordinates from ones
         * described in pixels to those described in points.
         *
         * @param {Seadragon.Rectangle} rectangle
         * @param {boolean} current
         * @return {Seadragon.Rectangle}
         */
        pointRectangleFromPixelRectangle: function pointRectangleFromPixelRectangle(rectangle, current) {
            var topLeft = rectangle.getTopLeft();
            var size = rectangle.getSize();

            var newTopLeft = this.pointFromPixel(topLeft, current);
            var newSize = this.deltaPointsFromPixels(size, current);

            return new Seadragon.Rectangle(newTopLeft.x, newTopLeft.y, newSize.x, newSize.y);
        },

        /**
         * Reverses <code>pointRectangleFromPixelRectangle</code> action.
         *
         * @see #pointRectangleFromPixelRectangle
         *
         * @param {Seadragon.Rectangle} rectangle
         * @param {boolean} current
         * @return {Seadragon.Rectangle}
         */
        pixelRectangleFromPointRectangle: function pixelRectangleFromPointRectangle(rectangle, current) {
            var topLeft = rectangle.getTopLeft();
            var size = rectangle.getSize();

            var newTopLeft = this.pixelFromPoint(topLeft, current);
            var newSize = this.deltaPixelsFromPoints(size, current);

            return new Seadragon.Rectangle(newTopLeft.x, newTopLeft.y, newSize.x, newSize.y);
        }
    }
);
//noinspection JSValidateJSDoc
/**
 * <p>Constructs the Picker instance.
 *
 * @class <p>Allows to mark rectangular areas on the virtual plane. These areas
 * can be later memorized using <code>Seadragon.Markers</code> instance.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {jQuery object} $container A jQuery object representing the DOM element containing
 *                                   all the HTML structure of Seadragon.
 * @param {Seadragon.Viewport} viewport The viewport handling current Seadragon instance.
 */
Seadragon.Picker = function Picker($container, viewport) {
    var $pickerOverlay, $pickerArea;

    var HANDLE_SIZE = 10;

    var pickerAreaMode, drawingArea;

    (function init() {
        if ($container == null || !(viewport instanceof Seadragon.Viewport)) {
            console.log('Received arguments: ');
            console.log(Array.prototype.slice.apply(arguments));
            throw new Error('Incorrect paremeters given to Seadragon.Picker!\n' +
                'Use Seadragon.Picker($container, viewport)');
        }
        // Indicates direction in which we are resizing the rectangle at the moment.
        pickerAreaMode = {
            toRight: true, // Is the rectangle being resized to the right, keeping its left edge intact?
            toBottom: true // Is the rectangle being resized to the bottom, keeping its top edge intact?
        };
        drawingArea = false; // Are we drawing a rectangle at the moment?

        $pickerOverlay = $('<div class="pickerOverlay" />').css({
            position: 'absolute',
            zIndex: 100,
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent'
        });

        $pickerArea = $('<div class="pickerArea" />').css({
            position: 'absolute',
            display: 'none',
            zIndex: 150,
            left: 0,
            top: 0,
            backgroundColor: 'transparent',
            border: '5px dashed #00d5ef'
        });
        $pickerOverlay.append($pickerArea);

        bindEvents();
    })();

    function show() {
        $container.append($pickerOverlay);
        $(document).on({
            mouseup: onMouseUp
        });
    }

    /**
     * Activates the Picker.
     * @function
     */
    this.show = show;

    function hide() {
        $(document).off({
            mouseup: onMouseUp
        });
        $pickerArea.hide();
        $pickerOverlay.detach();
    }

    /**
     * Deactivates the Picker.
     * @function
     */
    this.hide = hide;

    /**
     * Returns current mouse position relative to the canvas top left corner.
     *
     * @param {jQuery.Event} event An event from which we gather mouse position.
     * @return {Seadragon.Point}
     * @private
     */
    function getMousePosition(event) {
        var offset = $container.offset();
        return new Seadragon.Point(event.pageX - offset.left, event.pageY - offset.top);
    }

    /**
     * Checks if the position (mouseX, mouseY) is over the border of the rectangle
     * of a given bounds.
     *
     * @param {Seadragon.Rectangle} bounds
     * @param {number} mouseX
     * @param {number} mouseY
     * @return {string} String representing canonical cursor name corresponding to its current position over
     *                  the border (like <code>'nw-resize'</code>).
     * @private
     */
    function overBorder(bounds, mouseX, mouseY) {
        // Click position wrt. border of the rectangle.
        var Pos = {
            begin: 0,
            middle: 1,
            end: 2
        };
        var xPos, yPos;

        // Did we click outside the rectangle?
        if (mouseX < bounds.x - HANDLE_SIZE || mouseX > bounds.x + bounds.width + HANDLE_SIZE) {
            return 'default';
        }
        if (mouseY < bounds.y - HANDLE_SIZE || mouseY > bounds.y + bounds.height + HANDLE_SIZE) {
            return 'default';
        }

        // Position of the click in the rectangle.
        if (mouseX < bounds.x + HANDLE_SIZE && mouseX < bounds.x + bounds.width / 2) {
            xPos = Pos.begin;
        } else if (mouseX > bounds.x + bounds.width - HANDLE_SIZE) {
            xPos = Pos.end;
        } else {
            xPos = Pos.middle;
        }

        if (mouseY < bounds.y + HANDLE_SIZE && mouseY < bounds.y + bounds.height / 2) {
            yPos = Pos.begin;
        } else if (mouseY > bounds.y + bounds.height - HANDLE_SIZE) {
            yPos = Pos.end;
        } else {
            yPos = Pos.middle;
        }

        switch (xPos) {
            case Pos.begin:
                switch (yPos) {
                    case Pos.begin:
                        return 'nw-resize';
                    case Pos.middle:
                        return 'w-resize';
                    case Pos.end:
                        return 'sw-resize';
                    default:
                        console.log('Error 1! xPos: ' + xPos + ', yPos: ' + yPos);
                        return 'default';
                }
                break;

            case Pos.middle:
                switch (yPos) {
                    case Pos.begin:
                        return 'n-resize';
                    case Pos.middle:
                        return 'default'; // interior
                    case Pos.end:
                        return 's-resize';
                    default:
                        console.log('Error 2! xPos: ' + xPos + ', yPos: ' + yPos);
                        return 'default';
                }
                break;

            case Pos.end:
                switch (yPos) {
                    case Pos.begin:
                        return 'ne-resize';
                    case Pos.middle:
                        return 'e-resize';
                    case Pos.end:
                        return 'se-resize';
                    default:
                        console.log('Error 3! xPos: ' + xPos + ', yPos: ' + yPos);
                        return 'default';
                }
                break;

            default:
                console.error('Error 4! xPos: ' + xPos + ', yPos: ' + yPos);
                return 'default';
        }
    }


    /**
     * Dynamically changes picker's rectangle during it's creation
     * or dragging by its edge or corner.
     *
     * @param {number} left Position of the left edge of the rectangle when we move its right side.
     *                      Changes to mean position of the right side when mouse moves far to the left.
     * @param {number} top Like above but with 'left' changed to 'top' and 'right' to 'bottom'.
     * @param {boolean} horizontally Do we allow horizontal resizing? Can be blocked if we drag by the edge.
     * @param {boolean} vertically Do we allow vertical resizing?
     * @private
     */
    function keepAdjustingArea(left, top, horizontally, vertically) {
        if (horizontally == null) {
            horizontally = true;
        }
        if (vertically == null) {
            vertically = true;
        }

        $pickerOverlay.on({
            mousemove: function (event) {
                var mousePosition = getMousePosition(event);
                var cursorType = '';

                // Vertical/horizontal blocking is active when we change
                // rectangle size by dragging by its edge.
                if (vertically) {
                    pickerAreaMode.toBottom = mousePosition.y >= top;
                    if (pickerAreaMode.toBottom) {
                        $pickerArea.css({
                            top: top,
                            height: mousePosition.y - top
                        });
                        cursorType += 's';
                    } else {
                        $pickerArea.css({
                            top: mousePosition.y,
                            height: top - mousePosition.y
                        });
                        cursorType += 'n';
                    }
                }

                if (horizontally) {
                    pickerAreaMode.toRight = mousePosition.x >= left;
                    if (pickerAreaMode.toRight) {
                        $pickerArea.css({
                            left: left,
                            width: mousePosition.x - left
                        });
                        cursorType += 'e';
                    } else {
                        $pickerArea.css({
                            left: mousePosition.x,
                            width: left - mousePosition.x
                        });
                        cursorType += 'w';
                    }
                }

                cursorType += '-resize';
                $pickerOverlay.css('cursor', cursorType);
            }
        });
    }


    function getPickerAreaRectangle() {
        var pickerAreaCss = $pickerArea.css(['left', 'top', 'width', 'height']);
        return new Seadragon.Rectangle(
            parseInt(pickerAreaCss.left, 10),
            parseInt(pickerAreaCss.top, 10),
            parseInt(pickerAreaCss.width, 10),
            parseInt(pickerAreaCss.height, 10)
        );
    }


    /**
     * Handling mousemove when NOT changing picker's size.
     * This function just changes mouse cursor based on hovering.
     * @private
     */
    function bindPickerMouseMove() {
        $pickerOverlay.on({
            mousemove: function (event) {
                var mousePosition = getMousePosition(event);
                if (drawingArea) {
                    return;
                }

                var $this = $(this);

                var cursorType;
                if ($pickerArea.is(':visible')) {
                    cursorType = overBorder(getPickerAreaRectangle(), mousePosition.x, mousePosition.y);
                } else { // we haven't marked anything yet
                    cursorType = 'default';
                }

                $this.css('cursor', cursorType);
            }
        });
    }

    function onMouseUp(event) {
        if (drawingArea) {
            $pickerOverlay.off('mousemove');
            bindPickerMouseMove();

            var areaBounds = viewport.pointRectangleFromPixelRectangle(getPickerAreaRectangle());

            console.log('areaBounds: [' + areaBounds.x + ', ' + areaBounds.y +
                ', ' + areaBounds.width + ', ' + areaBounds.height +
                '], right: ' + (areaBounds.x + areaBounds.width) +
                ', bottom: ' + (areaBounds.y + areaBounds.height));

            drawingArea = false;

            // The point is invisible so we prefer to hide it.
            if (areaBounds.width === 0 && areaBounds.height === 0) {
                $pickerArea.hide();
            }

            var mouseMoveEvent = $.Event('mousemove');
            mouseMoveEvent.pageX = event.pageX;
            mouseMoveEvent.pageY = event.pageY;
            $pickerOverlay.trigger(mouseMoveEvent);
        }
    }


    function bindEvents() {
        bindPickerMouseMove();

        $pickerOverlay.on({
            mousedown: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                drawingArea = true;
                var mousePosition = getMousePosition(event);

                var pickerAreaCss = $pickerArea.css(['left', 'top', 'width', 'height']);
                var pickerAreaCssNormalized = {
                    x: parseInt(pickerAreaCss.left, 10),
                    y: parseInt(pickerAreaCss.top, 10),
                    width: parseInt(pickerAreaCss.width, 10),
                    height: parseInt(pickerAreaCss.height, 10)
                };

                var cursorType;
                if ($pickerArea.is(':visible')) {
                    cursorType = overBorder(pickerAreaCssNormalized, mousePosition.x, mousePosition.y);
                } else { // we haven't marked anything yet
                    cursorType = 'default';
                }

                switch (cursorType) {
                    case 'default':
                        // We didn't catch a handle to change size of the
                        // rectangle, we're making a new one.
                        var left = mousePosition.x;
                        var top = mousePosition.y;
                        $pickerArea.css({
                            left: left,
                            top: top,
                            width: 0,
                            height: 0
                        });
                        $pickerArea.show();
                        keepAdjustingArea(left, top);
                        break;

                    case 'n-resize':
                        keepAdjustingArea(
                            null,
                            pickerAreaCssNormalized.y + pickerAreaCssNormalized.height,
                            false, true);
                        break;

                    case 'w-resize':
                        keepAdjustingArea(
                            pickerAreaCssNormalized.x + pickerAreaCssNormalized.width,
                            null,
                            true, false);
                        break;

                    case 's-resize':
                        keepAdjustingArea(null, pickerAreaCssNormalized.y, false, true);
                        break;

                    case 'e-resize':
                        keepAdjustingArea(pickerAreaCssNormalized.x, null, true, false);
                        break;

                    case 'nw-resize':
                        keepAdjustingArea(
                            pickerAreaCssNormalized.x + pickerAreaCssNormalized.width,
                            pickerAreaCssNormalized.y + pickerAreaCssNormalized.height);
                        break;

                    case 'sw-resize':
                        keepAdjustingArea(
                            pickerAreaCssNormalized.x + pickerAreaCssNormalized.width,
                            pickerAreaCssNormalized.y);
                        break;

                    case 'se-resize':
                        keepAdjustingArea(pickerAreaCssNormalized.x, pickerAreaCssNormalized.y);
                        break;

                    case 'ne-resize':
                        keepAdjustingArea(
                            pickerAreaCssNormalized.x,
                            pickerAreaCssNormalized.y + pickerAreaCssNormalized.height);
                        break;
                }

                return false;
            }
        });
    }
};
//noinspection JSValidateJSDoc
/**
 * <p>Constructs a <code>Seadragon.Markers</code> instance.
 *
 * @class <p>Each marker is represented by a DOM object and a Seadragon.Rectangle instance
 * to which it's scaled. The rectangle represents element's position in points, not pixels;
 * thus it's updated when canvas moves.
 *
 * <ul>
 *     <li>Author: <a href="mailto:szymon.nowicki@laboratorium.ee">Szymon Nowicki</a>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {jQuery object} $container A jQuery object representing the DOM element containing
 *                                   all the HTML structure of Seadragon.
 * @param {Seadragon.Viewport} viewport The viewport handling current Seadragon instance.
 */
Seadragon.Markers = function Markers($container, viewport) {
    //An array of all kept markers.
    var markers = [];
    // An HTML overlay keeping all markers.
    var $markerOverlay;

    (function init() {
        if ($container == null || !(viewport instanceof Seadragon.Viewport)) {
            console.log('Received arguments: ');
            console.log(Array.prototype.slice.apply(arguments));
            throw new Error('Incorrect paremeters given to Seadragon.Markers!\n' +
                'Use Seadragon.Markers($container, viewport)');
        }
        $markerOverlay = $('<div class="markerOverlay" />');
        $container.append($markerOverlay);
        bindEvents();
    })();

    function addMarker(object, rectangle) {
        markers.push({object: object, rectangle: rectangle});
        $markerOverlay.append(object);
        fixPositions();
    }

    /**
     * Adds a single marker representing given object enclosed in a given rectangle. Rectangle is represented
     * in Seadragon points, relative to the virtual canvas on which everything is drawn.
     *
     * @param {HTMLElement} object An HTML element being marked.
     * @param {Seadragon.Rectangle} rectangle The rectangle representing object's position on the virtual canvas.
     * @function
     */
    this.addMarker = addMarker;

    function deleteMarkers() {
        markers = [];
        $markerOverlay.html('');
    }

    /**
     * Clears markers array.
     */
    this.deleteMarkers = deleteMarkers;

    /**
     * Moves markers to fit canvas when moving.
     * @private
     */
    function fixPositions() {
        $.each(markers, function (_, pair) {
            var pixelRectangle = viewport.pixelRectangleFromPointRectangle(pair.rectangle, true);
            var object = pair.object;
            object.css({
                left: pixelRectangle.x,
                top: pixelRectangle.y,
                width: pixelRectangle.width,
                height: pixelRectangle.height
            });
        });

    }

    function bindEvents() {
        $container.on({
            'seadragon.animation': fixPositions
        });
    }
};
/**
 * <p>Constructs a <code>Seadragon.Tile</code> instance.
 *
 * @class <p>Represents a single tile used by Seadragon. The tile knows about it's image path,
 * its position (i.e. it's column & row), the corresponding level and a few other parameters.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {Object} options An object containing all given options.
 * @param {number} options.level Sets <code>this.level</code>.
 * @param {number} options.x Sets <code>this.x</code>.
 * @param {number} options.y Sets <code>this.y</code>.
 * @param {Seadragon.Rectangle} options.bounds Sets <code>this.bounds</code>.
 * @param {string} options.url Sets <code>this.url</code>.
 */
Seadragon.Tile = function Tile(options) {
    if (options == null || options.level == null || options.x == null || options.y == null ||
        options.bounds == null || options.url == null) {
        console.log('\nReceived options: ');
        console.log(options);
        throw new Error('Seadragon.Tile needs a JSON parameter with at least the following fields: ' +
            'level, x, y, bounds, exists, url.');
    }

    // Core
    /**
     * Time of last change.
     * @type number
     */
    this.version = Date.now();
    /**
     * DZI level in which the tile is exists. Level 0 means the smallest image.
     * @type number
     */
    this.level = options.level;
    /**
     * The column at level <code>options.level</code> which is represented by this tile.
     * @type number
     */
    this.x = options.x;
    /**
     * The row at level <code>options.level</code> which is represented by this tile.
     * @type number
     */
    this.y = options.y;
    /**
     * A rectangle representing tile's position and size in normalized coordinates on the virtual plane.
     * @type Seadragon.Rectangle
     */
    this.bounds = options.bounds;

    /**
     * Set to false if an error during tile file load occurs. Helps <code>Drawer</code> to omit such tiles.
     * @type boolean
     */
    this.failedToLoad = false;
    /**
     * Did the tile already load its file?
     * @type boolean
     */
    this.loaded = false;
    /**
     * Is tile loading in progress?
     * @type boolean
     */
    this.loading = false;


    // Image
    /**
     * An <code>Image</code> object representing the image file at <code>this.url</code>.
     * @type Image
     */
    this.image = null;
    /**
     * The URL of tile's image file.
     * @type string
     */
    this.url = options.url;


    // Drawing
    /**
     * Current position of the tile on the screen in pixels.
     * @type Seadragon.Point
     */
    this.position = null;
    /**
     * Current size of the tile on the screen in pixels.
     * @type number
     */

    /**
     * The start time of this tile's blending.
     * @type number
     */
    this.blendStart = null;
    /**
     * Tile's opacity from 0 (transparent) to 1 (opaque).
     * @type number
     */
    this.opacity = null;
    /**
     * Planned (at the end of an animation) coordinates of the center of the tile;
     * used for computing tile loading order.
     * @type Seadragon.Point
     */
    this.targetCenter = null;
    /**
     * How far is the tile's level from being planned to be displayed. If e.g. the tile
     * has very large level and current view shows the image from the distance we know
     * we won't need the tile soon, thus the tile has low visibility to us.
     * @type number
     */
    this.visibility = null;


    // Caching
    /**
     * Do we plan to draw this tile in the current frame?
     * @type boolean
     */
    this.beingDrawn = false;
    /**
     * When did we looked at the tile information last time?
     * @type number
     */
    this.lastTouchTime = 0;
};

Seadragon.Tile.prototype = {
    /**
     * Updates tile's version to the current time.
     */
    updateVersion: function updateVersion() {
        this.version = Date.now();
    },

    /**
     * Draws the tile on canvas. Optionally applies zoom needed for magnifier support
     * and in that case makes it so both the usual and enlarged tile is identical
     * around <code>mousePosition</code>.
     *
     * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
     * @param {number} [zoom=1]
     * @param {Seadragon.Point} [mousePosition]
     */
    drawCanvas: function drawCanvas(context, zoom, mousePosition) {
        if (!this.loaded) {
            throw new Error('Attempting to draw tile ' + this.toString() + ' when it\'s not yet loaded.');
        }

        var position = this.position;
        var size = this.size;
        if (zoom != null && zoom !== 1) {
            position = position
                .minus(mousePosition)
                .multiply(zoom)
                .plus(mousePosition);
            size.x *= zoom;
            size.y *= zoom;
        }

        context.globalAlpha = this.opacity;
        context.drawImage(this.image, position.x, position.y, size.x, size.y);

        if (Seadragon.Config.debugTileBorders) {
            context.strokeRect(position.x, position.y, size.x, size.y);
        }
        context.globalAlpha = 1;
    },

    /**
     * Resets the tile and removes the reference to the image it contained.
     */
    unload: function unload() {
        this.image = null;
        this.loaded = false;
        this.loading = false;
    },

    /**
     * Returns the string representation of the tile.
     * @return {string}
     */
    toString: function toString() {
        return this.level + '/' + this.x + '_' + this.y;
    }
};
/**
 * Constructs the <code>CanvasLayerManager</code> instance based of canvas context
 * and a magnifier instance.
 *
 * @class <p>Manages two virtual layers on one canvas. This is needed to properly handle magnifier
 * as its tiles have to be drawn after all usual ones. Layer 0 is responsible for usual tiles, layer 1
 * for magnifier ones. Layer 1 is not drawn if magnifier is not shown.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
 * @param {Seadragon.Magnifier} magnifier
 */
Seadragon.CanvasLayersManager = function CanvasLayersManager(context, magnifier) {
    if (context == null) {
        throw new Error('Can\'t create a CanvasLayersManager instance without a context parameter!');
    }
    this.clear();
    /**
     * '2d' context of canvas on which we are drawing.
     * @type CanvasRenderingContext2D
     */
    this.context = context;
    /**
     * @type Seadragon.Magnifier
     */
    this.magnifier = magnifier;
    /**
     * Magnifier is drawn only this field is true.
     * @type boolean
     */
    /**
     * An array containing all tiles currently scheduled to draw
     * @type Array.<Array.<Seadragon.Tile>>
     */
    this.tiles = [
        [],
        []
    ];
};

Seadragon.CanvasLayersManager.prototype = {
    /**
     * Adds a tile to the layer idenfified by <code>layerNum</code>.
     * Magnifier's layer number is 1, the "standard" layer is 0.
     *
     * @param {number} layerNum
     * @param {Seadragon.Tile} tile
     */
    addToLayer: function addToLayer(layerNum, tile) {
        this.tiles[layerNum].push(tile);
    },

    /**
     * Draws the layer idenfified by <code>layerNum</code>.
     *
     * @param {number} layerNum
     */
    drawLayer: function drawLayer(layerNum) {
        var i, tilesOnLayer, drawLayer1, tile, zoom;
        tilesOnLayer = this.tiles[layerNum];
        drawLayer1 = layerNum === 1 && this.drawMagnifier;

        if (drawLayer1) { // magnifier level
            this.context.save();
            this.magnifier.drawPath(this.context);
        }
        for (i = 0; i < tilesOnLayer.length; i++) {
            tile = tilesOnLayer[i];
            if (drawLayer1) {
                zoom = Seadragon.Config.magnifierZoom;
            } else {
                zoom = 1;
            }
            tile.drawCanvas(this.context, zoom, this.magnifier.center);
        }
        if (drawLayer1) { // magnifier level
            this.magnifier.drawOnFinish(this.context);
            this.context.restore();
        }
    },

    /**
     * Draws both canvas layers.
     */
    drawCanvas: function drawCanvas() {
        this.drawLayer(0);
        this.drawLayer(1);
    },

    /**
     * Clears the set of tiles to draw.
     */
    clear: function clear() {
        this.tiles = [
            [],
            []
        ];
    }
};
//noinspection JSValidateJSDoc
/**
 * Constructs a drawer.
 *
 * @class Handles all the drawing based on events passed to it by the controller.
 *
 * <p> See <code>Seadragon.Viewport</code> description for information about conventions around parameter
 * named <code>current</code> and names <strong>point</strong> and <strong>pixel</strong>.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @see Seadragon.Viewport
 *
 * @param {Object} options An object containing all given options.
 * @param {Seadragon.Viewport} options.viewport
 * @param {jQuery object} options.$container A jQuery object representing the DOM element containing
 *                                           all the HTML structure of Seadragon.
 * @param {Seadragon.Magnifier} options.magnifier
 */
Seadragon.Drawer = function Drawer(options) {
    var self = this;

    var dziImages, viewport, magnifier;
    var $container, canvas, context;

    var imageLoader;
    var magnifierShown;

    var cacheNumTiles; // 1d dictionary [whichImage][level] --> Point
    var cachePixelOnImageSizeMax; // 1d dictionary [whichImage][level] --> max(point.x, point.y)
    var coverage; // 4d dictionary [whichImage][level][x][y] --> boolean
    var tilesMatrix; // 4d dictionary [whichImage][level][x][y] --> Tile
    var tileBoundsNotChangedMatrix; // like above

    var tilesLoaded; // unordered list of Tiles with loaded images
    var tilesDrawnLastFrame; // unordered list of Tiles drawn last frame
    var tilesDrawnLastFrameLayers; // layers of above tiles

    var dziImagesTL;
    var dziImagesBR;
    var viewportTL;
    var viewportBR;

    var currentTime;
    var lastResetTime;
    var midUpdate;

    var QUOTA = 500; // the max number of images we should keep in memory
    var MIN_PIXEL_RATIO = 0.5; // the most shrunk a tile should be

    (function init() {
        if (options == null || options.viewport == null || options.$container == null) {
            console.log('\nReceived options: ');
            console.log(options);
            throw new Error('Seadragon.Drawer needs a JSON parameter with at least the following fields: ' +
                'viewport, $container.\n' +
                'Parameter magnifier is optional.');
        }

        dziImages = [];
        viewport = options.viewport;
        magnifier = options.magnifier;

        $container = $(options.$container);
        canvas = $container.find('canvas').get(0);
        context = canvas.getContext('2d');
        // One layer for a magnifier:
        self.canvasLayersManager = new Seadragon.CanvasLayersManager(context, magnifier);

        self.element = $container;
        $container.append($(canvas));

        imageLoader = new Seadragon.ImageLoader(Seadragon.Config.imageLoaderLimit);

        magnifierShown = false;

        cacheNumTiles = [];
        cachePixelOnImageSizeMax = [];
        coverage = [];
        tilesMatrix = [];
        tileBoundsNotChangedMatrix = [];

        tilesLoaded = [];
        tilesDrawnLastFrame = [];
        tilesDrawnLastFrameLayers = [];

        dziImagesTL = [];
        dziImagesBR = [];
        viewportTL = [];
        viewportBR = [];

        self.maxLevel = 0; // It needs to be passed by controller.

        currentTime = Date.now();
        lastResetTime = 0;
        midUpdate = false;
    })();

    /**
     * "Registers" a new DZI image at a given index. We assume <code>dziImage = controller.dziImages[index]</code>.
     *
     * @param {Seadragon.DziImage} dziImage
     * @param {number} index
     */
    this.addDziImage = function addDziImage(dziImage, index) {
        if (midUpdate) { // We don't want to add a new image during the update process, deferring.
            console.log('Deferred adding a DZI to Drawer');
            var self = this;
            setTimeout(function () {
                self.addDziImage(dziImage, index);
            }, 100);
            return;
        }
        if (!dziImage) {
            console.error('No DZI Image given to Drawer\'s addDziImage method!');
            return;
        }

        // Add an image.
        if (typeof index === 'number') {
            dziImages[index] = dziImage;
        } else {
            index = dziImage.length;
            dziImages.push(dziImage);
        }
        cacheNumTiles[index] = [];
        cachePixelOnImageSizeMax[index] = [];
        tilesMatrix[index] = [];
        coverage[index] = [];
    };

    function setMagnifier(enable) {
        if (enable) {
            document.body.style.cursor = 'none';
            magnifierShown = true;
        } else {
            document.body.style.cursor = '';
            magnifierShown = false;
        }
    }

    /**
     * If <code>enable</code> is true, shows the magnifier; otherwise hides it.
     *
     * @param {boolean} enable
     * @function
     */
    this.setMagnifier = setMagnifier;

    /**
     * Returns number of tiles for the image at a given level.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImages</code> table.
     * @param {number} level
     * @return {number}
     * @private
     */
    function getNumTiles(whichImage, level) {
        if (!cacheNumTiles[whichImage][level]) {
            cacheNumTiles[whichImage][level] = dziImages[whichImage].getNumTiles(level);
        }

        return cacheNumTiles[whichImage][level];
    }

    /**
     * Says how many real pixels horizontally/vertically are covered by one pixel for the image at a given level.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImages</code> table.
     * @param {number} level
     * @return {number}
     * @private
     */
    function getPixelOnImageSizeMax(whichImage, level) {
        if (!cachePixelOnImageSizeMax[whichImage][level]) {
            var pixelOnImageSize = dziImages[whichImage].getScaledDimensions(level).invert();
            cachePixelOnImageSizeMax[whichImage][level] = Math.max(pixelOnImageSize.x, pixelOnImageSize.y);
        }

        return cachePixelOnImageSizeMax[whichImage][level];
    }

    /**
     * Returns a tile given by parameters.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @param {number} time Current time. It's passed as a parameter so that we don't compute time individually
     *                      for each tile.
     * @param {boolean} current
     * @return {Seadragon.Tile}
     * @private
     */
    function getTile(whichImage, level, x, y, time, current) {
        var tileMatrix, dziImage, bounds, url, tile;
        var boundsAlreadyUpdated = false;

        tileMatrix = tilesMatrix[whichImage];
        dziImage = dziImages[whichImage];

        if (!tileMatrix[level]) {
            tileMatrix[level] = [];
        }
        if (!tileMatrix[level][x]) {
            tileMatrix[level][x] = [];
        }

        // Initialize tile object if first time.
        if (!tileMatrix[level][x][y]) {
            // Where applicable, adjust x and y to support
            // Seadragon.Config.wrapping.
            bounds = dziImage.getTileBounds(level, x, y, current);
            url = dziImage.getTileUrl(level, x, y);

            tileMatrix[level][x][y] = new Seadragon.Tile({
                level: level,
                x: x,
                y: y,
                bounds: bounds,
                url: url
            });
            boundsAlreadyUpdated = true;
        }

        tile = tileMatrix[level][x][y];

        if (!boundsAlreadyUpdated && dziImage.bounds.version > tile.version) {
            bounds = dziImage.getTileBounds(level, x, y, current);
            tile.bounds = bounds;
            tile.updateVersion();
        }

        // Mark tile as touched so we don't reset it too soon.
        tile.lastTouchTime = time;

        return tile;
    }

    /**
     * Loads the tile's image file.
     *
     * @param {Seadragon.Tile} tile A tile for which we load an image file.
     * @param {number} time Current time. It's passed as a parameter because we compute it once
     *                      per one #update invocation.
     * @private
     */
    function loadTile(tile, time) {
        tile.loading = imageLoader.loadImage(tile.url, function (image) {
            onTileLoad(tile, time, image);
        });
    }

    /**
     * Handles actions performed on tile image file load. Sets tile's <code>image</code> parameter, marks it as loaded
     * (unless an error occured) and adds the tile to a table of tiles to draw. If the table exceedes the
     * given <code>QUOTA</code> length, one of existing tiles is removed from the table. This is determined
     * by tiles' levels and times they were "touched" for the last time.
     *
     * @param {Seadragon.Tile} tile
     * @param {number} time
     * @param {Image} image
     * @private
     */
    function onTileLoad(tile, time, image) {
        var i;

        tile.loading = false;

        if (midUpdate) {
            console.error('Tile load callback in the middle of drawing routine.');
            return;
        } else if (!image) {
            console.error('Tile ' + tile + ' failed to load: ' + tile.url);
            tile.failedToLoad = true;
            return;
        } else if (time < lastResetTime) {
            console.log('Ignoring tile ' + tile + ' loaded before reset: ' + tile.url);
            return;
        }

        tile.loaded = true;
        tile.image = image;

        var insertionIndex = tilesLoaded.length;

        if (tilesLoaded.length >= QUOTA) {
            var worstTile = null;
            var worstTileIndex = -1;

            for (i = tilesLoaded.length - 1; i >= 0; i--) {
                var prevTile = tilesLoaded[i];

                if (prevTile.beingDrawn) {
                    continue;
                } else if (!worstTile) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                    continue;
                }

                var prevTime = prevTile.lastTouchTime;
                var worstTime = worstTile.lastTouchTime;
                var prevLevel = prevTile.level;
                var worstLevel = worstTile.level;

                if (prevTime < worstTime || (prevTime === worstTime && prevLevel > worstLevel)) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                }
            }

            if (worstTile && worstTileIndex >= 0) {
                worstTile.unload();
                insertionIndex = worstTileIndex;
                // Note: we don't want or need to delete the actual Tile
                // object from tilesMatrix; that's negligible memory.
            }
        }

        tilesLoaded[insertionIndex] = tile;
        $container.trigger('seadragon.forceredraw');
    }

    function clearTiles() {
        tilesMatrix = [];
        tilesLoaded = [];
    }

    /**
     * <p>Returns true if the given tile provides coverage to lower-level tiles of
     * lower resolution representing the same content. If neither x nor y is
     * given, returns true if the entire visible level provides coverage.
     *
     * <p>Note that out-of-bounds tiles provide coverage in this sense, since
     * there's no content that they would need to cover. Tiles at non-existent
     * levels that are within the image bounds, however, do not.
     *
     * <p>Coverage scheme: it's required that in the draw routine, coverage for
     * every tile within the viewport is initially explicitly set to false.
     * This way, if a given level's coverage has been initialized, and a tile
     * isn't found, it means it's offscreen and thus provides coverage (since
     * there's no content needed to be covered). And if every tile that is found
     * does provide coverage, the entire visible level provides coverage.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @return {boolean}
     * @private
     */
    function providesCoverage(whichImage, level, x, y) {
        var i, j;
        if (!coverage[whichImage][level]) {
            return false;
        }
        if (x == null || y == null) {
            // Check that every visible tile provides coverage.
            // Update: protecting against properties added to the Object
            // class's prototype, which can definitely (and does) happen.
            var rows = coverage[whichImage][level];
            for (i in rows) {
                if (rows.hasOwnProperty(i)) {
                    var cols = rows[i];
                    for (j in cols) {
                        if (cols.hasOwnProperty(j) && !cols[j]) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }
        return (coverage[whichImage][level][x] == null ||
            coverage[whichImage][level][x][y] == null ||
            coverage[whichImage][level][x][y]);
    }

    /**
     * Returns true if the given tile is completely covered by higher-level
     * tiles of higher resolution representing the same content. If neither x
     * nor y is given, returns true if the entire visible level is covered.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @return {boolean}
     * @private
     */
    function isCovered(whichImage, level, x, y) {
        if (x == null || y == null) {
            return providesCoverage(whichImage, level + 1);
        } else {
            return (providesCoverage(whichImage, level + 1, 2 * x, 2 * y) &&
                providesCoverage(whichImage, level + 1, 2 * x, 2 * y + 1) &&
                providesCoverage(whichImage, level + 1, 2 * x + 1, 2 * y) &&
                providesCoverage(whichImage, level + 1, 2 * x + 1, 2 * y + 1));
        }
    }

    /**
     * Sets whether the given tile provides coverage or not.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @param {boolean} covers Coverage is set to this value.
     * @private
     */
    function setCoverage(whichImage, level, x, y, covers) {
        if (!coverage[whichImage][level]) {
            console.error('Setting coverage for a tile before its level\'s coverage has been reset: ' + level);
            return;
        }
        if (!coverage[whichImage][level][x]) {
            coverage[whichImage][level][x] = [];
        }
        coverage[whichImage][level][x][y] = covers;
    }

    /**
     * Resets coverage information for the given level. This should be called
     * after every draw routine. Note that at the beginning of the next draw
     * routine, coverage for every visible tile should be explicitly set.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @private
     */
    function resetCoverage(whichImage, level) {
        coverage[whichImage][level] = [];
    }

    /**
     * <p>Figures out if this tile is "better" than the previous best tile and returns the result.
     * Note that if there is no <code>prevBestTile</code>, the given one is automatically chosen.
     *
     * <p>Choosing algorithm relies on comparing level visibility and - if it's the same - distance
     * to the <code>interestingPoint</code>, if one exists (if it doesn't and visibility is the same,
     * <code>prevBestTile</code> is returned).
     *
     * @param {Seadragon.Tile} prevBestTile The best tile so far.
     * @param {Seadragon.Tile} tile A tile that "tries" to be better than <code>prevBestTile</code>.
     * @param {Seadragon.Point} [interestingPoint] The point near which we prefer to draw tiles. Usually
     *                                             either the middle of the viewport or current mouse position.
     * @return {Seadragon.Tile} The "better" tile.
     * @private
     */
    function compareTiles(prevBestTile, tile, interestingPoint) {
        if (!prevBestTile) {
            return tile;
        }
        if (tile.visibility > prevBestTile.visibility) {
            return tile;
        } else if (tile.visibility === prevBestTile.visibility) {
            if (interestingPoint instanceof Seadragon.Point) {
                var tileDistance = interestingPoint.distanceTo(tile.targetCenter);
                var prevBestTileDistance = interestingPoint.distanceTo(prevBestTile.targetCenter);
                if (tileDistance < prevBestTileDistance) {
                    return tile;
                }
            }
        }
        return prevBestTile;
    }

    /**
     * Hides the image if <code>hide</code> is true, shows it otherwise.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {boolean} hide
     * @param {boolean} immediately
     * @private
     */
    function showOrHideDzi(whichImage, hide, immediately) {
        var dziImage = dziImages[whichImage];
        if (!(dziImage instanceof Seadragon.DziImage)) {
            console.error('Can\'t ' + (hide ? 'hide' : 'show') +
                ' DZI of number ' + whichImage + ', there is no such DZI.');
            return;
        }
        var opacityTarget = hide ? 0 : 1;

        if (immediately) {
            dziImage.opacity = opacityTarget;
        } else if (!dziImage.blending) { // Otherwise we leave it where it was before updating.
            dziImage.opacity = hide ? 1 : 0;
        }

        dziImage.hiding = hide;
        dziImage.blendStart = Date.now();
        if (dziImage.blending) { // Fake that we started blending earlier.
            dziImage.blendStart -= (1 - Math.abs(opacityTarget - dziImage.opacity)) * Seadragon.Config.blendTime;
        }
        dziImage.blending = true;

        update();
    }

    function showDzi(whichImage, immediately) {
        showOrHideDzi(whichImage, false, immediately);
    }

    /**
     * Shows the image.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {boolean} immediately
     * @function
     */
    this.showDzi = showDzi;

    function hideDzi(whichImage, immediately) {
        showOrHideDzi(whichImage, true, immediately);
    }

    /**
     * Hides the image.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {boolean} immediately
     * @function
     */
    this.hideDzi = hideDzi;


    // See this.update description.
    function update() {
        var dziImage, tile, zeroDimensionMax, deltaTime, opacity;
        var i, j, whichImage, x, y, level; // indexes for loops

        if (midUpdate) {
            // We don't want to run two updates at the same time but we do want to indicate
            // the update needs to re-run as there could have been some changes - making
            // it necessary - done after the currently running update checked for them.
            return true;
        }

        //noinspection JSUnusedAssignment
        midUpdate = true;

        // Assume we won't need to update again after this update.
        // We'll set this if we find a reason to update again.
        var updateAgain = false;

        // The tiles that were drawn last frame, but won't be this frame,
        // can be cleared from the cache, so they should be marked as such.
        while (tilesDrawnLastFrame.length > 0) {
            tile = tilesDrawnLastFrame.pop();
            tilesDrawnLastFrameLayers.pop();
            tile.beingDrawn = false;
        }

        // Clear canvas, whether in <canvas> mode or HTML mode.
        // This is important as scene may be empty this frame.
        var viewportSize = viewport.containerSize;
        canvas.width = viewportSize.x;
        canvas.height = viewportSize.y;

        self.canvasLayersManager.clear();

        var viewportBounds = viewport.getRectangle(true);
        var viewportTL = viewportBounds.getTopLeft();
        var viewportBR = viewportBounds.getBottomRight();
        var viewportCenter = viewport.pixelFromPoint(viewport.getCenter());
        var viewportZoom = viewport.getZoom(true);

        var dziImageTLs = [];
        var dziImageBRs = [];
        var viewportTLs = [];
        var viewportBRs = [];

        var haveDrawns = [];
        var best = null;

        var zeroDimensionsMax = [];
        var drawingEnded = [];
        var drawnImageNumbers = [];

        currentTime = Date.now();

        // Drawing all images.
        for (whichImage = 0; whichImage < dziImages.length; whichImage++) {
            dziImage = dziImages[whichImage];
            if (!(dziImage instanceof Seadragon.DziImage) || dziImage.isHidden()) {
                continue;
            }

            // We don't need to compute these two things on each update but filtering out cases where it's not needed
            // would create a little overhead on its own so it's probably not worth doing that.
            dziImageTLs[whichImage] = dziImage.bounds.getTopLeft();
            dziImageBRs[whichImage] = dziImage.bounds.getBottomRight();

            var dziImageTL = dziImageTLs[whichImage];
            var dziImageBR = dziImageBRs[whichImage];

            // If image is off image entirely, don't bother drawing.
            if (dziImageBR.x < viewportTL.x || dziImageBR.y < viewportTL.y ||
                dziImageTL.x > viewportBR.x || dziImageTL.y > viewportBR.y) {
                continue;
            }

            // Restrain bounds of viewport relative to image.
            viewportTLs[whichImage] = new Seadragon.Point(
                Math.max(viewportTL.x, dziImageTL.x),
                Math.max(viewportTL.y, dziImageTL.y));
            viewportBRs[whichImage] = new Seadragon.Point(
                Math.min(viewportBR.x, dziImageBR.x),
                Math.min(viewportBR.y, dziImageBR.y));

            if (dziImage.blending) {
                updateAgain = true;

                deltaTime = currentTime - dziImage.blendStart;
                opacity = Math.min(1, deltaTime / Seadragon.Config.blendTime);
                dziImage.opacity = dziImage.hiding ? 1 - opacity : opacity;
                if ((dziImage.isHiding() && dziImage.opacity === 0) ||
                    (dziImage.isShowing() && dziImage.opacity === 1)) {
                    dziImage.blending = false; // We finished blending.
                }
            }

            // Optimal pixel ratio (?) -- this is based on the TARGET value.
            zeroDimensionsMax[whichImage] = getPixelOnImageSizeMax(whichImage, 0);

            haveDrawns[whichImage] = false;
            drawingEnded[whichImage] = false;

            // We'll draw this image.
            drawnImageNumbers.push(whichImage);
        }


        for (level = self.maxLevel; level >= 0; level--) {
            for (i = 0; i < drawnImageNumbers.length; i++) {
                whichImage = drawnImageNumbers[i];

                if (drawingEnded[whichImage]) {
                    continue; // We could delete whichImage from drawnImageNumbers but cost would be higher.
                }

                dziImage = dziImages[whichImage];
                var adjustedLevel = dziImage.getAdjustedLevel(level);

                viewportTL = viewportTLs[whichImage];
                viewportBR = viewportBRs[whichImage];

                zeroDimensionMax = zeroDimensionsMax[whichImage];

                if (adjustedLevel > dziImage.maxLevel || adjustedLevel < dziImage.minLevel) {
                    continue;
                }

                var drawLevel = false;
                var renderPixelDimensionC = viewportZoom / dziImage.getLevelScale(level);

                if (magnifierShown) {
                    // We need to load higher-level tiles as we need them
                    // for the magnifier. Notice that we load these higher
                    // levels for the whole space inside the viewport, not
                    // only ones under the magnifier. It helps to reduce the
                    // impression of slugishness as we move the magnifier. We
                    // don't need to worry about the additional tiles to load
                    // since before they're loaded we still see tiles from lower
                    // levels so transitions are smooth.
                    renderPixelDimensionC *= Seadragon.Config.magnifierZoom;
                }

                // If we haven't drawn yet, only draw level if tiles are big enough.
                if ((!haveDrawns[whichImage] && renderPixelDimensionC >= MIN_PIXEL_RATIO) ||
                    adjustedLevel === dziImage.minLevel) {
                    drawLevel = true;
                    haveDrawns[whichImage] = true;
                } else if (!haveDrawns[whichImage]) {
                    continue;
                }

                resetCoverage(whichImage, adjustedLevel);

                // Calculate scores applicable to all tiles on this level --
                // note that we're basing visibility on the TARGET pixel ratio.
                var renderPixelDimensionTMax = getPixelOnImageSizeMax(whichImage, adjustedLevel);
                var levelVisibility = zeroDimensionMax / Math.abs(zeroDimensionMax - renderPixelDimensionTMax);

                // Only iterate over visible tiles.
                var tileTL = dziImage.getTileAtPoint(adjustedLevel, viewportTL, true);
                var tileBR = dziImage.getTileAtPoint(adjustedLevel, viewportBR, true);
                var numTiles = getNumTiles(whichImage, adjustedLevel);
                var numTilesX = numTiles.x;
                var numTilesY = numTiles.y;
                tileTL.x = Math.max(tileTL.x, 0);
                tileTL.y = Math.max(tileTL.y, 0);
                tileBR.x = Math.min(tileBR.x, numTilesX - 1);
                tileBR.y = Math.min(tileBR.y, numTilesY - 1);

                for (x = tileTL.x; x <= tileBR.x; x++) {
                    for (y = tileTL.y; y <= tileBR.y; y++) {
                        tile = getTile(whichImage, adjustedLevel, x, y, currentTime, true);
                        var drawTile = drawLevel;

                        // Assume this tile doesn't cover initially.
                        setCoverage(whichImage, adjustedLevel, x, y, false);

                        if (tile.failedToLoad) {
                            continue;
                        }

                        // If we've drawn a higher-resolution level and we're
                        // not going to draw this level, then say this tile does
                        // cover if it's covered by higher-resolution tiles. if
                        // we're not covered, then we should draw this tile regardless.
                        if (haveDrawns[whichImage] && !drawTile) {
                            if (isCovered(whichImage, adjustedLevel, x, y)) {
                                setCoverage(whichImage, adjustedLevel, x, y, true);
                            } else {
                                drawTile = true;
                            }
                        }

                        if (!drawTile) {
                            continue;
                        }

                        // Calculate tile's position and size in pixels.
                        var boundsTL = tile.bounds.getTopLeft();
                        var boundsSize = tile.bounds.getSize();

                        var positionC = viewport.pixelFromPoint(boundsTL, true);
                        var sizeC = viewport.deltaPixelsFromPoints(boundsSize, true);

                        var drawOnMagnifier = magnifierShown && magnifier != null &&
                            magnifier.intersectsRectangle(new Seadragon.Rectangle(
                                positionC.x, positionC.y, sizeC.x, sizeC.y));

                        // Calculate distance from center of viewport --
                        // note that this is based on tile's TARGET position.
                        var positionT = viewport.pixelFromPoint(boundsTL, false);
                        var sizeT = viewport.deltaPixelsFromPoints(boundsSize, false);
                        var centerT = positionT.plus(sizeT.divide(2));

                        // Update tile's scores and values.
                        tile.position = positionC;
                        tile.size = sizeC;
                        tile.targetCenter = centerT;
                        tile.visibility = levelVisibility;

                        if (tile.loaded) {
                            if (!tile.blendStart) {
                                // Image was just added, blend it.
                                tile.blendStart = currentTime;
                            }

                            deltaTime = currentTime - tile.blendStart;
                            opacity = Math.min(1, deltaTime / Seadragon.Config.blendTime);

                            tile.opacity = opacity * dziImage.opacity;

                            // Queue tile for drawing in reverse order.
                            tilesDrawnLastFrame.push(tile);
                            tilesDrawnLastFrameLayers.push(drawOnMagnifier ? 1 : 0);

                            // If fully blended in, this tile now provides coverage,
                            // otherwise we need to update again to keep blending.
                            if (opacity >= 1) {
                                setCoverage(whichImage, adjustedLevel, x, y, true);
                            } else {
                                updateAgain = true;
                            }
                        } else if (!tile.loading) {
                            // Means tile isn't loaded yet, so score it.
                            var interestingPoint;
                            if (magnifierShown) { // if magnifier shown, draw tiles close to its center
                                interestingPoint = magnifier.center;
                            } else { // otherwise prefer the middle of the screen
                                interestingPoint = viewportCenter;
                            }
                            best = compareTiles(best, tile, interestingPoint);
                        }
                    }
                }

                // We may not need to draw any more lower-res levels.
                if (providesCoverage(whichImage, adjustedLevel)) {
                    drawingEnded[whichImage] = true;
                }
            }
        }

        // Load next tile if there is one to load.
        if (best) {
            loadTile(best, currentTime);
            // We haven't finished drawing, so we should be re-evaluating and re-scoring.
            updateAgain = true;
        }

        // Now draw the tiles, but in reverse order since we want higher-res
        // tiles to be drawn on top of lower-res ones. also mark each tile
        // as being drawn so it won't get cleared from the cache.
        for (i = tilesDrawnLastFrame.length - 1; i >= 0; i--) {
            tile = tilesDrawnLastFrame[i];
            for (j = 0; j <= tilesDrawnLastFrameLayers[i]; j++) {
                self.canvasLayersManager.addToLayer(j, tile);
            }
            tile.beingDrawn = true;
        }
        self.canvasLayersManager.drawCanvas();

        midUpdate = false;

        return updateAgain;
    }

    /**
     * The main update function.
     *
     * @return {boolean} Are there some actions left to perform (like showing a tile, blurring it in/out etc.)?
     *                   In such a case the function must be invoked again.
     * @function
     */
    this.update = update;

    function reset() {
        clearTiles();
        lastResetTime = Date.now();
        $container.trigger('seadragon.forceredraw');
    }

    /**
     * Resets drawer state: clears all tiles, sets <code>lastResetTime</code> to now and
     * triggers the <code>seadragon.forceredraw</code> event.
     *
     * @function
     */
    this.reset = reset;
};
//noinspection JSValidateJSDoc
/**
 * <p>Constructs a controller.
 *
 * @class <p>Manages all of Seadragon parts. It receives events and passes them along to the viewport,
 * Seadragon images and tells drawer when to update the current view. This is the 'core' Seadragon part.
 *
 * <p>See <code>Seadragon.Viewport</code> description for information about conventions around parameters
 * named <code>current</code> and <code>immediately</code> and names <strong>point</strong> and <strong>pixel</strong>.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @see Seadragon.Viewport
 *
 * @param {string|jQuery object} containerSelectorOrElement
 */
Seadragon.Controller = function Controller(containerSelectorOrElement) {
    var self = this;

    var $container, $canvas;
    var lastOpenStartTime, lastOpenEndTime;
    var animated;
    var forceAlign, forceRedraw;
    var dziImagesToHandle;
    var lastPosition;
    var containerSize;
    var magnifierShown, pickerShown;
    var lockOnUpdates, closing;
    var maxLevel;

    (function init() {
        $container = $(containerSelectorOrElement);
        if ($container.length === 0) {
            console.log('\nReceived containerSelectorOrElement: ');
            console.log(containerSelectorOrElement);
            throw new Error('Can\'t create a Controller instance without a container!');
        }
        $container.empty();
        $container.css({
            backgroundColor: Seadragon.Config.backgroundColor
        });

        $canvas = $('<canvas />');
        $container.append($canvas);

        lastOpenStartTime = lastOpenEndTime = 0;

        self.dziImages = [];

        magnifierShown = pickerShown = false;
        lockOnUpdates = closing = false;

        maxLevel = 0; // No DZIs loaded yet.

        dziImagesToHandle = 0;

        bindEvents();

        // Clear any previous message.
        var containerCss = $container.css(['width', 'height']);
        containerSize = new Seadragon.Point(
            parseInt(containerCss.width, 10), parseInt(containerCss.height, 10));

        // Restart other fields.
        self.viewport = new Seadragon.Viewport($container);
        self.magnifier = new Seadragon.Magnifier(new Seadragon.Point(0, 0), Seadragon.Config.magnifierRadius);
        self.picker = new Seadragon.Picker($container, self.viewport);
        self.markers = new Seadragon.Markers($container, self.viewport);
        self.drawer = new Seadragon.Drawer({
            viewport: self.viewport,
            $container: $container,
            magnifier: self.magnifier
        });

        // Begin updating.
        animated = false;
        forceAlign = forceRedraw = true;
        keepUpdating();
    })();

    /**
     * Shows the magnifier.
     */
    this.showMagnifier = function showMagnifier() {
        $(document).mouseup(); // To stop canvas dragging etc.

        magnifierShown = true;
        self.drawer.setMagnifier(true);
        self.drawer.canvasLayersManager.drawMagnifier = true;

        $canvas.on('mousemove', moveMagnifier);
        $canvas.trigger('mousemove');
    };

    /**
     * Hides the magnifier.
     */
    this.hideMagnifier = function hideMagnifier() {
        $canvas.off('mousemove', moveMagnifier);

        self.drawer.canvasLayersManager.drawMagnifier = false;
        self.drawer.setMagnifier(false);
        magnifierShown = false;

        forceRedraw = true;
    };

    /**
     * Toggles magnifier's state - shows it if it was hidden; hides it otherwise.
     */
    this.toggleMagnifier = function toggleMagnifier() {
        if (magnifierShown) {
            self.hideMagnifier();
        } else {
            self.showMagnifier();
        }
    };

    /**
     * Shows the picker.
     */
    this.showPicker = function showPicker() {
        pickerShown = true;
        self.picker.show();
    };

    /**
     * Hides the picker.
     */
    this.hidePicker = function hidePicker() {
        pickerShown = false;
        self.picker.hide();
    };

    /**
     * Toggles picker's state - shows it if it was hidden; hides it otherwise.
     */
    this.togglePicker = function togglePicker() {
        if (pickerShown) {
            self.hidePicker();
        } else {
            self.showPicker();
        }
    };

    function getMousePosition(event) {
        var offset = $container.offset();
        return new Seadragon.Point(event.pageX - offset.left, event.pageY - offset.top);
    }

    /**
     * Returns mouse position extracted from <code>event</code>.
     *
     * @param {jQuery.Event} event Mouse event.
     * @return {Seadragon.Point}
     * @function
     */
    this.getMousePosition = getMousePosition;

    function onDocumentMouseUp() {
        $(document).off('mousemove', dragCanvas);
        forceUpdate();
    }

    function bindEvents() {
        $canvas.on({
            mouseenter: function () {
                if (magnifierShown) {
                    self.drawer.canvasLayersManager.drawMagnifier = true;
                    forceUpdate();
                }
            },

            mouseleave: function () {
                if (magnifierShown) { // We have to redraw to hide magnifier.
                    self.drawer.canvasLayersManager.drawMagnifier = false;
                    forceUpdate();
                }
            },

            mousedown: function (event) {
                if (event.which !== 1 || magnifierShown) { // Only left-click is supported.
                    return false;
                }
                lastPosition = getMousePosition(event);
                $(document).on('mousemove', dragCanvas);
                return false;
            },

            wheel: function (event) {
                if (magnifierShown || !event.deltaY) {
                    return false;
                }
                zoomCanvas(event);
                forceUpdate();
                return false;
            }
        });

        $container.on({
            'seadragon.forcealign': function () {
                forceAlign = true;
                forceUpdate();
            },

            'seadragon.forceredraw': function () {
                forceUpdate();
            }
        });

        $(document).on({
            mouseup: onDocumentMouseUp
        });

        $(window).on({
            resize: forceUpdate
        });
    }

    /**
     * Handler executed when user drags the canvas using their mouse.
     *
     * @param {jQuery.Event} event Mouse event.
     * @private
     */
    function dragCanvas(event) {
        var position = getMousePosition(event);
        var delta = position.minus(lastPosition);

        var blockMovement = Seadragon.Config.blockMovement;
        if (blockMovement.horizontal) {
            delta.x = 0;
        }
        if (blockMovement.vertical) {
            delta.y = 0;
        }
        self.viewport.panBy(self.viewport.deltaPointsFromPixels(delta.negate()));

        lastPosition = position;
    }

    /**
     * Handler executed when zooming using mouse wheel.
     *
     * @param {jQuery.Event} event Mouse 'wheel' event.
     * @private
     */
    function zoomCanvas(event) {
        if (Seadragon.Config.blockZoom) {
            return;
        }
        var factor = Seadragon.Config.zoomPerScroll;
        if (event.deltaY > 0) { // zooming out
            factor = 1 / factor;
        }
        self.viewport.zoomBy(
            factor,
            false,
            self.viewport.pointFromPixel(getMousePosition(event), true));
    }


    /**
     * Moves the magnifier to mouse position determined by <code>event</code>.
     *
     * @param {jQuery.Event} event Mouse event.
     * @private
     */
    function moveMagnifier(event) {
        var position = getMousePosition(event);
        self.magnifier.panTo(position);
        forceUpdate();
    }

    /**
     * Computes maximum level to be drawn on canvas. Note that it's not simply
     * maximum of all dziImage.maxLevel - their levels all scaled so that
     * they match "virtual" levels with regards to their representation on canvas.
     *
     * @see Seadragon.TiledImage.getAdjustedLevel
     * @private
     */
    function recalculateMaxLevel() {
        maxLevel = 0;
        for (var i = 0; i < self.dziImages.length; i++) {
            var dziImage = self.dziImages[i];
            maxLevel = Math.max(maxLevel, dziImage.getUnadjustedLevel(dziImage.maxLevel));
        }
        self.viewport.maxLevelScale = Math.pow(2, maxLevel);
        self.drawer.maxLevel = maxLevel;
    }

    /**
     * Registers a new open image.
     *
     * @param {Seadragon.DziImage} dziImage
     * @param {number} [index] If specified, image is put at <code>this.dziImages[index]</code>; otherwise
     *                         it's put at the end of the table.
     * @private
     */
    function onOpen(dziImage, index) {
        if (!dziImage) {
            console.error('No DZI Image given to Viewer\'s onOpen()!');
            return;
        }

        // Add an image.
        if (typeof index !== 'number') {
            index = self.dziImages.length;
        }
        self.dziImages[index] = dziImage;
        self.drawer.addDziImage(dziImage, index);

        maxLevel = Math.max(maxLevel, dziImage.maxLevel);
        self.viewport.maxLevelScale = Math.pow(2, maxLevel);
        self.drawer.maxLevel = maxLevel;

        dziImagesToHandle--;

        $container.trigger('seadragon.loadeddzi');
        if (dziImagesToHandle === 0) {
            $container.trigger('seadragon.loadeddziarray');
        }
        forceUpdate();
    }

    /**
     * Schedule the next update run. Scheduling is paused when animations and user actions finish.
     * @private
     */
    function keepUpdating() {
        if (!lockOnUpdates) {
            if (isLoading()) {
                setTimeout(keepUpdating, 1);
                return;
            }
            update();
            setTimeout(keepUpdating, 1);
        }
    }

    function forceUpdate() {
        forceRedraw = true;
        if (lockOnUpdates) {
            lockOnUpdates = false;
            keepUpdating();
        }
    }

    /**
     * Unblock updates stopped by a lack of action. Invoked by single actions expecting redrawing.
     * @function
     */
    this.forceUpdate = forceUpdate;

    /**
     * Updates bounds of a Seadragon image; usually used during aligning (so not too often).
     *
     * @param {number} whichImage Image index in <code>this.dziImages</code> table.
     * @private
     */
    function updateDziImageBounds(whichImage) {
        forceAlign = self.dziImages[whichImage].bounds.update() || forceAlign;
        forceUpdate();
    }

    /**
     * A single update process, delegating drawing to the Drawer on a change.
     * @private
     */
    function update() {
        var containerCss = $container.css(['width', 'height']);
        var newContainerSize = new Seadragon.Point(
            parseInt(containerCss.width, 10), parseInt(containerCss.height, 10));

        if (!newContainerSize.equals(containerSize)) {
            // Maintain image position:
            forceRedraw = true; // canvas needs it
            containerSize = newContainerSize;
            self.viewport.resize(newContainerSize);
        }

        // animating => viewport moved, aligning images or loading/blending tiles.
        var animating = self.viewport.update() || forceAlign || forceRedraw;
        if (forceAlign) {
            forceAlign = false;
            setTimeout(function () { // Timeouts to make it more asynchronous.
                for (var i = 0; i < self.dziImages.length; i++) {
                    setTimeout(updateDziImageBounds, 17, i);
                }
            }, 17);
        }

        if (animating) {
            forceRedraw = self.drawer.update();
        } else {
            lockOnUpdates = true;
        }

        // Triger proper events.
        if (!animated && animating) {
            // We weren't animating, and now we did ==> animation start.
            $container.trigger('seadragon.animationstart');
            $container.trigger('seadragon.animation');
        } else if (animating) {
            // We're in the middle of animating.
            $container.trigger('seadragon.animation');
        } else if (animated) {
            // We were animating, and now we're not anymore ==> animation finish.
            $container.trigger('seadragon.animationfinish');
        }

        // For the next update check.
        animated = animating;
    }

    /**
     * Opens Deep Zoom Image (DZI).
     *
     * @param {string} dziUrl An URL/path to the DZI file.
     * @param {number} index If specified, an image is loaded into <code>controller.dziImages[index]</code>.
     *                       Otherwise it's put at the end of the table.
     * @param {boolean} [shown=true] If false, image is not drawn. It can be made visible later.
     * @param {Seadragon.Rectangle} [bounds] Bounds representing position and shape of the image on the virtual
     *                                       Seadragon plane.
     */
    this.openDzi = function openDzi(dziUrl, index, shown, bounds, /* internal */ dontIncrementCounter) {
        if (!dontIncrementCounter) {
            dziImagesToHandle++;
        }
        try {
            Seadragon.DziImage.createFromDzi({
                dziUrl: dziUrl,
                $container: $container,
                bounds: bounds,
                index: index,
                shown: shown,
                callback: onOpen
            });
        } catch (error) {
            // We try to keep working even after a failed attempt to load a new DZI.
            dziImagesToHandle--;
            console.error('DZI failed to load.');
        }
    };

    /**
     * Opens many DZIs.
     *
     * @param {Array.<string>} dziUrlArray Array of URLs/paths to DZI files.
     * @param {Array.<Seadragon.Rectangle>} [boundsArray] Array of bounds representing position and shape
     *                                                    of the image on the virtual Seadragon plane.
     */
    this.openDziArray = function openDziArray(dziUrlArray, boundsArray, hideByDefault) {
        var i;
        if (boundsArray == null) {
            boundsArray = [];
        }
        var dziUrlArrayLength = dziUrlArray.length;
        dziImagesToHandle += dziUrlArrayLength;
        for (i = 0; i < dziUrlArrayLength; i++) {
            self.openDzi(dziUrlArray[i], i, !hideByDefault, boundsArray[i], true);
        }
    };

    function isLoading() {
        return dziImagesToHandle > 0;
    }

    /**
     * Checks if controller is in progress of loading/processing new DZIs. Some actions are halted
     * for these short periods.
     *
     * @return {boolean}
     * @function
     */
    this.isLoading = isLoading;

    /**
     * Closes the Seadragon module, de-registers events and clears Seadragon HTML container.
     */
    this.close = function close() {
        $(window).off({
            resize: forceUpdate
        });
        $(document).off({
            mouseup: onDocumentMouseUp,
            mousemove: dragCanvas
        });
        $container.off();
        $container.empty();
    };

    /**
     * Organizes DZIs into a given layout.
     *
     * @param {boolean} [alingInRows=false] If true, align in rows; otherwise in columns.
     * @param {number} heightOrWidth If <code>alignInRows</code>: height of rows; otherwise width of columns.
     * @param {number} spaceBetweenImages
     * @param {number} maxRowWidthOrColumnHeight If not infinite, the next row/column is started
     *                                           upon reaching the limit.
     * @param {boolean} immediately
     * @private
     */
    function alignRowsOrColumns(alingInRows, heightOrWidth, spaceBetweenImages, maxRowWidthOrColumnHeight,
                                immediately) {
        var whichImage, width, height, dziImage, widthSum, heightSum, newBounds;

        if (isLoading()) {
            setTimeout(alignRowsOrColumns, 100,
                alingInRows, heightOrWidth, spaceBetweenImages, maxRowWidthOrColumnHeight, immediately);
            return;
        }

        widthSum = heightSum = 0;

        if (!maxRowWidthOrColumnHeight) {
            maxRowWidthOrColumnHeight = Infinity;
        }

        for (whichImage = 0; whichImage < self.dziImages.length; whichImage++) {
            dziImage = self.dziImages[whichImage];

            // Compute the current state.
            if (alingInRows) {
                width = dziImage.width * heightOrWidth / dziImage.height;
                height = heightOrWidth;
                if (widthSum + width > maxRowWidthOrColumnHeight) {
                    // Row width is now too much!
                    widthSum = 0;
                    heightSum += height + spaceBetweenImages;
                }
            }
            else { // Align in columns.
                width = heightOrWidth;
                height = dziImage.height * heightOrWidth / dziImage.width;
                if (heightSum + height > maxRowWidthOrColumnHeight) {
                    // Column height is now too much!
                    heightSum = 0;
                    widthSum += width + spaceBetweenImages;
                }
            }

            // Set bounds.
            newBounds = new Seadragon.Rectangle(widthSum, heightSum, width, height);

            // Compute parameters after placing an image.
            if (alingInRows) {
                widthSum += width + spaceBetweenImages;
            } else {
                heightSum += height + spaceBetweenImages;
            }

            dziImage.fitBounds(newBounds, immediately);
            updateDziImageBounds(whichImage);
        }
        recalculateMaxLevel();

        $container.trigger('seadragon.forcealign');
    }

    /**
     * Align images in rows.
     *
     * @param {number} height Height of a single row.
     * @param {number} spaceBetweenImages Space between images in a row and between columns.
     * @param {number} maxRowWidth Maximum row width. If the next image exceeded it, it's moved to the next row.
     *                             If set to <code>Infinity</code>, only one row will be created.
     * @param {boolean} immediately
     */
    this.alignRows = function alignRows(height, spaceBetweenImages, maxRowWidth, immediately) {
        alignRowsOrColumns(true, height, spaceBetweenImages, maxRowWidth, immediately);
    };

    /**
     * Align images in columns.
     *
     * @see #alignRows
     *
     * @param {number} width
     * @param {number} spaceBetweenImages
     * @param {number} maxColumnHeight
     * @param {boolean} immediately
     */
    this.alignColumns = function alignColumns(width, spaceBetweenImages, maxColumnHeight, immediately) {
        alignRowsOrColumns(false, width, spaceBetweenImages, maxColumnHeight, immediately);
    };

    /**
     * Moves the viewport so that the given image is centered and zoomed as much as possible
     * while still being contained within the viewport.
     *
     * @param {number} whichImage We fit the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} current
     */
    this.fitImage = function fitImage(whichImage, current) {
        var dziImage = self.dziImages[whichImage];
        if (!dziImage) {
            console.error('No image with number ' + whichImage);
            return;
        }

        self.viewport.fitBounds(dziImage.bounds.getRectangle(current));
    };


    function dziImageBoundsInPoints(whichImage, current) {
        return self.dziImages[whichImage].bounds.getRectangle(current);
    }

    /**
     * Returns bounds of the given image in points.
     *
     * @param {number} whichImage We get bounds of the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} current
     * @return {Seadragon.Rectangle}
     * @function
     */
    this.dziImageBoundsInPoints = dziImageBoundsInPoints;

    function dziImageBoundsInPixels(whichImage, current) {
        var pointBounds = dziImageBoundsInPoints(whichImage, current);
        return self.viewport.pixelRectangleFromPointRectangle(pointBounds, current);
    }

    /**
     * Returns bounds of the given image in pixels.
     *
     * @param {number} whichImage We get bounds of the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} current
     * @return {Seadragon.Rectangle}
     * @function
     */
    this.dziImageBoundsInPixels = dziImageBoundsInPixels;


    /**
     * Shows the given image.
     *
     * @param {number} whichImage We show the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} immediately
     */
    this.showDzi = function showDzi(whichImage, immediately) {
        self.drawer.showDzi(whichImage, immediately);
        forceUpdate();
    };

    /**
     * Hides the given image.
     *
     * @param {number} whichImage We hide the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} immediately
     */
    this.hideDzi = function hideDzi(whichImage, immediately) {
        self.drawer.hideDzi(whichImage, immediately);
        forceUpdate();
    };
};
})(this, this.Seadragon);
