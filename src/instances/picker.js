/**
 * Constructs the <code>Picker</code> instance.
 *
 * @class <p>Allows to mark rectangular areas on the virtual plane. These areas
 * can be later memorized using <code>Malakh.Markers</code> instance.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {Malakh} malakh  Sets <code>this.malakh</code>.
 */
Malakh.Picker = function Picker(/* malakh */) {
    this.ensureArguments(arguments, 'Picker');

    var that = this,
        $pickerOverlay, $pickerArea,
        pickerAreaMode, drawingArea;

    // Indicates direction in which we are resizing the rectangle at the moment.
    pickerAreaMode = {
        toRight: true, // Is the rectangle being resized to the right, keeping its left edge intact?
        toBottom: true, // Is the rectangle being resized to the bottom, keeping its top edge intact?
    };
    drawingArea = false; // Are we drawing a rectangle at the moment?

    $pickerOverlay = $('<div class="picker_overlay">').css({
        position: 'absolute',
        zIndex: 100,
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    });

    $pickerArea = $('<div class="picker_area">').css({
        position: 'absolute',
        display: 'none',
        zIndex: 150,
        left: 0,
        top: 0,
        backgroundColor: 'transparent',
        border: '5px dashed #00d5ef',
    });
    $pickerOverlay.append($pickerArea);

    bindEvents();

    /**
     * Activates the Picker.
     */
    this.show = function show() {
        that.$container.append($pickerOverlay);
        $(document).on('mouseup.malakh', onMouseUp);
        return this;
    };

    /**
     * Deactivates the Picker.
     */
    this.hide = function hide() {
        $(document).off({
            'mouseup.malakh': onMouseUp,
        });
        $pickerArea.hide();
        $pickerOverlay.detach();
        return this;
    };

    /**
     * Returns current mouse position relative to the canvas top left corner.
     *
     * @param {jQuery.Event} evt An event from which we gather mouse position.
     * @return {Malakh.Point}
     * @private
     */
    function getMousePosition(evt) {
        var offset = that.$container.offset();
        return new Malakh.Point(evt.pageX - offset.left, evt.pageY - offset.top);
    }

    /**
     * Checks if the position (mouseX, mouseY) is over the border of the rectangle
     * of a given bounds.
     *
     * @param {Malakh.Rectangle} bounds
     * @param {number} mouseX
     * @param {number} mouseY
     * @return {string} String representing canonical cursor name corresponding to its current position over
     *                  the border (like <code>'nw-resize'</code>).
     * @private
     */
    function overBorder(bounds, mouseX, mouseY) {
        var handleSize = that.config.pickerHandleSize;
        // Click position wrt. border of the rectangle.
        var Pos = {
            begin: 0,
            middle: 1,
            end: 2,
        };
        var xPos, yPos;

        // Did we click outside the rectangle?
        if (mouseX < bounds.x - handleSize || mouseX > bounds.x + bounds.width + handleSize) {
            return 'default';
        }
        if (mouseY < bounds.y - handleSize || mouseY > bounds.y + bounds.height + handleSize) {
            return 'default';
        }

        // Position of the click in the rectangle.
        if (mouseX < bounds.x + handleSize && mouseX < bounds.x + bounds.width / 2) {
            xPos = Pos.begin;
        } else if (mouseX > bounds.x + bounds.width - handleSize) {
            xPos = Pos.end;
        } else {
            xPos = Pos.middle;
        }

        if (mouseY < bounds.y + handleSize && mouseY < bounds.y + bounds.height / 2) {
            yPos = Pos.begin;
        } else if (mouseY > bounds.y + bounds.height - handleSize) {
            yPos = Pos.end;
        } else {
            yPos = Pos.middle;
        }

        switch (xPos) {
            case Pos.begin:
                switch (yPos) {
                    case Pos.begin:
                        return 'nw-resize';
                    case Pos.middle:
                        return 'w-resize';
                    case Pos.end:
                        return 'sw-resize';
                    default:
                        console.error('Error 1! xPos: ' + xPos + ', yPos: ' + yPos);
                        return 'default';
                }
                break;

            case Pos.middle:
                switch (yPos) {
                    case Pos.begin:
                        return 'n-resize';
                    case Pos.middle:
                        return 'default'; // interior
                    case Pos.end:
                        return 's-resize';
                    default:
                        console.error('Error 2! xPos: ' + xPos + ', yPos: ' + yPos);
                        return 'default';
                }
                break;

            case Pos.end:
                switch (yPos) {
                    case Pos.begin:
                        return 'ne-resize';
                    case Pos.middle:
                        return 'e-resize';
                    case Pos.end:
                        return 'se-resize';
                    default:
                        console.error('Error 3! xPos: ' + xPos + ', yPos: ' + yPos);
                        return 'default';
                }
                break;

            default:
                console.error('Error 4! xPos: ' + xPos + ', yPos: ' + yPos);
                return 'default';
        }
    }


    /**
     * Dynamically changes picker's rectangle during it's creation
     * or dragging by its edge or corner.
     *
     * @param {number} left Position of the left edge of the rectangle when we move its right side.
     *                      Changes to mean position of the right side when mouse moves far to the left.
     * @param {number} top Like above but with 'left' changed to 'top' and 'right' to 'bottom'.
     * @param {boolean} [horizontally] Do we allow horizontal resizing? Can be blocked if we drag by the edge.
     * @param {boolean} [vertically] Do we allow vertical resizing?
     * @private
     */
    function keepAdjustingArea(left, top, horizontally, vertically) {
        if (horizontally == null) {
            horizontally = true;
        }
        if (vertically == null) {
            vertically = true;
        }

        $pickerOverlay.on({
            'mousemove.malakh': function (evt) {
                var mousePosition = getMousePosition(evt);
                var cursorType = '';

                // Vertical/horizontal blocking is active when we change
                // rectangle size by dragging by its edge.
                if (vertically) {
                    pickerAreaMode.toBottom = mousePosition.y >= top;
                    if (pickerAreaMode.toBottom) {
                        $pickerArea.css({
                            top: top,
                            height: mousePosition.y - top,
                        });
                        cursorType += 's';
                    } else {
                        $pickerArea.css({
                            top: mousePosition.y,
                            height: top - mousePosition.y,
                        });
                        cursorType += 'n';
                    }
                }

                if (horizontally) {
                    pickerAreaMode.toRight = mousePosition.x >= left;
                    if (pickerAreaMode.toRight) {
                        $pickerArea.css({
                            left: left,
                            width: mousePosition.x - left,
                        });
                        cursorType += 'e';
                    } else {
                        $pickerArea.css({
                            left: mousePosition.x,
                            width: left - mousePosition.x,
                        });
                        cursorType += 'w';
                    }
                }

                cursorType += '-resize';
                $pickerOverlay.css('cursor', cursorType);
            },
        });
    }


    function getPickerAreaRectangle() {
        var pickerAreaCss = $pickerArea.css(['left', 'top', 'width', 'height']);
        return new Malakh.Rectangle(
            parseFloat(pickerAreaCss.left),
            parseFloat(pickerAreaCss.top),
            parseFloat(pickerAreaCss.width),
            parseFloat(pickerAreaCss.height)
        );
    }


    /**
     * Handling mousemove when NOT changing picker's size.
     * This function just changes mouse cursor based on hovering.
     * @private
     */
    function bindPickerMouseMove() {
        $pickerOverlay.on({
            'mousemove.malakh': function (evt) {
                var mousePosition = getMousePosition(evt);
                if (drawingArea) {
                    return;
                }

                var cursorType;
                if ($pickerArea.is(':visible')) {
                    cursorType = overBorder(getPickerAreaRectangle(), mousePosition.x, mousePosition.y);
                } else { // we haven't marked anything yet
                    cursorType = 'default';
                }

                $(this).css('cursor', cursorType);
            },
        });
    }

    function onMouseUp(evt) {
        if (drawingArea) {
            $pickerOverlay.off('mousemove.malakh');
            bindPickerMouseMove();

            var areaBounds = that.malakh.viewport.pointRectangleFromPixelRectangle(getPickerAreaRectangle());

            // Prints coordinates of the selected area (so far it's not used anywhere).
            console.log('areaBounds: [' + areaBounds.x + ', ' + areaBounds.y +
                ', ' + areaBounds.width + ', ' + areaBounds.height +
                '], right: ' + (areaBounds.x + areaBounds.width) +
                ', bottom: ' + (areaBounds.y + areaBounds.height));

            drawingArea = false;

            // The point is invisible so we prefer to hide it.
            if (areaBounds.width === 0 && areaBounds.height === 0) {
                $pickerArea.hide();
            }

            var mouseMoveEvent = $.Event('mousemove.malakh');
            mouseMoveEvent.pageX = evt.pageX;
            mouseMoveEvent.pageY = evt.pageY;
            $pickerOverlay.trigger(mouseMoveEvent);
        }
    }


    function bindEvents() {
        bindPickerMouseMove();

        $pickerOverlay.on({
            'mousedown.malakh': function (evt) {
                var left, top;
                evt.stopPropagation(); // don't propagate events to the Malakh canvas

                if (evt.which !== 1) { // Only left-click is supported.
                    return;
                }
                drawingArea = true;
                var mousePosition = getMousePosition(evt);

                var pickerAreaCss = $pickerArea.css(['left', 'top', 'width', 'height']);
                var pickerAreaCssNormalized = {
                    x: parseFloat(pickerAreaCss.left),
                    y: parseFloat(pickerAreaCss.top),
                    width: parseFloat(pickerAreaCss.width),
                    height: parseFloat(pickerAreaCss.height),
                };

                var cursorType;
                if ($pickerArea.is(':visible')) {
                    cursorType = overBorder(pickerAreaCssNormalized, mousePosition.x, mousePosition.y);
                } else { // we haven't marked anything yet
                    cursorType = 'default';
                }

                switch (cursorType) {
                    case 'default':
                        // We didn't catch a handle to change size of the
                        // rectangle, we're making a new one.
                        left = mousePosition.x;
                        top = mousePosition.y;
                        $pickerArea.css({
                            left: left,
                            top: top,
                            width: 0,
                            height: 0,
                        });
                        $pickerArea.show();
                        keepAdjustingArea(left, top);
                        break;

                    case 'n-resize':
                        keepAdjustingArea(
                            null,
                            pickerAreaCssNormalized.y + pickerAreaCssNormalized.height,
                            false, true);
                        break;

                    case 'w-resize':
                        keepAdjustingArea(
                            pickerAreaCssNormalized.x + pickerAreaCssNormalized.width,
                            null,
                            true, false);
                        break;

                    case 's-resize':
                        keepAdjustingArea(null, pickerAreaCssNormalized.y, false, true);
                        break;

                    case 'e-resize':
                        keepAdjustingArea(pickerAreaCssNormalized.x, null, true, false);
                        break;

                    case 'nw-resize':
                        keepAdjustingArea(
                            pickerAreaCssNormalized.x + pickerAreaCssNormalized.width,
                            pickerAreaCssNormalized.y + pickerAreaCssNormalized.height);
                        break;

                    case 'sw-resize':
                        keepAdjustingArea(
                            pickerAreaCssNormalized.x + pickerAreaCssNormalized.width,
                            pickerAreaCssNormalized.y);
                        break;

                    case 'se-resize':
                        keepAdjustingArea(pickerAreaCssNormalized.x, pickerAreaCssNormalized.y);
                        break;

                    case 'ne-resize':
                        keepAdjustingArea(
                            pickerAreaCssNormalized.x,
                            pickerAreaCssNormalized.y + pickerAreaCssNormalized.height);
                        break;
                }
            },
        });
    }
};

Malakh.Picker.prototype = Object.create(malakhProxy);
