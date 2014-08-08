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
 * @extends Malakh.TiledImage
 *
 * @param {Malakh} malakh  Sets <code>this.malakh</code>.
 *
 * @param {Object} options An object containing all given options.
 * @param {number} options.width Sets <code>this.width</code>.
 * @param {number} options.height Sets <code>this.height</code>.
 * @param {number} options.tileSize Sets <code>this.tileSize</code>.
 * @param {number} options.tilesUrl Sets <code>this.tilesUrl</code>.
 * @param {number} options.tileFormat Sets <code>this.tileFormat</code>.
 * @param {number} [options.tileOverlap=0] Sets <code>this.tileOverlap</code>.
 * @param {Malakh.Rectangle} [options.bounds=new Malakh.Rectangle(0, 0, options.width, options.height)]
 *                              Sets <code>this.bounds</code>.
 * @param {number} [options.minLevel] Sets this.minLevel.
 * @param {number} [options.maxLevel] Sets this.maxLevel.
 */
Malakh.DziImage = function DziImage(malakh, options) {
    this.ensureArguments(arguments, 'DziImage', ['options']);
    this.ensureOptions(options, 'DziImage', ['width', 'height', 'tileSize', 'tilesUrl', 'fileFormat']);

    Malakh.TiledImage.call(this, this.malakh, {
        width: options.width,
        height: options.height,
        tileSize: options.tileSize,
        tileOverlap: options.tileOverlap,
        bounds: options.bounds,
        minLevel: options.minLevel,
        maxLevel: options.maxLevel,
    });

    /**
     * URL to the directory containing tile files.
     *
     * @type string
     */
    this.tilesUrl = options.tilesUrl;
    /**
     * Format of tile files ('png' or 'jpg').
     *
     * @type string
     */
    this.fileFormat = options.fileFormat;
};

Malakh.DziImage.prototype = Object.create(Malakh.TiledImage.prototype);

$.extend(Malakh.DziImage.prototype,
    /**
     * @lends Malakh.DziImage.prototype
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
            return this.tilesUrl + level + '/' + x + '_' + y + '.' + this.fileFormat;
        },

        /**
         * Returns how much scaled is a pixel at a given level.
         * @param {number} level The image level.
         * @return {number}
         */
        getPixelOnImageSize: function getPixelOnImageSize(level) {
            return this.getScaledDimensions(level).invert().x;
        },
    }
);
