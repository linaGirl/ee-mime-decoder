


	var   MimeDecoder 		= require( "./" )
		, log 				= require( "ee-log" )
		, StreamCollector 	= require( "ee-stream-collector" )
		, fs 				= require( "fs" );




	var stream = fs.createReadStream( __dirname + "/test/msg1.mime" );


	var decoder = new MimeDecoder();
	decoder.on( "data", function( part ){
		log.error( "PAAAAART!");
		if ( part.isStream ){
			log( "stream" );
			var s = new StreamCollector();

			part.on( "data", function( chunk ){
				log( "got data", chunk );
			} );
			part.on( "end", function( data ){
				log( "stream end" );
				log( data );
			} );

			// part.pipe( s );
		}
	} );
	decoder.on( "end", function(){ 
		log( "fetig" );
		log( decoder.parts );
	} );


	stream.pipe( decoder );

	

