/**
 * Constructs a <code>SingleImage</code> instance.
 *
 * @class Represents a tiled image in the single image format (i.e. a single JPG or PNG file).
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
 * @param {number} options.imageUrl Sets <code>this.imageUrl</code>.
 * @param {Seadragon.Rectangle} [options.bounds=new Seadragon.Rectangle(0, 0, options.width, options.height)]
 *                              Sets <code>this.bounds</code>.
 */
Seadragon.SingleImage = function SingleImage(seadragon, options) {
    this.ensureArguments(arguments, 'SingleImage', ['options']);
    this.ensureOptions(options, 'SingleImage', ['width', 'height', 'imageUrl']);

    Seadragon.TiledImage.call(this, this.seadragon, {
        width: options.width,
        height: options.height,
        tileSize: Math.max(options.width, options.height),
        tileOverlap: 0,
        bounds: options.bounds,
        minLevel: 0,
        maxLevel: 0,
    });

    /**
     * The URL of the image file.
     * @type string
     */
    this.imageUrl = options.imageUrl;
};

Seadragon.SingleImage.prototype = Object.create(Seadragon.TiledImage.prototype);

$.extend(Seadragon.SingleImage.prototype,
    /**
     * @lends Seadragon.SingleImage.prototype
     */
    {
        /**
         * Returns tile's URL/path.
         */
        getTileUrl: function getTileUrl(/* level, x, y */) {
            return this.imageUrl;
        },

        /**
         * Returns how much scaled is a pixel at a given level.
         * @param {number} level The image level.
         * @return {number}
         */
        getPixelOnImageSize: function getPixelOnImageSize(/* level */) {
            return 1;
        },
    }
);
