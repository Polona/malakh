/*global Seadragon: false */
(function () {
    'use strict';

    //noinspection JSValidateJSDoc
    /**
     * Constructs a DZI image.
     *
     * @class Represents a tiled image in the DZI format.
     *
     * <ul>
     *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
     *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
     *     <li>License: MIT (see the licence.txt file for copyright information)</li>
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
     * @param {number} [options.minLevel] Sets this.minLevel.
     * @param {number} [options.maxLevel] Sets this.maxLevel.
     */
    Seadragon.DziImage = function (options) {
        if (options == null || options.$container == null || options.width == null || options.height == null ||
            options.tileSize == null || options.tilesUrl == null || options.fileFormat == null) {
            Seadragon.Debug.log('\nReceived options: ');
            Seadragon.Debug.log(options);
            Seadragon.Debug.fatal('Seadragon.DziImage needs a JSON parameter with at least the following ' +
                'fields: $container, width, height, tileSize, tilesUrl, fileFormat.\n' +
                'Fields: tileOverlap, minLevel, maxLevel are optional.');
        }

        Seadragon.TiledImage.call(this, {
            $container: options.$container,
            width: options.width,
            height: options.height,
            tileSize: options.tileSize,
            tileOverlap: options.tileOverlap,
            minLevel: options.minLevel,
            maxLevel: options.maxLevel
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

        return new Seadragon.DziImage({
            $container: options.$container,
            width: width,
            height: height,
            tileSize: tileSize,
            tileOverlap: tileOverlap,
            tilesUrl: tilesUrl,
            fileFormat: fileFormat
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
     */
    Seadragon.DziImage.createFromDzi = function (options) {
        if (options == null || options.dziUrl == null || options.$container == null || options.callback == null) {
            Seadragon.Debug.log('\nReceived options: ');
            Seadragon.Debug.log(options);
            Seadragon.Debug.fatal('Seadragon.DziImage\'s createFromDzi method needs a JSON parameter with at ' +
                'least the following fields: dziUrl, $container, callback.');
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
                options.callback(processDzi(options));
            },
            error: function (error) {
                Seadragon.Debug.fatal('Unable to retrieve the given DZI file, does it really exist?', error);
            }
        });
    };
})();
