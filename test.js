


	var   MimeDecoder 		= require( "./" )
		, log 				= require( "ee-log" )
		, StreamCollector 	= require( "ee-stream-collector" )
		, fs 				= require( "fs" );


	var msg = "msg3";


	var stream = fs.createReadStream( "./test/"+msg+".mime" );


	var decoder = new MimeDecoder();
	decoder.on( "data", function( part ){
		log.error( "new part!");
		if ( part.isStream() ){
			log( "the part is a stream" );
			part.pipe( fs.createWriteStream( "./test/"+msg+".data" ) );
		}
	} );


	var printer = function( parts, level ){
		level = level || 0;

		parts.forEach( function( part ){
			log.info( "part length", part.length );
			log( part.getHeader( "content-type" ) );
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

	

