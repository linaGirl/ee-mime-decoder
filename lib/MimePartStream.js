

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" )
		, StreamDecoder 	= require( "ee-stream-decoder" )
		, TransformStream 	= require( "stream" ).Transform;



	log.disable();

	
	module.exports = new Class( {
		inherits: TransformStream



		, isStream: function(){ return true; }
		, __length: 0


		, init: function( options ){
			this.headers = options.headers;
			this.parent = options.parent;

			var cte = this.headers.has( "content-transfer-encoding" ) ? this.headers.get( "content-transfer-encoding", true ).value.toLowerCase() : null;
			if ( cte === "base64" || cte === "quoted-printable" ){
				this.decoder = new StreamDecoder( { encoding: cte } );
				this.decoder.on( "data", this.handleDecodedData.bind( this ) );
			}

			TransformStream.call( this );
		}


		, hasChildren: function(){
			return false;
		}


		, get length(){
			return this.__length;
		}


		, hasHeader: function( name ){
			return this.headers.has( name );
		}

		, getHeader: function( name ){
			return this.headers.get( name, true );
		}

		, handleDecodedData: function( data ){
			this.__length += data.length;
		 	this.push( data );
		}


		, _transform: function( chunk, encoding, callback ){
			log( chunk.toString() )
			if ( this.decoder ) this.decoder.write( chunk, callback );
			else {
				this.__length += chunk.length;
				this.push( chunk );
				callback();
			}
		}
	} );