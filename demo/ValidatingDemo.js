/**
 * @author hiebj (Jonathan Hieb)
 * To see this Validating demo in action, check out the Fiddle: https://fiddle.sencha.com/#fiddle/1b3
 */
// Define the Model with desired Ext.data.Validations.
Ext.define('Plant', {
	extend: 'Ext.data.Model',
	fields: [ 'common', 'botanical', 'light', {
		name: 'indoor',
		type: 'boolean'
	}, {
		name: 'availability',
		type: 'date',
		dateFormat: 'm/d/Y'
	}, {
		name: 'price',
		type: 'float'
	} ],
	validations: [ {
		type: 'presence',
		field: 'common'
	}, {
		type: 'presence',
		field: 'botanical'
	},
	// Throw in some custom validations for fun.
	{
		type: 'min',
		field: 'price',
		message: 'must be greater than $2.00',
		minimum: 2
	}, {
		type: 'daterange',
		field: 'availability',
		message: 'must be after 7/21/1989, but no later than today',
		minimum: new Date(1989, 7, 21),
		maximum: new Date()
	}, {
		type: 'indoor',
		field: 'light'
	}, {
		type: 'indoor',
		field: 'indoor'
	} ]
});

// Define the custom validators
Ext.apply(Ext.data.validations, {
	min: function(config, value) {
		return Ext.isNumber(value) && value >= config.minimum;
	},
	daterange: function(config, value) {
		return Ext.isDate(value) &&
				(!config.minimum || config.minimum.getTime() <= value.getTime()) &&
				(!config.maximum || config.maximum.getTime() >= value.getTime());
	},
	indoor: function(config, value) {
		var valid = true,
			vals = this.indoorValues = this.indoorValues || {},
			light;
		// It would be so great if Validations had access to the record...
		vals[config.field] = value;
		if (Ext.isDefined(vals.indoor) && Ext.isDefined(vals.light)) {
			light = vals.light.toLowerCase();
			if (light.indexOf('shad') > -1 && light.indexOf('or') === -1 && !vals.indoor) {
				this.indoorMessage = 'is invalid: Plants that need shade should not be planted outdoors';
				valid = false;
			} else if (light.indexOf('sunny') > -1 && !!vals.indoor) {
				this.indoorMessage = 'is invalid: Plants that need sun should not be planted indoors';
				valid = false;
			}
			delete this.indoorValues;
		}
		return valid;
	}
});

Ext.onReady(function() {
	// The Validating Feature uses QuickTips.
	Ext.QuickTips.init();
	Ext.create('Ext.grid.Panel', {
		features: [ {
			ftype: 'validating'
		} ],
		store: {
			autoLoad: true,
			model: 'Plant',
			proxy: {
				type: 'ajax',
				url: 'plants.json',
				reader: 'json'
			},
			sorters: [ {
				property: 'common',
				direction: 'ASC'
			} ]
		},
		plugins: [ {
			ptype: 'cellediting',
			clicksToEdit: 1
		} ],
		columns: [
				{
		            text: 'Common Name',
		            dataIndex: 'common',
		            flex: 1,
		            editor: {
		                xtype: 'textfield'
		            }
		        },
				{
					text: 'Botanical Name',
					dataIndex: 'botanical',
					flex: 1,
					editor: {
						xtype: 'textfield'
					}
				},
				{
					text: 'Light',
					dataIndex: 'light',
					width: 120,
					editor: {
						xtype: 'combo',
						store: [ [ 'Shade', 'Shade' ],
								[ 'Mostly Shady', 'Mostly Shady' ],
								[ 'Sun or Shade', 'Sun or Shade' ],
								[ 'Mostly Sunny', 'Mostly Sunny' ],
								[ 'Sunny', 'Sunny' ] ]
					}
				}, {
					xtype: 'booleancolumn',
					text: 'Indoor',
					dataIndex: 'indoor',
					width: 80,
					trueText: 'Indoor',
					falseText: 'Outdoor',
					editor: {
						xtype: 'checkbox'
					}
				}, {
					xtype: 'numbercolumn',
					text: 'Price',
					dataIndex: 'price',
					width: 70,
					renderer: 'usMoney',
					editor: {
						xtype: 'numberfield'
					}
				}, {
					xtype: 'datecolumn',
					text: 'Available',
					dataIndex: 'availability',
					editor: {
						xtype: 'datefield',
						format: 'm/d/y'
					}
				} ],
		renderTo: Ext.getBody(),
		width: 650,
		height: 300,
		title: 'Edit Plants?',
		frame: true,
		tbar: [ {
			text: 'Add Plant',
			handler: function() {
				var grid = Ext.ComponentQuery.query('grid')[0];
				grid.getStore().insert(0, {
					light: 'Mostly Shady',
					availDate: Ext.Date.clearTime(new Date())
				});
				grid.editingPlugin.startEditByPosition({
					row: 0,
					column: 0
				});
			}
		} ]
	});
});