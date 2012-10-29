/*global Seadragon: false */

//noinspection JSValidateJSDoc
/**
 * <p>Constructs the Picker instance.
 *
 * @class <p>Allows to mark rectangular areas on the virtual plane. These areas
 * can be later memorized using <code>Seadragon.Markers</code> instance.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: MIT (see the licence.txt file for copyright information)</li>
 * <ul>
 *
 * @param {jQuery object} $container A jQuery object representing the DOM element containing
 *                                   all the HTML structure of Seadragon.
 * @param {Seadragon.Viewport} viewport The viewport handling current Seadragon instance.
 */
Seadragon.Picker = function ($container, viewport) {
    'use strict';

    var $pickerOverlay, $pickerArea;

    var HANDLE_SIZE = 10;

    var pickerAreaMode, drawingArea;

    (function init() {
        if ($container == null || !(viewport instanceof Seadragon.Viewport)) {
            Seadragon.Debug.fatal('Can\'t create a Picker instance without a $container parameter!');
            Seadragon.Debug.log('Received arguments: ');
            Seadragon.Debug.log(Array.prototype.slice.apply(arguments));
            Seadragon.Debug.fatal('Incorrect paremeters given to Seadragon.Picker!\n' +
                'Use Seadragon.Picker($container, viewport)');
        }
        // Indicates direction in which we are resizing the rectangle at the moment.
        pickerAreaMode = {
            toRight: true, // Is the rectangle being resized to the right, keeping its left edge intact?
            toBottom: true // Is the rectangle being resized to the bottom, keeping its top edge intact?
        };
        drawingArea = false; // Are we drawing a rectangle at the moment?

        $pickerOverlay = $('<div class="pickerOverlay" />').css({
            position: 'absolute',
            zIndex: 100,
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent'
        });

        $pickerArea = $('<div class="pickerArea" />').css({
            position: 'absolute',
            display: 'none',
            zIndex: 150,
            left: 0,
            top: 0,
            backgroundColor: 'transparent',
            border: '5px dashed #00d5ef'
        });
        $pickerOverlay.append($pickerArea);

        bindEvents();
    })();

    function show() {
        $container.append($pickerOverlay);
        $(document).on({
            mouseup: onMouseUp
        });
    }

    /**
     * Activates the Picker.
     * @function
     */
    this.show = show;

    function hide() {
        $(document).off({
            mouseup: onMouseUp
        });
        $pickerArea.hide();
        $pickerOverlay.detach();
    }

    /**
     * Deactivates the Picker.
     * @function
     */
    this.hide = hide;

    /**
     * Returns current mouse position relative to the canvas top left corner.
     *
     * @param {jQuery.Event} event An event from which we gather mouse position.
     * @return {Seadragon.Point}
     * @private
     */
    function getMousePosition(event) {
        var offset = $container.offset();
        return new Seadragon.Point(event.pageX - offset.left, event.pageY - offset.top);
    }

    /**
     * Checks if the position (mouseX, mouseY) is over the border of the rectangle
     * of a given bounds.
     *
     * @param {Seadragon.Rectangle} bounds
     * @param {number} mouseX
     * @param {number} mouseY
     * @return {string} String representing canonical cursor name corresponding to its current position over
     *                  the border (like <code>'nw-resize'</code>).
     * @private
     */
    function overBorder(bounds, mouseX, mouseY) {
        // Click position wrt. border of the rectangle.
        var Pos = {
            begin: 0,
            middle: 1,
            end: 2
        };
        var xPos, yPos;

        // Did we click outside the rectangle?
        if (mouseX < bounds.x - HANDLE_SIZE || mouseX > bounds.x + bounds.width + HANDLE_SIZE) {
            return 'default';
        }
        if (mouseY < bounds.y - HANDLE_SIZE || mouseY > bounds.y + bounds.height + HANDLE_SIZE) {
            return 'default';
        }

        // Position of the click in the rectangle.
        if (mouseX < bounds.x + HANDLE_SIZE && mouseX < bounds.x + bounds.width / 2) {
            xPos = Pos.begin;
        } else if (mouseX > bounds.x + bounds.width - HANDLE_SIZE) {
            xPos = Pos.end;
        } else {
            xPos = Pos.middle;
        }

        if (mouseY < bounds.y + HANDLE_SIZE && mouseY < bounds.y + bounds.height / 2) {
            yPos = Pos.begin;
        } else if (mouseY > bounds.y + bounds.height - HANDLE_SIZE) {
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
                        Seadragon.Debug.log('Error 1! xPos: ' + xPos + ', yPos: ' + yPos);
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
                        Seadragon.Debug.log('Error 2! xPos: ' + xPos + ', yPos: ' + yPos);
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
                        Seadragon.Debug.log('Error 3! xPos: ' + xPos + ', yPos: ' + yPos);
                        return 'default';
                }
                break;

            default:
                Seadragon.Debug.error('Error 4! xPos: ' + xPos + ', yPos: ' + yPos);
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
     * @param {boolean} horizontally Do we allow horizontal resizing? Can be blocked if we drag by the edge.
     * @param {boolean} vertically Do we allow vertical resizing?
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
            mousemove: function (event) {
                var mousePosition = getMousePosition(event);
                var cursorType = '';

                // Vertical/horizontal blocking is active when we change
                // rectangle size by dragging by its edge.
                if (vertically) {
                    pickerAreaMode.toBottom = mousePosition.y >= top;
                    if (pickerAreaMode.toBottom) {
                        $pickerArea.css({
                            top: top + 'px',
                            height: (mousePosition.y - top) + 'px'
                        });
                        cursorType += 's';
                    } else {
                        $pickerArea.css({
                            top: mousePosition.y + 'px',
                            height: (top - mousePosition.y) + 'px'
                        });
                        cursorType += 'n';
                    }
                }

                if (horizontally) {
                    pickerAreaMode.toRight = mousePosition.x >= left;
                    if (pickerAreaMode.toRight) {
                        $pickerArea.css({
                            left: left + 'px',
                            width: (mousePosition.x - left) + 'px'
                        });
                        cursorType += 'e';
                    } else {
                        $pickerArea.css({
                            left: mousePosition.x + 'px',
                            width: (left - mousePosition.x) + 'px'
                        });
                        cursorType += 'w';
                    }
                }

                cursorType += '-resize';
                $pickerOverlay.css('cursor', cursorType);
            }
        });
    }


    /**
     * Handling mousemove when NOT changing picker's size.
     * This function just changes mouse cursor based on hovering.
     * @private
     */
    function bindPickerMouseMove() {
        $pickerOverlay.on({
            mousemove: function (event) {
                var mousePosition = getMousePosition(event);
                if (drawingArea) {
                    return;
                }

                var $this = $(this);

                var cursorType;
                if ($pickerArea.is(':visible')) {
                    cursorType = overBorder(new Seadragon.Rectangle(
                        parseInt($pickerArea.css('left'), 10),
                        parseInt($pickerArea.css('top'), 10),
                        parseInt($pickerArea.css('width'), 10),
                        parseInt($pickerArea.css('height'), 10)
                    ), mousePosition.x, mousePosition.y);
                } else { // we haven't marked anything yet
                    cursorType = 'default';
                }

                $this.css('cursor', cursorType);
            }
        });
    }

    function onMouseUp(event) {
        if (drawingArea) {
            $pickerOverlay.off('mousemove');
            bindPickerMouseMove();

            var areaBounds = viewport.pointRectangleFromPixelRectangle(
                new Seadragon.Rectangle(
                    parseInt($pickerArea.css('left'), 10),
                    parseInt($pickerArea.css('top'), 10),
                    parseInt($pickerArea.css('width'), 10),
                    parseInt($pickerArea.css('height'), 10)
                ));

            Seadragon.Debug.log('areaBounds: [' + areaBounds.x + ', ' + areaBounds.y +
                ', ' + areaBounds.width + ', ' + areaBounds.height +
                '], right: ' + (areaBounds.x + areaBounds.width) +
                ', bottom: ' + (areaBounds.y + areaBounds.height));

            drawingArea = false;

            // The point is invisible so we prefer to hide it.
            if (areaBounds.width === 0 && areaBounds.height === 0) {
                $pickerArea.hide();
            }

            var mouseMoveEvent = $.Event('mousemove');
            mouseMoveEvent.pageX = event.pageX;
            mouseMoveEvent.pageY = event.pageY;
            $pickerOverlay.trigger(mouseMoveEvent);
        }
    }


    function bindEvents() {
        bindPickerMouseMove();

        $pickerOverlay.on({
            mousedown: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                drawingArea = true;
                var mousePosition = getMousePosition(event);

                var pickerCSS = {
                    x: parseInt($pickerArea.css('left'), 10),
                    y: parseInt($pickerArea.css('top'), 10),
                    width: parseInt($pickerArea.css('width'), 10),
                    height: parseInt($pickerArea.css('height'), 10)
                };

                var cursorType;
                if ($pickerArea.is(':visible')) {
                    cursorType = overBorder(pickerCSS, mousePosition.x, mousePosition.y);
                } else { // we haven't marked anything yet
                    cursorType = 'default';
                }

                switch (cursorType) {
                    case 'default':
                        // We didn't catch a handle to change size of the
                        // rectangle, we're making a new one.
                        var left = mousePosition.x;
                        var top = mousePosition.y;
                        $pickerArea.css({
                            left: left + 'px',
                            top: top + 'px',
                            width: 0,
                            height: 0
                        });
                        $pickerArea.show();
                        keepAdjustingArea(left, top);
                        break;

                    case 'n-resize':
                        keepAdjustingArea(null, pickerCSS.y + pickerCSS.height, false, true);
                        break;

                    case 'w-resize':
                        keepAdjustingArea(pickerCSS.x + pickerCSS.width, null, true, false);
                        break;

                    case 's-resize':
                        keepAdjustingArea(null, pickerCSS.y, false, true);
                        break;

                    case 'e-resize':
                        keepAdjustingArea(pickerCSS.x, null, true, false);
                        break;

                    case 'nw-resize':
                        keepAdjustingArea(pickerCSS.x + pickerCSS.width, pickerCSS.y + pickerCSS.height);
                        break;

                    case 'sw-resize':
                        keepAdjustingArea(pickerCSS.x + pickerCSS.width, pickerCSS.y);
                        break;

                    case 'se-resize':
                        keepAdjustingArea(pickerCSS.x, pickerCSS.y);
                        break;

                    case 'ne-resize':
                        keepAdjustingArea(pickerCSS.x, pickerCSS.y + pickerCSS.height);
                        break;
                }

                return false;
            }
        });
    }
};
