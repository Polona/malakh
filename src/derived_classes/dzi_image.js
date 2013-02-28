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
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 *
 * @param {Object} options An object containing all given options.
 * @param {number} options.width Sets <code>this.width</code>.
 * @param {number} options.height Sets <code>this.height</code>.
 * @param {number} options.tileSize Sets <code>this.tileSize</code>.
 * @param {number} options.tilesUrl Sets <code>this.tilesUrl</code>.
 * @param {number} options.tileFormat Sets <code>this.tileFormat</code>.
 * @param {number} [options.tileOverlap=0] Sets <code>this.tileOverlap</code>.
 * @param {Seadragon.Rectangle} [options.bounds=new Seadragon.Rectangle(0, 0, options.width, options.height)]
 *                              Sets <code>this.bounds</code>.
 * @param {number} [options.minLevel] Sets this.minLevel.
 * @param {number} [options.maxLevel] Sets this.maxLevel.
 */
Seadragon.DziImage = function DziImage(seadragon, options) {
    this.ensureArguments(arguments, 'Drawer', ['options']);
    this.ensureOptions(options, 'Drawer', ['width', 'height', 'tileSize', 'tilesUrl', 'fileFormat']);

    Seadragon.TiledImage.call(this, this.seadragon, {
        width: options.width,
        height: options.height,
        tileSize: options.tileSize,
        tileOverlap: options.tileOverlap,
        bounds: options.bounds,
        minLevel: options.minLevel,
        maxLevel: options.maxLevel
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
            return this.tilesUrl + level + '/' + x + '_' + y + '.' + this.fileFormat;
        },
    }
);
