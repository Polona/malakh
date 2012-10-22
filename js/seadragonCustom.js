/*global Seadragon:false dziNamesArray:false */
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

    var constrainImage = false;

    var $container;

    sdData = {
        containerSelector: undefined,

        debugMode: false,
        debugTileBorders: false,

        zoomPerDblclick: 2.5,

        controller: undefined,
        tilesDir: 'seadragon_data/'
    };
    $.extend(sdData, options);

    // Initialize the image (IT CAN BE EXECUTED ONLY ONCE!!!).
    function sdInit() {
        // Seadragon options:
        if (typeof sdData.animationTime === 'number') {
            Seadragon.Config.animationTime = sdData.animationTime;
        } else {
            sdData.animationTime = Seadragon.Config.animationTime;
        }

        Seadragon.Config.zoomPerScroll = 1.2;
        Seadragon.Config.imageLoaderLimit = 50;
//        Seadragon.Config.constraintViewport = true;

        // Debug options:
        Seadragon.Config.debugMode = sdData.debugMode;
        Seadragon.Config.debugTileBorders = sdData.debugTileBorders;

        // Seadragon initialization:
        $container = $(sdData.containerSelector);
        sdData.controller = new Seadragon.Controller($container);

        sdData.controller.openDzi(sdData.tilesDir + 'autoportrety_2c.dzi');

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

        $('#magnifier').on({
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

        $('#picker').on({
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


        $('#fitImage').on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                sdData.controller.viewport.fitImage();
                return false;
            }
        });

        $('#constrainImage').on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                if (pickerOn) {
                    return false;
                }
                constrainImage = !constrainImage;
                $(this).css('background-color', buttonColors[constrainImage]);
                Seadragon.Config.constraintViewport = constrainImage;
                sdData.controller.viewport.applyConstraints();
                return false;
            }
        }).trigger($.Event('click', {which: 1}));

        sdData.controller.viewport.fitImage(true);

        $('#seadragonPreloader').remove();
    }

    sdInit();
}
