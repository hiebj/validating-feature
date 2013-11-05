Ext.ux.grid.feature.Validating is a Feature that provides automatic row and cell validation for Ext.grid.Panel.

For a live example, check out the Fiddle: https://fiddle.sencha.com/#fiddle/1b3

Automatic Validation
------------------
The validation process relies on Ext.data.validations configured on an Ext.data.Model. To determine a record's validity, Ext.data.Model#validate method is called. If a field of a record fails validation, its representative grid cell will be painted with an invalid CSS class and a tooltip containing the returned error messages.

Validation occurs automatically when a record is updated. When the record is repainted by the View on Ext.data.Store#update, our cellTpl will apply error CSS and tooltips based on the result of a call to the Ext.data.Model#validate function. Records which are not dirty (have not been updated) are validated only by an explicit call to validate.

The CSS and tooltip are applied using the capabilities of a grid Feature, namely by manipulating Ext.view.Table#cellTpl.

Server-Side (Write) Validation
--------------------------------------
In some cases, a batch 'write' operation might result in mixed success, where some records succeed the operation and others fail. This Feature provides an easy way to present record- and field-level write errors to the user.

The Feature will listen for store 'write' events and attempt to discern which records, if any, failed during the operation. Failed records will be painted with invalid CSS and a tooltip indicating the server-side error message for that record.

By default, this Feature will attempt to extract the errors from the raw server data on a per-record basis, either by reading a configurable errorProperty (for JSON data; see config) or by index access (for ArrayStore data). This way, the server can return an extra property on each record describing a single error or a set of field-specific errors without any special client-side Model configuration. If no errors are specified, the record is assumed to have been updated successfully.

This feature has multiple override hooks to tailor this behavior for the target server's response format. See the comments in the code for details.

Manual Validation
----------------------
If necessary, records can be validated manually in one of two ways:

- By invoking #validate, which will in turn call Ext.data.Model#validate to retrieve errors
- By invoking #setErrors, which will apply arbitrary errors to the View on a per-record basis

Note that errors set via the setErrors method will **not** be returned by future calls to Ext.data.Model#validate, meaning that using setErrors will **not** cause a record to fail validation. These errors will also be blown away when the respective record triggers Ext.data.Store#update, and will need to be re-set if appropriate.