

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" )
		, TransformStream 	= require( "stream" ).Transform;



	module.exports = new Class( {
		inherits: TransformStream


		, init: function( options ){
			TransformStream.call( this );
		}



		, _transform: function( chunk, encoding, callback ){

			new MultipartDecoder().write( chunk );


			this.push( new Buffer( chunk, "base64" ) );
			callback();
		}



		, _flush: function( callback ){
			if ( this.offsetBytes ) this.push( new Buffer( this.offsetBytes, "base64" ) );
			callback();
		}
	} );