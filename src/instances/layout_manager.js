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
     * @param {number} [heightOrWidth=500]  If <code>alignInRows</code>: height of rows; otherwise width of columns.
     * @param {number} [spaceBetweenImages=0]
     * @param {number} [maxRowWidthOrColumnHeight=Infinity]  If not infinite, the next row/column is started
     *                                                       upon reaching the limit.
     * @param {boolean} [immediately=false]
     * @private
     */
    this._alignRowsOrColumns = function alignRowsOrColumns(alingInRows, heightOrWidth, spaceBetweenImages,
                                                           maxRowWidthOrColumnHeight, immediately) {
        var width, height, widthSum, heightSum, newBounds;

        // Setting default values if parameters were not provided.
        heightOrWidth = heightOrWidth || 500; // it has to be >0
        spaceBetweenImages = spaceBetweenImages || 0;
        if (maxRowWidthOrColumnHeight == null) {
            maxRowWidthOrColumnHeight = Infinity;
        }

        if (this.controller.isLoading()) {
            setTimeout(this._alignRowsOrColumns.bind(this), 100,
                alingInRows, heightOrWidth, spaceBetweenImages,
                maxRowWidthOrColumnHeight, immediately);
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
     * @param {number} [height=500]  Height of a single row.
     * @param {number} [spaceBetweenImages=0] Space between images in a row and between columns.
     * @param {number} [maxRowWidth=Infinity]  Maximum row width. If the next image exceeded it, it's moved to
     *                                         the next row. If set to <code>Infinity</code>, only one row will
     *                                         be created.
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
     * @param {number} [width=500]
     * @param {number} [spaceBetweenImages=0]
     * @param {number} [maxColumnHeight=Infinity]
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
        if (!(tiledImage instanceof Seadragon.TiledImage)) {
            console.error('No image with number ' + whichImage);
            return this;
        }
        this.viewport.fitBounds(
            tiledImage.boundsSprings.getRectangle(current),
            immediately
        );
        return this;
    };

    /**
     * Hides currently visible images and shows only the given one.
     *
     * @param {number} whichImage  Index of the image to show.
     * @param {boolean} [options={}] Object  containing optional configuration.
     * @param {boolean} [options.immediately=false]
     * @param {boolean} [options.dontFitImage=false]
     * @param {boolean} [options.dontForceConstraints=false]
     */
    this.showOnlyImage = function showOnlyImage(whichImage, options) {
        var tiledImage;

        function getFitImageFunction(whichImage) {
            return function () {
                this.layoutManager.fitImage(whichImage, false, true);
            };
        }

        options = options || {};

        this.controller.showTiledImage(whichImage, options.immediately);

        if (!options.dontFitImage) {
            if (this.tiledImages[whichImage] instanceof Seadragon.TiledImage) {
                getFitImageFunction(whichImage).call(this);
            } else {
                this.controller.tiledImagesCallbacks[whichImage].push(
                    getFitImageFunction(whichImage)
                );
            }
        }

        for (var i = 0; i < this.tiledImages.length; i++) {
            tiledImage = this.tiledImages[i];
            if (i !== whichImage) {
                if (tiledImage instanceof Seadragon.TiledImage) { // otherwise it's already hidden
                    this.controller.hideTiledImage(i, options.immediately);
                }
            }
        }

        if (!options.dontForceConstraints) {
            this.controller.constrainToImage(whichImage);
        }

        this.$container.trigger('seadragon:force_align');

        return this;
    };

    /**
     * TODO document.
     *
     * @param {number} [height=500]
     * @param {boolean} [immediately=false]
     */
    this.alignCentersAndHeights = function alignCenterAndHeight(height, immediately) {
        if (this.controller.isLoading()) {
            setTimeout(this.alignCentersAndHeights.bind(this), 100, height, immediately);
            return this;
        }

        height = height || 500; // it has to be >0

        function getFitBoundsFunction(bounds, immediately) {
            return function () {
                return this.fitBounds(bounds, immediately);
            };
        }

        for (var i = 0; i < this.tiledImages.length; i++) {
            var tiledImage = this.tiledImages[i];
            // We pass width as 0 because TiledImage#fitBounds corrects it anyway
            // and we adjust x & y so that (0, 0) is in the center of the returned rectangle.
            var newBounds = new Seadragon.Rectangle(0, -height / 2, 0, height);
            if (tiledImage instanceof Seadragon.TiledImage) {
                // Center in (0, 0), common height, width counted from height & aspect ratio.
                tiledImage.fitBounds(newBounds, immediately);
            } else {
                this.controller.tiledImagesCallbacks[i].push(
                    getFitBoundsFunction(newBounds, true) // we want deferred bounds modifications to invoke immediately
                );
            }
        }

        return this;
    };
};

Seadragon.LayoutManager.prototype = Object.create(seadragonProxy);
