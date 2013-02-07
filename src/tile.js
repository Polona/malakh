/**
 * Constructs a <code>Seadragon.Tile</code> instance.
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
        console.info('Received options: ', options);
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
