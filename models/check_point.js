'use strict';

//外部引用
const Sequelize = require('sequelize');
var Rds = require('./rds');
var rds = new Rds();
var MsCkpConfig = require('./ms_ckp_config');
var ms_ckp_config = new MsCkpConfig();
var BankRid = require('./bank_rid');

//定义指标model
var CheckPoint = rds.sequelize.define('bank_subject_checkpoint_ckps',{
	uid: { type: Sequelize.STRING(255), allowNull: false, primaryKey: true},
	dimesion: {type: Sequelize.STRING(50), allowNull: true},
	rid: {type: Sequelize.STRING(255), allowNull: false},
	checkpoint: {type: Sequelize.STRING(200), allowNull: true},
	subject: {type: Sequelize.STRING(36), allowNull: false},
	is_entity: {type: Sequelize.BOOLEAN, allowNull: true},
	advice: {type: Sequelize.TEXT, allowNull: true},
	desc: {type: Sequelize.TEXT, allowNull: true},
	weights: {type: Sequelize.FLOAT, allowNull: true},
	sort: {type: Sequelize.STRING(255), allowNull: true},
	category: {type: Sequelize.STRING(255), allowNull: true},
	high_level: {type: Sequelize.BOOLEAN, allowNull: true},
	checkpoint_system_id: {type: Sequelize.BIGINT(11), allowNull: true},
	checkpoint_system_rid: {type: Sequelize.STRING(255), allowNull: true},
	deleted_at: Sequelize.DATE,
	//Self-Define Timestamps
	dt_add: Sequelize.DATE,
	dt_update: Sequelize.DATE
});

//指标model的所有列名
CheckPoint.all_cols = [
	"uid", 
	"dimesion", 
	"rid", 
	"checkpoint",
	"subject",
	"is_entity",
	"advice",
	"`desc`",
	"weights",
	"sort",
	"category",
	"high_level",
	"checkpoint_system_id",
	"checkpoint_system_rid",
	"deleted_at",
	"dt_add",
	"dt_update"
];

//获取同级最大节点rid
CheckPoint.get_max_rid = function(from_ckp, parent_ckp){
	var target_rid = (parent_ckp) ? parent_ckp.rid : "";
	var sql_str = "SELECT MAX(rid) as max_rid FROM bank_subject_checkpoint_ckps WHERE " +
		"rid LIKE '" + target_rid + "%' and " +
		"LENGTH(rid) = LENGTH('" + target_rid + "') + " + ms_ckp_config.ckpStep + " and " +
		"subject = '" + from_ckp.subject + "' and " +
		"dimesion = '" + from_ckp.dimesion + "' and " +
		"category = '" + from_ckp.category + "' and " +
		"checkpoint_system_rid = '" + from_ckp.checkpoint_system_rid + "';";
	return rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.SELECT });
}

//变更影响节点
CheckPoint.change_impacted_nodes = function(target_nodes=[], parent_ckp=null, direction="down"){
	var sql_str = "";
	if(Array.isArray(target_nodes) && target_nodes.length==0){
		sql_str = "SELECT 1 FROM DUAL;"
	} else {
		var old_parent_rid = (parent_ckp) ? parent_ckp.rid : "";
		var old_parent_rid_length = old_parent_rid.length;
		var children_rid = "";
		var node_old_rid = "";
		var node_rid_length = 0;
		var node_new_rid = "";
		target_nodes.forEach(function(node){
			// console.log("-------");
			// console.log("node: " + node.uid + "," + node.rid);
			children_rid = "";
			node_rid_length = node.rid.length;
			node_old_rid = (parent_ckp) ? node.rid.slice(old_parent_rid_length, old_parent_rid_length + ms_ckp_config.ckpStep) : node.rid.slice(0, ms_ckp_config.ckpStep);
			children_rid = (parent_ckp) ? node.rid.slice((old_parent_rid_length + ms_ckp_config.ckpStep), node_rid_length) : node.rid.slice(ms_ckp_config.ckpStep, node_rid_length);
			// console.log("old_parent_rid:" + old_parent_rid);
			// console.log("node_old_rid:" + node_old_rid);
			// console.log("BankRid.shift_rid(node_old_rid,'down'):" + BankRid.shift_rid(node_old_rid,"down"));
			// console.log("children_rid:" + children_rid);
			node_new_rid = old_parent_rid + BankRid.shift_rid(node_old_rid,"down") + children_rid;
			// console.log("node_new_rid: " + node_new_rid);
			sql_str += "SET @newRid='" + node_new_rid + "'; SET @nodeUid=" + node.uid + ";UPDATE bank_subject_checkpoint_ckps SET rid=@newRid WHERE uid=@nodeUid;";
		});
	}
	return rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.BULKUPDATE });//.then(items => {
}

//获取自己以及子孙节点
CheckPoint.prototype.myNodes = function(){
	var sql_str = "SELECT " + CheckPoint.all_cols.join(",") + " FROM bank_subject_checkpoint_ckps WHERE " +
		"subject = '" + this.subject + "' and " +
		"dimesion = '" + this.dimesion + "' and " +
		"category = '" + this.category + "' and " +
		"checkpoint_system_rid = '" + this.checkpoint_system_rid + "' and " +
		"LEFT(rid, LENGTH('" + this.rid + "')) = '" + this.rid + "';";
	return rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.SELECT });
}

//获取紧邻节点
CheckPoint.prototype.nextNode = function(){
	var sql_str = "SELECT " + CheckPoint.all_cols.join(",") + " FROM bank_subject_checkpoint_ckps WHERE " +
		"subject = '" + this.subject + "' and " +
		"dimesion = '" + this.dimesion + "' and " +
		"category = '" + this.category + "' and " +
		"checkpoint_system_rid = '" + this.checkpoint_system_rid + "' and " +
		"LENGTH(rid) = LENGTH('" + this.rid + "') and " +
		"rid > '" + this.rid + "' ORDER BY rid ASC LIMIT 1;"
	return rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.SELECT });
}

//获取影响节点
CheckPoint.prototype.impactNodes = function(exclude_nodes_node=null){
	var sql_str = "";
	// if(Array.isArray(exclude_nodes_uids)){
	var exclude_nodes_node_rid = (exclude_nodes_node) ? exclude_nodes_node.rid : "''";
	sql_str = "SELECT " + CheckPoint.all_cols.join(",") + " FROM bank_subject_checkpoint_ckps WHERE " +
		"subject = '" + this.subject + "' and " +
		"dimesion = '" + this.dimesion + "' and " +
		"category = '" + this.category + "' and " +
		"checkpoint_system_rid = '" + this.checkpoint_system_rid + "' and " +
		// "LENGTH(rid) = LENGTH('" + this.rid + "') and " +
		"rid LIKE '" + this.parent_rid() + "%' and " + 			
		"rid >= '" + this.rid + "' and " + 
		"rid NOT LIKE '" + exclude_nodes_node_rid + "%' ; ";
			// "uid NOT IN(" + exclude_nodes_uids_str + ")";
	// }
	return rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.SELECT });
}

//获取父节点rid
CheckPoint.prototype.parent_rid = function(){
	return (this && this.rid) ? this.rid.slice(0, this.rid.length - ms_ckp_config.ckpStep) : "!!!";
}

//获取父节点
CheckPoint.prototype.parent = function(){
	var cond = {
		subject: this.subject,
		dimesion: this.dimesion,
		category: this.category,
		checkpoint_system_rid: this.checkpoint_system_rid,
		rid: this.parent_rid()
	};
	return CheckPoint.findOne({attributes: CheckPoint.all_cols, where: cond });
}

module.exports = CheckPoint;