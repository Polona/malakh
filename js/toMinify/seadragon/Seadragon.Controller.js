/*global Seadragon: false */

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
 *     <li>License: MIT (see the licence.txt file for copyright information)</li>
 * <ul>
 *
 * @see Seadragon.Viewport
 *
 * @param {string|jQuery object} containerSelectorOrElement
 */
Seadragon.Controller = function (containerSelectorOrElement) {
    'use strict';

    var self = this;

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
            Seadragon.Debug.log('\nReceived containerSelectorOrElement: ');
            Seadragon.Debug.log(containerSelectorOrElement);
            Seadragon.Debug.fatal('Can\'t create a Controller instance without a bounds parameter!');
        }
        $container.empty();
        $container.css({
            backgroundColor: Seadragon.Config.backgroundColor
        });

        $canvas = $('<canvas />');
        $container.append($canvas);

        lastOpenStartTime = lastOpenEndTime = 0;

        self.dziImages = [];

        magnifierShown = pickerShown = false;
        lockOnUpdates = closing = false;

        maxLevel = 0; // No DZIs loaded yet.

        dziImagesToHandle = 0;

        bindEvents();

        // Clear any previous message.
        containerSize = new Seadragon.Point(
            parseInt($container.css('width'), 10), parseInt($container.css('height'), 10));

        // Restart other fields.
        self.viewport = new Seadragon.Viewport($container);
        self.magnifier = new Seadragon.Magnifier(new Seadragon.Point(0, 0), Seadragon.Config.magnifierRadius);
        self.picker = new Seadragon.Picker($container, self.viewport);
        self.markers = new Seadragon.Markers($container, self.viewport);
        self.drawer = new Seadragon.Drawer({
            viewport: self.viewport,
            $container: $container,
            magnifier: self.magnifier
        });

        // Begin updating.
        animated = false;
        forceAlign = forceRedraw = true;
        keepUpdating();
    })();

    /**
     * Shows the magnifier.
     */
    this.showMagnifier = function () {
        $(document).mouseup(); // To stop canvas dragging etc.

        magnifierShown = true;
        self.drawer.setMagnifier(true);
        self.drawer.canvasLayersManager.drawMagnifier = true;

        $canvas.on('mousemove', moveMagnifier);
        $canvas.trigger('mousemove');
    };

    /**
     * Hides the magnifier.
     */
    this.hideMagnifier = function () {
        $canvas.off('mousemove', moveMagnifier);

        self.drawer.canvasLayersManager.drawMagnifier = false;
        self.drawer.setMagnifier(false);
        magnifierShown = false;

        forceRedraw = true;
    };

    /**
     * Toggles magnifier's state - shows it if it was hidden; hides it otherwise.
     */
    this.toggleMagnifier = function () {
        if (magnifierShown) {
            self.hideMagnifier();
        } else {
            self.showMagnifier();
        }
    };

    /**
     * Shows the picker.
     */
    this.showPicker = function () {
        pickerShown = true;
        self.picker.show();
    };

    /**
     * Hides the picker.
     */
    this.hidePicker = function () {
        pickerShown = false;
        self.picker.hide();
    };

    /**
     * Toggles picker's state - shows it if it was hidden; hides it otherwise.
     */
    this.togglePicker = function () {
        if (pickerShown) {
            self.hidePicker();
        } else {
            self.showPicker();
        }
    };

    function getMousePosition(event) {
        var offset = $container.offset();
        return new Seadragon.Point(event.pageX - offset.left, event.pageY - offset.top);
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
        $(document).off('mousemove', dragCanvas);
        forceUpdate();
    }

    function bindEvents() {
        $canvas.on({
            mouseenter: function () {
                if (magnifierShown) {
                    self.drawer.canvasLayersManager.drawMagnifier = true;
                    forceUpdate();
                }
            },

            mouseleave: function () {
                if (magnifierShown) { // We have to redraw to hide magnifier.
                    self.drawer.canvasLayersManager.drawMagnifier = false;
                    forceUpdate();
                }
            },

            mousedown: function (event) {
                if (event.which !== 1 || magnifierShown) { // Only left-click is supported.
                    return false;
                }
                lastPosition = getMousePosition(event);
                $(document).on('mousemove', dragCanvas);
                return false;
            },

            mousewheel: function (event, delta) {
                if (magnifierShown || !delta) {
                    return false;
                }
                zoomCanvas(event, delta);
                forceUpdate();
                return false;
            }
        });

        $container.on({
            'seadragon.forcealign': function () {
                forceAlign = true;
                forceUpdate();
            },

            'seadragon.forceredraw': function () {
                forceUpdate();
            }
        });

        $(document).on({
            mouseup: onDocumentMouseUp
        });

        $(window).on({
            resize: forceUpdate
        });
    }

    /**
     * Handler executed when user drags the canvas using their mouse.
     *
     * @param {jQuery.Event} event Mouse event.
     * @private
     */
    function dragCanvas(event) {
        var position = getMousePosition(event);
        var delta = position.minus(lastPosition);

        var blockMovement = Seadragon.Config.blockMovement;
        if (blockMovement.horizontal) {
            delta.x = 0;
        }
        if (blockMovement.vertical) {
            delta.y = 0;
        }
        self.viewport.panBy(self.viewport.deltaPointsFromPixels(delta.negate()));

        lastPosition = position;
    }

    /**
     * Handler executed when zooming using mouse wheel.
     *
     * @param {jQuery.Event} event Mouse event.
     * @param {Seadragon.Point} delta Mouse wheel delta; determines if we're zooming in or out.
     * @private
     */
    function zoomCanvas(event, delta) {
        if (Seadragon.Config.blockZoom) {
            return;
        }
        var factor = Seadragon.Config.zoomPerScroll;
        if (delta < 0) { // zooming out
            factor = 1 / factor;
        }
        self.viewport.zoomBy(
            factor,
            false,
            self.viewport.pointFromPixel(getMousePosition(event), true));
    }


    /**
     * Moves the magnifier to mouse position determined by <code>event</code>.
     *
     * @param {jQuery.Event} event Mouse event.
     * @private
     */
    function moveMagnifier(event) {
        var position = getMousePosition(event);
        self.magnifier.panTo(position);
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
        for (var i = 0; i < self.dziImages.length; i++) {
            var dziImage = self.dziImages[i];
            maxLevel = Math.max(maxLevel, dziImage.getUnadjustedLevel(dziImage.maxLevel));
        }
        self.viewport.maxLevelScale = Math.pow(2, maxLevel);
        self.drawer.maxLevel = maxLevel;
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
            Seadragon.Debug.error('No DZI Image given to Viewer\'s onOpen()!');
            return;
        }

        // Add an image.
        if (typeof index !== 'number') {
            index = self.dziImages.length;
        }
        self.dziImages[index] = dziImage;
        self.drawer.addDziImage(dziImage, index);

        maxLevel = Math.max(maxLevel, dziImage.maxLevel);
        self.viewport.maxLevelScale = Math.pow(2, maxLevel);
        self.drawer.maxLevel = maxLevel;

        dziImagesToHandle--;

        $container.trigger('seadragon.loadeddzi');
        if (dziImagesToHandle === 0) {
            $container.trigger('seadragon.loadeddziarray');
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
        forceAlign = self.dziImages[whichImage].bounds.update() || forceAlign;
        forceUpdate();
    }

    /**
     * A single update process, delegating drawing to the Drawer on a change.
     * @private
     */
    function update() {
        var newContainerSize = new Seadragon.Point(
            parseInt($container.css('width'), 10), parseInt($container.css('height'), 10));

        if (!newContainerSize.equals(containerSize)) {
            // Maintain image position:
            forceRedraw = true; // canvas needs it
            containerSize = newContainerSize;
            self.viewport.resize(newContainerSize);
        }

        // animating => viewport moved, aligning images or loading/blending tiles.
        var animating = self.viewport.update() || forceAlign || forceRedraw;
        if (forceAlign) {
            forceAlign = false;
            setTimeout(function () { // Timeouts to make it more asynchronous.
                for (var i = 0; i < self.dziImages.length; i++) {
                    setTimeout(updateDziImageBounds, 17, i);
                }
            }, 17);
        }

        if (animating) {
            forceRedraw = self.drawer.update();
        } else {
            lockOnUpdates = true;
        }

        // Triger proper events.
        if (!animated && animating) {
            // We weren't animating, and now we did ==> animation start.
            $container.trigger('seadragon.animationstart');
            $container.trigger('seadragon.animation');
        } else if (animating) {
            // We're in the middle of animating.
            $container.trigger('seadragon.animation');
        } else if (animated) {
            // We were animating, and now we're not anymore ==> animation finish.
            $container.trigger('seadragon.animationfinish');
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
    this.openDzi = function (dziUrl, index, shown, bounds, /* internal */ dontIncrementCounter) {
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
            Seadragon.Debug.error('DZI failed to load.');
        }
    };

    /**
     * Opens many DZIs.
     *
     * @param {Array.<string>} dziUrlArray Array of URLs/paths to DZI files.
     * @param {Array.<Seadragon.Rectangle>} [boundsArray] Array of bounds representing position and shape
     *                                                    of the image on the virtual Seadragon plane.
     */
    this.openDziArray = function (dziUrlArray, boundsArray, hideByDefault) {
        var i;
        if (boundsArray == null) {
            boundsArray = [];
        }
        var dziUrlArrayLength = dziUrlArray.length;
        dziImagesToHandle += dziUrlArrayLength;
        for (i = 0; i < dziUrlArrayLength; i++) {
            self.openDzi(dziUrlArray[i], i, !hideByDefault, boundsArray[i], true);
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
    this.close = function () {
        $(window).off({
            resize: forceUpdate
        });
        $(document).off({
            mouseup: onDocumentMouseUp,
            mousemove: dragCanvas
        });
        $container.off();
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

        for (whichImage = 0; whichImage < self.dziImages.length; whichImage++) {
            dziImage = self.dziImages[whichImage];

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

        $container.trigger('seadragon.forcealign');
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
    this.alignRows = function (height, spaceBetweenImages, maxRowWidth, immediately) {
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
    this.alignColumns = function (width, spaceBetweenImages, maxColumnHeight, immediately) {
        alignRowsOrColumns(false, width, spaceBetweenImages, maxColumnHeight, immediately);
    };

    /**
     * Moves the viewport so that the given image is centered and zoomed as much as possible
     * while still being contained within the viewport.
     *
     * @param {number} whichImage We fit the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} current
     */
    this.fitImage = function (whichImage, current) {
        var dziImage = self.dziImages[whichImage];
        if (!dziImage) {
            Seadragon.Debug.error('No image with number ' + whichImage);
            return;
        }

        self.viewport.fitBounds(dziImage.bounds.getRectangle(current));
    };


    function dziImageBoundsInPoints(whichImage, current) {
        return self.dziImages[whichImage].bounds.getRectangle(current);
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
        return self.viewport.pixelRectangleFromPointRectangle(pointBounds, current);
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
        self.drawer.showDzi(whichImage, immediately);
        forceUpdate();
    };

    /**
     * Hides the given image.
     *
     * @param {number} whichImage We hide the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} immediately
     */
    this.hideDzi = function hideDzi(whichImage, immediately) {
        self.drawer.hideDzi(whichImage, immediately);
        forceUpdate();
    };
};
