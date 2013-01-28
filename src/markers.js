//noinspection JSValidateJSDoc
/**
 * <p>Constructs a <code>Seadragon.Markers</code> instance.
 *
 * @class <p>Each marker is represented by a DOM object and a Seadragon.Rectangle instance
 * to which it's scaled. The rectangle represents element's position in points, not pixels;
 * thus it's updated when canvas moves.
 *
 * <ul>
 *     <li>Author: <a href="mailto:szymon.nowicki@laboratorium.ee">Szymon Nowicki</a>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {jQuery object} $container A jQuery object representing the DOM element containing
 *                                   all the HTML structure of Seadragon.
 * @param {Seadragon.Viewport} viewport The viewport handling current Seadragon instance.
 */
Seadragon.Markers = function Markers($container, viewport) {
    //An array of all kept markers.
    var markers = [];
    // An HTML overlay keeping all markers.
    var $markerOverlay;

    (function init() {
        if ($container == null || !(viewport instanceof Seadragon.Viewport)) {
            console.log('Received arguments: ');
            console.log(Array.prototype.slice.apply(arguments));
            throw new Error('Incorrect paremeters given to Seadragon.Markers!\n' +
                'Use Seadragon.Markers($container, viewport)');
        }
        $markerOverlay = $('<div class="markerOverlay" />');
        $container.append($markerOverlay);
        bindEvents();
    })();

    function addMarker(object, rectangle) {
        markers.push({object: object, rectangle: rectangle});
        $markerOverlay.append(object);
        fixPositions();
    }

    /**
     * Adds a single marker representing given object enclosed in a given rectangle. Rectangle is represented
     * in Seadragon points, relative to the virtual canvas on which everything is drawn.
     *
     * @param {HTMLElement} object An HTML element being marked.
     * @param {Seadragon.Rectangle} rectangle The rectangle representing object's position on the virtual canvas.
     * @function
     */
    this.addMarker = addMarker;

    function deleteMarkers() {
        markers = [];
        $markerOverlay.html('');
    }

    /**
     * Clears markers array.
     */
    this.deleteMarkers = deleteMarkers;

    /**
     * Moves markers to fit canvas when moving.
     * @private
     */
    function fixPositions() {
        $.each(markers, function (_, pair) {
            var pixelRectangle = viewport.pixelRectangleFromPointRectangle(pair.rectangle, true);
            var object = pair.object;
            object.css({
                left: pixelRectangle.x,
                top: pixelRectangle.y,
                width: pixelRectangle.width,
                height: pixelRectangle.height
            });
        });

    }

    function bindEvents() {
        $container.on('seadragon:animation.seadragon', fixPositions);
    }
};
