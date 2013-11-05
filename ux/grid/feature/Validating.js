/**
 * @author hiebj (Jonathan Hieb)
 * 
 * Ext.ux.grid.feature.Validating is a Feature that provides automatic row and cell validation for
 * {@link Ext.grid.Panel}.
 * ftype: 'validating'
 *
 * For a live example, check out the Fiddle: https://fiddle.sencha.com/#fiddle/1b3
 * 
 * # Automatic Validation
 * 
 * The validation process relies on {@link Ext.data.validations} configured on an {@link Ext.data.Model}. To
 * determine a record's validity, the {@link Ext.data.Model#validate} method is called. If a field of a record
 * fails validation, its representative grid cell will be painted with an invalid CSS class and a tooltip
 * containing the returned error messages.
 * 
 * Validation occurs automatically when a record is updated. When the record is repainted by {@link Ext.view.Table}
 * on {@link Ext.data.Store#update}, our {@link #cellTpl} will apply error CSS and tooltips based on the result of
 * a call to the {@link Ext.data.Model#validate} function. Records which are not dirty (have not been updated) are
 * only validated by an explicit call to {@link #validate}.
 * 
 * The CSS is applied using the capabilities of a grid Feature, namely by manipulating
 * {@link Ext.view.Table#cellTpl}. If the Validating Feature causes some kind of conflict with your View, or if you
 * want to customize how the error CSS is applied, this is where to start looking.
 *
 * # Server-Side (Write) Validation
 * 
 * In some cases, a batch 'write' operation might result in mixed success, where some records succeed the operation
 * and others fail. This Feature provides an easy way to present record- and field-level write errors to the user.
 * 
 * The Feature will listen for {@link Ext.data.Store#write} events and attempt to discern which records, if any,
 * failed during the operation. Failed records will be painted with invalid CSS and a tooltip indicating the
 * server-side error message for that record.
 * 
 * By default, this Feature will attempt to extract the errors from the raw server data on a per-record basis,
 * either by reading a configurable {@link #errorProperty} (for JSON data; see config) or by index access
 * (for {@link Ext.data.ArrayStore} data). This way, the server can return an extra property on each record
 * describing a single error or a set of field-specific errors without any special client-side Model configuration.
 * If no errors are specified, the record is assumed to have been updated successfully.
 *
 * Example: Consider a basic {@link Ext.data.Model} with the fields: [ 'id', 'name' ].
 * This object would be a valid JSON response for an instance of this Model that fails server validation:
 * 
 *		{
 *			id: 1,
 *			name: "first",
 *			errors: "The name 'first' is already in use"
 *				OR
 *			errors: [ { field: "name", message: "The name 'first' is already in use"} ... ]
 *		}
 * 
 * In the case of {@link Ext.data.ArrayStore} data, we'll assume the error is located at the first index NOT used
 * by the model's {@link Ext.data.Model#fields}:
 * 
 *		[
 *			1,
 *			"first",
 *			"The name 'first' is already in use"
 *				OR
 *			[ { field: "name", message: "The name 'first' is already in use"} ... ]
 *		]
 * 
 * To tailor this behavior for the target server's response format, this Feature can be configured with custom
 * {@link #getRawDataErrors} or {@link #getWriteErrors} methods (see config).
 * 
 * # Manual Validation
 * 
 * If necessary, records can be validated manually in one of two ways:
 * 
 * - By invoking {@link #validate}, which will in turn call {@link Ext.data.Model#validate} to retrieve errors
 * - By invoking {@link #setErrors}, which will apply arbitrary errors to the View on a per-record basis
 * 
 * Note that errors set via the {@link #setErrors} method will NOT be returned by future calls to 
 * {@Ext.data.Model#validate} method, meaning that calling {@link #setErrors} will NOT cause a record to fail
 * validation. These errors will also be blown away when the respective record triggers
 * {@link Ext.data.Store#update}, and will need to be re-set afterward if appropriate.
 */
Ext.define('Ext.ux.grid.feature.Validating', {
	extend: 'Ext.grid.feature.Feature',
	alias: 'feature.validating',
	
	/**
	 * @cfg {Boolean} autoValidate Set to false to disable automatic validation triggered by
	 *		{@link Ext.dataStore#update}. Defaults to true
	 */
	autoValidate: true,
	/**
	 * @cfg {String} invalidCls The CSS class to apply to a cell that fails validation. Defaults to
	 *		'x-grid-cell-invalid'
	 */
	invalidCls: 'x-grid-cell-invalid',
	
	/**
	 * @cfg {String} errorProperty The data property used by the default {@link #getRawDataErrors} implementation
	 *		to extract errors from each record's raw server data response. Will be ignored if the server responds
	 *		with {@link Ext.data.ArrayStore} data, or if {@link #getRawDataErrors} is overridden. Defaults to
	 *		'errors'
	 */
	errorProperty: 'errors',
	
	/** 
	 * @cfg {Function} getRawDataErrors Optional override method to extract error descriptors from the raw server
	 *		data used to create a single {@link Ext.data.ResultSet} record. For more information, see the
	 *		{@link #getRawDataErrors} documentation.
	 */
	/**
	 * @cfg {Function} getWriteErrors Optional override method to extract a set of line-item error descriptors
	 *		from an entire 'write' {@link Ext.data.Operation}. For more information, see the
	 *		{@link #getWriteErrors} documentation.
	 */
	
	/**
	 * @property cellTpl
	 * The {@link Ext.XTemplate} this {@link Ext.grid.feature.Feature} adds to the {@link Ext.table.View}. It
	 * is essentially the same as the default template, except that if a given cell is invalid it is double-wrapped
	 * using an extra outer <div> with the configured {@link #invalidCls}.
	 * 
	 * Developer note: The simple effect of a red border could have been achieved with a before/after cellTpl
	 * instead, modifying the 'style' and 'tdCls' properties of the values object passed to the original tpl in
	 * {@link Ext.view.Table}. However, certain CSS configurations for {@link #invalidCls} can cause conflicts with
	 * other Grid behavior when in this way (e.g. the "red flag" dirty image).
	 */
	cellTpl: [
		  '{% this.validatingFeature.validateCell(values); %}',
		  '<td role="gridcell" class="{tdCls}" {tdAttr} id="{[Ext.id()]}">',
			'<tpl if="invalid">',
				'<div class="{invalidCls}"<tpl if="tooltip"> data-errorqtip="{tooltip}"</tpl>>',
			'</tpl>',
					'<div {unselectableAttr} class="' + Ext.baseCSSPrefix + 'grid-cell-inner {innerCls}"',
						'style="text-align:{align};<tpl if="style">{style}</tpl>">{value}',
					'</div>',
			'<tpl if="invalid">',
				'</div>',
			'</tpl>',
		  '</td>',
		  '{% this.validatingFeature.cleanupCellValues(values); %}', {
			  priority: 50
		  }
	  ],
	
	tooltipTpl: '<ul><tpl for="errors"><li role="alert">{.}</li></tpl></ul>',

	init: function(grid) {
		this.errorMap = new Ext.util.MixedCollection();
		// Make sure the cellTpl has access to this validating Feature
		this.view.addCellTpl(Ext.XTemplate.getTpl(this, 'cellTpl')).validatingFeature = this;
		// Our onUpdate handler must be called before the view onUpdate handler. The view handler has priority 0.
		grid.store.on({
			load: this.clear,
			clear: this.clear,
			bulkremove: this.onBulkRemove,
			update: this.onUpdate,
			write: this.onWrite,
			priority: 50,
			scope: this
		});
		grid.validatingFeature = this;
		this.callParent(arguments);
	},
	
	/**
	 * Manual valdiation function. Validates the record by calling {@link Ext.data.Model#validate},
	 * then triggers a repaint for the record's row, which will cause our {@link #cellTpl} to be reapplied for all
	 * cells.
	 * @param {Ext.data.Model} record The record to validate
	 * @return {Ext.data.Errors} the errors returned by {@link Ext.data.Model#validate}
	 */
	validate: function(record) {
		var errors = this.cacheErrors(record);
		this.view.onUpdate(this.grid.store, record);
		return errors;
	},
	
	/**
	 * @private
	 * Used internally to validate a record and cache the errors, called by {@link #validate} and
	 * {@link #onUpdate}. This function does *not* repaint the view.
	 */
	cacheErrors: function(record) {
		var id = record.internalId,
			errors = record.validate();
		if (!errors.isValid()) {
			this.errorMap.add(id, errors);
		}
		this.isValid();
		return errors;
	},
	
	/**
	 * Checks the validity state of the entire grid. Note that this does not necessarily have the same result as
	 * filtering the {@link Ext.data.Store} by validity, since we may have extra errors from a write operation or
	 * applied manually via {@link setErrors}.
	 * @returns {Boolean} false if there are errors in the cache, true otherwise.
	 */
	isValid: function() {
		var lastValid = this.lastValid;
		this.lastValid = !this.errorMap.getCount();
		if (Ext.isDefined(lastValid) && lastValid !== this.lastValid) {
			this.fireEvent('validitychange', this, this.lastValid);
		}
		return this.lastValid;
	},
	
	/**
	 * When records are removed from the store, we also remove them from the cache. This function can also be
	 * called if for some reason the entire cache needs to be wiped.
	 */
	clear: function() {
		this.errorMap.clear();
		this.isValid();
	},
	
	onBulkRemove: function(store, records) {
		Ext.each(records, function(record) {
			this.errorMap.removeAtKey(record.internalId);
		}, this);
		this.isValid();
	},
	
	/**
	 * @private
	 * Auto-validate: (Re)validate the record, repainting any fields whose validation status changed during the
	 * update. This intentionally handles ALL update operations (edit, commit, reject).
	 */
	onUpdate: function(store, record, operation, modifiedFieldNames) {
		if (this.autoValidate) {
			var id = record.internalId,
				lastErrors = this.errorMap.removeAtKey(id),
				errors = this.cacheErrors(record).getRange(),
				repaint;
			// If the modifiedFieldNames argument is not passed, the whole row will be repainted anyway
			if (modifiedFieldNames) {
				repaint = [];
				if (lastErrors && lastErrors.getCount()) {
					Ext.Array.push(errors, lastErrors.getRange());
				}
				Ext.each(errors, function(error) {
					Ext.Array.include(repaint, error.field);
				});
				// No need to repaint fields that will already be repainted by the current update event
				repaint = Ext.Array.difference(repaint, modifiedFieldNames);
				if (!Ext.isEmpty(repaint)) {
					this.view.onUpdate(store, record, operation, repaint);
				}
			}
		}
	},
	
	/**
	 * @private
	 * The entry point to the server-side validation/write error support system. This handler will pass off
	 * the actual error extraction to template function {@link #getWriteErrors}.
	 */
	onWrite: function(store, operation) {
		if (this.validateOnWrite) {
			this.setErrors(this.getWriteErrors.apply(this, arguments));
		}
	},
	
	/**
	 * Method that will manually add errors to the cache, so that they will be rendered into the grid view.
	 * Note that errors set by this method will impact the result of {@link #isValid}, but will NOT be returned by
	 * {@link Ext.data.Model#validate}, meaning that these errors will NOT result in the model failing validation.
	 * They exist only in the gridview and in this Feature.
	 * These errors will also be blown away when the respective record triggers {@link Ext.data.Store#update}, and
	 * will need to be re-set if appropriate.
	 * 
	 * @param {Object} errors An error descriptor with the follwing properties:
	 *	@param {Ext.data.Model} record	The record to mark as invalid
	 *	@param {String} message			The error message to use in the tooltip
	 *	@param {String} field			Optional; specifies a specific field (cell) to which the error should be
	 *		applied. By default, the error will be applied to the entire record (by applying it to every field).
	 */
	setErrors: function(errors) {
		var record,
			id,
			recordErrors,
			fieldNames = [];
		Ext.each(errors, function(error) {
			if (error) {
				record = error.record;
				id = record.internalId;
				recordErrors = this.errorMap.getByKey(id);
				if (!recordErrors) {
					recordErrors = new Ext.data.Errors();
					this.errorMap.add(id, recordErrors);
				}
				if (error.field) {
					// The error is tied to a specific field
					recordErrors.add({
						field: error.field,
						message: error.message
					});
					fieldNames.push(error.field);
				} else {
					// Apply the same error to all fields for the record
					Ext.each(record.self.getFields(), function(field) {
						recordErrors.add({
							record: record,
							field: field.name,
							message: error.message
						});
						fieldNames.push(field.name);
					});
				}
				// Manually refresh the view for the record
				this.view.onUpdate(this.store, record, Ext.data.Model.REJECT, fieldNames);
			}
		}, this);
	},
	
	/**
	 * @protected
	 * @template
	 * Method to retrieve a set of line-item error descriptors from a write operation.
	 *
	 * This default implementation iterates through {@link Ext.data.Operation#resultSet} and attempts to extract
	 * errors from each record's raw data using {@link #getRawDataErrors}. Any extra properties (those that don't
	 * match up with a corresponding Model field) will be available via the {@link Ext.data.Model#raw} property on
	 * the ResultSet records, since they are instantiated around the server response's raw data object.
	 * See:	{@link Ext.data.reader.Reader#read}
	 * 
	 * The code used to match up the response records with their local equivalents follows logic
	 * similar to that used in {@link Ext.data.Operation#commitRecords}.
	 * 
	 * Other implementations using an {@link Ext.data.proxy.Server} proxy might wish to make use of the undocumented
	 * property {@link Ext.data.Operation#response}, which contains the entire XMLHttpResponse object from the
	 * server.
	 * See: {@link Ext.data.proxy.Server#processResponse}
	 * 
	 * Note that this function is actually called with the 'arguments' object from the onWrite handler in this
	 * class, meaning that this function will be passed all the arguments of the 'write' event - not just 'store'
	 * and 'operation'. This is done intentionally so that a custom 'write' event can be appropriately handled.
	 * 
	 * @param store
	 * @param operation
	 * @return {Array} of error descriptors, whose format matches the 'errors' parameter to {@link #setErrors}
	 */
	getWriteErrors: function(store, operation) {
		var errors = new Ext.util.MixedCollection(),
			clientRecords = operation.getRecords(),
			serverRecords,
			serverErrors,
			i;
		if (clientRecords && clientRecords.length) {
			if (clientRecords.length > 1) {
				// There are multiple records involved in the operation - we have to match up each client
				// record with the corresponding server record.
				if (operation.action === 'update' || clientRecords[0].clientIdProperty) {
					// Match by clientIdProperty
					serverRecords = new Ext.util.MixedCollection();
					serverRecords.addAll(operation.getResultSet().records);
					for (i = clientRecords.length; i--;) {
						// Use the Operation's private matchClientRec function to make the job easier
						serverErrors = this.getRecordWriteErrors(clientRecords[i],
								serverRecords.findBy(operation.matchClientRec, clientRecords[i]));
						if (!Ext.isEmpty(serverErrors)) {
							errors.addAll(serverErrors);
						}
					}
				} else {
					// We have no clientIdProperty to match; match by index order instead
					for (i = 0; i < clientRecords.length; i++) {
						serverErrors = this.getRecordWriteErrors(clientRecords[i], serverRecords[i]);
						if (!Ext.isEmpty(serverErrors)) {
							errors.addAll(serverErrors);
						}
					}
				}
			} else {
				// Operation only has one record, so no need to match it up
				serverErrors = this.getRecordWriteErrors(clientRecords[0], operation.getResultSet().records[0]);
				if (!Ext.isEmpty(serverErrors)) {
					errors.addAll(serverErrors);
				}
			}
		}		
		return errors;
	},
	
	/**
	 * @private
	 * Builds an Array of server error descriptors for each record by invoking {@link #getRawDataErrors}
	 */
	getRecordWriteErrors: function(clientRecord, serverRecord) {
		var errors = [],
			serverErrors,
			error;
		if (clientRecord && serverRecord) {
			serverErrors = this.getRawDataErrors(serverRecord.raw, serverRecord);
			if (!Ext.isEmpty(serverErrors)) {
				// serverErrors may be an Array or just a single item
				Ext.each(serverErrors, function(serverError) {
					error = { record: clientRecord };
					if (typeof serverError === 'object') {
						// Error is an object descriptor { field, message }
						Ext.applyIf(error, serverError);
					} else {
						// Error is just a message
						error.message = serverError;
					}
					errors.push(error);
				});
			}
		}
		return errors;
	},
	
	/**
	 * @protected
	 * @template
	 * Method to extract errors from the raw data of a single {@link Ext.data.ResultSet} record.
	 * This method can be overridden as a more casual way of customizing the way errors are extracted from raw data.
	 * Instead of changing the way errors are pulled from the entire {@link Ext.data.Operation}, this function
	 * determines how an error is pulled from each individual record's {@link Ext.data.Model#raw} response data.
	 * 
	 * If you're using JSON data and you have a specific error property on each record, consider using the
	 * {@link #errorProprety} config.
	 * 
	 * If the errors can't be pulled from individual record data, you'll need to override {@link #getWriteErrors}
	 * instead.
	 * 
	 * @return {String/Object/String[]/Object[]}
	 * - A String (in which case the error is applied to the whole record)
	 * - A { field, message } object (in which case the error is applied to the specified field
	 * - An Array containing either Strings or { field, message } objects
	 */
	getRawDataErrors: function(rawData, serverRecord) {
		if (Ext.isArray(rawData)) {
			// Array data; access the first value not matched by a field
			return rawData[serverRecord.self.getFields().length];
		} else {
			// JSON data; return this.errorProperty
			return rawData[this.errorProperty];
		}
	},
	
	/**
	 * @private
	 * The main hook executed during rendering.
	 * If this feature is active and the cell has at least one error, add invalid flags to the cellValues.
	 * The {@link #cellTpl} will handle the rest.
	 * @param {Object} cellValues The values object passed to the {@link #cellTpl}
	 */
	validateCell: function(cellValues) {
		var errors = this.getCellErrors(cellValues.record, cellValues.column);
		if (!this.disabled && !Ext.isEmpty(errors)) {
			Ext.apply(cellValues, {
				invalid: true,
				invalidCls: this.invalidCls,
				tooltip: this.composeTooltip(errors)
			});
		}
	},
	
	/**
	 * @private
	 * Accesses the error cache and pulls out an Array of String error messages for an individual cell.
	 */
	getCellErrors: function(record, column) {
		var recordErrors = this.errorMap.getByKey(record.internalId),
			errors = [],
			message;
		if (recordErrors && !recordErrors.isValid()) {
			Ext.each(recordErrors.getByField(column.dataIndex), function(error) {
				// Just push an empty string if the message is empty for some reason.
				// In this case, our cellTpl will only apply invalid CSS - it will not apply an empty tooltip.
				message = '';
				if (!Ext.isEmpty(error.message)) {
					// Only add the column name if the error is not a record-level error applied to all fields
					if (!error.record) {
						message = column.text + ' ';
					}
					message = Ext.String.trim(message + Ext.String.htmlEncode(error.message));
				}
				errors.push(message);
			});
		}
		return errors;
	},
	
	/**
	 * @private
	 * Renders an array of errors as an HTML string, suitable to be shown in a tooltip.
	 * @return The error string. If errors.length > 1, they will be returned in a <ul><li> wrapper; otherwise,
	 *		errors[0] is returned as-is.
	 */
	composeTooltip: function(errors) {
		var html;
		if (errors.length > 1) {
			html = Ext.String.htmlEncode(Ext.XTemplate.getTpl(this, 'tooltipTpl').apply({
				errors: errors
			}));
		} else if (errors.length === 1) {
			html = errors[0];
		}
		return html;
	},

	/**
	 * @private
	 * Delete all the invalid flags from the cellValues, so that subsequent fields aren't marked as invalid.
	 */
	cleanupCellValues: function(cellValues) {
		delete cellValues.invalid;
		delete cellValues.invalidCls;
		delete cellValues.tooltip;
	}
});