

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" )
		, StreamDecoder 	= require( "ee-stream-decoder" )
		, TransformStream 	= require( "stream" ).Transform;



	module.exports = new Class( {
		inherits: TransformStream



		, isStream: true


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