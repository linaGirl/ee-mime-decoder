


	var   MimeDecoder 		= require( "./" )
		, log 				= require( "ee-log" )
		, StreamCollector 	= require( "ee-stream-collector" )
		, fs 				= require( "fs" );


	var msg = "msg4";


	var stream = fs.createReadStream( __dirname + "/test/"+msg+".mime" );


	var decoder = new MimeDecoder();
	decoder.on( "data", function( part ){
		log.error( "new part!");
		if ( part.isStream ){
			log( "the part is a stream" );
			var s = fs.createWriteStream(  __dirname + "/test/"+msg+".data" )
			/*var s = new StreamCollector();
			s.on( "end", function( data ){
				log( "stream end" );
				log( data );
			} );*/

			part.pipe( s );
		}
	} );


	var printer = function( parts, level ){
		level = level || 0;

		parts.forEach( function( part ){
			log.info( "part length", part.length );
			log( part.headers.get( "content-type", true ) );
			if ( part.hasChildren() ){
				printer( part.parts, level + 1 );
			}
		} );
	}

	decoder.on( "end", function(){ 
		log( "finished ..." );
		var messages = decoder.getMessage();

		printer( messages.parts );
	} );


	stream.pipe( decoder );

	

