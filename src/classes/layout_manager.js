/**
 * Constructs the <code>LayoutManager</code> instance.
 *
 * @class Contains methods for common layout schemes like putting images in rows or columns.
 *
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 */
Seadragon.LayoutManager = function LayoutManager(seadragon) {
    this.ensureArguments(arguments, 'LayoutManager');
};

Seadragon.LayoutManager.prototype = Object.create(seadragonBasePrototype);

$.extend(Seadragon.LayoutManager.prototype,
    /**
     * @lends Seadragon.LayoutManager.prototype
     */
    {
        /**
         * Organizes DZIs into a given layout.
         *
         * @param {boolean} [alingInRows=false] If true, align in rows; otherwise in columns.
         * @param {number} heightOrWidth If <code>alignInRows</code>: height of rows; otherwise width of columns.
         * @param {number} spaceBetweenImages
         * @param {number} maxRowWidthOrColumnHeight If not infinite, the next row/column is started
         *                                           upon reaching the limit.
         * @param {boolean} [immediately=false]
         * @private
         */
        _alignRowsOrColumns: function (alingInRows, heightOrWidth, spaceBetweenImages, maxRowWidthOrColumnHeight,
                                       immediately) {
            var width, height, widthSum, heightSum, newBounds;
            var that = this;

            if (this.controller.isLoading()) {
                setTimeout(function () {
                    that._alignRowsOrColumns(alingInRows, heightOrWidth, spaceBetweenImages,
                        maxRowWidthOrColumnHeight, immediately);
                }, 100);
                return;
            }

            widthSum = heightSum = 0;

            if (!maxRowWidthOrColumnHeight) {
                maxRowWidthOrColumnHeight = Infinity;
            }

            this.dziImages.forEach(function (dziImage) {
                // Compute the current state.
                if (alingInRows) {
                    width = dziImage.width * heightOrWidth / dziImage.height;
                    height = heightOrWidth;
                    if (widthSum + width > maxRowWidthOrColumnHeight) {
                        // Row width is now too much!
                        widthSum = 0;
                        heightSum += height + spaceBetweenImages;
                    }
                }
                else { // Align in columns.
                    width = heightOrWidth;
                    height = dziImage.height * heightOrWidth / dziImage.width;
                    if (heightSum + height > maxRowWidthOrColumnHeight) {
                        // Column height is now too much!
                        heightSum = 0;
                        widthSum += width + spaceBetweenImages;
                    }
                }

                // Set bounds.
                newBounds = new Seadragon.Rectangle(widthSum, heightSum, width, height);

                // Compute parameters after placing an image.
                if (alingInRows) {
                    widthSum += width + spaceBetweenImages;
                } else {
                    heightSum += height + spaceBetweenImages;
                }

                dziImage.fitBounds(newBounds, immediately);
            });
        },

        /**
         * Align images in rows.
         *
         * @param {number} height Height of a single row.
         * @param {number} spaceBetweenImages Space between images in a row and between columns.
         * @param {number} maxRowWidth Maximum row width. If the next image exceeded it, it's moved to the next row.
         *                             If set to <code>Infinity</code>, only one row will be created.
         * @param {boolean} [immediately=false]
         */
        alignRows: function alignRows(height, spaceBetweenImages, maxRowWidth, immediately) {
            this._alignRowsOrColumns(true, height, spaceBetweenImages, maxRowWidth, immediately);
        },

        /**
         * Align images in columns.
         *
         * @see #alignRows
         *
         * @param {number} width
         * @param {number} spaceBetweenImages
         * @param {number} maxColumnHeight
         * @param {boolean} [immediately=false]
         */
        alignColumns: function _alignColumns(width, spaceBetweenImages, maxColumnHeight, immediately) {
            this._alignRowsOrColumns(false, width, spaceBetweenImages, maxColumnHeight, immediately);
        },

        /**
         * Moves the viewport so that the given image is centered and zoomed as much as possible
         * while still being contained within the viewport.
         *
         * @param {number} whichImage We fit the <code>this.dziImages[whichImage]</code> image
         * @param {boolean} [current=false]
         */
        fitImage: function fitImage(whichImage, current) {
            var dziImage = this.dziImages[whichImage];
            if (!dziImage) {
                console.error('No image with number ' + whichImage);
                return;
            }
            this.viewport.fitBounds(dziImage.bounds.getRectangle(current));
        },


        /**
         * Shows the given image.
         *
         * @param {number} whichImage We show the <code>this.dziImages[whichImage]</code> image
         * @param {boolean} [immediately=false]
         */
        showDzi: function showDzi(whichImage, immediately) {
            this.drawer.showDzi(whichImage, immediately);
            this.controller.restoreUpdating();
        },

        /**
         * Hides the given image.
         *
         * @param {number} whichImage We hide the <code>this.dziImages[whichImage]</code> image
         * @param {boolean} [immediately=false]
         */
        hideDzi: function hideDzi(whichImage, immediately) {
            this.drawer.hideDzi(whichImage, immediately);
            this.controller.restoreUpdating();
        }
    }
);
