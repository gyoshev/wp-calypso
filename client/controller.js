/**
 * External Dependencies
 */
import ReactDom from 'react-dom';
import startsWith from 'lodash/startsWith';

export function renderElements( context ) {
	console.log( 'render', context, context.path, context.primary );

	renderPrimary( context );
	renderSecondary( context );
}

function renderPrimary( context ) {
	const { path } = context;
	console.log( 'renderPrimary', context, path, context.primary );
	// FIXME: temporary hack until we have a proper isomorphic, one tree routing solution. Do NOT do this!
	const sheetsDomElement = startsWith( path, '/themes' ) && document.getElementsByClassName( 'themes__sheet' )[0];
	if ( context.primary && ! sheetsDomElement ) {
		ReactDom.render(
			context.primary,
			document.getElementById( 'primary' )
		);
	}
}

function renderSecondary( context ) {
	if ( context.secondary === null ) {
		ReactDom.unmountComponentAtNode( document.getElementById( 'secondary' ) );
	} else if ( context.secondary !== undefined ) {
		ReactDom.render(
			context.secondary,
			document.getElementById( 'secondary' )
		);
	}
}
