(function () {
    /*global Seadragon: false, console: false */
    'use strict';

    /**
     * <p>A global object representing message logging.
     *
     * @namespace
     *
     * @author <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a> @
     *         <a href="http://laboratorium.ee/">Laboratorium EE</a>
     * @license MIT (see the licence.txt file for copyright information)
     */
    Seadragon.Debug = {
        /**
         * <code>console.log</code> wrapper.
         * @param {string} message
         */
        log: function (message) {
            if (Seadragon.Config.debugMode && window.console) {
                console.log(message);
            }
        },

        /**
         * <code>console.error</code> wrappper.
         *
         * @param {string} message
         * @param {Error} [error]
         */
        error: function (message, error) {
            if (window.console) { // Errors should be printed not only in debug mode.
                if (error == null) {
                    console.error('Seadragon error: ' + message);
                } else {
                    console.error('Seadragon error ' + error.name + ': ' + error.message + '; ' + message);
                }
            }
        },

        /**
         * Fatal error, wraps throwing an error.
         *
         * @param {string} message
         * @param {Error} [error]
         * @throws {Error}
         */
        fatal: function (message, error) {
            if (error == null) { // Errors should be thrown not only in debug mode.
                throw new Error('Seadragon error: ' + message);
            } else {
                throw new Error('Seadragon error ' + error.name + ': ' + error.message + '; ' + message);
            }
        }
    };
})();
