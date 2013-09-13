

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" )
		, TransformStream 	= require( "stream" ).Transform
		, MimeMultiPart 	= require( "./MimeMultiPart" );



	module.exports = new Class( {
		inherits: TransformStream

		


		, init: function(){
			TransformStream.call( this );

			this.decoder = new MultipartDecoder();

			this.decoder.on( "data", this.handleData.bind( this ) );
			this.decoder.on( "end", this.handleEnd.bind( this ) );
		}



		, handleData: function( part ){
			ẗhis.parts.push( part );

			// stream part
			this.push( part );
		}

		, handleData: function(){
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