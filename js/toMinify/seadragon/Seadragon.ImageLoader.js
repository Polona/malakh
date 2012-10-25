/*global Seadragon: false */
(function () {
    'use strict';

    /**
     * <p>Creates a new <code>ImageLoader</code>.
     *
     * @class <p>Represents objects managing loading of images. Remembers number of images
     * currently downloading and makes sure it doesn't exceed maximum set in
     * <code>Seadragon.Config.imageLoaderLimit</code>.
     *
     * <ul>
     *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
     *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
     *     <li>License: MIT (see the licence.txt file for copyright information)</li>
     * <ul>
     */
    Seadragon.ImageLoader = function () {
        /**
         * Number of images currently downloaded.
         * @type number
         * @default 0
         */
        this.downloading = 0;
    };

    Seadragon.ImageLoader.prototype = {
        /**
         * Loads an image.
         *
         * @param {string} src URL to the image to be loaded
         * @param {function} [callback] Callback function to be executed after image is loaded
         * @return {boolean} Was loading successful?
         */
        loadImage: function (src, callback) {
            if (this.downloading >= Seadragon.Config.imageLoaderLimit) {
                return false;
            }
            var self = this;

            this.downloading++;
            var timeout;
            var image = new Image();

            function catchedCallback() {
                self.downloading--;
                if (typeof callback === 'function') {
                    try {
                        callback(image);
                    } catch (error) {
                        Seadragon.Debug.error('Error while executing ' + src + ' callback.', error);
                    }
                }
            }

            function finish() {
                if (timeout) {
                    clearTimeout(timeout);
                }
                image.onload = image.onabort = image.onerror = null;

                // Call on a timeout to ensure asynchronous behavior.
                setTimeout(catchedCallback, 1, src, image.complete ? image : null);
            }

            image.onload = image.onabort = image.onerror = finish;

            // Consider it a failure if the image times out.
            timeout = setTimeout(finish, Seadragon.Config.imageLoaderTimeout);
            image.src = src;

            return true;
        }
    };
})();
