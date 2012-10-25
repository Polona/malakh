/*global Seadragon: false */
(function () {
    'use strict';

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
     *     <li>License: MIT (see the licence.txt file for copyright information)</li>
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
     * @param {number} [options.minLevel=Seadragon.Config.minLevelToDraw] Sets this.minLevel.
     * @param {number} [options.maxLevel=maximum image level] Sets this.maxLevel.
     *
     * @author <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
     */
    Seadragon.TiledImage = function (options) {
        if (options == null || options.$container == null || options.width == null || options.height == null ||
            options.tileSize == null || options.tileOverlap == null) {
            Seadragon.Debug.log('Received arguments: ');
            Seadragon.Debug.log(arguments);
            Seadragon.Debug.fatal('Seadragon.TiledImage needs a JSON parameter with at least the following fields: ' +
                '$container, width, height, tileSize.\n' +
                'Fields: tileOverlap, minLevel, maxLevel are optional.');
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
    };

    //noinspection JSValidateJSDoc
    Seadragon.TiledImage.prototype = {
        /**
         * How many times smaller are images from the given level compared to original image dimensions?
         *
         * @param {number} level
         * @return {number}
         */
        getLevelScale: function (level) {
            return Math.pow(0.5, this.maxLevel - level);
        },

        /**
         * Returns number of tiles in both dimensions at the current level.
         *
         * @param {number} level
         * @return {Seadragon.Point}
         */
        getNumTiles: function (level) {
            var scale = this.getLevelScale(level);
            var x = Math.ceil(scale * this.width / this.tileSize);
            var y = Math.ceil(scale * this.height / this.tileSize);

            return new Seadragon.Point(x, y);
        },

        /**
         * Returns bounds dimensions scaled (i.e. usually divided by some power of 2) to the given level.
         *
         * @param {number} level
         * @return {Seadragon.Point}
         */
        getScaledDimensions: function (level) {
            return new Seadragon.Point(this.width, this.height).multiply(this.getLevelScale(level));
        },

        /**
         * Returns a tile containing a given point.
         *
         * @param {number} level
         * @param {Seadragon.Point} point
         * @return {Seadragon.Point}
         */
        getTileAtPoint: function (level, point) {
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
         * @return {Seadragon.Rectangle}
         */
        getTileBounds: function (level, x, y) {
            var px, py, sx, sy, levelScale;

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

            return new Seadragon.Rectangle(px, py, sx, sy);
        },

        /**
         * Returns tile's URL/path. An abstract method - needs to be redefined in classes extending this one!
         * @param {number} level The image level the tile lies on.
         * @param {number} x Tile's column number (starting from 0).
         * @param {number} y Tile's row number (starting from 0).
         * @return {string}
         */
        getTileUrl: function (/*level, x, y*/) {
            Seadragon.Debug.error("Method not implemented.");
            return '';
        }
    };
})();
