/**
 * Constructs a <code>Malakh.Tile</code> instance.
 *
 * @class <p>Represents a single tile used by Malakh. The tile knows about it's image path,
 * its position (i.e. it's column & row), the corresponding level and a few other parameters.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {Malakh} malakh  Sets <code>this.malakh</code>.
 *
 * @param {Object} options An object containing all given options.
 * @param {number} options.level Sets <code>this.level</code>.
 * @param {number} options.x Sets <code>this.x</code>.
 * @param {number} options.y Sets <code>this.y</code>.
 * @param {Malakh.Rectangle} options.bounds Sets <code>this.bounds</code>.
 * @param {string} options.url Sets <code>this.url</code>.
 */
Malakh.Tile = function Tile(malakh, options) {
    this.ensureArguments(arguments, 'Tile', [options]);
    this.ensureOptions(options, 'Tile', ['level', 'x', 'y', 'bounds', 'url']);

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
     * @type Malakh.Rectangle
     */
    this.bounds = options.bounds;

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
     * @type Malakh.Point
     */
    this.position = null;
    /**
     * Current size of the tile on the screen in pixels.
     * @type Malakh.Point
     */
    this.size = null;
    /**
     * Support subpixel precision when drawing on canvas.
     * @type boolean
     * @see Malakh.TiledImage#subpixelTileParameters
     */
    this.subpixelTileParameters = (options.subpixelTileParameters != null) ?
        options.subpixelTileParameters :
        this.config.subpixelTileParameters;

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
     * @type Malakh.Point
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

Malakh.Tile.prototype = Object.create(malakhProxy);

$.extend(Malakh.Tile.prototype,
    /**
     * @lends Malakh.Tile.prototype
     */
    {
        /**
         * Updates tile's version to the current time.
         */
        updateVersion: function updateVersion() {
            this.version = Date.now();
            return this;
        },

        /**
         * Draws the tile on canvas. Optionally applies zoom needed for magnifier support
         * and in that case makes it so both the usual and enlarged tile is identical
         * around <code>mousePosition</code>.
         *
         * @param {number} [zoom=1]
         * @param {Malakh.Point} [mousePosition]
         */
        draw: function draw(zoom, mousePosition) {
            if (!this.loaded) {
                this.fail('Attempting to draw tile ' + this.toString() + ' when it\'s not yet loaded.');
            }

            var context = this.canvasContext,
                position = this.position,
                size = this.size,
                image = this.image;

            if (zoom != null && zoom !== 1) {
                position = position
                    .minus(mousePosition)
                    .multiply(zoom)
                    .plus(mousePosition);
                size.x *= zoom;
                size.y *= zoom;
            }

            if (!this.subpixelTileParameters) {
                position.x = Math.floor(position.x);
                position.y = Math.floor(position.y);
                size.x = Math.ceil(size.x);
                size.y = Math.ceil(size.y);
            }

            context.globalAlpha = this.opacity;
            try {
                context.drawImage(image, position.x, position.y, size.x, size.y);
            } catch (e) {
                console.error('context.drawImage error.', image, position.x, position.y, size.x, size.y);
                throw e;
            }
            if (this.config.debugTileBorders) {
                context.strokeRect(position.x, position.y, size.x, size.y);
            }
            context.globalAlpha = 1;

            return this;
        },

        /**
         * Resets the tile and removes the reference to the image it contained.
         */
        unload: function unload() {
            this.image = null;
            this.loaded = false;
            this.loading = false;
            return this;
        },

        /**
         * Returns the string representation of the tile.
         * @return {string}
         */
        toString: function toString() {
            return this.level + '/' + this.x + '_' + this.y;
        },
    }
);
