'use strict';

const Sequelize = require('sequelize');
var Rds = require('./rds');
var rds = new Rds();
var MsCkpConfig = require('./ms_ckp_config');
var ms_ckp_config = new MsCkpConfig();
var pad_left = require('pad-left');

var BankRid = rds.sequelize.define('bank_rids',{
	id: {type: Sequelize.BIGINT(11), allowNull: true, primaryKey: true, autoIncrement: true},
	rid: {type: Sequelize.STRING(255), allowNull: false},
	created_at: Sequelize.DATE,
	updated_at: Sequelize.DATE
});

BankRid.shift_rid = function(old_rid, direction){
	var new_rid = old_rid;
	var new_rid_length = 0;
	switch(direction){
		case "up":
			if(old_rid != '000'){
				new_rid = ( parseInt(old_rid, 36) - 1 ).toString(36);
				new_rid_length = (new_rid.length%ms_ckp_config.ckpStep ==0 ) ? new_rid.length : parseInt(new_rid.length/ms_ckp_config.ckpStep+1)*ms_ckp_config.ckpStep;
				new_rid = pad_left(new_rid, new_rid_length, '0');
			}
			break;
		case "down":
			if(old_rid != 'zzz'){
				new_rid = ( parseInt(old_rid, 36) + 1 ).toString(36);
				new_rid_length = (new_rid.length%ms_ckp_config.ckpStep ==0 ) ? new_rid.length : parseInt(new_rid.length/ms_ckp_config.ckpStep+1)*ms_ckp_config.ckpStep;
				new_rid = pad_left(new_rid, new_rid_length, '0');
			}
			break;
		default:
			break;
	}
	return new_rid;
}

module.exports = BankRid;