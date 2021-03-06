const configPath = require( 'path' ).resolve( __dirname, '..', '..', 'config' );
const data = require( './parser' )( configPath, {
	env: process.env.CALYPSO_ENV || process.env.NODE_ENV || 'development',
	includeSecrets: true,
	enabledFeatures: process.env.ENABLE_FEATURES,
	disabledFeatures: process.env.DISABLE_FEATURES
} );

/**
 * Return config `key`.
 * Throws an error if the requested `key` is not set in the config file.
 *
 * @param {String} key The key of the config entry.
 * @return {Mixed} Value of config or error if not found.
 * @api public
 */
function config( key ) {
	if ( key in data ) {
		return data[ key ];
	}
	throw new Error( 'config key `' + key + '` does not exist' );
}

function isEnabled( feature ) {
	return !! data.features[ feature ];
}

function anyEnabled() {
	var args = Array.prototype.slice.call( arguments );
	return args.some( function( feature ) {
		return isEnabled( feature );
	} );
}

module.exports = config;
module.exports.isEnabled = isEnabled;
module.exports.anyEnabled = anyEnabled;
