( function( $, window, document, undefined ) {
    'use strict';

    var showMap = function( element, e ) {
        e.preventDefault();

        var mapParams = $( element ).data(),
            $modal,
            modalHeaderHeight;
        if( mapParams.hint == undefined ) {
            mapParams.hint = 'Test';
        }



        $( '#mapPopup' ).modal({
            center: true,
            size: [ 1200, $( document.body ).height() - 150 ],
            onOpen: function( self ) {
                $modal = self.$element;
                modalHeaderHeight = $modal
                    .find( '.au-modal__header' ).outerHeight();

                if( $modal.find( '.b-new-card' ).length > 0 ) {
                    modalHeaderHeight +=  $modal.find( '.b-new-card' ).outerHeight();
                }

                $( '#yandex-map' )
                    .height( $modal.height() - modalHeaderHeight )
                    .ymap( mapParams );
            }
        });
    };

    function YandexMap ( element, options ) {
        this.init( element, options );
    }

    YandexMap.prototype = {
        constructor: YandexMap,

        init: function( element, options ) {
            this.element  = element;
            this.$element = $( element );
            this.options  = this.getOptions( options );
            this.showGeoObject();
        },

        reinit: function( options ) {
            if( typeof( this.map.geoObjects.removeAll ) != "undefined" ) {
                this.map.geoObjects.removeAll();
            }
            
            if ( options.center == undefined ){
                options.center = this.options.center;
            }

            if ( options.center.toString() === this.options.center.toString() ) {
                return;
            }

            this.options = this.getOptions( options );

            this.map.setCenter( this.options.center );
            this.createGeoObject( this.options.center );
            this.setControls( this.getControls() );
        },

        setControls: function( controls ) {
            if( !controls ) {
                return;
            }

            for( var control in controls ) {
                if( typeof( controls[control] ) == 'string' ) {
                    this.map.controls.add( controls[control] );
                }
            }
        },

        getOptions: function( options ) {
            options = $.extend( {}, $.fn.ymap.defaults, this.$element.data(), options );
            return options;
        },

        getControls: function() {
            return this.$element.data( "mapControls" );
        },

        createMap: function( center ) {
            if ( !!this.map ) return;

            this.options.center = center;
            this.options.mapId = this.$element.attr( 'id' );

            this.map = new AM.YandexMap( this.element, this.options );
            this.map.geoObjects.events.add( 'add', this.disableAjaxLoader.bind( this ) );
        },

        showGeoObject: function() {
            this.enableAjaxLoader();
            if ( this.options.center ) {
                this.createMap( this.options.center );
                this.createGeoObject( this.options.center );
                this.setControls( this.getControls() );
            } else {
                this.geocodeAddress( this.options.hint );
            }
        },

        createGeoObject: function( coords ) {
            var properties = { hintContent: this.options.hint },
                options = { preset: 'islands#blackDotIcon' },
                geoObject;

            geoObject = new ymaps.Placemark( coords, properties, options );
            this.map.geoObjects.add( geoObject );
        },

        geocodeAddress: function( address ) {
            var geocode = ymaps.geocode( address, { results: 1 } );

            geocode.then( function( result ) {
                var coords = result.geoObjects.get( 0 ).geometry.getCoordinates();
                this.createMap( coords );
                this.createGeoObject( coords );
                this.setControls( this.getControls() );
            }.bind( this ), this.showGeocodeError.bind( this ) );
        },

        showGeocodeError: function() {
            this.disableAjaxLoader();
            this.$element.append( '<div class="h2 au-tac">Адрес не найден</div>' );
        },

        enableAjaxLoader: function() {
            if ( this.loader ) return;
            this.loader = true;
            this.$element.ajaxLoader( this.options.loader.on );
        },

        disableAjaxLoader: function() {
            if ( !this.loader ) return;
            this.loader = false;
            this.$element.ajaxLoader( this.options.loader.off );
        },
    };

    $.fn.ymap = function( options ) {
        var $el, instance;
        
        return this.each( function() {
            $el = $( this );
            instance = $el.data( 'plugin_ymap' );

            if ( !instance ) {
                $el.data( 'plugin_ymap', new YandexMap( this, options ) );
            } else {
                if ( options.center == undefined ) {
                    var geocode = ymaps.geocode( options.hint, { results: 1 } )
                    geocode.then( function( result ) {
                        options.center = result.geoObjects.get( 0 ).geometry.getCoordinates();
                        instance.reinit( options );
                    }.bind( this ) );
                } else {
                    instance.reinit( options );
                }


            }
        } );
    };

    $.fn.ymap.Constructor = YandexMap;
    $.fn.ymap.defaults = {
        forceCloseScale: true,
        zoom: 13,
        behaviors: ['default', 'scrollZoom'],
        controls: [],
        loader: {
            on: {
                mode: 'on',
                type: 'huge',
                align: 'center',
                opacity: false,
                valign: 'center',
                text: 'Идет загрузка карты&hellip;'
            },
            off: {
                mode:'off'
            }
        }
    };

    ymaps.ready( function() {
        $( document ).on( 'click', '.js-address', function( e ){
            showMap( this, e );
        });
        debugger;
        // delivery dealers map
        var mapHeaderTmpl = $( '#tmpl-delivery-map' ).html();

        $( document ).on( 'click', '.js-map-delivery-click', function( e ) {
            var dealerId = $( this ).data( 'dealerId' );
            var advertId = $( this ).data( 'advertId' );
            var $modal   = $( '#au-modal__header-ext' );

            if( dealerId ) {
                /** placing dealer info */
                var mapTmpl  = Mark.up( mapHeaderTmpl, AM.Vars.AdvertDealers[dealerId] );

                $modal.html( mapTmpl );
            } else {
                /** placing private info */
                $( "#au-modal__header-ext" ).html( '<div class="au-modal__header">' + $( this ).data( 'hint' ) + '</div>' );
            }

            /** placing phone info */
            $modal.find( '.js-delivery-phone' ).data( 'advertId', advertId );
            var $openedPhone = $( '#delivery-phone-' + advertId );
            if( $( '.js-delivery-phone', $openedPhone ).length < 1 ) {
                $modal.find( '.b-contact__phone' ).html( $openedPhone.clone() );
            }

            showMap( this, e );
        });

        $( '.js-yandex-map' ).ymap();
    } );

} )( jQuery, window, document );