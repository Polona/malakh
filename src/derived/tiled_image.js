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
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 *
 * @param {Object} options  An object containing all given options.
 * @param {number} options.width  Sets <code>this.width</code>.
 * @param {number} options.height  Sets <code>this.height</code>.
 * @param {number} options.tileSize  Sets <code>this.tileSize</code>.
 * @param {number} [options.tileOverlap]  Sets <code>this.tileOverlap</code>.
 * @param {Seadragon.Rectangle} [options.bounds=new Seadragon.Rectangle(0, 0, options.width, options.height)]
 *                              Sets the initial value of <code>this.boundsSprings</code>.
 * @param {number} [options.minLevel=this.config.minLevelToDraw]  Sets <code>this.minLevel</code>.
 * @param {number} [options.maxLevel=maximum image level]  Sets <code>this.maxLevel</code>.
 */
Seadragon.TiledImage = function TiledImage(seadragon, options) {
    this.ensureArguments(arguments, 'TiledImage', [options]);
    this.ensureOptions(options, 'TiledImage', ['width', 'height', 'tileSize', 'tileOverlap']);

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
     * @see Seadragon#config
     * @default Seadragon#config.minLevelToDraw
     */
    this.minLevel = options.minLevel ? options.minLevel : this.config.minLevelToDraw;
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
    // Correct aspect ratio.
    options.bounds.width = options.bounds.height * options.width / options.height;

    /**
     * Animated bounds of the image. They represent position and shape of the image on the virtual
     * Seadragon plane.
     * @type Seadragon.AnimatedRectangle
     */
    this.boundsSprings = this.AnimatedRectangle(options.bounds);

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
     * @type Boolean
     */
    this.hiding = false;

    /**
     * Opacity of the image. Fully opaque by default.
     * @type number
     * @default 1
     */
    this.opacity = 1;
};

Seadragon.TiledImage.prototype = Object.create(seadragonBasePrototype);

$.extend(Seadragon.TiledImage.prototype,
    /**
     * @lends Seadragon.TiledImage.prototype
     */
    {
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
        getTiledImageLevel: function getTiledImageLevel(level, current) {
            var scaledBounds = this.getDimensionsScale(current);
            return level + Math.ceil(Math.log(Math.max(scaledBounds.x, scaledBounds.y)) / Math.log(2));
        },

        /**
         * Reverses <code>this.getTiledImageLevel</code>.
         *
         * @see #getTiledImageLevel
         *
         * @param {number} level
         * @param {boolean} [current=false]
         * @return {number}
         */
        getViewportLevel: function getViewportLevel(level, current) {
            var scaledBounds = this.getDimensionsScale(current);
            return level - Math.ceil(Math.log(Math.max(scaledBounds.x, scaledBounds.y)) / Math.log(2));
        },

        /**
         * Returns bounds width & height with regards to original image dimensions.
         *
         * @param {boolean} [current=false]
         * @return {Seadragon.Point}
         */
        getDimensionsScale: function getDimensionsScale(current) {
            var bounds;
            bounds = this.boundsSprings.getRectangle(current);
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
        getScaledLevel: function getScaledLevel(level) {
            return Math.pow(0.5, this.maxLevel - level);
        },

        /**
         * Returns number of tiles in both dimensions at the current level.
         *
         * @param {number} level
         * @return {Seadragon.Point}
         */
        getNumTiles: function getNumTiles(level) {
            var scaledLevel = this.getScaledLevel(level);
            var x = Math.ceil(scaledLevel * this.width / this.tileSize);
            var y = Math.ceil(scaledLevel * this.height / this.tileSize);

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
            var bounds = this.boundsSprings.getRectangle(current);
            return new Seadragon.Point(bounds.width, bounds.height).multiply(this.getScaledLevel(level));
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
            var scale = this.getDimensionsScale(current);
            var bounds = this.boundsSprings.getRectangle(current);

            point = point.minus(new Seadragon.Point(bounds.x, bounds.y));
            point.x /= scale.x;
            point.y /= scale.y;
            var pixel = point.multiply(this.getScaledLevel(level));

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
            var scale, bounds, px, py, sx, sy, scaledLevel;

            scale = this.getDimensionsScale(current);
            bounds = this.boundsSprings.getRectangle(current);

            // Find position, adjust for no overlap data on top and left edges.
            px = x === 0 ? 0 : this.tileSize * x - this.tileOverlap;
            py = y === 0 ? 0 : this.tileSize * y - this.tileOverlap;

            // Find size, adjust for no overlap data on top and left edges.
            sx = this.tileSize + (x === 0 ? 1 : 2) * this.tileOverlap;
            sy = this.tileSize + (y === 0 ? 1 : 2) * this.tileOverlap;

            // Normalize.
            scaledLevel = this.getScaledLevel(level);
            px /= scaledLevel;
            py /= scaledLevel;
            sx /= scaledLevel;
            sy /= scaledLevel;

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
         * Returns tile's URL/path. An abstract method - needs to be redefined in derived extending this one!
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
         * TODO write here sth about triggering?
         *
         * @param {Seadragon.Rectangle} bounds
         * @param {boolean} [immediately=false]
         */
        fitBounds: function fitBounds(bounds, immediately) {
            this.boundsSprings.fitBounds(bounds, immediately);
            this.$container.trigger('seadragon:forcealign');
            return this;
        }
    }
);
