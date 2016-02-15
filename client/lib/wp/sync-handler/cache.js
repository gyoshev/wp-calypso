/**
 * External dependencies
 */
import moment from 'moment';
import debugFactory from 'debug';
import ms from 'ms';

/**
 * Internal dependencies
 */
import warn from 'lib/warn';
import { getLocalForage } from 'lib/localforage';

/**
 * Module variables
 */
const localforage = getLocalForage();
const debug = debugFactory( 'calypso:sync-handler:cache' );
const RECORDS_LIST_KEY = 'records-list';

const SYNC_RECORD_REGEX = /^sync-record-\w+$/;

// set record lifetime to 2 days
const DAY_IN_HOURS = 24;
const HOUR_IN_MS = 3600000;
export const LIFETIME = 2 * DAY_IN_HOURS * HOUR_IN_MS;
//const LIFETIME = '2 days';

/**
 * Check it the given key is a `sync-record` key
 *
 * @param {String} key - record key
 * @return {Boolean} `true` if it's a sync-record-<key>
 */
const isSyncRecordKey = key => {
	const isSyncRecord = SYNC_RECORD_REGEX.test( key );

	if ( isSyncRecord ) {
		debug( '%o is a sync-record', key );
	}
	return isSyncRecord;
}

export class Cache {
	getAll( callback = () => {} ) {
		return localforage.getItem( RECORDS_LIST_KEY, callback );
	}

	/**
	 * Add the given `key` into the records-list object
	 * adding at the same a marktime (now).
	 * If the pair key-mark already exists it will be updated.
	 *
	 * @param {String} key - record key
	 * @param {Function} [callback] - callback function
	 * @return {Promise} promise
	 */
	addItem( key, callback = () => {} ) {
		return this.filterByKey( key, ( err, records ) => {
			debug( 'adding %o', key );

			// add the fresh item into history list
			records.unshift( { key, mark: Date.now() } );
			return localforage.setItem( RECORDS_LIST_KEY, records, callback );
		},
		err => {
			callback( err );
		} );
	}

	removeItem( key, callback = () => {} ) {
		return this.filterByKey().then(
			key, records => {
				debug( 'adding %o', key );
				return localforage.setItem( RECORDS_LIST_KEY, records, callback );
			},
			err => {
				callback( err );
			}
		);
	}

	/**
	 * Retrieve all records filter by the given key
	 *
	 * @param {String} key - compare records with this key
	 * @param {Function} [callback] - callback function
	 * @return {Promise} promise
	 */
	filterByKey( key, callback = () => {} ) {
		return this.getAll().then( records => {
			if ( ! records || ! records.length ) {
				debug( 'No records stored' );
				return callback( null, [] );
			}

			// filter records by the given key
			records = records.filter( item => {
				if ( item.key === key ) {
					debug( '%o exists. Removing ...', key );
				}
				return item.key !== key;
			} );

			return callback( null, records );
		},
		err => {
			callback( err );
		} );
	}

	/**
	 * Calling this method all records will be removed.
	 * It's a cleaning method and it should be used to re-sync the whole data.
	 */
	clearAll( callback = () => {} ) {
		localforage.keys( ( err, keys ) => {
			if ( err ) {
				return callback( err );
			}

			const syncHandlerKeys = keys.filter( isSyncRecordKey );

			if ( ! syncHandlerKeys.length ) {
				return debug( 'No records to remove' );
			}

			debug( 'Removing %o records', syncHandlerKeys.length );
			syncHandlerKeys.forEach( key => {
				localforage.removeItem( key ).then( () => {
					debug( '%o has been removed', key );
				}, removeErr => {
					if ( removeErr ) {
						return warn( removeErr );
					}
				} );
			} );

			localforage.removeItem( RECORDS_LIST_KEY ).then( () => {
				debug( '%o has been removed as well', RECORDS_LIST_KEY );
			}, removeListErr => {
				if ( removeListErr ) {
					warn( removeListErr );
					return callback( removeListErr );
				}
			} );
		} );
	}

	/**
	 * Prune old records depending of the given lifetime
	 *
	 * @param {Number|String} lifetime - lifetime (ms or natural string)
	 */
	pruneRecordsFrom( lifetime = LIFETIME ) {
		lifetime = ms( lifetime );
		debug( 'start to prune records older than %s', ms( lifetime, { long: true } ) );

		this.getAll()
		.then( records => {
			if ( ! records || ! records.length ) {
				return debug( 'Records not found' );
			}

			const filteredRecords = records.filter( item => {
				const reference = Date.now() - lifetime;
				const timeago = moment( item.mark ).from();

				if ( item.mark < reference ) {
					debug( '%o is too old (%s). Removing ...', item.key, timeago );
					localforage.removeItem( item.key );
					return false;
				}

				return true;
			} );

			if ( filteredRecords.length === records.length ) {
				debug( 'No records to prune' );
			} else {
				debug( 'updating %o list', RECORDS_LIST_KEY );
				return localforage.setItem( RECORDS_LIST_KEY, filteredRecords );
			}
		} );
	}
}
