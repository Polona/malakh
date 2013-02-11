/**
 * Creates a new <code>ImageLoader</code> instance.
 *
 * @class <p>Represents objects managing loading of images. Remembers number of images
 * currently downloading and makes sure it doesn't exceed maximum set in
 * <code>this.config.imageLoaderLimit</code>.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 */
Seadragon.ImageLoader = function ImageLoader(seadragon) {
    this.ensureArguments(arguments, 'ImageLoader');

    /**
     * Number of images currently downloaded.
     * @type number
     * @default 0
     */
    this.downloading = 0;
};

Seadragon.ImageLoader.prototype = Object.create(seadragonBasePrototype);

$.extend(Seadragon.ImageLoader.prototype,
    /**
     * @lends Seadragon.ImageLoader.prototype
     */
    {
        /**
         * Loads an image.
         *
         * @param {string} src URL to the image to be loaded
         * @param {function} [callback] Callback function to be executed after image is loaded
         * @return {boolean} Was loading successful?
         */
        loadImage: function loadImage(src, callback) {
            if (this.downloading >= this.config.imageLoaderLimit) {
                return false;
            }
            var that = this;

            this.downloading++;
            var timeout;
            var image = new Image();

            function catchedCallback() {
                that.downloading--;
                if (typeof callback === 'function') {
                    try {
                        callback(image);
                    } catch (error) {
                        console.error('Error while executing ' + src + ' callback.', error);
                    }
                }
            }

            function finish() {
                if (timeout) {
                    clearTimeout(timeout);
                }
                image.onload = image.onabort = image.onerror = null;

                // Call on a timeout to ensure asynchronous behavior.
                setTimeout(catchedCallback, 0, src, image.complete ? image : null);
            }

            image.onload = image.onabort = image.onerror = finish;

            // Consider it a failure if the image times out.
            timeout = setTimeout(finish, this.config.imageLoaderTimeout);
            image.src = src;

            return true;
        }
    }
);
