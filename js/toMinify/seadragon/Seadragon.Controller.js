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
Seadragon.Controller = function Controller(containerSelectorOrElement) {
    'use strict';

    var self = this;

    var $container, $canvas;
    var lastOpenStartTime, lastOpenEndTime;
    var animated;
    var forceRedraw;
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
            Seadragon.Debug.fatal('Can\'t create a Controller instance without a container!');
        }
        $container.empty();
        $container.css({
            backgroundColor: Seadragon.Config.backgroundColor
        });

        $canvas = $('<canvas />');
        $container.append($canvas);

        lastOpenStartTime = lastOpenEndTime = 0;

        self.dziImage = null;

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
        forceRedraw = true;
        keepUpdating();
    })();

    /**
     * Shows the magnifier.
     */
    this.showMagnifier = function showMagnifier() {
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
    this.hideMagnifier = function hideMagnifier() {
        $canvas.off('mousemove', moveMagnifier);

        self.drawer.canvasLayersManager.drawMagnifier = false;
        self.drawer.setMagnifier(false);
        magnifierShown = false;

        forceRedraw = true;
    };

    /**
     * Toggles magnifier's state - shows it if it was hidden; hides it otherwise.
     */
    this.toggleMagnifier = function toggleMagnifier() {
        if (magnifierShown) {
            self.hideMagnifier();
        } else {
            self.showMagnifier();
        }
    };

    /**
     * Shows the picker.
     */
    this.showPicker = function showPicker() {
        pickerShown = true;
        self.picker.show();
    };

    /**
     * Hides the picker.
     */
    this.hidePicker = function hidePicker() {
        pickerShown = false;
        self.picker.hide();
    };

    /**
     * Toggles picker's state - shows it if it was hidden; hides it otherwise.
     */
    this.togglePicker = function togglePicker() {
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
     * Registers a new open image.
     *
     * @param {Seadragon.DziImage} dziImage
     * @private
     */
    function onOpen(dziImage) {
        if (!dziImage) {
            Seadragon.Debug.error('No DZI Image given to Viewer\'s onOpen()!');
            return;
        }

        // Add an image.
        self.dziImage = dziImage;
        self.drawer.loadDziImage(dziImage);

        self.viewport.maxLevelScale = Math.pow(2, dziImage.maxLevel);
        self.viewport.constraints = new Seadragon.Point(dziImage.width, dziImage.height);

        dziImagesToHandle--;

        $container.trigger('seadragon.loadeddzi');
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
     * A single update process, delegating drawing to the Drawer on a change.
     * @private
     */
    function update() {
        if (self.dziImage == null) { // DZI hasn't been loaded yet.
            return;
        }

        var newContainerSize = new Seadragon.Point(
            parseInt($container.css('width'), 10), parseInt($container.css('height'), 10));

        if (!newContainerSize.equals(containerSize)) {
            // Maintain image position:
            forceRedraw = true; // canvas needs it
            containerSize = newContainerSize;
            self.viewport.resize(newContainerSize);
        }

        // animating => viewport moved, aligning images or loading/blending tiles.
        var animating = self.viewport.update() || forceRedraw;

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
     */
    this.openDzi = function openDzi(dziUrl) {
        dziImagesToHandle++;
        try {
            Seadragon.DziImage.createFromDzi({
                dziUrl: dziUrl,
                $container: $container,
                callback: onOpen
            });
        } catch (error) {
            // We try to keep working even after a failed attempt to load a new DZI.
            dziImagesToHandle--;
            Seadragon.Debug.error('DZI failed to load.');
        }
    };

    /**
     * Checks if controller is in progress of loading/processing new DZIs. Some actions are halted
     * for these short periods.
     *
     * @return {boolean}
     * @private
     */
    function isLoading() {
        return dziImagesToHandle > 0;
    }

    /**
     * Closes the Seadragon module, de-registers events and clears Seadragon HTML container.
     */
    this.close = function close() {
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
};
