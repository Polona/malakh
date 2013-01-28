/**
 * <p>Configuration options of Seadragon.
 *
 * @namespace
 *
 * @author <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a> @
 *         <a href="http://laboratorium.ee/">Laboratorium EE</a>
 * @license MIT (see the license.txt file for copyright information)
 */
// TODO change it into a constructor
Seadragon.Config = {
    /**
     * Prints more info to the console etc.
     * @type boolean
     */
    debugMode: false,
    /**
     * Adds borders to tiles so that loading process is more explicit.
     * @type boolean
     */
    debugTileBorders: false,


    /**
     * Blocks user-invoked canvas movement in horizontal and/or vertical direction.
     * Programatic panning works as before.
     *
     * @property {boolean} horizontal blocks movement in horizontal direction
     * @property {boolean} vertical blocks movement in vertical direction
     * @type Object
     */
    blockMovement: {
        horizontal: false,
        vertical: false
    },
    /**
     * Blocks user-invoked zoom; viewport methods still work.
     * @type boolean
     */
    blockZoom: false,


    /**
     * If set to true, it prevents user from panning/zooming too far from
     * the viewport.constraintBounds rectangle.
     * @type boolean
     */
    constraintViewport: false,


    /**
     * DZI format has tiles as small as 1x1 pixel. Loading them all on one side
     * prevents loading too large images conserving memory but, on the other hand,
     * causes a fuzzy effect. Level set here should be small enough to be contained
     * in one tile only.
     * @type number
     */
    minLevelToDraw: 8,


    /**
     * Time it takes to finish various animations in miliseconds.
     * @type number
     */
    animationTime: 1000,
    /**
     * Time it takes to blend in/out tiles in miliseconds.
     * WARNING: needs to be lower than animationTime!
     * @type number
     */
    blendTime: 500,


    /**
     * Defines sharpness of springs moves; springs are used for animations.
     * @type number
     */
    springStiffness: 5,


    /**
     * Maximum number of simultaneous AJAX image requests.
     * @type number
     */
    imageLoaderLimit: 4,
    /**
     * Maximum waiting time for an image to load.
     * @type number
     */
    imageLoaderTimeout: 15000,


    /**
     * How much to zoom on mouse wheel event.
     * @type number
     */
    zoomPerScroll: 1.2,


    /**
     * Maximum number of tile images to keep in cache.
     * @type number
     */
    maxImageCacheCount: 100,


    /**
     * How much magnifier zooms tiles below it.
     * @type number
     */
    magnifierZoom: 2,
    /**
     * Magnifier is a circle; this parameter represents its radius in pixels.
     * @type number
     */
    magnifierRadius: 200,


    /**
     * Color of background beneath drawn images. Needed for magnifier to correctly
     * redraw background in places where there are no tiles to display.
     * @type string
     */
    backgroundColor: '#2d2a2b'
};
