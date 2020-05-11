var AltMode = ( function( _Reveal, global ){

	var Reveal = _Reveal;
	var defMode = 0;

	// Cloning by using a JSON isn't working here because
	// reveal.js configuration object contains functions.
	// Therefore we need something more mature to clone
	// these objects:
	// https://stackoverflow.com/questions/4459928/how-to-deep-clone-in-javascript
	function clone( item ){
		if (!item) { return item; } // null, undefined values check

		var types = [ Number, String, Boolean ], 
			result;

		// normalizing primitives if someone did new String('aaa'), or new Number('444');
		types.forEach(function(type) {
			if (item instanceof type) {
				result = type( item );
			}
		});

		if (typeof result == 'undefined') {
			if (Object.prototype.toString.call( item ) === '[object Array]') {
				result = [];
				item.forEach(function(child, index, array) {
					result[index] = clone( child );
				});
			} else if (typeof item == 'object') {
				// testing that this is DOM
				if (item.nodeType && typeof item.cloneNode == 'function') {
					result = item.cloneNode( true );
				} else if (!item.prototype) { // check that this is a literal
					if (item instanceof Date) {
						result = new Date(item);
					} else {
						// it is an object literal
						result = {};
						for (var i in item) {
							result[i] = clone( item[i] );
						}
					}
				} else {
					// depending what you would like here,
					// just keep the reference, or create new object
					if (false && item.constructor) {
						// would not advice to do that, reason? Read below
						result = new item.constructor();
					} else {
						result = item;
					}
				}
			} else {
				result = item;
			}
		}

		return result;
	}

	function getPresenterConfig(){
		return {
			altModePresenter: null,
			controls: false,
			controlsTutorial: false,
			helpButtonDisplay: 'none', // HelpButton plugin
			hideAddressBar: true,
			mouseWheel: false,
			previewLinks: false,
			progress: false,
			slideNumber: false,
		};
	}

	function setAltModeConfig( altModeConfig ){
		var config = Reveal.getConfig();
		altModeConfig = altModeConfig !== undefined ? altModeConfig
			: config.altModeConfig;

		// we check if the active config should have distraction
		// free presenter mode defaults been applied to
		if( config.altModePresenter ){
			Reveal.configure( getPresenterConfig() );
		}

		// if the user haven't set an alt configuration
		// we set one for the user to allow distraction
		// free presentation mode
		if( !Array.isArray( altModeConfig ) ){
			altModeConfig = [ getPresenterConfig() ];
		}

		// now we save the default configuration into element 0
		// if this not already happend
		if( !altModeConfig.length || !altModeConfig[ 0 ].altModeDefault ){
			// we want to save our current config set;
			var default_config = {};
			if( config.altModeConfig && config.altModeConfig.length && config.altModeConfig[ 0 ].altModeDefault ){
				// we were already initialized and stored our current config
				// so we retrieve it from the store and set it again
				// on our new config
				default_config = config.altModeConfig[ 0 ];
			}else{
				// to not overwrite it because of stored object
				// refernces we need to clone it first and
				// delete our own config settings
				default_config = clone( config );
				delete default_config.altModeConfig;
				delete default_config.altMode;
				default_config.altModeDefault = true;
			}
			altModeConfig.unshift( default_config );
		}

		altModeConfig.forEach( function( e ){
			if( e.altModePresenter ){
				e = Object.assign( e, getPresenterConfig() );
			}
		});
		Reveal.configure({ altModeConfig: altModeConfig });
	}

	function setAltMode( altMode ){
		var config = Reveal.getConfig();
		altMode = altMode !== null && !isNaN( altMode ) ? altMode
			: config.altMode !== undefined && !isNaN( config.altMode ) ? config.altMode
			: defMode;
		altMode = +altMode;
		altMode = altMode % config.altModeConfig.length;

		// set altMode parameter into browser URL without reload;
		// by that we can toggle to PDF export mode with an alternate
		// preset active
		var url_doc = new URL( document.URL );
		var query_doc = new URLSearchParams( url_doc.searchParams );
		// reapply the search params to normalize old and new url
		// in case a query parameter without a following equal
		// sign was given
		url_doc.search = ( query_doc.toString() ? '?' + query_doc.toString() : '' );
		var old_url = url_doc.toString();
		if( !altMode ){
			query_doc.delete( 'altMode' );
		}else{
			query_doc.set( 'altMode', altMode );
		}
		url_doc.search = ( query_doc.toString() ? '?' + query_doc.toString() : '' );
		var new_url = url_doc.toString();

		// only change URL if it really changed to not mess
		// up browser history
		if( old_url != new_url ){
			window.history.pushState( {}, '', new_url );
		}

		var saved_config = clone( config.altModeConfig[ altMode ] );
		delete saved_config.altModeDefault;
		saved_config.altMode = altMode;
		Reveal.configure( saved_config );
		if( global.HelpButton ){
			global.HelpButton.configure( saved_config );
		}
		if( global.ThemeOverride ){
			global.ThemeOverride.configure( saved_config );
		}
	}

	function isPrintingPDF(){
		return ( /print-pdf/gi ).test( window.location.search );
	}

	function toggleAltMode(){
		var config = Reveal.getConfig();
		if( !isPrintingPDF() ){
			// switch the configuration presets is
			// not allowed in PDF export mode because
			// this will mess up the presentation;
			// toggle configuration presets first before
			// switching to PDF export mode
			setAltMode( ++config.altMode );
		}
	}

	function applyAltModeParameter(){
		var url_doc = new URL( document.URL );
		var query_doc = new URLSearchParams( url_doc.searchParams );
		setAltMode( query_doc.get( 'altMode' ) );
	}

	function installKeyBindings(){
		var config = Reveal.getConfig();
		var shortcut = config.altModeShortcut || 'A';
		Reveal.addKeyBinding({
			keyCode: shortcut.toUpperCase().charCodeAt( 0 ),
			key: shortcut.toUpperCase(),
			description: 'Toggle alternative modes'
		}, toggleAltMode );
	}

	function installAltMode(){
		setAltModeConfig();
		applyAltModeParameter();
	}

	function configure( o ){
		if( !o || o !== Object(o) ){
			return;
		}
		setAltModeConfig( o.altConfig );
		setAltMode( o.altMode );
	}

	function install(){
		installKeyBindings();
		// we are only allowed to run, once every other dependency
		// has been loaded; otherwise we would safe the default
		// configuration with incomplete settings and restore it
		// once we toggled back to altMode=0
		if( Reveal.isReady() ){
			installAltMode();
		}else{
			Reveal.addEventListener( 'ready', function(){
				installAltMode();
			});
		}
	}

	var Plugin = {
		configure: configure,
		getPresenterConfig: getPresenterConfig
	}

	if( Reveal && Reveal.VERSION && Reveal.VERSION.length && Reveal.VERSION[ 0 ] == '3' ){
		// reveal 3.x
		install();
	}else{
		// must be reveal 4.x
		Plugin.id = 'alt-mode';
		Plugin.init = function( _Reveal ){
			Reveal = _Reveal;
			install();
		};
	}

	return Plugin;

})( Reveal, window );
