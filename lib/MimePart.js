

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" )
		, StreamDecoder 	= require( "ee-stream-decoder" )
		, TransformStream 	= require( "stream" ).Transform;


	log.disable();

	module.exports = new Class( {
		inherits: TransformStream


		, isStream: function(){ return false; }

		, init: function( options ){
			this._setProperty('headers', options.headers);
			this._setProperty('parent', options.parent);
			this._setProperty('decoder');

			var cte = this.headers.has( "content-transfer-encoding" ) ? this.headers.get( "content-transfer-encoding", true ).value.toLowerCase() : null;
			if ( cte === "base64" || cte === "quoted-printable" ){
				this.decoder = new StreamDecoder( { encoding: cte } );
				this.decoder.on( "data", this.handleDecodedData.bind( this ) );
			}

			this._setProperty('_readableState');
			this._setProperty('_events');
			this._setProperty('_maxListeners');
			this._setProperty('_writableState');
			this._setProperty('_transformState');
			this._setProperty('domain');
			this._setProperty('readable');
			this._setProperty('writable');
			this._setProperty('allowHalfOpen');

			TransformStream.call( this );
		}

		, _setProperty: function(key, value) {
			Object.defineProperty(this, key, {value: value, configurable: true, writable: true});
		}

		, hasChildren: function(){
			return false;
		}


		, get length(){
			return this.data ? this.data.length : 0 ;
		}


		, hasHeader: function( name ){
			return this.headers.has( name );
		}

		, getHeader: function( name ){
			return this.headers.get( name, true );
		}

		, handleDecodedData: function( data ){
		 	this.push( data );
		}


		, _transform: function( chunk, encoding, callback ){
			if ( this.decoder ) this.decoder.write( chunk, callback );
			else {
				this.push( chunk );
				callback();
			}
		}
	} );