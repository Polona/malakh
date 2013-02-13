/**
 * Constructs the <code>LayoutManager</code> instance.
 *
 * @class Contains methods for common layout schemes like putting images in rows or columns.
 *
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 */
Seadragon.LayoutManager = function LayoutManager(seadragon) {
    this.ensureArguments(arguments, 'LayoutManager');


    /**
     * Organizes DZIs into a given layout. TODO: currently doesn't work with uninitialized images.
     *
     * @param {boolean} [alingInRows=false]  If true, align in rows; otherwise in columns.
     * @param {number} heightOrWidth  If <code>alignInRows</code>: height of rows; otherwise width of columns.
     * @param {number} spaceBetweenImages
     * @param {number} maxRowWidthOrColumnHeight  If not infinite, the next row/column is started
     *                                            upon reaching the limit.
     * @param {boolean} [immediately=false]
     * @private
     */
    this._alignRowsOrColumns = function alignRowsOrColumns(alingInRows, heightOrWidth, spaceBetweenImages,
                                                           maxRowWidthOrColumnHeight, immediately) {
        var width, height, widthSum, heightSum, newBounds;
        var that = this;

        if (this.controller.isLoading()) {
            setTimeout(function () {
                that._alignRowsOrColumns(alingInRows, heightOrWidth, spaceBetweenImages,
                    maxRowWidthOrColumnHeight, immediately);
            }, 100);
            return this;
        }

        widthSum = heightSum = 0;

        if (!maxRowWidthOrColumnHeight) {
            maxRowWidthOrColumnHeight = Infinity;
        }

        this.tiledImages.forEach(function (tiledImage) {
            // Compute the current state.
            if (alingInRows) {
                width = heightOrWidth * tiledImage.boundsSprings.getAspectRatio();
                height = heightOrWidth;
                if (widthSum + width > maxRowWidthOrColumnHeight) {
                    // Row width is now too much!
                    widthSum = 0;
                    heightSum += height + spaceBetweenImages;
                }
            }
            else { // Align in columns.
                width = heightOrWidth;
                height = heightOrWidth / tiledImage.boundsSprings.getAspectRatio();
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

            tiledImage.fitBounds(newBounds, immediately);
        });

        return this;
    };

    /**
     * Align images in rows. TODO: currently doesn't work with uninitialized images.
     *
     * @param {number} height  Height of a single row.
     * @param {number} spaceBetweenImages Space between images in a row and between columns.
     * @param {number} maxRowWidth  Maximum row width. If the next image exceeded it, it's moved to the next row.
     *                              If set to <code>Infinity</code>, only one row will be created.
     * @param {boolean} [immediately=false]
     */
    this.alignRows = function alignRows(height, spaceBetweenImages, maxRowWidth, immediately) {
        return this._alignRowsOrColumns(true, height, spaceBetweenImages, maxRowWidth, immediately);
    };

    /**
     * Align images in columns. TODO: currently doesn't work with uninitialized images.
     *
     * @see #alignRows
     *
     * @param {number} width
     * @param {number} spaceBetweenImages
     * @param {number} maxColumnHeight
     * @param {boolean} [immediately=false]
     */
    this.alignColumns = function alignColumns(width, spaceBetweenImages, maxColumnHeight, immediately) {
        return this._alignRowsOrColumns(false, width, spaceBetweenImages, maxColumnHeight, immediately);
    };

    /**
     * Moves the viewport so that the given image is centered and zoomed as much as possible
     * while still being contained within the viewport.
     *
     * @param {number} whichImage  We fit the <code>this.tiledImages[whichImage]</code> image
     * @param {boolean} [current=false]
     * @param {boolean} [immediately=false]
     */
    this.fitImage = function fitImage(whichImage, current, immediately) {
        var tiledImage = this.tiledImages[whichImage];
        if (!tiledImage) {
            console.error('No image with number ' + whichImage);
            return this;
        }
        this.viewport.fitBounds(
            tiledImage.boundsSprings.getRectangle(current),
            immediately
        );
        return this;
    };

    function getFitImageFunction(whichImage, current, immediately) {
        return function () {
            this.layoutManager.fitImage(whichImage, current, immediately);
        };
    }

    /**
     * Hides currently visible images and shows only the given one.
     *
     * @param {number} whichImage  Index of the image to show.
     * @param {boolean} [immediately=false]
     */
    this.showOnlyImage = function showOnlyImage(whichImage, immediately) {
        var tiledImage;

        this.showTiledImage(whichImage, immediately);
        if (this.tiledImages[whichImage] instanceof Seadragon.TiledImage) {
            this.fitImage(whichImage);
        } else {
            this.controller.tiledImagesCallbacks[whichImage].push(
                getFitImageFunction(whichImage, undefined, immediately)
            );
        }

        for (var i = 0; i < this.tiledImages.length; i++) {
            tiledImage = this.tiledImages[i];
            if (i !== whichImage) {
                if (tiledImage instanceof Seadragon.TiledImage) { // otherwise it's already hidden
                    this.hideTiledImage(i, immediately);
                }
            }
        }

        return this;
    };

    this.alignCenterAndHeight = function alignCenterAndHeight(height, immediately) {
        var that = this;
        if (this.controller.isLoading()) {
            setTimeout(function () {
                that.alignCenterAndHeight(height, immediately);
            }, 100);
            return this;
        }

        function getFitBoundsFunction(bounds, immediately) {
            return function () {
                return this.fitBounds(bounds, immediately);
            };
        }

        for (var i = 0; i < this.tiledImages.length; i++) {
            var tiledImage = this.tiledImages[i];
            var newBounds = new Seadragon.Rectangle(0, 0, undefined, height);
            if (tiledImage instanceof Seadragon.TiledImage) {
                // Center in (0, 0), common height, width counted from height & aspect ratio.
                tiledImage.fitBounds(newBounds, immediately);
            } else {
                this.controller.tiledImagesCallbacks[i].push(
                    getFitBoundsFunction(newBounds, immediately)
                );
            }
        }

        return this;
    };
};

Seadragon.LayoutManager.prototype = Object.create(seadragonProxy);
