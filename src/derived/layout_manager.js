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
     */
    this.fitImage = function fitImage(whichImage, current) {
        var tiledImage = this.tiledImages[whichImage];
        if (!tiledImage) {
            console.error('No image with number ' + whichImage);
            return this;
        }
        this.viewport.fitBounds(tiledImage.boundsSprings.getRectangle(current));
        return this;
    };

    /**
     * Hides currently visible images and shows only the given one.
     *
     * @param {number} whichImage  Index of the image to show.
     * @param {boolean} [immediately=false]
     */
    this.showOnlyImage = function showOnlyImage(whichImage, immediately) {
        var that = this;
        this.tiledImages.forEach(function (tiledImage, index) {
            if (index === whichImage) {
                that.showTiledImage(index, immediately);
            } else {
                that.hideTiledImage(index, immediately);
            }
        });
    };

    this.alignCenterAndHeight = function alignCenterAndHeight(height, immediately) {
        var that = this;
        if (this.controller.isLoading()) {
            setTimeout(function () {
                that.alignCenterAndHeight(height, immediately);
            }, 100);
            return this;
        }

        this.tiledImages.forEach(function (tiledImage, index) {
            if (that.controller.tiledImagesLoaded[index]) {
                // Center in (0, 0), common height, width counted from height & aspect ratio.
                tiledImage.fitBounds(new Seadragon.Rectangle(0, 0, undefined, height), immediately);
            } else {
                that.controller.tiledImagesCallbacks[index].push(
                    function () {
                        this.fitBounds(new Seadragon.Rectangle(0, 0, undefined, height), immediately);
                    }
                );
            }
        });

        return this;
    };
};

Seadragon.LayoutManager.prototype = Object.create(seadragonBasePrototype);
