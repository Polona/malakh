/*global Seadragon: false, dziNamesArray: false */
var sdData;

function seadragonCustom(options) {
    'use strict';

    var buttonColors = {
        false: '#cd5c5c',
        true: '#2e8b57'
    };

    var pickerOn = false;
    var magnifierOn = false;
    var animationsOff = false;

    var constrainImage3 = false;
    var constrainImage17 = false;

    var $container, dziArray, boundsArray;

    sdData = {
        containerSelector: undefined,

        debugMode: false,
        debugTileBorders: false,

        zoomPerDblclick: 2.5,

        controller: undefined,
        tilesDir: 'seadragon_data/'
    };
    $.extend(sdData, options);


    // Seadragon options:
    if (typeof sdData.animationTime === 'number') {
        Seadragon.Config.animationTime = sdData.animationTime;
    } else {
        sdData.animationTime = Seadragon.Config.animationTime;
    }

    Seadragon.Config.zoomPerScroll = 1.2;
    Seadragon.Config.imageLoaderLimit = 50;

    // Debug options:
    Seadragon.Config.debugMode = sdData.debugMode;
    Seadragon.Config.debugTileBorders = sdData.debugTileBorders;

    // Seadragon initialization:
    $container = $(sdData.containerSelector);
    sdData.controller = new Seadragon.Controller($container);

    dziArray = [];
    boundsArray = [];
    dziNamesArray.forEach(function (dziName) {
        dziArray.push(sdData.tilesDir + dziName + '.dzi');
        boundsArray.push(new Seadragon.Rectangle(1000000, 1000000, 1000, 1000));
    });
    sdData.controller.openDziArray(dziArray, boundsArray);
    sdData.controller.alignRows(4920, 0, Infinity, true);

    // Adjust -- not necessary, just removes the need to do it by ourselves.
    sdData.controller.viewport.zoomTo(0.1, true);
    sdData.controller.viewport.panTo(new Seadragon.Point(7000, 2500), true);


    // Buttons.
    $('#animationsOff').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            animationsOff = !animationsOff;
            if (animationsOff) {
                Seadragon.Config.animationTime = 0;
            } else {
                Seadragon.Config.animationTime = sdData.animationTime;
            }
            $(this).css('background-color', buttonColors[animationsOff]);
            return false;
        }
    });

    var $magnifier = $('#magnifier');
    if (Seadragon.Magnifier) {
        $magnifier.on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                if (pickerOn) {
                    $('#picker').trigger(event); // turn off the picker
                }
                sdData.controller.toggleMagnifier();
                magnifierOn = !magnifierOn;
                $(this).css('background-color', buttonColors[magnifierOn]);
                return false;
            }
        });
    } else {
        $magnifier.remove();
    }

    var $picker = $('#picker');
    if (Seadragon.Picker) {
        $picker.on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                if (magnifierOn) {
                    $('#magnifier').trigger(event); // turn off the magnifier
                }
                sdData.controller.togglePicker();
                pickerOn = !pickerOn;
                $(this).css('background-color', buttonColors[pickerOn]);
                return false;
            }
        });
    } else {
        $picker.remove();
    }


    $('#alignRow').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainImage3 || constrainImage17) {
                return false;
            }
            sdData.controller.alignRows(6000, 100, Infinity);
            return false;
        }
    });

    $('#alignColumn').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainImage3 || constrainImage17) {
                return false;
            }
            sdData.controller.alignColumns(6000, 100, Infinity);
            return false;
        }
    });

    $('#alignRows').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainImage3 || constrainImage17) {
                return false;
            }
            sdData.controller.alignRows(6000, 100, 100000);
            return false;
        }
    });

    $('#alignColumns').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainImage3 || constrainImage17) {
                return false;
            }
            sdData.controller.alignColumns(6000, 100, 100000);
            return false;
        }
    });

    $('#fitImage3').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainImage17) {
                return false;
            }
            sdData.controller.fitImage(2);
            return false;
        }
    });

    $('#fitImage17').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainImage3) {
                return false;
            }
            sdData.controller.fitImage(16);
            return false;
        }
    });

    $('#constrainImage3').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (pickerOn) {
                return false;
            }
            constrainImage3 = !constrainImage3;
            $(this).css('background-color', buttonColors[constrainImage3]);
            constrainImage17 = false;
            $('#constrainImage17').css('background-color', buttonColors[false]);
            Seadragon.Config.constraintViewport = constrainImage3;
            sdData.controller.viewport.constraintBounds = new Seadragon.Rectangle(
                sdData.controller.dziImages[2].bounds.getRectangle());
            sdData.controller.viewport.fitConstraintBounds();
            sdData.controller.viewport.applyConstraints();
            return false;
        }
    });

    $('#constrainImage17').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (pickerOn) {
                return false;
            }
            constrainImage17 = !constrainImage17;
            $(this).css('background-color', buttonColors[constrainImage17]);
            constrainImage3 = false;
            $('#constrainImage3').css('background-color', buttonColors[false]);
            Seadragon.Config.constraintViewport = constrainImage17;
            sdData.controller.viewport.constraintBounds = new Seadragon.Rectangle(
                sdData.controller.dziImages[16].bounds.getRectangle());
            sdData.controller.viewport.fitConstraintBounds();
            sdData.controller.viewport.applyConstraints();
            return false;
        }
    });

    $('#seadragonPreloader').remove();
}
