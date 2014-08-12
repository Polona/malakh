/**
 * Constructs the <code>LayoutManager</code> instance.
 *
 * @class Contains methods for common layout schemes like putting images in rows or columns.
 *
 * @param {Malakh} malakh  Sets <code>this.malakh</code>.
 */
Malakh.LayoutManager = function LayoutManager(/* malakh */) {
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

        var malakh = this.malakh,
            controller = malakh.controller,
            tiledImages = malakh.tiledImages;

        // Setting default values if parameters were not provided.
        heightOrWidth = heightOrWidth || 500; // it has to be >0
        spaceBetweenImages = spaceBetweenImages || 0;
        if (maxRowWidthOrColumnHeight == null) {
            maxRowWidthOrColumnHeight = Infinity;
        }

        if (controller.isLoading()) {
            setTimeout(utils.bindThis(this._alignRowsOrColumns, this), 100,
                alingInRows, heightOrWidth, spaceBetweenImages,
                maxRowWidthOrColumnHeight, immediately);
            return this;
        }

        widthSum = heightSum = 0;

        if (!maxRowWidthOrColumnHeight) {
            maxRowWidthOrColumnHeight = Infinity;
        }

        utils.forEach(tiledImages, function (tiledImage) {
            // Compute the current state.
            if (alingInRows) {
                width = heightOrWidth * tiledImage.animatedBounds.getAspectRatio();
                height = heightOrWidth;
                if (widthSum + width > maxRowWidthOrColumnHeight) {
                    // Row width is now too much!
                    widthSum = 0;
                    heightSum += height + spaceBetweenImages;
                }
            } else { // Align in columns.
                width = heightOrWidth;
                height = heightOrWidth / tiledImage.animatedBounds.getAspectRatio();
                if (heightSum + height > maxRowWidthOrColumnHeight) {
                    // Column height is now too much!
                    heightSum = 0;
                    widthSum += width + spaceBetweenImages;
                }
            }

            // Set bounds.
            newBounds = new Malakh.Rectangle(widthSum, heightSum, width, height);

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
     * @param {Object} [options]  An object containing all given options.
     * @param {number} [options.visibility=1]  How large is the image in the viewport; visibility 1 means as large
     *                                         as possible while fitting in it
     * @param {boolean} [options.current=false]
     * @param {boolean} [options.immediately=false]
     */
    this.fitImage = function fitImage(whichImage, options) {
        var boundsRectangle,
            malakh = this.malakh,
            tiledImage = malakh.tiledImages[whichImage];

        options = options || {};
        options.visibility = options.visibility || 1; // visibility 0 doesn't make sense


        if (!(tiledImage instanceof Malakh.TiledImage)) {
            console.error('No image with number ' + whichImage);
            return this;
        }
        boundsRectangle = tiledImage.animatedBounds.getRectangle(options.current);
        boundsRectangle.scaleAroundCenter(1 / options.visibility);
        malakh.viewport.fitBounds(boundsRectangle, options.immediately);
        return this;
    };

    /**
     * Hides currently visible images and shows only the given one.
     *
     * @param {number} whichImage  Index of the image to show.
     * @param {Object} [options]  Object containing optional configuration.
     * @param {number} [options.visibility=1]  How large is the image in the viewport; visibility 1 means as large
     *                                         as possible while fitting in it
     * @param {boolean} [options.immediately=false]
     * @param {boolean} [options.dontFitImage=false]
     * @param {boolean} [options.dontForceConstraints=false]
     * @param {boolean} [options.preCacheNeighbors=false]
     */
    this.showOnlyImage = function showOnlyImage(whichImage, options) {
        var tiledImage;

        var malakh = this.malakh,
            tiledImages = malakh.tiledImages,
            controller = malakh.controller,
            layoutManager = malakh.layoutManager,
            $container = malakh.$container;

        options = options || {};
        tiledImage = tiledImages[whichImage];

        var tiledImageCallbacks = controller.tiledImagesCallbacks[whichImage];
        if (!(tiledImage instanceof Malakh.TiledImage) && !(tiledImageCallbacks instanceof Array)) {
            console.error('No Tiled Image shown or registered at number: ' + whichImage + '!');
            return this;
        }

        function getFitImageFunction(whichImage) {
            return function () {
                layoutManager.fitImage(whichImage, {immediately: true, visibility: options.visibility});
            };
        }

        controller.showImage(whichImage, options.immediately);

        if (!options.dontFitImage) {
            if (tiledImage instanceof Malakh.TiledImage) {
                getFitImageFunction(whichImage).call(this);
            } else {
                tiledImageCallbacks.push(getFitImageFunction(whichImage));
            }
        }

        for (var i = 0; i < tiledImages.length; i++) {
            if (i !== whichImage) {
                if (controller.imageLoadingStarted(i)) { // otherwise it's already hidden
                    controller.hideImage(i, options.immediately);
                } else if (options.preCacheNeighbors && Math.abs(i - whichImage) === 1) {
                    controller.loadImageWithoutShowing(i);
                }
            }
        }

        if (!options.dontForceConstraints) {
            controller.constrainToImage(whichImage);
        }

        $container.trigger('malakh:force_align');

        return this;
    };

    /**
     * Aligns all images so that their centers and heights match.
     *
     * @param {number} [height=500]
     * @param {boolean} [immediately=false]
     */
    this.alignCentersAndHeights = function alignCenterAndHeight(height, immediately) {
        var malakh = this.malakh,
            controller = malakh.controller;
        if (controller.isLoading()) {
            setTimeout(utils.bindThis(this.alignCentersAndHeights, this), 100, height, immediately);
            return this;
        }

        var tiledImages = malakh.tiledImages;

        height = height || 500; // it has to be >0

        function getFitBoundsFunction(bounds, immediately) {
            return function () {
                return this.fitBounds(bounds, immediately);
            };
        }

        for (var i = 0; i < tiledImages.length; i++) {
            var tiledImage = tiledImages[i];
            // We pass width as 0 because TiledImage#fitBounds corrects it anyway
            // and we adjust x & y so that (0, 0) is in the center of the returned rectangle.
            var newBounds = new Malakh.Rectangle(0, -height / 2, 0, height);
            if (tiledImage instanceof Malakh.TiledImage) {
                // Center in (0, 0), common height, width counted from height & aspect ratio.
                tiledImage.fitBounds(newBounds, immediately);
            } else {
                controller.tiledImagesCallbacks[i].push(
                    getFitBoundsFunction(newBounds, true) // we want deferred bounds modifications to invoke immediately
                );
            }
        }

        return this;
    };
};

Malakh.LayoutManager.prototype = Object.create(malakhProxy);
