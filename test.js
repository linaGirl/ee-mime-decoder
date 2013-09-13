


	var   MimeDecoder 		= require( "./" )
		, fs 				= require( "fs" );




	var mm = fs.readFileSync( __dirname + "/test/msg1.mime" );


	var decoder = new MimeDecoder();

	
	

	decoder.write( mm );

