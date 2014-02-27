

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" )
		, TransformStream 	= require( "stream" ).Transform
		, MimeMultiPart 	= require( "./MimeMultiPart" );



	module.exports = new Class( {
		inherits: TransformStream




		, init: function(header){

			this._setProperty('decoder');
			this._setProperty('_readableState');
			this._setProperty('_events');
			this._setProperty('_maxListeners');
			this._setProperty('_writableState');
			this._setProperty('_transformState');
			this._setProperty('domain');
			this._setProperty('readable');
			this._setProperty('writable');
			this._setProperty('allowHalfOpen');


			TransformStream.call( this, { objectMode: true } );
			
			this.decoder = new MimeMultiPart();

			if (header) this.decoder.write('\nContent-Type:'+header+'\n\n');

			this.decoder.on( "data", this.handleData.bind( this ) );
			this.decoder.on( "end", this.handleEnd.bind( this ) );
		}


		, _setProperty: function(key, value) {
			Object.defineProperty(this, key, {value: value, configurable: true, writable: true});
		}

		, getMessage: function(){
			return this.decoder;
		}



		, handleData: function( part ){
			// stream part
			this.push( part );
		}

		, handleEnd: function(){
			this.decoderEnded = true;
		}


		, _transform: function( chunk, encoding, callback ){
			this.decoder.write( chunk, callback );
		}


		, _flush: function( callback ){
			if ( this.decoderEnded ) callback();
			else {
				this.decoder.on( "end", callback );
				this.decoder.end();
			}
		}
	} );