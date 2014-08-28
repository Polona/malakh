/* global dziNamesArray: false */
/* eslint-disable no-unused-vars */

var malakh;

function malakhCustom(containerSelectorOrElement, configOverrides) {
    'use strict';

    var buttonColors = {
        false: '#cd5c5c',
        true: '#2e8b57',
    };
    var dziPrefix = 'malakh_data/';
    var initialAnimationTime, initialMouseAnimationTime;

    var animationsOff = false;

    var constrainToImage0 = false,
        constrainToImage16 = false;

    var dziDataArray;

    // Malakh initialization:
    malakh = new Malakh(containerSelectorOrElement,
        $.extend({backgroundColor: '#2d2a2b'}, configOverrides));
    initialAnimationTime = malakh.config.animationTime;
    initialMouseAnimationTime = malakh.config.mouseAnimationTime;

    function openNorblinDZIsInARow() {
        dziDataArray = [];
        dziNamesArray.forEach(function (dziName, index) {
            dziDataArray[index] = {
                imageDataUrl: dziPrefix + dziName + '.dzi',
                bounds: new Malakh.Rectangle(1000000, 1000000, 1000, 1000),
            };
        });
        malakh.openDziArray(dziDataArray);
        malakh.alignRows(6000, 0, Infinity, true);
        malakh.viewport.zoomTo(0.1, true);
        malakh.viewport.panTo(new Malakh.Point(7000, 3000), true);
    }

    function openSomeNorblinDZIsInARow() {
        dziDataArray = [];
        dziNamesArray.forEach(function (dziName, index) {
            dziDataArray[index] = {
                imageDataUrl: dziPrefix + dziName + '.dzi',
                bounds: new Malakh.Rectangle(1000000, 1000000, 1000, 1000),
            };
        });
        malakh.openDziArray(dziDataArray.slice(0, 27));
        malakh.alignRows(6000, 0, Infinity, true);
        malakh.viewport.zoomTo(0.1, true);
        malakh.viewport.panTo(new Malakh.Point(7000, 3000), true);
    }

    function openOneTestDZIFromAcademica() {
        malakh
            .openDzi({
                imageDataUrl: 'http://127.0.0.1:8107/resource/image/280189/?DeepZoom=279868.tif.dzi',
                tilesUrl: 'http://127.0.0.1:8107/resource/image/280189/?DeepZoom=279868.tif_files/',
            }).showOnlyImage(0, {
                dontForceConstraints: true,
            });
    }

    openNorblinDZIsInARow();

    // Buttons.
    $('#animations_off').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            animationsOff = !animationsOff;
            if (animationsOff) {
                malakh.config.animationTime = malakh.config.mouseAnimationTime = 0;
            } else {
                malakh.config.animationTime = initialAnimationTime;
                malakh.config.mouseAnimationTime = initialMouseAnimationTime;
            }
            $(this).css('background-color', buttonColors[animationsOff]);
        },
    });

    $('#dont_center').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            malakh.config.centerWhenZoomedOut = !malakh.config.centerWhenZoomedOut;
            $(this).css('background-color', buttonColors[!malakh.config.centerWhenZoomedOut]);
        },
    });

    $('#zoom_off').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            malakh.config.blockZoom = !malakh.config.blockZoom;
            $(this).css('background-color', buttonColors[malakh.config.blockZoom]);
        },
    });

    $('#tile_borders').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            malakh.config.debugTileBorders = !malakh.config.debugTileBorders;
            $(this).css('background-color', buttonColors[malakh.config.debugTileBorders]);
        },
    });

    var $magnifier = $('#magnifier');
    if (Malakh.Magnifier) {
        $magnifier.on({
            click: function (evt) {
                if (evt.which !== 1) { // Only left-click is supported.
                    return;
                }
                if (malakh.config.enablePicker) {
                    $('#picker').trigger(evt); // turn off the picker
                }
                malakh.toggleMagnifier();
                $(this).css('background-color', buttonColors[malakh.config.enableMagnifier]);
            },
        });
    } else {
        $magnifier.hide();
    }

    var $picker = $('#picker');
    if (Malakh.Picker) {
        $picker.on({
            click: function (evt) {
                if (evt.which !== 1) { // Only left-click is supported.
                    return;
                }
                if (malakh.config.enableMagnifier) {
                    $('#magnifier').trigger(evt); // turn off the magnifier
                }
                malakh.togglePicker();
                $(this).css('background-color', buttonColors[malakh.config.enablePicker]);
            },
        });
    } else {
        $picker.hide();
    }


    $('#align_row').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage0 || constrainToImage16) {
                return;
            }
            if (malakh.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            malakh.alignRows(6000, 100, Infinity);
        },
    });

    $('#align_column').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage0 || constrainToImage16) {
                return;
            }
            if (malakh.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            malakh.alignColumns(6000, 100, Infinity);
        },
    });

    $('#align_rows').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage0 || constrainToImage16) {
                return;
            }
            if (malakh.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            malakh.alignRows(6000, 100, 50000);
        },
    });

    $('#align_columns').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage0 || constrainToImage16) {
                return;
            }
            if (malakh.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            malakh.alignColumns(6000, 100, 50000);
        },
    });

    $('#fit_image_0').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage16) {
                return;
            }
            if (malakh.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            malakh.fitImage(0);
        },
    });

    $('#fit_image_16').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage0) {
                return;
            }
            if (malakh.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            malakh.fitImage(16);
        },
    });

    $('#constrain_to_image_0').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (malakh.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            constrainToImage0 = !constrainToImage0;
            $(this).css('background-color', buttonColors[constrainToImage0]);
            constrainToImage16 = false;
            $('#constrain_to_image_16').css('background-color', buttonColors.false);
            if (constrainToImage0) {
                malakh.constrainToImage(0);
                malakh.fitImage(0);
            } else {
                malakh.config.constrainViewport = false;
            }
        },
    });

    $('#constrain_to_image_16').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (malakh.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            constrainToImage16 = !constrainToImage16;
            $(this).css('background-color', buttonColors[constrainToImage16]);
            constrainToImage0 = false;
            $('#constrain_to_image_0').css('background-color', buttonColors.false);
            if (constrainToImage16) {
                malakh.constrainToImage(16);
                malakh.fitImage(16);
            } else {
                malakh.config.constrainViewport = false;
            }
        },
    });
}

/* eslint-enable no-unused-vars */
