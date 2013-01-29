//noinspection JSValidateJSDoc
/**
 * <p>Constructs a controller.
 *
 * @class <p>Manages all of Seadragon parts. It receives events and passes them along to the viewport,
 * Seadragon images and tells drawer when to update the current view. This is the 'core' Seadragon part.
 *
 * <p>See <code>Seadragon.Viewport</code> description for information about conventions around parameters
 * named <code>current</code> and <code>immediately</code> and names <strong>point</strong> and <strong>pixel</strong>.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @see Seadragon.Viewport
 *
 * @param {string|jQuery object} containerSelectorOrElement
 */
// TODO document controller fields
Seadragon.Controller = function Controller(containerSelectorOrElement) {
    var that = this;

    var $container, $canvas;
    var lastOpenStartTime, lastOpenEndTime;
    var animated;
    var forceAlign, forceRedraw;
    var dziImagesToHandle;
    var lastPosition;
    var containerSize;
    var magnifierShown, pickerShown;
    var lockOnUpdates, closing;
    var maxLevel;

    (function init() {
        $container = $(containerSelectorOrElement);
        if ($container.length === 0) {
            console.log('\nReceived containerSelectorOrElement: ', containerSelectorOrElement);
            throw new Error('Can\'t create a Controller instance without a container!');
        }
        $container.empty();
        $container.css({
            backgroundColor: Seadragon.Config.backgroundColor
        });

        $canvas = $('<canvas />');
        $container.append($canvas);

        lastOpenStartTime = lastOpenEndTime = 0;

        that.dziImages = [];

        magnifierShown = pickerShown = false;
        lockOnUpdates = closing = false;

        maxLevel = 0; // No DZIs loaded yet.

        dziImagesToHandle = 0;

        bindEvents();

        // Clear any previous message.
        var containerCss = $container.css(['width', 'height']);
        containerSize = new Seadragon.Point(
            parseInt(containerCss.width, 10), parseInt(containerCss.height, 10));

        // Restart other fields.
        that.viewport = new Seadragon.Viewport($container);
        if (Seadragon.Magnifier) {
            that.magnifier = new Seadragon.Magnifier(new Seadragon.Point(0, 0), Seadragon.Config.magnifierRadius);
        }
        if (Seadragon.Picker) {
            that.picker = new Seadragon.Picker($container, that.viewport);
        }
        if (Seadragon.Markers) {
            that.markers = new Seadragon.Markers($container, that.viewport);
        }
        that.drawer = new Seadragon.Drawer({
            viewport: that.viewport,
            $container: $container,
            magnifier: that.magnifier
        });

        // Begin updating.
        animated = false;
        forceAlign = forceRedraw = true;
        keepUpdating();
    })();

    if (Seadragon.Magnifier) {
        /**
         * Shows the magnifier.
         */
        this.showMagnifier = function showMagnifier() {
            $(document).mouseup(); // To stop canvas dragging etc.

            magnifierShown = true;
            that.drawer.setMagnifier(true);
            that.drawer.canvasLayersManager.drawMagnifier = true;

            $canvas.on('mousemove.seadragon', moveMagnifier);
            $canvas.trigger('mousemove.seadragon');
        };

        /**
         * Hides the magnifier.
         */
        this.hideMagnifier = function hideMagnifier() {
            $canvas.off('mousemove.seadragon', moveMagnifier);

            that.drawer.canvasLayersManager.drawMagnifier = false;
            that.drawer.setMagnifier(false);
            magnifierShown = false;

            forceRedraw = true;
        };

        /**
         * Toggles magnifier's state - shows it if it was hidden; hides it otherwise.
         */
        this.toggleMagnifier = function toggleMagnifier() {
            if (magnifierShown) {
                that.hideMagnifier();
            } else {
                that.showMagnifier();
            }
        };
    }

    if (Seadragon.Picker) {
        /**
         * Shows the picker.
         */
        this.showPicker = function showPicker() {
            pickerShown = true;
            that.picker.show();
        };

        /**
         * Hides the picker.
         */
        this.hidePicker = function hidePicker() {
            pickerShown = false;
            that.picker.hide();
        };

        /**
         * Toggles picker's state - shows it if it was hidden; hides it otherwise.
         */
        this.togglePicker = function togglePicker() {
            if (pickerShown) {
                that.hidePicker();
            } else {
                that.showPicker();
            }
        };
    }

    function getMousePosition(evt) {
        var offset = $container.offset();
        return new Seadragon.Point(evt.pageX - offset.left, evt.pageY - offset.top);
    }

    /**
     * Returns mouse position extracted from <code>event</code>.
     *
     * @param {jQuery.Event} event Mouse event.
     * @return {Seadragon.Point}
     * @function
     */
    this.getMousePosition = getMousePosition;

    function onDocumentMouseUp() {
        $(document).off('mousemove.seadragon', dragCanvas);
        forceUpdate();
    }

    function bindEvents() {
        $canvas.on({
            'mouseenter.seadragon': function () {
                if (magnifierShown) {
                    that.drawer.canvasLayersManager.drawMagnifier = true;
                    forceUpdate();
                }
            },

            'mouseleave.seadragon': function () {
                if (magnifierShown) { // We have to redraw to hide magnifier.
                    that.drawer.canvasLayersManager.drawMagnifier = false;
                    forceUpdate();
                }
            },

            'mousedown.seadragon': function (evt) {
                if (evt.which !== 1 || magnifierShown) { // Only left-click is supported.
                    return false;
                }
                lastPosition = getMousePosition(evt);
                $(document).on('mousemove.seadragon', dragCanvas);
                return false;
            },

            'wheel.seadragon': function (evt) {
                if (magnifierShown || !evt.deltaY) {
                    return false;
                }
                zoomCanvas(evt);
                forceUpdate();
                return false;
            }
        });

        $container.on({
            'seadragon:forcealign.seadragon': function () {
                forceAlign = true;
                forceUpdate();
            },

            'seadragon:forceredraw.seadragon': function () {
                forceUpdate();
            }
        });

        $(document).on('mouseup.seadragon', onDocumentMouseUp);
        $(window).on('resize.seadragon', forceUpdate);
    }

    /**
     * Handler executed when user drags the canvas using their mouse.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @private
     */
    function dragCanvas(evt) {
        var position = getMousePosition(evt);
        var delta = position.minus(lastPosition);

        var blockMovement = Seadragon.Config.blockMovement;
        if (blockMovement.horizontal) {
            delta.x = 0;
        }
        if (blockMovement.vertical) {
            delta.y = 0;
        }
        that.viewport.panBy(that.viewport.deltaPointsFromPixels(delta.negate()));

        lastPosition = position;
    }

    /**
     * Handler executed when zooming using mouse wheel.
     *
     * @param {jQuery.Event} evt Mouse 'wheel' event.
     * @private
     */
    function zoomCanvas(evt) {
        if (Seadragon.Config.blockZoom) {
            return;
        }
        var factor = Seadragon.Config.zoomPerScroll;
        if (evt.deltaY > 0) { // zooming out
            factor = 1 / factor;
        }
        that.viewport.zoomBy(
            factor,
            false,
            that.viewport.pointFromPixel(getMousePosition(evt), true));
    }


    /**
     * Moves the magnifier to mouse position determined by <code>event</code>.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @private
     */
    function moveMagnifier(evt) {
        var position = getMousePosition(evt);
        that.magnifier.panTo(position);
        forceUpdate();
    }

    /**
     * Computes maximum level to be drawn on canvas. Note that it's not simply
     * maximum of all dziImage.maxLevel - their levels all scaled so that
     * they match "virtual" levels with regards to their representation on canvas.
     *
     * @see Seadragon.TiledImage.getAdjustedLevel
     * @private
     */
    function recalculateMaxLevel() {
        maxLevel = 0;
        for (var i = 0; i < that.dziImages.length; i++) {
            var dziImage = that.dziImages[i];
            maxLevel = Math.max(maxLevel, dziImage.getUnadjustedLevel(dziImage.maxLevel));
        }
        that.viewport.maxLevelScale = Math.pow(2, maxLevel);
        that.drawer.maxLevel = maxLevel;
    }

    /**
     * Registers a new open image.
     *
     * @param {Seadragon.DziImage} dziImage
     * @param {number} [index] If specified, image is put at <code>this.dziImages[index]</code>; otherwise
     *                         it's put at the end of the table.
     * @private
     */
    function onOpen(dziImage, index) {
        if (!dziImage) {
            console.error('No DZI Image given to Viewer\'s onOpen()!');
            return;
        }

        // Add an image.
        if (typeof index !== 'number') {
            index = that.dziImages.length;
        }
        that.dziImages[index] = dziImage;
        that.drawer.addDziImage(dziImage, index);

        maxLevel = Math.max(maxLevel, dziImage.maxLevel);
        that.viewport.maxLevelScale = Math.pow(2, maxLevel);
        that.drawer.maxLevel = maxLevel;

        dziImagesToHandle--;

        $container.trigger('seadragon:loadeddzi.seadragon');
        if (dziImagesToHandle === 0) {
            $container.trigger('seadragon:loadeddziarray.seadragon');
        }
        forceUpdate();
    }

    /**
     * Schedule the next update run. Scheduling is paused when animations and user actions finish.
     * @private
     */
    function keepUpdating() {
        if (!lockOnUpdates) {
            if (isLoading()) {
                setTimeout(keepUpdating, 1);
                return;
            }
            update();
            setTimeout(keepUpdating, 1);
        }
    }

    function forceUpdate() {
        forceRedraw = true;
        if (lockOnUpdates) {
            lockOnUpdates = false;
            keepUpdating();
        }
    }

    /**
     * Unblock updates stopped by a lack of action. Invoked by single actions expecting redrawing.
     * @function
     */
    this.forceUpdate = forceUpdate;

    /**
     * Updates bounds of a Seadragon image; usually used during aligning (so not too often).
     *
     * @param {number} whichImage Image index in <code>this.dziImages</code> table.
     * @private
     */
    function updateDziImageBounds(whichImage) {
        forceAlign = that.dziImages[whichImage].bounds.update() || forceAlign;
        forceUpdate();
    }

    /**
     * A single update process, delegating drawing to the Drawer on a change.
     * @private
     */
    function update() {
        var containerCss = $container.css(['width', 'height']);
        var newContainerSize = new Seadragon.Point(
            parseInt(containerCss.width, 10), parseInt(containerCss.height, 10));

        if (!newContainerSize.equals(containerSize)) {
            // Maintain image position:
            forceRedraw = true; // canvas needs it
            containerSize = newContainerSize;
            that.viewport.resize(newContainerSize);
        }

        // animating => viewport moved, aligning images or loading/blending tiles.
        var animating = that.viewport.update() || forceAlign || forceRedraw;
        if (forceAlign) {
            forceAlign = false;
            setTimeout(function () { // Timeouts to make it more asynchronous.
                for (var i = 0; i < that.dziImages.length; i++) {
                    setTimeout(updateDziImageBounds, 17, i);
                }
            }, 17);
        }

        if (animating) {
            forceRedraw = that.drawer.update();
        } else {
            lockOnUpdates = true;
        }

        // Triger proper events.
        if (!animated && animating) {
            // We weren't animating, and now we did ==> animation start.
            $container.trigger('seadragon:animationstart.seadragon');
            $container.trigger('seadragon:animation.seadragon');
        } else if (animating) {
            // We're in the middle of animating.
            $container.trigger('seadragon:animation.seadragon');
        } else if (animated) {
            // We were animating, and now we're not anymore ==> animation finish.
            $container.trigger('seadragon:animationend.seadragon');
        }

        // For the next update check.
        animated = animating;
    }

    /**
     * Opens Deep Zoom Image (DZI).
     *
     * @param {string} dziUrl An URL/path to the DZI file.
     * @param {number} index If specified, an image is loaded into <code>controller.dziImages[index]</code>.
     *                       Otherwise it's put at the end of the table.
     * @param {boolean} [shown=true] If false, image is not drawn. It can be made visible later.
     * @param {Seadragon.Rectangle} [bounds] Bounds representing position and shape of the image on the virtual
     *                                       Seadragon plane.
     */
    this.openDzi = function openDzi(dziUrl, index, shown, bounds, /* internal */ dontIncrementCounter) {
        if (!dontIncrementCounter) {
            dziImagesToHandle++;
        }
        try {
            Seadragon.DziImage.createFromDzi({
                dziUrl: dziUrl,
                $container: $container,
                bounds: bounds,
                index: index,
                shown: shown,
                callback: onOpen
            });
        } catch (error) {
            // We try to keep working even after a failed attempt to load a new DZI.
            dziImagesToHandle--;
            console.error('DZI failed to load.');
        }
    };

    /**
     * Opens many DZIs.
     *
     * @param {Array.<string>} dziUrlArray Array of URLs/paths to DZI files.
     * @param {Array.<Seadragon.Rectangle>} [boundsArray] Array of bounds representing position and shape
     *                                                    of the image on the virtual Seadragon plane.
     */
    this.openDziArray = function openDziArray(dziUrlArray, boundsArray, hideByDefault) {
        var i;
        if (boundsArray == null) {
            boundsArray = [];
        }
        var dziUrlArrayLength = dziUrlArray.length;
        dziImagesToHandle += dziUrlArrayLength;
        for (i = 0; i < dziUrlArrayLength; i++) {
            that.openDzi(dziUrlArray[i], i, !hideByDefault, boundsArray[i], true);
        }
    };

    function isLoading() {
        return dziImagesToHandle > 0;
    }

    /**
     * Checks if controller is in progress of loading/processing new DZIs. Some actions are halted
     * for these short periods.
     *
     * @return {boolean}
     * @function
     */
    this.isLoading = isLoading;

    /**
     * Closes the Seadragon module, de-registers events and clears Seadragon HTML container.
     */
    this.close = function close() {
        $(window, document, $container).off('.seadragon');
        $container.empty();
    };

    /**
     * Organizes DZIs into a given layout.
     *
     * @param {boolean} [alingInRows=false] If true, align in rows; otherwise in columns.
     * @param {number} heightOrWidth If <code>alignInRows</code>: height of rows; otherwise width of columns.
     * @param {number} spaceBetweenImages
     * @param {number} maxRowWidthOrColumnHeight If not infinite, the next row/column is started
     *                                           upon reaching the limit.
     * @param {boolean} immediately
     * @private
     */
    function alignRowsOrColumns(alingInRows, heightOrWidth, spaceBetweenImages, maxRowWidthOrColumnHeight,
                                immediately) {
        var whichImage, width, height, dziImage, widthSum, heightSum, newBounds;

        if (isLoading()) {
            setTimeout(alignRowsOrColumns, 100,
                alingInRows, heightOrWidth, spaceBetweenImages, maxRowWidthOrColumnHeight, immediately);
            return;
        }

        widthSum = heightSum = 0;

        if (!maxRowWidthOrColumnHeight) {
            maxRowWidthOrColumnHeight = Infinity;
        }

        for (whichImage = 0; whichImage < that.dziImages.length; whichImage++) {
            dziImage = that.dziImages[whichImage];

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
            updateDziImageBounds(whichImage);
        }
        recalculateMaxLevel();

        $container.trigger('seadragon:forcealign.seadragon');
    }

    /**
     * Align images in rows.
     *
     * @param {number} height Height of a single row.
     * @param {number} spaceBetweenImages Space between images in a row and between columns.
     * @param {number} maxRowWidth Maximum row width. If the next image exceeded it, it's moved to the next row.
     *                             If set to <code>Infinity</code>, only one row will be created.
     * @param {boolean} immediately
     */
    this.alignRows = function alignRows(height, spaceBetweenImages, maxRowWidth, immediately) {
        alignRowsOrColumns(true, height, spaceBetweenImages, maxRowWidth, immediately);
    };

    /**
     * Align images in columns.
     *
     * @see #alignRows
     *
     * @param {number} width
     * @param {number} spaceBetweenImages
     * @param {number} maxColumnHeight
     * @param {boolean} immediately
     */
    this.alignColumns = function alignColumns(width, spaceBetweenImages, maxColumnHeight, immediately) {
        alignRowsOrColumns(false, width, spaceBetweenImages, maxColumnHeight, immediately);
    };

    /**
     * Moves the viewport so that the given image is centered and zoomed as much as possible
     * while still being contained within the viewport.
     *
     * @param {number} whichImage We fit the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} current
     */
    this.fitImage = function fitImage(whichImage, current) {
        var dziImage = that.dziImages[whichImage];
        if (!dziImage) {
            console.error('No image with number ' + whichImage);
            return;
        }

        that.viewport.fitBounds(dziImage.bounds.getRectangle(current));
    };


    function dziImageBoundsInPoints(whichImage, current) {
        return that.dziImages[whichImage].bounds.getRectangle(current);
    }

    /**
     * Returns bounds of the given image in points.
     *
     * @param {number} whichImage We get bounds of the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} current
     * @return {Seadragon.Rectangle}
     * @function
     */
    this.dziImageBoundsInPoints = dziImageBoundsInPoints;

    function dziImageBoundsInPixels(whichImage, current) {
        var pointBounds = dziImageBoundsInPoints(whichImage, current);
        return that.viewport.pixelRectangleFromPointRectangle(pointBounds, current);
    }

    /**
     * Returns bounds of the given image in pixels.
     *
     * @param {number} whichImage We get bounds of the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} current
     * @return {Seadragon.Rectangle}
     * @function
     */
    this.dziImageBoundsInPixels = dziImageBoundsInPixels;


    /**
     * Shows the given image.
     *
     * @param {number} whichImage We show the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} immediately
     */
    this.showDzi = function showDzi(whichImage, immediately) {
        that.drawer.showDzi(whichImage, immediately);
        forceUpdate();
    };

    /**
     * Hides the given image.
     *
     * @param {number} whichImage We hide the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} immediately
     */
    this.hideDzi = function hideDzi(whichImage, immediately) {
        that.drawer.hideDzi(whichImage, immediately);
        forceUpdate();
    };
};