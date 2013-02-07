/**
 * Constructs a tiled image.
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
 * @param {jQuery} options.$container A jQuery object representing the DOM element containing
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
        console.info('Received arguments: ', [].slice.apply(arguments));
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
     * @param {boolean} [current=false]
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
     * @param {boolean} [current=false]
     * @return {number}
     */
    getUnadjustedLevel: function getUnadjustedLevel(level, current) {
        var boundsScale = this.getBoundsScale(current);
        return level - Math.ceil(Math.log(Math.max(boundsScale.x, boundsScale.y)) / Math.log(2));
    },

    /**
     * Returns bounds width & height with regards to original image dimensions.
     *
     * @param {boolean} [current=false]
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
     * @param {boolean} [current=false]
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
     * @param {boolean} [current=false]
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
     * @param {boolean} [current=false]
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
    getTileUrl: function getTileUrl(level, x, y) {
        console.error('Method not implemented; arguments:', level, x, y);
        return '';
    },

    /**
     * @see Seadragon.AnimatedRectangle#fitBounds
     *
     * NOTE: this method shouldn't be called manually, use controller's <code>fitBounds</code> method instead.
     * The controller's method handles updating other important parameters as well.
     *
     * @param {Seadragon.Rectangle} bounds
     * @param {boolean} [immediately=false]
     */
    fitBounds: function fitBounds(bounds, immediately) {
        this.bounds.fitBounds(bounds, immediately);
    }
};
