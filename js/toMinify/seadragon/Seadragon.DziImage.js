/*global Seadragon: false */
(function () {
    'use strict';

    //noinspection JSValidateJSDoc
    /**
     * Constructs a DZI image.
     *
     * @class Represents a tiled image in the DZI format.
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
     *
     * @author <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
     */
    Seadragon.DziImage = function (options) {
        if (options == null || options.$container == null || options.width == null || options.height == null ||
            options.tileSize == null || options.tilesUrl == null || options.fileFormat == null) {
            Seadragon.Debug.log('\nReceived options: ');
            Seadragon.Debug.log(options);
            Seadragon.Debug.fatal('Seadragon.DziImage needs a JSON parameter with at least the following ' +
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
            getTileUrl: function (level, x, y) {
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

    // extract tile url
    function getTilesPath(dziUrl) {
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
    Seadragon.DziImage.createFromDzi = function (options) {
        if (options == null || options.dziUrl == null || options.$container == null || options.callback == null) {
            Seadragon.Debug.log('\nReceived options: ');
            Seadragon.Debug.log(options);
            Seadragon.Debug.fatal('Seadragon.DziImage\'s createFromDzi method needs a JSON parameter with at ' +
                'least the following fields: dziUrl, $container, callback.\n' +
                'Fields: bounds, index, shown are optional.');
        }

        if (!options.dziUrl) {
            Seadragon.Debug.fatal('No url to DZI given!');
        }

        $.ajax({
            type: 'GET',
            url: options.dziUrl,
            dataType: 'xml',
            success: function (data) {
                options.data = data;
                options.callback(processDzi(options), options.index);
            },
            error: function (error) {
                Seadragon.Debug.fatal('Unable to retrieve the given DZI file, does it really exist?', error);
            }
        });
    };
})();
